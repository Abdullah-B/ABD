/*
 * Firebase configuration.
 *
 * The app works out of the box using your browser's localStorage — no setup
 * required. To share the plan across devices/people, paste your Firebase
 * Realtime Database config below.
 *
 * How to get these values (free tier):
 *   1. Go to https://console.firebase.google.com and create a project.
 *   2. Build > Realtime Database > Create Database (start in test mode while planning).
 *   3. Project settings > General > "Your apps" > Web app > copy the config object.
 *   4. Paste the values below and redeploy.
 *
 * Leave the placeholders as-is to keep using local-only storage.
 */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCydrNF67k0heovgQuXv0O79iFhxxTPkB8",
  authDomain: "bbq-halaqa.firebaseapp.com",
  databaseURL: "https://bbq-halaqa-default-rtdb.firebaseio.com",
  projectId: "bbq-halaqa",
  storageBucket: "bbq-halaqa.firebasestorage.app",
  messagingSenderId: "950023637327",
  appId: "1:950023637327:web:3eec8492e6d5ea87879d3a"
};

// A shared "room" key so multiple people see the same plan. Change it to
// start a fresh, separate plan (e.g. "summer-bbq-2026").
window.BBQ_ROOM = "bbq-halaqa-trip2";
