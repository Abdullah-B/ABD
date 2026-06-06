/* Shopping tab: buyers add items; the leader tracks cost and what's left. */
window.Shopping = (function () {
  function init() {
    document.getElementById("shopping-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const item = document.getElementById("shop-item").value.trim();
      if (!item) return;
      const entry = {
        id: uid(),
        item,
        qty: parseInt(document.getElementById("shop-qty").value, 10) || 1,
        who: document.getElementById("shop-who").value.trim(),
        cost: parseFloat(document.getElementById("shop-cost").value) || 0,
        purchased: false
      };
      Store.update("shopping", (list) => { list.push(entry); return list; });
      e.target.reset();
      document.getElementById("shop-qty").value = 1;
      document.getElementById("shop-item").focus();
    });

    Store.subscribe("shopping", render);
  }

  function patch(id, changes) {
    Store.update("shopping", (list) => {
      const it = list.find((x) => x.id === id);
      if (it) Object.assign(it, changes);
      return list;
    });
  }

  function remove(id) {
    Store.update("shopping", (list) => list.filter((x) => x.id !== id));
  }

  function money(n) { return (n || 0).toFixed(2); }

  function render(list) {
    list = list || [];
    const body = document.getElementById("shopping-body");
    body.innerHTML = "";

    let bought = 0, spent = 0, est = 0;
    list.forEach((it) => {
      est += it.cost || 0;
      if (it.purchased) { bought++; spent += it.cost || 0; }
    });
    document.getElementById("sum-items").textContent = list.length;
    document.getElementById("sum-bought").textContent = bought;
    document.getElementById("sum-left").textContent = list.length - bought;
    document.getElementById("sum-spent").textContent = money(spent);
    document.getElementById("sum-est").textContent = money(est);

    if (!list.length) {
      body.innerHTML = '<tr><td colspan="6" class="empty-state">Nothing on the list yet.</td></tr>';
      return;
    }

    list.forEach((it) => {
      const tr = document.createElement("tr");
      if (it.purchased) tr.className = "done";

      const tdChk = document.createElement("td");
      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.checked = !!it.purchased;
      chk.title = "Mark as purchased";
      chk.addEventListener("change", () => patch(it.id, { purchased: chk.checked }));
      tdChk.appendChild(chk);

      const tdItem = document.createElement("td");
      tdItem.textContent = it.item;
      const tdQty = document.createElement("td");
      tdQty.textContent = it.qty;
      const tdWho = document.createElement("td");
      tdWho.textContent = it.who || "—";

      const tdCost = document.createElement("td");
      const costInput = document.createElement("input");
      costInput.type = "number";
      costInput.min = "0";
      costInput.step = "0.01";
      costInput.className = "cost-input";
      costInput.value = it.cost || 0;
      costInput.title = "Cost";
      costInput.addEventListener("change", () => patch(it.id, { cost: parseFloat(costInput.value) || 0 }));
      tdCost.appendChild(costInput);

      const tdDel = document.createElement("td");
      const del = document.createElement("button");
      del.className = "icon-btn";
      del.textContent = "✕";
      del.title = "Remove";
      del.addEventListener("click", () => remove(it.id));
      tdDel.appendChild(del);

      tr.append(tdChk, tdItem, tdQty, tdWho, tdCost, tdDel);
      body.appendChild(tr);
    });
  }

  return { init };
})();
