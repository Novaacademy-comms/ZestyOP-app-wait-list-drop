// ─── Firebase Imports (CDN ESM) ───────────────────────────────────────────────
import { initializeApp }         from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, runTransaction, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─── Firebase Config ──────────────────────────────────────────────────────────
// Paste your Firebase project values below.
// Find them at: Firebase Console → Project Settings → Your Apps → SDK setup
const firebaseConfig = {
  apiKey:            "AIzaSyDzkCVvQqB1T_nM4ZuxHGgToxB2zH71QsI",
  authDomain:        "zestyop-f2133.firebaseapp.com",
  projectId:         "zestyop-f2133",
  storageBucket:     "zestyop-f2133.firebasestorage.app",
  messagingSenderId: "382463023165",
  appId:             "1:382463023165:web:b6e9c4137f08d14cd53254",
};

// ─── Init ─────────────────────────────────────────────────────────────────────
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ─── State ────────────────────────────────────────────────────────────────────
let userData   = null;
let referredBy = null;

// ─── DOM Refs ─────────────────────────────────────────────────────────────────
const loadingScreen  = document.getElementById("loading-screen");
const formCard       = document.getElementById("form-card");
const successCard    = document.getElementById("success-card");
const emailInput     = document.getElementById("email-input");
const twitterInput   = document.getElementById("twitter-input");
const emailError     = document.getElementById("email-error");
const twitterError   = document.getElementById("twitter-error");
const submitError    = document.getElementById("submit-error");
const submitBtn      = document.getElementById("submit-btn");
const counterNum     = document.getElementById("counter-num");
const refBanner      = document.getElementById("ref-banner");
const referralLinkBox = document.getElementById("referral-link-box");

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getUrlParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

function getReferralLink(code) {
  return `${window.location.origin}${window.location.pathname}?ref=${code}`;
}

function showLoading() {
  loadingScreen.style.display = "flex";
  formCard.style.display      = "none";
  successCard.style.display   = "none";
}

function showForm() {
  loadingScreen.style.display = "none";
  formCard.style.display      = "block";
  successCard.style.display   = "none";
}

function showSuccess(data) {
  loadingScreen.style.display = "none";
  formCard.style.display      = "none";
  successCard.style.display   = "block";

  document.getElementById("success-twitter").textContent   = "@" + data.twitter;
  document.getElementById("success-position").textContent  = "#" + (data.position?.toLocaleString() ?? "—");
  document.getElementById("success-referrals").textContent = data.referrals ?? 0;
  referralLinkBox.textContent = getReferralLink(data.referralCode);
}

// ─── On Load ──────────────────────────────────────────────────────────────────
referredBy = getUrlParam("ref");
if (referredBy) refBanner.style.display = "block";

// Fetch live counter
async function fetchCount() {
  try {
    const snap = await getDoc(doc(db, "meta", "stats"));
    counterNum.textContent = snap.exists() ? snap.data().count.toLocaleString() : "0";
  } catch {
    counterNum.textContent = "0";
  }
}

// Auth state listener — show correct screen on load
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const snap = await getDoc(doc(db, "waitlist", user.uid));
    if (snap.exists()) {
      userData = snap.data();
      showSuccess(userData);
      return;
    }
  }
  await fetchCount();
  showForm();
});

// ─── Submit Handler ───────────────────────────────────────────────────────────
window.handleSubmit = async function () {
  // Clear previous errors
  emailError.textContent   = "";
  twitterError.textContent = "";
  submitError.textContent  = "";

  const email   = emailInput.value.trim();
  const twitter = twitterInput.value.trim();

  // Validate
  let valid = true;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    emailError.textContent = "Enter a valid email address";
    emailInput.classList.add("err");
    valid = false;
  } else {
    emailInput.classList.remove("err");
  }

  if (!twitter || twitter.length < 2) {
    twitterError.textContent = "Enter your Twitter/X handle";
    twitterInput.classList.add("err");
    valid = false;
  } else {
    twitterInput.classList.remove("err");
  }

  if (!valid) return;

  // Disable button & show spinner
  submitBtn.disabled   = true;
  submitBtn.innerHTML  = `<span class="spinner"></span> Joining…`;

  try {
    // 1. Anonymous sign-in
    const { user } = await signInAnonymously(auth);

    // 2. Guard: already signed up
    const existing = await getDoc(doc(db, "waitlist", user.uid));
    if (existing.exists()) {
      userData = existing.data();
      showSuccess(userData);
      return;
    }

    // 3. Atomic position counter
    const statsRef = doc(db, "meta", "stats");
    let newPosition;
    await runTransaction(db, async (tx) => {
      const statsSnap = await tx.get(statsRef);
      const current   = statsSnap.exists() ? statsSnap.data().count : 0;
      newPosition     = current + 1;
      tx.set(statsRef, { count: newPosition }, { merge: true });
    });

    // 4. Save waitlist entry
    const referralCode = generateCode();
    const cleanTwitter = twitter.replace(/^@/, "");

    const entry = {
      email,
      twitter:      cleanTwitter,
      referralCode,
      position:     newPosition,
      referrals:    0,
      referredBy:   referredBy || null,
      uid:          user.uid,
      createdAt:    serverTimestamp(),
    };

    await setDoc(doc(db, "waitlist", user.uid), entry);

    // 5. Save code → uid mapping
    await setDoc(doc(db, "referralCodes", referralCode), { uid: user.uid });

    // 6. Credit referrer if applicable
    if (referredBy) await creditReferrer(referredBy);

    userData = entry;
    showSuccess(entry);

  } catch (err) {
    console.error("Signup error:", err);
    submitError.textContent = "Something went wrong. Please try again.";
  } finally {
    submitBtn.disabled  = false;
    submitBtn.innerHTML = "Join the Waitlist →";
  }
};

// ─── Credit Referrer ──────────────────────────────────────────────────────────
async function creditReferrer(refCode) {
  try {
    const codeSnap = await getDoc(doc(db, "referralCodes", refCode));
    if (!codeSnap.exists()) return;

    const { uid } = codeSnap.data();
    const referrerRef = doc(db, "waitlist", uid);

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(referrerRef);
      if (!snap.exists()) return;
      const data = snap.data();
      tx.update(referrerRef, {
        referrals: (data.referrals || 0) + 1,
        position:  Math.max(1, (data.position || 9999) - 10),
      });
    });
  } catch (err) {
    console.error("Referral credit error:", err);
  }
}

// ─── Copy Link ────────────────────────────────────────────────────────────────
window.copyLink = async function () {
  if (!userData?.referralCode) return;
  const link = getReferralLink(userData.referralCode);
  try { await navigator.clipboard.writeText(link); } catch {}

  const btn = document.getElementById("copy-btn");
  btn.textContent = "Copied!";
  btn.classList.add("ok");
  setTimeout(() => {
    btn.textContent = "Copy link";
    btn.classList.remove("ok");
  }, 2000);
};

// ─── Share on Twitter/X ───────────────────────────────────────────────────────
window.shareOnTwitter = function () {
  if (!userData?.referralCode) return;
  const text = encodeURIComponent(
    `I just joined the ZestyOP waitlist — the SocialFi app where your influence earns onchain.\n\nJoin me 👇`
  );
  const url = encodeURIComponent(getReferralLink(userData.referralCode));
  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
};
