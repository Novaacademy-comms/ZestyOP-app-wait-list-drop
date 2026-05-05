// ─────────────────────────────────────────────────────────────────────────────
// FIREBASE CONFIGURATION — ZestyOP
// ─────────────────────────────────────────────────────────────────────────────
//
// HOW TO GET YOUR KEYS:
// 1. Go to https://console.firebase.google.com
// 2. Open your project
// 3. Click the gear icon ⚙ → Project Settings
// 4. Scroll down to "Your apps" → click your web app (or create one)
// 5. Under "SDK setup and configuration" copy the values below
//
// WHERE TO PASTE THEM:
// Open script.js and find the firebaseConfig object at the top.
// Replace each "YOUR_..." placeholder with your real value.
//
// ─────────────────────────────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey:            "AIzaSyDzkCVvQqB1T_nM4ZuxHGgToxB2zH71QsI",
  authDomain:        "zestyop-f2133.firebaseapp.com",
  projectId:         "zestyop-f2133",
  storageBucket:     "zestyop-f2133.firebasestorage.app",
  messagingSenderId: "382463023165",
  appId:             "1:382463023165:web:b6e9c4137f08d14cd53254",
};

// ─────────────────────────────────────────────────────────────────────────────
// FIREBASE SERVICES TO ENABLE:
// ─────────────────────────────────────────────────────────────────────────────
//
// 1. AUTHENTICATION
//    Firebase Console → Authentication → Sign-in method
//    Enable: Anonymous  ← for waitlist users
//    Enable: Email/Password ← for admin login (/admin)
//
// 2. FIRESTORE DATABASE
//    Firebase Console → Firestore Database → Create database
//    Start in production mode
//
// 3. FIRESTORE RULES
//    Firebase Console → Firestore → Rules
//    Paste this:
//
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     match /waitlist/{uid} {
//       allow read: if request.auth != null;
//       allow write: if request.auth != null && request.auth.uid == uid;
//     }
//     match /referralCodes/{code} {
//       allow read, write: if request.auth != null;
//     }
//     match /meta/stats {
//       allow read: if true;
//       allow write: if request.auth != null;
//     }
//   }
// }
//
// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ACCOUNT
// ─────────────────────────────────────────────────────────────────────────────
//
// Create your admin login at:
// Firebase Console → Authentication → Users → Add user
// Use any email + password. You'll use these to sign in at /admin.html
//
// ─────────────────────────────────────────────────────────────────────────────
