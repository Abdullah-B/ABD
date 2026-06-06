# 🔥 BBQ Trip Planner

A small static website for planning a group barbecue trip. Built with plain
HTML/CSS/JS — no build step — so it deploys cleanly to **Firebase Hosting**
(free tier). It works locally with zero configuration and can sync across
devices once Firebase is wired up.

## Features

- **👥 People** — add participants one at a time or paste a whole list.
- **🧩 Groups** — split everyone into groups (default size 5), shuffle, and
  reassign individuals between groups.
- **🗓️ Program** — schedule activities with a start time and duration; the end
  time is computed automatically. Add and remove items freely.
- **🗺️ Area Map** — upload a photo of the barbecue spot and draw/label the
  areas where each group should be (rectangle or freehand, with a color
  legend).
- **🛒 Shopping** — buyers add items (with who's in charge, quantity, cost);
  the leader checks them off and sees totals for spent / estimated / left.

## Data storage

The app uses a single data layer (`public/js/store.js`) with two backends:

- **Local (default):** everything is saved to the browser's `localStorage`.
  No setup needed — just open the site.
- **Cloud (shared):** if you fill in `public/firebase-config.js`, data is read
  from and written to a **Firebase Realtime Database** (a small JSON document),
  so every planner sees the same live plan.

The header shows which mode is active ("Saved on this device" vs.
"Synced via Firebase").

## Run locally

Just open `public/index.html` in a browser, or serve the folder:

```bash
cd public && python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploy to Firebase (free tier)

See **[DEPLOY.md](DEPLOY.md)** for the full step-by-step guide. In short:

1. Create a project at <https://console.firebase.google.com>.
2. Enable **Build → Realtime Database** (start in test mode while planning).
3. Copy your web app config into `public/firebase-config.js`, and set the
   project id in `.firebaserc`.
4. Install the CLI and deploy:

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase deploy
   ```

`firebase.json` serves the `public/` folder and applies the database rules in
`database.rules.json`.

> **Note on security:** `database.rules.json` ships with open read/write rules,
> which is fine for a private, short-lived planning session. Before sharing the
> URL widely, add Firebase Authentication and lock the rules down.
