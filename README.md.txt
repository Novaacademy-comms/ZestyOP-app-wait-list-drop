# ZestyOP — Waitlist (Plain HTML/CSS/JS)

No framework. No build step. Just drop the files and deploy.

---

## Files

```
zestyop/
├── index.html          ← Waitlist page
├── style.css           ← All styles
├── script.js           ← Firebase logic (auth, firestore, referrals)
├── firebase-config.js  ← Instructions for adding your Firebase keys
└── README.md
```

---

## Step 1 — Add Your Firebase Keys

Open `script.js` and find the `firebaseConfig` object at the top of the file.
Replace each placeholder with your real values:

```js
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_AUTH_DOMAIN",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID",
};
```

Find your values at:
**Firebase Console → Project Settings → Your Apps → SDK setup and config**

---

## Step 2 — Firebase Setup

### Enable Authentication
Firebase Console → Authentication → Sign-in method → Enable:
- **Anonymous** (used by waitlist visitors)
- **Email/Password** (used by you to access /admin)

### Create Your Admin Account
Firebase Console → Authentication → Users → Add user
This is the login you'll use at `/admin.html`

### Create Firestore Database
Firebase Console → Firestore Database → Create database → Production mode

### Set Firestore Security Rules
Firebase Console → Firestore → Rules → paste this:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /waitlist/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == uid;
    }
    match /referralCodes/{code} {
      allow read, write: if request.auth != null;
    }
    match /meta/stats {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

---

## Step 3 — Deploy to Vercel

1. Push your files to a GitHub repo
2. Go to https://vercel.com → New Project → Import repo
3. Vercel will detect it as a static site automatically
4. Hit Deploy — done!

Your site will be live at `https://your-app.vercel.app`

---

## How It Works

| Feature | How |
|---|---|
| Waitlist signup | Anonymous Firebase Auth + Firestore |
| Live counter | `meta/stats` document, atomically incremented |
| Referral links | `?ref=CODE` in URL, tracked in `referralCodes` collection |
| Referral reward | Each referral moves the referrer up 10 spots |
| Share on X | Pre-filled tweet with referral link |

## Firestore Structure

```
waitlist/{uid}
  email, twitter, referralCode,
  position, referrals, referredBy,
  uid, createdAt

referralCodes/{code}
  uid

meta/stats
  count
```
