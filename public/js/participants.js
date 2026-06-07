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
