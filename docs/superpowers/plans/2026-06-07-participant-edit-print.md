# Participant Edit + Print Roster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the organizer rename a participant inline (pencil ✎) instead of delete+re-add, and print a clean participant roster (name + Paid/Not paid) with one button.

**Architecture:** Both features live on the People tab. Editing reuses the Groups-rename inline-editor mechanics; printing is a button that calls `window.print()` plus an `@media print` stylesheet that hides the app chrome and renders paid status as text. Names already live in the synced `participants` collection — **no `store.js` change**.

**Tech Stack:** Vanilla JS (IIFE modules on `window`), no build step, no framework. Firebase Realtime Database (compat SDK) or `localStorage` via `Store`.

**Spec:** `docs/superpowers/specs/2026-06-07-participant-edit-print-design.md`

---

## Verification approach

No test tooling (static, no build). Verify **manually in-browser** and via the **in-memory-Store + chrome-devtools harness** used previously (temporary `public/__harness__.html` that stubs `window.Store`, loads the real `js/participants.js`, served with `cd public && python3 -m http.server 8765 --bind 127.0.0.1`, driven with chrome-devtools; delete the harness and confirm `git status` clean before finishing). Do **not** stop the server with `pkill -f "http.server 8765"` (it self-matches the killing shell) — kill the listener by port or the background job.

---

## File structure

| File | Responsibility | Change |
|---|---|---|
| `public/js/participants.js` | People tab UI + logic | Add `updateName` + per-row ✎ + `openEditor`; (Task 2) wire Print button |
| `public/index.html` | Markup | (Task 2) add the 🖨️ Print list button |
| `public/styles.css` | Styling | `.row-actions` (Task 1) + `@media print` block (Task 2) |

`public/js/store.js` is intentionally **not** touched.

---

## Task 1: Inline participant name edit

**Files:**
- Modify: `public/js/participants.js` (replace entire file)
- Modify: `public/styles.css` (append `.row-actions` rule)

- [ ] **Step 1: Replace the ENTIRE contents of `public/js/participants.js` with exactly this:**

```js
/* Participants tab: add/remove/rename people; mark who has paid; print roster. */
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

  function updateName(id, name) {
    Store.update("participants", (list) => {
      const p = list.find((x) => x.id === id);
      if (p) p.name = name;
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

      // Checkbox + name grouped on the left; action buttons on the right.
      const label = document.createElement("label");
      label.className = "paid-toggle";
      label.title = p.paid ? "Mark unpaid" : "Mark paid";

      const box = document.createElement("input");
      box.type = "checkbox";
      box.checked = !!p.paid;
      box.addEventListener("change", () => setPaid(p.id, box.checked));

      const span = document.createElement("span");
      span.textContent = p.name;
      label.append(box, span);

      const actions = document.createElement("span");
      actions.className = "row-actions";

      // Pencil sits OUTSIDE the label so clicking it doesn't toggle paid.
      const edit = document.createElement("button");
      edit.className = "icon-btn";
      edit.title = "Rename";
      edit.textContent = "✎";
      edit.addEventListener("click", () => openEditor(li, p));

      const btn = document.createElement("button");
      btn.className = "remove";
      btn.title = "Remove";
      btn.textContent = "✕";
      btn.addEventListener("click", () => remove(p.id));

      actions.append(edit, btn);
      li.append(label, actions);
      ul.appendChild(li);
    });
  }

  // Replace a participant row with an inline name editor.
  function openEditor(li, p) {
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 40;
    input.value = p.name;
    input.className = "rename-input";

    const save = document.createElement("button");
    save.className = "icon-btn"; save.title = "Save"; save.textContent = "✓";

    const cancel = document.createElement("button");
    cancel.className = "icon-btn"; cancel.title = "Cancel"; cancel.textContent = "✕";

    let done = false;
    function commit() {
      if (done) return; done = true;
      const name = input.value.trim();
      if (name && name !== p.name) updateName(p.id, name); // subscription re-renders
      else render(current);                                 // blank/unchanged: restore row
    }
    // render(current), NOT render(): render(list) sets current = list || [], so a
    // bare render() would blank the whole list.
    function abort() { if (done) return; done = true; render(current); }

    // mousedown + preventDefault keeps focus on the input so the click registers
    // (a plain click would blur the input first and trigger cancel).
    save.addEventListener("mousedown", (e) => { e.preventDefault(); commit(); });
    cancel.addEventListener("mousedown", (e) => { e.preventDefault(); abort(); });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); commit(); }
      else if (e.key === "Escape") { e.preventDefault(); abort(); }
    });
    input.addEventListener("blur", abort);

    li.innerHTML = "";
    li.append(input, save, cancel);
    input.focus();
    input.select();
  }

  function getAll() { return current; }

  return { init, getAll };
})();
```

- [ ] **Step 2: Append the `.row-actions` rule to the END of `public/styles.css`:**

```css

/* Participant row action buttons (rename + remove) grouped on the right */
.row-actions { display: flex; align-items: center; gap: 4px; }
```

- [ ] **Step 3: Static check**

Run: `node --check public/js/participants.js`
Expected: clean exit. Confirm the module still returns `{ init, getAll }`.

Run (brace balance for CSS):
`node -e "const c=require('fs').readFileSync('public/styles.css','utf8');const o=(c.match(/{/g)||[]).length,cl=(c.match(/}/g)||[]).length;if(o!==cl)throw new Error('unbalanced '+o+' vs '+cl);console.log('braces balanced',o);"`
Expected: prints "braces balanced N".

- [ ] **Step 4: Manual verification (browser)**

Serve and open the People tab (harness or live-app). With a few people added:
- Each row shows `✎` then `✕` on the right; clicking the name still toggles the paid checkbox; clicking `✎` does NOT toggle paid.
- Click `✎` → the row becomes an input (name prefilled + selected) with `✓`/`✕`.
- Type a new name + Enter (or `✓`) → the name updates in the list; `Store.get("participants")` shows the new `name`; that person's `paid` and `id` are unchanged.
- Open editor, clear the field, commit → reverts to the old name (no blank).
- Open editor, press Esc / click `✕` / click away (blur) → reverts, no change.

Expected: rename works; blank/unchanged/cancel all revert; no console errors.

- [ ] **Step 5: Commit**

```bash
git add public/js/participants.js public/styles.css
git commit -m "$(cat <<'EOF'
Add inline rename for participants

Each People row gets a pencil button (outside the paid-toggle label) that
opens an inline editor reusing the Groups-rename mechanics. updateName()
changes only the participant's name; blank/unchanged/cancel revert. Adds a
.row-actions wrapper to group the rename + remove buttons.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Print roster

**Files:**
- Modify: `public/index.html` (add the Print button after the counter line)
- Modify: `public/js/participants.js` (wire the button in `init()`)
- Modify: `public/styles.css` (append the `@media print` block)

- [ ] **Step 1: Add the Print button to `public/index.html`**

Change the counter line (currently):

```html
      <p class="counter"><strong id="participant-count">0</strong> people joining · <strong id="paid-count">0</strong> paid</p>
```

to (counter unchanged, button added right after it):

```html
      <p class="counter"><strong id="participant-count">0</strong> people joining · <strong id="paid-count">0</strong> paid</p>
      <button id="print-participants" class="secondary" type="button">🖨️ Print list</button>
```

- [ ] **Step 2: Wire the Print button in `participants.js` `init()`**

In `public/js/participants.js`, change:

```js
    bulkAdd.addEventListener("click", () => {
      add(bulkText.value.split("\n"));
      bulkText.value = "";
    });

    Store.subscribe("participants", render);
  }
```

to:

```js
    bulkAdd.addEventListener("click", () => {
      add(bulkText.value.split("\n"));
      bulkText.value = "";
    });

    document.getElementById("print-participants").addEventListener("click", () => window.print());

    Store.subscribe("participants", render);
  }
```

- [ ] **Step 3: Append the `@media print` block to the END of `public/styles.css`:**

```css

/* Print: a clean participant roster (name + paid status), no app chrome */
@media print {
  .app-header, .tabs, .hint, #participant-form, .bulk, #print-participants,
  .panel:not(.active) { display: none !important; }
  main { max-width: none; margin: 0; padding: 0; }
  .list li {
    box-shadow: none; border: none; border-bottom: 1px solid #ccc;
    border-radius: 0; background: none !important; padding: 6px 0;
    page-break-inside: avoid;
  }
  .list li .paid-toggle input[type="checkbox"], .list li .row-actions { display: none !important; }
  .list li.paid .paid-toggle span::after { content: " — Paid"; font-weight: 600; }
  .list li:not(.paid) .paid-toggle span::after { content: " — Not paid"; color: #555; }
}
```

- [ ] **Step 4: Static check**

Run: `node --check public/js/participants.js`
Expected: clean exit.

Run (brace balance):
`node -e "const c=require('fs').readFileSync('public/styles.css','utf8');const o=(c.match(/{/g)||[]).length,cl=(c.match(/}/g)||[]).length;if(o!==cl)throw new Error('unbalanced '+o+' vs '+cl);console.log('braces balanced',o);"`
Expected: prints "braces balanced N".

- [ ] **Step 5: Manual verification (browser)**

- The People tab shows a `🖨️ Print list` button below the counter.
- Use print preview (or DevTools "Emulate CSS media type: print"): only the
  **Participants** heading, the `N people joining · M paid` counter, and the names
  show. The header, tabs, add form, bulk box, the Print button, all checkboxes,
  and the ✎/✕ buttons are hidden.
- Each row reads `Name — Paid` (paid) or `Name — Not paid` (unpaid).

Expected: clean roster with text paid status; no interactive chrome.

- [ ] **Step 6: Commit**

```bash
git add public/index.html public/js/participants.js public/styles.css
git commit -m "$(cat <<'EOF'
Add printable participant roster

A "Print list" button calls window.print(); an @media print stylesheet hides
the app chrome and interactive controls and shows each person's name with a
text "— Paid" / "— Not paid" status (text, so it prints without relying on
background colors).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Full verification pass

**Files:** none (acceptance testing)

- [ ] **Step 1: Edit-flow acceptance (harness or live)**

With several people added (at least one paid):
1. `✎` is present per row and does not toggle paid; the name click still toggles paid.
2. `✎` → editor prefilled/selected; Enter commits a new name; list updates; the
   person's `paid` and `id` are unchanged (check `Store.get("participants")`).
3. `✓` button also commits (mousedown path).
4. Blank/whitespace commit → reverts to old name; unchanged commit → no change.
5. Esc, `✕`, and blur each cancel and restore the row.
6. A name typed as `<b>x</b>` renders as literal text in the list and editor
   (no `<b>` element).
7. Rename persists across reload (it's part of `participants`).

- [ ] **Step 2: Print acceptance**

Emulate print media (DevTools `Emulation.setEmulatedMedia` / "Rendering → Emulate
CSS media: print", or print preview). Confirm:
- Only the Participants heading + counter + name list are visible.
- Header, tabs, add form, bulk, Print button, checkboxes, and `.row-actions` are hidden.
- Each row shows `Name — Paid` or `Name — Not paid`.
- (Controller note: this can also be verified deterministically by inspecting the
  CSSOM — find the `@media print` rule in `document.styleSheets` and assert it
  contains the hide selectors and the `::after` paid-status content.)

- [ ] **Step 3: Confirm no stray test changes**

```bash
git status --short
```
Expected: no `__harness__.html` left behind; `firebase-config.js` not modified.

- [ ] **Step 4: Deploy (optional)**

```bash
firebase deploy --only hosting
```
(Pushing / deploying may require your direct authorization, as before.)
