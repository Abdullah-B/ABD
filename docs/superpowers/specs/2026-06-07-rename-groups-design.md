# Rename Groups — Design Spec

**Date:** 2026-06-07
**Status:** Approved (pending spec review)
**Component:** Groups tab — `public/js/groups.js`, `public/js/store.js`, `public/index.html`, `public/styles.css`

## Context

The Groups tab splits participants into numbered groups. Groups are **not**
first-class objects: each participant carries a numeric `group` field, and the
group's title is derived at render time as `"Group " + n` (`groups.js`). No
group metadata is persisted. Users want to give groups custom names (e.g.
"Grill Crew").

## Goals

- Let users rename any group to a custom label.
- Names persist and sync across devices (cloud + local) like other data.
- Names survive a **Shuffle** (re-organizing membership) but reset on a fresh **Split**.
- Make **Split** the single "create groups" action; **Shuffle** only
  re-randomizes already-created groups.

## Non-goals

- No first-class group entities / stable IDs / per-group delete or reorder.
- No renaming the "Unassigned" pseudo-group.
- No changes to the People / Program / Shopping / Map tabs.
- No automated test harness (the app is vanilla, no build/test tooling today).

## Approach

Add a small synced `groupNames` map keyed by group number and render
`groupNames[n] || "Group " + n`. It rides the existing Store layer, so it syncs
across devices for free and is a minimal change.

*Rejected alternative:* make groups first-class objects with stable IDs
(participants reference `groupId`). More robust, but it would touch
split/shuffle/reassign/render plus a data migration — overkill for "rename"
(YAGNI).

## Data model

- Add `"groupNames"` to `COLLECTIONS` and to `DEFAULTS` (`groupNames: {}`) in
  `store.js`.
- Shape: `{ "g1": "Grill Crew", "g2": "Salad Squad" }` — key is `"g" +
  groupNumber`, value is the custom label. A missing key means the default
  `"Group n"`.
- **Firebase compatibility:** keys are prefixed with `g` so the Realtime
  Database never coerces the map into a JS array (which it does when keys are
  sequential integers like `1, 2, 3`). `displayName(n)` reads
  `groupNames["g" + n]`.
- Persists automatically via the existing backends: `${room}/groupNames` in the
  Realtime Database, `bbq:${room}:groupNames` in localStorage.

## Behavior — button states

`hasGroups` = at least one participant has a truthy `.group`. Enabled/disabled
state is recomputed in `render()` from `hasGroups`.

| Control | No groups yet | Groups exist |
|---|---|---|
| **Split** (`#split-btn`, accent) | **Enabled** — divide by size, in order; reset `groupNames` to `{}` | **Disabled** |
| **Shuffle** (`#shuffle-btn`) | **Disabled** | **Enabled** — keep the existing N group slots **and their names**; randomly redistribute all participants across slots `1..N` |
| **Clear** (`#clear-groups-btn`) | **Disabled** | **Enabled** — delete every `.group` and reset `groupNames` to `{}`; returns to the "No groups" state |
| **Group size** (`#group-size`) | **Enabled** | **Disabled** (no effect once groups exist) |

### Split (only when `!hasGroups`)
Existing ordered assignment by size is unchanged, **plus**: set `groupNames = {}`.
(Names reset on Split. Because Split only runs from a cleared state, names are
default anyway; this keeps the data tidy.)

### Shuffle (only when `hasGroups`)
- `N` = current number of groups = the maximum group number among participants.
- Shuffle participant order (Fisher–Yates, as today), then block-assign with
  `size = ceil(total / N)` so `group = floor(i / size) + 1`, which yields groups
  `1..N`, balanced, numbered identically to before.
- `groupNames` is left untouched — names stay attached to their slot numbers.

### Clear (only when `hasGroups`)
Delete `.group` from every participant **and** set `groupNames = {}`.

## Rename UX

- Each real group card's `<h3>` gets a trailing `.icon-btn` ✎ (`title="Rename
  group"`). The **Unassigned** card does not get one.
- Click ✎ → replace the heading with an inline editor: `<input type="text"
  maxlength="40">` prefilled with the current display name, plus ✓ (save) and
  ✕ (cancel) `.icon-btn`s.
- **Commit:** Enter or ✓. **Cancel:** Esc, ✕, or blur (clicking away). Only one
  editor open at a time (a re-render closes any open editor).
- On commit: `name = input.value.trim()`. If `name === ""` **or** `name ===
  "Group " + n` → delete `groupNames["g" + n]` (revert to default). Otherwise
  set `groupNames["g" + n] = name`. Persist via `Store.update("groupNames", ...)`.
- Validation: `maxlength="40"` on the input plus a trim; no other constraints.

## Rendering — names everywhere

- Helper `displayName(n) = groupNames["g" + n] || ("Group " + n)`.
- Card title: `` `${displayName(n)} (${count})` `` set via `textContent`.
- Move-to-group `<select>` options use `displayName(g)` for `g` in
  `1..maxGroup+1`. The existing "+1 new group" option shows its default name
  (no custom name exists yet).

## Sync

`Groups.init()` subscribes to `groupNames` in addition to `participants`,
caching both at module scope. `render()` reads both; either subscription firing
triggers a re-render. This gives live cross-device updates in cloud mode and
cross-tab updates in local mode.

## Security / safety

All names are rendered via `textContent` / `input.value`, never `innerHTML`, so
a name like `<img onerror=...>` renders as literal text (no injection). Numeric
keys are parsed/validated as integers when read.

## Edge cases

- **Empty slot after Shuffle:** if people were removed so `total < N`, a slot
  may end up with zero members. It simply won't render a card; its name remains
  in `groupNames` (harmless) and reappears if the slot is repopulated.
- **New group via dropdown:** moving someone to the "+1 new group" option still
  works; the new group shows a default name until renamed.
- **Blank / default-equal name:** reverts to `"Group n"` (key removed).

## Files touched

- `public/js/store.js` — add `groupNames` to `COLLECTIONS` and `DEFAULTS`.
- `public/js/groups.js` — subscribe to `groupNames`; `hasGroups`-based button
  states; rename editor; `displayName()` in title + dropdown; Shuffle preserves
  names; Split/Clear reset names.
- `public/index.html` — no change expected; the buttons already exist and
  `render()` sets their disabled state on the first paint (the `participants`
  subscription fires immediately after `Store.init()`).
- `public/styles.css` — minor styling for the inline rename editor if needed
  (reuse `.icon-btn`).

## Testing / verification

No build or test tooling exists (static vanilla JS). Verification is manual,
in-browser:

1. Before Split: Shuffle and Clear are disabled, Split + size enabled.
2. Split → groups appear with default names; Split + size disable, Shuffle +
   Clear enable.
3. Rename a group via ✎ → persists across reload; the name also shows in the
   move-to-group dropdown.
4. Shuffle → members redistribute, names stay put; Split stays disabled.
5. Clear → groups and names wiped; Split + size re-enable, Shuffle + Clear
   disable.
6. Blank name → reverts to "Group n".
7. Name containing HTML (e.g. `<b>x`) renders literally.
8. Cloud mode: rename on one device appears on another.
