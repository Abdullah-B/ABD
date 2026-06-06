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
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// A shared "room" key so multiple people see the same plan. Change it to
// start a fresh, separate plan (e.g. "summer-bbq-2026").
window.BBQ_ROOM = "default-trip";
