# Rename Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users give each group a custom name that persists and syncs, and rework the Split/Shuffle/Clear buttons so Split is the sole "create" action.

**Architecture:** Add one synced `groupNames` map to the existing Store layer, keyed by `"g" + groupNumber`. The Groups module renders `groupNames["g"+n] || "Group n"` in both the card title and the move-to-group dropdown, gates the buttons on whether groups exist, and provides an inline pencil-button rename editor. Shuffle preserves names; Split and Clear reset them.

**Tech Stack:** Vanilla JS (IIFE modules on `window`), no build step, no framework. Firebase Realtime Database (compat SDK from CDN) or `localStorage` via `Store`.

**Spec:** `docs/superpowers/specs/2026-06-07-rename-groups-design.md`

---

## Verification approach

This project has **no test tooling** (static, no build) — per the spec, verification is **manual in-browser**. Each task ends with explicit manual checks in place of automated tests.

**Verification setup (do this once):**

```bash
cd /home/aba/Codex/ABD/public && python3 -m http.server 8000
# then open http://localhost:8000 in a browser, Groups tab, with devtools console open
```

⚠️ **The app is now in cloud mode**, so testing writes to the shared `bbq-halaqa-trip2` room. To avoid touching the real plan while developing, temporarily change the room in `public/firebase-config.js`:

```js
window.BBQ_ROOM = "dev-rename-test"; // TEMP for testing — revert before final commit
```

Revert it to `"bbq-halaqa-trip2"` before the final task. (Alternatively, just use the **Clear** button to tidy up afterward.) Add a few people on the People tab before testing Groups.

---

## File structure

| File | Responsibility | Change |
|---|---|---|
| `public/js/store.js` | Data layer / sync | Add `groupNames` to `COLLECTIONS` + `DEFAULTS` |
| `public/js/groups.js` | Groups tab UI + logic | Full rewrite: names, button states, rename editor |
| `public/styles.css` | Styling | Add header/rename-input/disabled styles |

---

## Task 1: Add the `groupNames` collection to the Store

**Files:**
- Modify: `public/js/store.js:11` (COLLECTIONS) and `public/js/store.js:12-17` (DEFAULTS)

- [ ] **Step 1: Add `groupNames` to the collections list**

In `public/js/store.js`, change line 11 from:

```js
  const COLLECTIONS = ["participants", "program", "shopping", "map"];
```

to:

```js
  const COLLECTIONS = ["participants", "program", "shopping", "map", "groupNames"];
```

- [ ] **Step 2: Add the `groupNames` default**

Change the `DEFAULTS` block (lines 12-17) from:

```js
  const DEFAULTS = {
    participants: [],
    program: [],
    shopping: [],
    map: { image: null, shapes: [] }
  };
```

to:

```js
  const DEFAULTS = {
    participants: [],
    program: [],
    shopping: [],
    map: { image: null, shapes: [] },
    groupNames: {}
  };
```

- [ ] **Step 3: Manual verification**

Reload `http://localhost:8000`. In the devtools console:

```js
Store.get("groupNames")            // → {}
Store.set("groupNames", {g1: "Test"})
Store.get("groupNames")            // → {g1: "Test"}
```

Reload the page again → `Store.get("groupNames")` still returns `{g1: "Test"}` (it persisted). Then clean up: `Store.set("groupNames", {})`.

Expected: no console errors; the value round-trips and persists.

- [ ] **Step 4: Commit**

```bash
git add public/js/store.js
git commit -m "$(cat <<'EOF'
Add groupNames collection to the Store

Adds a synced map (cloud + local) that will hold custom group names.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Rewrite `groups.js` — names, button states, rename editor

**Files:**
- Modify: `public/js/groups.js` (replace entire file)

This task replaces the whole file. Key changes vs the original:
- subscribes to `groupNames`; adds `displayName(n)` used in titles and the dropdown;
- `split(shuffle)` is replaced by `doSplit()` (sole creator, resets names, guarded) and `doShuffle()` (keeps the same N groups + names, guarded);
- `clearGroups()` also wipes names;
- `setButtonStates()` (called first in `render()`) disables Split + size once groups exist and disables Shuffle + Clear until they do;
- `card()` gets a header row with a pencil ✎ button (not on "Unassigned"); `openEditor()` + `rename()` handle inline editing.

- [ ] **Step 1: Replace the entire contents of `public/js/groups.js` with:**

```js
/* Groups tab: split participants into groups (default size 5), rename, reassign. */
window.Groups = (function () {
  let participants = [];
  let groupNames = {};

  function init() {
    document.getElementById("split-btn").addEventListener("click", doSplit);
    document.getElementById("shuffle-btn").addEventListener("click", doShuffle);
    document.getElementById("clear-groups-btn").addEventListener("click", clearGroups);
    Store.subscribe("participants", (list) => { participants = list || []; render(); });
    Store.subscribe("groupNames", (names) => { groupNames = names || {}; render(); });
  }

  function groupSize() {
    return Math.max(1, parseInt(document.getElementById("group-size").value, 10) || 5);
  }

  function displayName(n) {
    return groupNames["g" + n] || ("Group " + n);
  }

  function maxGroupNumber() {
    return participants.reduce((m, p) => (p.group && p.group > m ? p.group : m), 0);
  }

  // Split is the only "create groups" action: it runs from a cleared state and
  // resets any custom names.
  function doSplit() {
    if (participants.some((p) => p.group)) return; // guard: groups already exist
    const size = groupSize();
    Store.update("participants", (list) => {
      list.forEach((p, i) => { p.group = Math.floor(i / size) + 1; });
      return list;
    });
    Store.set("groupNames", {}); // names reset on split
  }

  // Shuffle keeps the existing number of groups AND their names; it only
  // redistributes who is in each.
  function doShuffle() {
    const n = maxGroupNumber();
    if (n === 0) return; // guard: nothing to shuffle yet
    Store.update("participants", (list) => {
      const order = list.slice();
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      const size = Math.ceil(order.length / n);
      const idToGroup = {};
      order.forEach((p, i) => { idToGroup[p.id] = Math.floor(i / size) + 1; });
      list.forEach((p) => { p.group = idToGroup[p.id]; });
      return list;
    });
    // groupNames intentionally left untouched — names stay on their slots.
  }

  function clearGroups() {
    Store.update("participants", (list) => {
      list.forEach((p) => { delete p.group; });
      return list;
    });
    Store.set("groupNames", {}); // wipe names too
  }

  function reassign(id, group) {
    Store.update("participants", (list) => {
      const p = list.find((x) => x.id === id);
      if (p) { if (group) p.group = group; else delete p.group; }
      return list;
    });
  }

  function rename(n, value) {
    const name = (value || "").trim();
    Store.update("groupNames", (names) => {
      const next = names || {};
      if (!name || name === "Group " + n) delete next["g" + n];
      else next["g" + n] = name;
      return next;
    });
  }

  function setButtonStates() {
    const hasGroups = participants.some((p) => p.group);
    const hasPeople = participants.length > 0;
    document.getElementById("split-btn").disabled = hasGroups || !hasPeople;
    document.getElementById("group-size").disabled = hasGroups;
    document.getElementById("shuffle-btn").disabled = !hasGroups;
    document.getElementById("clear-groups-btn").disabled = !hasGroups;
  }

  function render() {
    setButtonStates();

    const grid = document.getElementById("groups-grid");
    grid.innerHTML = "";

    if (!participants.length) {
      grid.innerHTML = '<p class="empty-state">Add people on the People tab first, then split them here.</p>';
      return;
    }

    const groupsMap = {}; // groupNumber -> [participants]
    const unassigned = [];
    participants.forEach((p) => {
      if (p.group) (groupsMap[p.group] = groupsMap[p.group] || []).push(p);
      else unassigned.push(p);
    });

    const groupNumbers = Object.keys(groupsMap).map(Number).sort((a, b) => a - b);
    const maxGroup = groupNumbers.length ? Math.max(...groupNumbers) : 0;

    if (!groupNumbers.length && !unassigned.length) return;

    if (!groupNumbers.length) {
      grid.innerHTML = '<p class="empty-state">Not split yet — choose a group size and hit “Split into groups”.</p>';
    }

    groupNumbers.forEach((n) => grid.appendChild(card(n, displayName(n), groupsMap[n], maxGroup, false)));
    if (unassigned.length) grid.appendChild(card(null, "Unassigned", unassigned, maxGroup, true));
  }

  function card(n, title, members, maxGroup, isUnassigned) {
    const div = document.createElement("div");
    div.className = "group-card";
    if (isUnassigned) div.style.borderTopColor = "#bbb";

    const header = document.createElement("div");
    header.className = "group-card-header";

    const h = document.createElement("h3");
    h.textContent = `${title} (${members.length})`;
    header.appendChild(h);

    if (!isUnassigned) {
      const edit = document.createElement("button");
      edit.className = "icon-btn";
      edit.title = "Rename group";
      edit.textContent = "✎";
      edit.addEventListener("click", () => openEditor(header, n, title));
      header.appendChild(edit);
    }
    div.appendChild(header);

    const ul = document.createElement("ul");
    members.forEach((p) => {
      const li = document.createElement("li");
      const name = document.createElement("span");
      name.textContent = p.name;

      const sel = document.createElement("select");
      sel.title = "Move to another group";
      const optUn = new Option("— unassigned —", "");
      sel.add(optUn);
      // Offer existing groups plus one extra "new group".
      for (let g = 1; g <= maxGroup + 1; g++) {
        const o = new Option(displayName(g), String(g));
        if (p.group === g) o.selected = true;
        sel.add(o);
      }
      if (!p.group) optUn.selected = true;
      sel.addEventListener("change", () => reassign(p.id, parseInt(sel.value, 10) || null));

      li.append(name, sel);
      ul.appendChild(li);
    });
    div.appendChild(ul);
    return div;
  }

  // Replace the card header with an inline rename editor.
  function openEditor(header, n, currentTitle) {
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 40;
    input.value = currentTitle;
    input.className = "rename-input";

    const save = document.createElement("button");
    save.className = "icon-btn"; save.title = "Save"; save.textContent = "✓";

    const cancel = document.createElement("button");
    cancel.className = "icon-btn"; cancel.title = "Cancel"; cancel.textContent = "✕";

    let done = false;
    function commit() { if (done) return; done = true; rename(n, input.value); } // re-render fires via subscription
    function abort() { if (done) return; done = true; render(); }

    // mousedown + preventDefault keeps focus on the input so the click still registers
    // (a plain click would blur the input first and trigger cancel).
    save.addEventListener("mousedown", (e) => { e.preventDefault(); commit(); });
    cancel.addEventListener("mousedown", (e) => { e.preventDefault(); abort(); });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); commit(); }
      else if (e.key === "Escape") { e.preventDefault(); abort(); }
    });
    input.addEventListener("blur", abort);

    header.innerHTML = "";
    header.append(input, save, cancel);
    input.focus();
    input.select();
  }

  return { init };
})();
```

- [ ] **Step 2: Verify button gating**

Reload. With people added but **not** split:
- "Split into groups" + the size box are **enabled**; "🎲 Shuffle & split" and "Clear" are **disabled**.

Click Split:
- Groups appear titled "Group 1", "Group 2", … with member counts.
- Now Split + size are **disabled**; Shuffle + Clear are **enabled**.

Expected: button states flip exactly as above; no console errors.

- [ ] **Step 3: Verify Shuffle keeps names; Split is locked**

In the console, set a name and confirm it shows:

```js
Store.update("groupNames", (m) => { m.g1 = "Grill Crew"; return m; })
```

Group 1's title becomes "Grill Crew (…)". Now click **Shuffle** a few times:
- Members redistribute across the same number of groups.
- "Grill Crew" stays as the group-1 title (name preserved).
- Split stays disabled.

Expected: names survive shuffles; group count unchanged.

- [ ] **Step 4: Verify Clear resets everything**

Click **Clear**:
- All group cards disappear (everyone unassigned).
- Split + size re-enable; Shuffle + Clear disable.
- `Store.get("groupNames")` → `{}` in the console.

Expected: groups and names both wiped; buttons reset.

- [ ] **Step 5: Verify the dropdown uses custom names**

Split again, set `Store.update("groupNames", (m) => { m.g2 = "Salad Squad"; return m; })`, then open any member's move-to-group dropdown.

Expected: the option for group 2 reads "Salad Squad" (not "Group 2").

- [ ] **Step 6: Commit**

```bash
git add public/js/groups.js
git commit -m "$(cat <<'EOF'
Rework Groups: custom names, button gating, rename logic

Split is now the sole create action (disabled once groups exist); Shuffle
re-randomizes membership while preserving names; Clear wipes groups and
names. Titles and the move-to-group dropdown use displayName().

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Style the rename editor and disabled controls

**Files:**
- Modify: `public/styles.css` (append after the existing `.group-card` rules, around line 124)

- [ ] **Step 1: Append the new styles**

Add these rules to `public/styles.css` (after the `.empty-state` rule on line 124):

```css

/* Group card header: title + rename controls on one row */
.group-card-header { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.group-card-header h3 { margin: 0; }
.rename-input { flex: 1; min-width: 0; font-size: 1rem; padding: 4px 6px; }

/* Disabled buttons / inputs read as "grayed out" */
button:disabled, .controls input:disabled { opacity: .5; cursor: not-allowed; }
```

- [ ] **Step 2: Verify the pencil + editor look right**

Reload. On a group card:
- A faint ✎ sits to the right of the title; it turns accent-colored on hover.
- Click ✎ → the title row becomes a text input with ✓ and ✕ buttons, input pre-filled and selected.
- Disabled buttons (e.g. Shuffle before splitting) appear visibly grayed out.

Expected: header lays out on one row; input stretches to fill; nothing overflows the card.

- [ ] **Step 3: Commit**

```bash
git add public/styles.css
git commit -m "$(cat <<'EOF'
Style group rename editor and disabled controls

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Full manual verification pass

**Files:** none (acceptance testing)

- [ ] **Step 1: Run the full acceptance checklist**

With the local server running and a handful of people added, verify each spec behavior:

1. **Before Split:** Shuffle + Clear disabled; Split + size enabled.
2. **Split:** groups appear with default names; Split + size disable; Shuffle + Clear enable.
3. **Rename via ✎:** type "Grill Crew", press Enter → title updates. **Reload** → name persists. The name also appears in the move-to-group dropdown.
4. **Shuffle:** members redistribute; names stay put; Split stays disabled.
5. **Clear:** groups + names wiped; Split + size re-enable; Shuffle + Clear disable.
6. **Blank name:** rename a group to empty (or back to "Group N") and save → reverts to the default "Group N".
7. **Injection-safe:** rename a group to `<b>x</b>` → it renders literally as `<b>x</b>` text, not bold.
8. **Cancel paths:** open the editor, press **Esc** → no change; open again, click **✕** → no change; open again, click elsewhere (blur) → no change.

Expected: every item passes.

- [ ] **Step 2: Cross-device/tab sync check**

- *Cloud mode:* open the site in two browsers/devices on the same room; rename a group in one → it appears in the other within a moment.
- *(Local mode equivalent:* open two tabs; a rename in one reflects in the other on focus/refresh.)*

Expected: the rename propagates.

- [ ] **Step 3: Revert the test room (if you changed it)**

If you set `window.BBQ_ROOM = "dev-rename-test"` for testing, change it back to `"bbq-halaqa-trip2"` in `public/firebase-config.js`. Confirm `git status` shows **no** unintended change to `firebase-config.js`.

```bash
git status --short
```

Expected: `firebase-config.js` is **not** listed as modified.

- [ ] **Step 4: Deploy (optional)**

Once verified, the feature can ship with:

```bash
firebase deploy --only hosting
```

(Pushing to git / deploying may require your direct authorization, as before.)
