# Paid Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the organizer mark each participant as paid via a People-tab checkbox; paid people show a light-green name card in both the People list and the Groups page, with a live "X of Y paid" tally.

**Architecture:** `paid` is a boolean on each participant object, so it rides the existing synced `participants` collection — **no `store.js` change**. `participants.js` renders the checkbox + tally and toggles `paid`; `groups.js` adds a `paid` class to each member card; `styles.css` paints `.paid` rows light green. Both tabs already subscribe to `participants`, so a toggle re-renders everywhere.

**Tech Stack:** Vanilla JS (IIFE modules on `window`), no build step, no framework. Firebase Realtime Database (compat SDK from CDN) or `localStorage` via `Store`.

**Spec:** `docs/superpowers/specs/2026-06-07-paid-tracker-design.md`

---

## Verification approach

This project has **no test tooling** (static, no build) — per the spec, verification is **manual in-browser** plus the in-memory-Store harness used for the previous feature. Each task ends with explicit checks in place of automated tests.

**Harness verification (zero Firebase writes — preferred during development):**
Create a temporary `public/__harness__.html` that stubs `window.Store` in-memory, loads the real module(s) via `<script src>`, and is driven with the chrome-devtools MCP. Serve with `cd public && python3 -m http.server 8765 --bind 127.0.0.1`. Delete the harness and confirm `git status` is clean before finishing. (Do **not** kill the server with `pkill -f "http.server 8765"` — that pattern self-matches the killing shell; kill the background job instead.)

**Live-app manual check (optional):** `cd public && python3 -m http.server 8000`, open `http://localhost:8000`. The app is in cloud mode, so it writes to the shared `bbq-halaqa-trip2` room. To avoid touching the real plan, temporarily set `window.BBQ_ROOM = "dev-paid-test"` in `public/firebase-config.js` and revert it before finishing (confirm with `git status --short`).

---

## File structure

| File | Responsibility | Change |
|---|---|---|
| `public/js/participants.js` | People tab UI + logic | Checkbox per row, `setPaid()`, `paid` class, paid tally |
| `public/index.html` | Markup | Add `paid-count` span to the counter line |
| `public/js/groups.js` | Groups tab UI | Add `paid` class to each member `<li>` |
| `public/styles.css` | Styling | `.paid` card color + `.paid-toggle` checkbox styles |

`public/js/store.js` is intentionally **not** touched — `paid` is part of the `participants` collection that already syncs.

---

## Task 1: People tab — paid checkbox, tally, and toggle

**Files:**
- Modify: `public/index.html:43` (counter line)
- Modify: `public/js/participants.js` (replace entire file)

- [ ] **Step 1: Add the paid tally to the counter line**

In `public/index.html`, change line 43 from:

```html
      <p class="counter"><strong id="participant-count">0</strong> people joining</p>
```

to:

```html
      <p class="counter"><strong id="participant-count">0</strong> people joining · <strong id="paid-count">0</strong> paid</p>
```

- [ ] **Step 2: Replace the entire contents of `public/js/participants.js` with:**

```js
/* Participants tab: add/remove the people joining the trip; mark who has paid. */
window.Participants = (function () {
  let current = [];

  function init() {
    const form = document.getElementById("participant-form");
    const nameInput = document.getElementById("participant-name");
    const bulkAdd = document.getElementById("bulk-add");
    const bulkText = document.getElementById("bulk-names");

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      add([nameInput.value]);
      nameInput.value = "";
      nameInput.focus();
    });

    bulkAdd.addEventListener("click", () => {
      add(bulkText.value.split("\n"));
      bulkText.value = "";
    });

    Store.subscribe("participants", render);
  }

  function add(names) {
    const clean = names.map((n) => n.trim()).filter(Boolean);
    if (!clean.length) return;
    Store.update("participants", (list) => {
      clean.forEach((name) => list.push({ id: uid(), name }));
      return list;
    });
  }

  function remove(id) {
    Store.update("participants", (list) => list.filter((p) => p.id !== id));
  }

  // Toggle a participant's paid flag. Set true when checked; delete the key when
  // unchecked so an unpaid person is just { id, name }.
  function setPaid(id, isPaid) {
    Store.update("participants", (list) => {
      const p = list.find((x) => x.id === id);
      if (p) { if (isPaid) p.paid = true; else delete p.paid; }
      return list;
    });
  }

  function render(list) {
    current = list || [];
    document.getElementById("participant-count").textContent = current.length;
    document.getElementById("paid-count").textContent = current.filter((p) => p.paid).length;

    const ul = document.getElementById("participant-list");
    ul.innerHTML = "";
    if (!current.length) {
      ul.innerHTML = '<li class="empty-state">No one added yet.</li>';
      return;
    }

    current.forEach((p) => {
      const li = document.createElement("li");
      if (p.paid) li.classList.add("paid");

      // Checkbox + name grouped on the left; remove button stays on the right.
      const label = document.createElement("label");
      label.className = "paid-toggle";
      label.title = "Mark paid";

      const box = document.createElement("input");
      box.type = "checkbox";
      box.checked = !!p.paid;
      box.addEventListener("change", () => setPaid(p.id, box.checked));

      const span = document.createElement("span");
      span.textContent = p.name;
      label.append(box, span);

      const btn = document.createElement("button");
      btn.className = "remove";
      btn.title = "Remove";
      btn.textContent = "✕";
      btn.addEventListener("click", () => remove(p.id));

      li.append(label, btn);
      ul.appendChild(li);
    });
  }

  function getAll() { return current; }

  return { init, getAll };
})();
```

- [ ] **Step 3: Static check**

Run: `node --check public/js/participants.js`
Expected: clean exit, no output.

Confirm the module still returns the same public interface — the last `return` is `return { init, getAll };` (so `app.js`'s existing `Participants.init()` still works).

- [ ] **Step 4: Manual verification (browser)**

Serve and open the People tab (use the harness or live-app setup from "Verification approach"). With a few people added:
- Each row has a checkbox to the left of the name; the `✕` button stays on the right.
- The counter reads e.g. "7 people joining · 0 paid".
- Check one box → in the console `Store.get("participants")` shows `paid: true` on that person; the counter becomes "… · 1 paid"; that `<li>` has the `paid` class (`document.querySelector("#participant-list li.paid")` is non-null).
- Uncheck it → `paid` key is gone from that object; counter back to "0 paid"; the `<li>` no longer has the `paid` class.

Expected: toggling flips `paid`, the tally, and the row class; no console errors. (The green color comes in Task 3.)

- [ ] **Step 5: Commit**

```bash
git add public/js/participants.js public/index.html
git commit -m "$(cat <<'EOF'
Add paid checkbox and tally to the People tab

Each participant gets a paid checkbox; toggling sets/removes a `paid`
boolean on the participant (rides the existing participants collection).
A live "X of Y paid" tally shows in the counter line. Paid rows get a
`paid` class (styled in a later commit).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Groups page — green card for paid members

**Files:**
- Modify: `public/js/groups.js` (one-line insertion inside `card()`)

- [ ] **Step 1: Add the `paid` class to each member `<li>`**

In `public/js/groups.js`, inside the `members.forEach` loop of `card()`, change:

```js
      const li = document.createElement("li");
      const name = document.createElement("span");
```

to:

```js
      const li = document.createElement("li");
      if (p.paid) li.classList.add("paid");
      const name = document.createElement("span");
```

(This is the only change to the file. Do not modify anything else.)

- [ ] **Step 2: Static check**

Run: `node --check public/js/groups.js`
Expected: clean exit, no output.

- [ ] **Step 3: Manual verification (browser)**

On the Groups tab, with people split into groups and at least one person marked paid on the People tab:
- The paid person's member `<li>` in their group card has the `paid` class
  (`document.querySelector("#groups-grid li.paid")` is non-null).
- No checkbox is rendered on the Groups page (only on People).
- Marking someone paid/unpaid on the People tab updates the Groups card class without a manual refresh (both tabs subscribe to `participants`).

Expected: paid status reflects on group member cards; no checkbox there; no console errors. (Green color comes in Task 3.)

- [ ] **Step 4: Commit**

```bash
git add public/js/groups.js
git commit -m "$(cat <<'EOF'
Reflect paid status on Groups page member cards

Each group member <li> gets the `paid` class when that participant is
paid, so paid people show the same green card on the Groups tab. No
checkbox here — paid is toggled only on the People tab.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Style the paid cards and checkbox

**Files:**
- Modify: `public/styles.css` (append at end of file)

- [ ] **Step 1: Append these rules** to the END of `public/styles.css`:

```css

/* Paid participants: light-green card in both the People list and group cards */
.list li.paid, .group-card li.paid { background: #e6f7e9; border-color: #b7e4c7; }
.paid-toggle { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.paid-toggle input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; }
```

- [ ] **Step 2: Verify additive + balanced**

Run: `git -C /home/aba/Codex/ABD diff -- public/styles.css`
Expected: a purely additive diff (only `+` lines), matching the four lines above.

Run: `node -e "const c=require('fs').readFileSync('public/styles.css','utf8');const o=(c.match(/{/g)||[]).length,cl=(c.match(/}/g)||[]).length;if(o!==cl)throw new Error('unbalanced '+o+' vs '+cl);console.log('braces balanced',o);"`
Expected: prints "braces balanced N".

- [ ] **Step 3: Manual verification (browser)**

Reload:
- People tab: a paid (checked) row is light green with a soft green border; the checkbox is ~18px and clickable; unpaid rows stay white.
- Groups tab: a paid member's card is light green too.
- Clicking the name (inside the label) toggles the checkbox (native label behavior).

Expected: green renders in both views; layout intact (checkbox+name left, `✕` right); nothing overflows.

- [ ] **Step 4: Commit**

```bash
git add public/styles.css
git commit -m "$(cat <<'EOF'
Style paid participant cards and the paid checkbox

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Full manual verification pass

**Files:** none (acceptance testing)

- [ ] **Step 1: Run the full acceptance checklist**

With the server running and a handful of people added, verify each spec behavior:

1. **Checkbox present:** each People row has a checkbox left of the name; tally reads "N people joining · 0 paid".
2. **Mark paid:** check a box → row turns light green; tally increments; `Store.get("participants")` shows `paid: true`.
3. **Unmark:** uncheck → row white again; tally decrements; the `paid` key is gone from that object.
4. **Persists:** reload → paid people are still checked/green (it's part of `participants`).
5. **Groups reflect:** split into groups → a paid person's member card is light green on the Groups tab; no checkbox there.
6. **Survives regrouping:** Reshuffle, reassign via dropdown, and Clear+Split → paid (green) status is preserved for those people.
7. **New person unpaid:** add a new person (single and bulk) → defaults to unchecked/white; tally unchanged.
8. **Injection-safe:** add a person named `<b>x</b>` → renders as literal text, and paid toggling still works on them.

Expected: every item passes.

- [ ] **Step 2: Cross-device/tab sync check**

- *Cloud mode:* open the site in two browsers/devices on the same room; mark someone paid in one → it appears (green + checked + tally) in the other within a moment, on both the People and Groups tabs.
- *(Local mode equivalent:* two tabs; a toggle in one reflects in the other on focus/refresh.)*

Expected: the paid status propagates.

- [ ] **Step 3: Confirm no stray test changes**

If you created a harness or changed the test room, remove/revert them:

```bash
git status --short
```

Expected: only the intended files were committed; `firebase-config.js` is **not** modified; no `__harness__.html` left behind.

- [ ] **Step 4: Deploy (optional)**

Once verified, the feature can ship with:

```bash
firebase deploy --only hosting
```

(Pushing to git / deploying may require your direct authorization, as before.)
