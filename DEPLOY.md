# Deploying the BBQ Trip Planner to Firebase (free tier)

This guide walks you through hosting the site on Firebase's free **Spark**
plan and (optionally) turning on shared cloud storage so every planner sees
the same live plan. No paid plan is required.

---

## What you'll end up with

- A public URL like `https://your-project.web.app` serving the site.
- (Optional) A **Realtime Database** so the participant list, groups, program,
  map drawings, and shopping list are shared across everyone's devices.

If you skip the database steps, the site still works perfectly — it just saves
data in each person's own browser (`localStorage`).

---

## Step 0 — Prerequisites (one time)

1. A Google account.
2. **Node.js** installed (https://nodejs.org). Check with:
   ```bash
   node --version
   ```
3. Install the Firebase CLI globally:
   ```bash
   npm install -g firebase-tools
   ```
4. Log in (opens a browser):
   ```bash
   firebase login
   ```

---

## Step 1 — Create a Firebase project

1. Go to <https://console.firebase.google.com>.
2. Click **Add project**, give it a name (e.g. `bbq-trip`), and finish the
   wizard. You can disable Google Analytics — it's not needed.
3. Note your **Project ID** (shown under the project name, e.g.
   `bbq-trip-1a2b3`). You'll use it twice below.

> The default **Spark (free) plan** covers Hosting and Realtime Database for a
> small group like this. You do **not** need to add a billing account.

---

## Step 2 — Point the repo at your project

Edit **`.firebaserc`** in the repo root and replace `YOUR_PROJECT` with your
Project ID:

```json
{
  "projects": {
    "default": "bbq-trip-1a2b3"
  }
}
```

---

## Step 3 (optional but recommended) — Enable shared cloud storage

Skip this if you're happy with per-browser local storage.

### 3a. Create the Realtime Database

1. In the Firebase console: **Build → Realtime Database → Create Database**.
2. Pick a location close to you.
3. Start in **Test mode** (open read/write) for now. This matches the rules in
   `database.rules.json`. You can lock it down later (see "Securing" below).

### 3b. Register a Web App and copy its config

1. In the console, click the **gear ⚙️ → Project settings**.
2. Scroll to **Your apps**, click the **Web** icon (`</>`), and register an app
   (any nickname; you do **not** need Firebase Hosting checkbox here).
3. Firebase shows a `firebaseConfig` object. Copy those values into
   **`public/firebase-config.js`**, replacing the placeholders:

   ```js
   window.FIREBASE_CONFIG = {
     apiKey: "AIza...",
     authDomain: "bbq-trip-1a2b3.firebaseapp.com",
     databaseURL: "https://bbq-trip-1a2b3-default-rtdb.firebaseio.com",
     projectId: "bbq-trip-1a2b3",
     storageBucket: "bbq-trip-1a2b3.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abc123"
   };

   window.BBQ_ROOM = "summer-bbq-2026"; // any label; share it to share a plan
   ```

   > Make sure `databaseURL` is present — that's the value the app uses for the
   > Realtime Database. If the console didn't show it, copy it from the
   > Realtime Database page (it's the URL at the top, ending in
   > `.firebaseio.com`).

These web config values are **not secrets** — they're meant to ship in the
browser. Access is controlled by the database rules, not by hiding the keys.

---

## Step 4 — Deploy

From the repo root:

```bash
# Deploy hosting only (if you skipped the database):
firebase deploy --only hosting

# Or deploy hosting + database rules (if you did Step 3):
firebase deploy --only hosting,database
```

When it finishes, the CLI prints your **Hosting URL**
(`https://<project-id>.web.app`). Open it and share it with the group.

> `firebase.json` is already configured to serve the `public/` folder and to
> apply `database.rules.json`, so no extra setup is needed.

---

## Updating the site later

Make your changes, then run `firebase deploy` again. Each deploy is versioned,
and you can roll back from **Hosting → Release history** in the console.

---

## Securing the database before sharing widely

`database.rules.json` ships **open** (anyone with the URL can read/write):

```json
{ "rules": { ".read": true, ".write": true } }
```

That's fine for a private, short-lived plan. If you'll post the link publicly
or want it to last, tighten it:

1. In the console: **Build → Authentication → Get started**, and enable a
   sign-in method (e.g. Google or Anonymous).
2. Change `database.rules.json` to require auth:
   ```json
   { "rules": { ".read": "auth != null", ".write": "auth != null" } }
   ```
3. Redeploy: `firebase deploy --only database`.

(The current app doesn't include a sign-in UI; adding one is a small follow-up
if you decide to go this route — ask and it can be wired in.)

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Header still says "Saved on this device" after Step 3 | Double-check `public/firebase-config.js` has real values (no `YOUR_...` placeholders) and a valid `databaseURL`, then redeploy. |
| `firebase deploy` says *"No currently active project"* | Set the Project ID in `.firebaserc`, or run `firebase use <project-id>`. |
| `Permission denied` writing data | The database rules are too strict, or you enabled Auth without signing in. For planning, Test-mode/open rules are fine. |
| Changes don't show up | Hard-refresh the browser (Ctrl/Cmd+Shift+R) — Hosting caches assets. |
