/* Program tab: scheduled activities with start time + duration. */
window.Program = (function () {
  function init() {
    document.getElementById("program-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const activity = document.getElementById("prog-activity").value.trim();
      const start = document.getElementById("prog-start").value;
      const duration = parseInt(document.getElementById("prog-duration").value, 10) || 0;
      if (!activity || !start) return;
      Store.update("program", (list) => {
        list.push({ id: uid(), activity, start, duration });
        return list;
      });
      e.target.reset();
      document.getElementById("prog-duration").value = 30;
      document.getElementById("prog-activity").focus();
    });

    Store.subscribe("program", render);
  }

  function remove(id) {
    Store.update("program", (list) => list.filter((x) => x.id !== id));
  }

  function endTime(start, duration) {
    const [h, m] = start.split(":").map(Number);
    const total = h * 60 + m + (duration || 0);
    const eh = Math.floor((total % 1440) / 60);
    const em = total % 60;
    return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
  }

  function fmtDuration(min) {
    if (!min) return "0m";
    const h = Math.floor(min / 60), m = min % 60;
    const parts = [];
    if (h) parts.push(h + "h");
    if (m) parts.push(m + "m");
    return parts.join(" ") || "0m";
  }

  function render(list) {
    const body = document.getElementById("program-body");
    body.innerHTML = "";
    const items = (list || []).slice().sort((a, b) => a.start.localeCompare(b.start));
    if (!items.length) {
      body.innerHTML = '<tr><td colspan="5" class="empty-state">No activities planned yet.</td></tr>';
      return;
    }
    items.forEach((item) => {
      const tr = document.createElement("tr");

      const tdStart = document.createElement("td");
      tdStart.textContent = item.start;
      const tdAct = document.createElement("td");
      tdAct.textContent = item.activity;
      const tdDur = document.createElement("td");
      tdDur.textContent = fmtDuration(item.duration);
      const tdEnd = document.createElement("td");
      tdEnd.textContent = endTime(item.start, item.duration);

      const tdDel = document.createElement("td");
      const btn = document.createElement("button");
      btn.className = "icon-btn";
      btn.textContent = "✕";
      btn.title = "Remove";
      btn.addEventListener("click", () => remove(item.id));
      tdDel.appendChild(btn);

      tr.append(tdStart, tdAct, tdDur, tdEnd, tdDel);
      body.appendChild(tr);
    });
  }

  return { init };
})();
