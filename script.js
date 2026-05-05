// ─── Firebase Imports (CDN ESM) ───────────────────────────────────────────────
import { initializeApp }         from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInAnonymously, signInWithPopup, GoogleAuthProvider, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, runTransaction, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─── Firebase Config ──────────────────────────────────────────────────────────
// Paste your Firebase project values below.
// Find them at: Firebase Console → Project Settings → Your Apps → SDK setup
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_AUTH_DOMAIN",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID",
};

// ─── Init ─────────────────────────────────────────────────────────────────────
const app      = initializeApp(firebaseConfig);
const auth     = getAuth(app);
const db       = getFirestore(app);
const provider = new GoogleAuthProvider();

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

// ─── Google Sign-In Handler ───────────────────────────────────────────────────
window.handleGoogleSignIn = async function () {
  const googleBtn = document.getElementById("google-btn");
  googleBtn.disabled = true;
  googleBtn.textContent = "Signing in…";
  submitError.textContent = "";

  try {
    const result = await signInWithPopup(auth, provider);
    const user   = result.user;

    // Check if already on waitlist
    const existing = await getDoc(doc(db, "waitlist", user.uid));
    if (existing.exists()) {
      userData = existing.data();
      showSuccess(userData);
      return;
    }

    // Auto-fill email from Google account
    if (user.email) {
      emailInput.value = user.email;
    }

    // Show twitter field so user can complete signup
    googleBtn.style.display = "none";
    document.querySelector(".divider-row").style.display = "none";
    submitError.textContent = "";

    // Highlight the twitter field
    twitterInput.focus();
    submitError.textContent = "✅ Google connected! Just enter your Twitter handle to finish.";
    submitError.style.color = "#22a650";

  } catch (err) {
    if (err.code !== "auth/popup-closed-by-user") {
      submitError.textContent = "Google sign-in failed. Please try again.";
    }
    // Only restore the button if it's still visible (sign-in didn't succeed)
    if (googleBtn.style.display !== "none") {
      googleBtn.disabled = false;
      googleBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
          <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 19.001 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
          <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
          <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.021 35.556 44 30.038 44 24c0-1.341-.138-2.65-.389-3.917z"/>
        </svg>
        Continue with Google`;
    }
  }
};

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
    // 1. Use existing signed-in user (e.g. Google) or sign in anonymously
    let user = auth.currentUser;
    if (!user) {
      const result = await signInAnonymously(auth);
      user = result.user;
    }

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
