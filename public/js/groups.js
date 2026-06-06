/* Groups tab: split participants into groups (default size 5) and reassign. */
window.Groups = (function () {
  let participants = [];

  function init() {
    document.getElementById("split-btn").addEventListener("click", () => split(false));
    document.getElementById("shuffle-btn").addEventListener("click", () => split(true));
    document.getElementById("clear-groups-btn").addEventListener("click", clearGroups);
    Store.subscribe("participants", (list) => { participants = list || []; render(); });
  }

  function groupSize() {
    return Math.max(1, parseInt(document.getElementById("group-size").value, 10) || 5);
  }

  function split(shuffle) {
    const size = groupSize();
    Store.update("participants", (list) => {
      let order = list.slice();
      if (shuffle) {
        for (let i = order.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [order[i], order[j]] = [order[j], order[i]];
        }
      }
      const idToGroup = {};
      order.forEach((p, i) => { idToGroup[p.id] = Math.floor(i / size) + 1; });
      list.forEach((p) => { p.group = idToGroup[p.id]; });
      return list;
    });
  }

  function clearGroups() {
    Store.update("participants", (list) => {
      list.forEach((p) => { delete p.group; });
      return list;
    });
  }

  function reassign(id, group) {
    Store.update("participants", (list) => {
      const p = list.find((x) => x.id === id);
      if (p) { if (group) p.group = group; else delete p.group; }
      return list;
    });
  }

  function render() {
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

    groupNumbers.forEach((n) => grid.appendChild(card("Group " + n, groupsMap[n], maxGroup)));
    if (unassigned.length) grid.appendChild(card("Unassigned", unassigned, maxGroup, true));
  }

  function card(title, members, maxGroup, isUnassigned) {
    const div = document.createElement("div");
    div.className = "group-card";
    if (isUnassigned) div.style.borderTopColor = "#bbb";

    const h = document.createElement("h3");
    h.textContent = `${title} (${members.length})`;
    div.appendChild(h);

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
        const o = new Option("Group " + g, String(g));
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

  return { init };
})();
