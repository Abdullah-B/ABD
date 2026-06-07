# Participant Edit + Print Roster — Design Spec

**Date:** 2026-06-07
**Status:** Approved (pending spec review)
**Component:** People tab — `public/js/participants.js`, `public/index.html`, `public/styles.css`

## Context

The People tab (`participants.js`) renders each person as a `.list li` =
`<label class="paid-toggle">` (a checkbox + the name `<span>`) followed by a
`.remove` `✕` button. Names live as `{ id, name, paid? }` objects in the synced
`participants` collection. Two gaps: you can't rename someone (only delete +
re-add), and there's no clean way to print the roster with paid status.

This spec adds two small, independent features, both confined to the People tab.

## Goals

- **Edit name:** rename an existing participant inline, without deleting and
  re-adding.
- **Print roster:** a one-click clean printout of the participant list showing
  each name and whether they have paid.

## Non-goals

- No editing of names on the Groups page (names there are derived; edit on People
  only — like the paid checkbox).
- No CSV/PDF export, no print of groups/program/shopping (just the participant
  roster). YAGNI.
- No `store.js` change — names already ride the `participants` collection.
- No automated test harness (vanilla app; verification is manual + browser harness).

## Feature 1 — Inline name edit

### UX
- Each real participant row gains a pencil `✎` button (`.icon-btn`,
  `title="Rename"`). It sits **outside** the `.paid-toggle` label (a sibling), so
  clicking it does not toggle the paid checkbox. `✎` and the `✕` remove button are
  grouped in a `.row-actions` wrapper on the right: `[checkbox name] … [✎][✕]`.
- Click `✎` → the row's content is replaced by an inline editor: a text
  `<input class="rename-input" maxlength="40">` prefilled with the name and
  selected, plus `✓` (save) and `✕` (cancel) `.icon-btn`s. (Reuses the
  Groups-rename editor mechanics and styles.)
- **Commit:** Enter or `✓`. **Cancel:** Esc, `✕`, or blur. Only one editor open at
  a time (a re-render closes any open editor). A `done` guard prevents the
  blur-after-commit from double-firing.

### Logic
- `updateName(id, newName)`: `const name = newName.trim()`. If `name` is non-empty
  **and** differs from the current name → `Store.update("participants", ...)` set
  that participant's `name = name`. Otherwise (blank or unchanged) do nothing
  (blank names are rejected; names stay required).
- Commit handler: if the trimmed value is a valid change, call `updateName()` (the
  subscription re-renders); otherwise call `render(current)` to restore the row.
- Cancel handler: call `render(current)` to restore the row (no Store write).
  - Note: `render(list)` sets `current = list || []`, so the editor must call
    `render(current)` (the cached list), **not** `render()` with no argument
    (which would blank the list).

### Edit data flow
`updateName` only sets `p.name`; `id` and `paid` are untouched, so a rename
preserves paid status and group membership.

## Feature 2 — Print roster

### UX
- A `🖨️ Print list` button (`#print-participants`, `class="secondary"`) on the
  People tab, placed right after the counter line. Clicking it calls
  `window.print()`.

### Print stylesheet (`@media print`)
- **Hide:** `.app-header`, `.tabs`, `.hint`, `#participant-form`, `.bulk`,
  `#print-participants`, and `.panel:not(.active)` (the other tabs). Within each
  row, hide the checkbox (`.paid-toggle input[type="checkbox"]`) and the
  `.row-actions` (✎/✕).
- **Keep:** the `Participants` heading, the `N people joining · M paid` counter,
  and the name list.
- **Paid status as text** (printed reliably regardless of the browser's
  "background graphics" setting), via CSS so no JS/markup change is needed:
  - `.list li.paid .paid-toggle span::after { content: " — Paid"; }`
  - `.list li:not(.paid) .paid-toggle span::after { content: " — Not paid"; }`
- **Plain styling:** strip card background/shadow/border-radius from `.list li`
  for a clean printed roster; a light bottom rule between rows;
  `page-break-inside: avoid` per row. Reset `main` padding/max-width.

The Print button lives only on the People tab, so that panel is the active one
when printing; `.panel:not(.active)` hides the rest.

## Styling summary (`styles.css`)
- `.row-actions { display: flex; align-items: center; gap: 4px; }` (screen).
- An `@media print { … }` block with the hide/keep/paid-text/plain-list rules
  above.
- Reuses existing `.icon-btn` (pencil/save/cancel) and `.rename-input` (editor
  input) — no new rules needed for the editor itself.

## Security / safety

Names are rendered with `textContent` and edited via `input.value` — never
`innerHTML` for user data — so a name like `<b>x</b>` stays literal in the list,
the editor, and the printout. `maxlength="40"` plus a trim bound the input.

## Edge cases

- **Blank / whitespace-only name on commit:** rejected — the row reverts to the
  existing name (no Store write).
- **Unchanged name on commit:** no-op revert.
- **Cancel paths (Esc / ✕ / blur):** restore the row, no change.
- **Rename preserves paid + group:** only `name` changes.
- **Print with an open editor:** unlikely (printing is a separate button), but the
  `@media print` rules target normal rows; worst case an open editor row prints
  its input — harmless.
- **Empty list:** print shows the heading + "0 people joining · 0 paid" and the
  existing empty-state line.

## Files touched

- `public/js/participants.js` — `updateName()`, per-row `✎` + `.row-actions`
  wrapper, `openEditor(li, p)`, and wire `#print-participants` to `window.print()`.
- `public/index.html` — add the `🖨️ Print list` button after the counter line.
- `public/styles.css` — `.row-actions` rule + the `@media print` block.
- `public/js/store.js` — **no change**.

## Testing / verification

No build/test tooling. Verify manually and via the in-memory-Store +
chrome-devtools harness (load real `participants.js`, stub `window.Store`, drive
with evaluate_script — zero Firebase writes):

1. Each row shows `✎` next to `✕`; the name still toggles paid when clicked
   (checkbox), and `✎` does **not** toggle paid.
2. Click `✎` → inline editor with the name prefilled/selected. Enter/✓ commits a
   new name; the list updates and paid/group are unchanged.
3. Blank or unchanged + commit → reverts to the old name (no change).
4. Esc / ✕ / blur → cancels, row restored.
5. A name typed as `<b>x</b>` renders literally in the list, editor, and print.
6. Click `🖨️ Print list` → using print-media emulation, only the heading +
   counter + roster show; checkboxes/buttons/tabs/forms hidden; each row reads
   "Name — Paid" or "Name — Not paid".
7. Rename then reload → the new name persists (it's part of `participants`).
