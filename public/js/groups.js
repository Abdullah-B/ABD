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
      grid.innerHTML = '<p class="empty-state">Not split yet — choose a group size and hit "Split into groups".</p>';
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
