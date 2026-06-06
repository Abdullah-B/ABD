/* Participants tab: add/remove the people joining the trip. */
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

  function render(list) {
    current = list || [];
    const ul = document.getElementById("participant-list");
    document.getElementById("participant-count").textContent = current.length;
    ul.innerHTML = "";
    if (!current.length) {
      ul.innerHTML = '<li class="empty-state">No one added yet.</li>';
      return;
    }
    current.forEach((p) => {
      const li = document.createElement("li");
      const span = document.createElement("span");
      span.textContent = p.name;
      const btn = document.createElement("button");
      btn.className = "remove";
      btn.title = "Remove";
      btn.textContent = "✕";
      btn.addEventListener("click", () => remove(p.id));
      li.append(span, btn);
      ul.appendChild(li);
    });
  }

  function getAll() { return current; }

  return { init, getAll };
})();
