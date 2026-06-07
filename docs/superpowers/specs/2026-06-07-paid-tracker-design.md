# Paid Tracker — Design Spec

**Date:** 2026-06-07
**Status:** Approved (pending spec review)
**Component:** People tab — `public/js/participants.js`; Groups tab — `public/js/groups.js`; `public/index.html`; `public/styles.css`

## Context

Participants are stored as plain objects `{ id, name }` in the synced
`participants` collection (`participants.js`). The People tab lists each person
as a `.list li` card (`<span>name</span>` + a `✕` remove button). The Groups tab
(`groups.js`) lists each member inside a group card as a `.group-card li`
(`<span>name</span>` + a move-to-group `<select>`). The organizer wants to track
who has paid for the trip and who has not.

## Goals

- Mark each participant as paid / not paid via a checkbox on the People tab.
- Paid status is a boolean property on the participant; it persists and syncs
  across devices like all other data.
- A paid participant's name card shows light green in **both** the People list
  and the Groups page (at-a-glance status).
- Show a live "X of Y paid" tally on the People tab.

## Non-goals

- No checkbox on the Groups page — it reflects paid status as color only
  (read-only). The checkbox lives only on the People tab.
- No payment amounts, dates, methods, or history — just a boolean.
- No separate payments collection / no data migration.
- No changes to Program / Map / Shopping tabs.
- No automated test harness (the app is vanilla, no build/test tooling today).

## Approach

Add a `paid` boolean to each participant object. It rides the existing
`participants` collection, so it syncs across devices for free and requires **no
change to `store.js`**. Rendering reads `p.paid` and applies a shared `.paid` CSS
class to the participant's `<li>` in both views. This mirrors the existing
Shopping tab "purchased" checkbox pattern (`.data-table input[type="checkbox"]`,
`tr.done`).

*Rejected alternative:* a separate `payments` map keyed by participant id. Adds a
second collection and id-syncing for a single boolean — pointless indirection
(YAGNI).

## Data model

- Participant shape becomes `{ id, name, paid? }`. `paid === true` means paid;
  absent or falsy means not paid.
- On toggle: set `p.paid = true` when checked; **delete** `p.paid` when unchecked
  (keeps the stored object tidy; absent reads as unpaid).
- Persists automatically via the existing backends (`${room}/participants` in the
  Realtime Database, `bbq:${room}:participants` in localStorage).

## Behavior — People tab (`participants.js`)

- Each participant row gains a leading checkbox: `<input type="checkbox">`,
  `checked` when `p.paid` is truthy, with `title="Mark paid"`.
- Toggling the checkbox calls a `setPaid(id, isPaid)` helper that does
  `Store.update("participants", ...)`: find the participant; set `p.paid = true`
  if checked, else `delete p.paid`. The subscription re-renders (same flow as the
  existing remove button).
- Row layout (the `.list li` stays `display:flex; justify-content:space-between`):
  the checkbox and name are grouped on the left, the `✕` remove button stays on
  the right. To keep the flex spacing, wrap the checkbox + name in a left
  container (e.g. a `<label class="paid-toggle">` holding the checkbox and the
  name span) so `justify-content: space-between` still pushes `✕` to the right.
  Clicking the label (name or box) toggles paid.
- A paid row gets the `paid` class on its `<li>` → light-green card.
- **Counter:** the existing counter line gains a paid tally. `index.html`
  becomes `<p class="counter"><strong id="participant-count">0</strong> people
  joining · <strong id="paid-count">0</strong> paid</p>`; `render()` sets
  `paid-count` to the number of participants with truthy `paid`.

## Behavior — Groups page (`groups.js`)

- In `card()`, when building each member `<li>`, add the `paid` class if that
  participant's `paid` is truthy. No checkbox, no other change.
- Paid status is untouched by Split / Reshuffle / Clear / reassign — those only
  read/write the `group` field, never `paid`. A person stays paid regardless of
  group changes.

## Styling (`styles.css`)

```css
/* Paid participants: light-green card in both the People list and group cards */
.list li.paid, .group-card li.paid { background: #e6f7e9; border-color: #b7e4c7; }
.paid-toggle { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.paid-toggle input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; }
```

A soft mint-green on the cream background. The shade is easy to adjust later.

## Sync

`paid` lives on participant objects in the `participants` collection. Both
`participants.js` and `groups.js` already subscribe to `participants`, so a paid
toggle on one device re-renders both tabs everywhere (cloud mode) or across tabs
(local mode). No new subscription needed.

## Security / safety

Names continue to render via `textContent`; the checkbox is a real form control.
No `innerHTML` with user data. `paid` is coerced to a boolean on read/write.

## Edge cases

- **Unchecking** deletes the `paid` key (object stays `{ id, name }`), which
  reads as unpaid — identical to a never-paid person.
- **New people** (single add or bulk paste) default to unpaid (`paid` absent).
- **Remove** a person: unaffected; the row (and any group membership) disappears.
- **Empty list:** the paid tally reads `0` and the People list shows its existing
  empty state.
- **Group changes:** Split/Reshuffle/Clear/reassign never touch `paid`, so the
  green status is preserved through any regrouping.

## Files touched

- `public/js/participants.js` — checkbox per row + `setPaid()` + `paid` class +
  set the paid tally; group checkbox+name on the left of each `.list li`.
- `public/js/groups.js` — add the `paid` class to each member `<li>` in `card()`.
- `public/styles.css` — `.paid` card rule + `.paid-toggle` checkbox styling.
- `public/index.html` — add `· <strong id="paid-count">0</strong> paid` to the
  existing counter line.
- `public/js/store.js` — **no change** (`paid` rides the `participants` collection).

## Testing / verification

No build or test tooling exists (static vanilla JS). Verification is manual,
in-browser, and via the in-memory-Store harness technique used for the rename
feature (load real JS, stub `window.Store`, drive with chrome-devtools — zero
Firebase writes):

1. People tab: a checkbox sits left of each name; the tally reads "0 of N paid".
2. Check a box → that row turns light green; the tally increments; uncheck →
   reverts to white and the tally decrements.
3. The `paid` flag persists across reload (it is part of `participants`).
4. Groups tab: split into groups; a paid person's member card is light green
   there too; no checkbox appears on the Groups page.
5. Reshuffle / reassign / clear+split → paid (green) status is preserved.
6. Add a new person → defaults to unpaid (white, unchecked).
7. A name containing HTML still renders as literal text (injection-safe).
8. Cloud mode: toggling paid on one device updates both tabs on another.
