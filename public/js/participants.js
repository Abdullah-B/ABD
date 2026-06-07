/* Participants tab: add/remove/rename people; mark who has paid; print roster. */
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

  function updateName(id, name) {
    Store.update("participants", (list) => {
      const p = list.find((x) => x.id === id);
      if (p) p.name = name;
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

      // Checkbox + name grouped on the left; action buttons on the right.
      const label = document.createElement("label");
      label.className = "paid-toggle";
      label.title = p.paid ? "Mark unpaid" : "Mark paid";

      const box = document.createElement("input");
      box.type = "checkbox";
      box.checked = !!p.paid;
      box.addEventListener("change", () => setPaid(p.id, box.checked));

      const span = document.createElement("span");
      span.textContent = p.name;
      label.append(box, span);

      const actions = document.createElement("span");
      actions.className = "row-actions";

      // Pencil sits OUTSIDE the label so clicking it doesn't toggle paid.
      const edit = document.createElement("button");
      edit.className = "icon-btn";
      edit.title = "Rename";
      edit.textContent = "✎";
      edit.addEventListener("click", () => openEditor(li, p));

      const btn = document.createElement("button");
      btn.className = "remove";
      btn.title = "Remove";
      btn.textContent = "✕";
      btn.addEventListener("click", () => remove(p.id));

      actions.append(edit, btn);
      li.append(label, actions);
      ul.appendChild(li);
    });
  }

  // Replace a participant row with an inline name editor.
  function openEditor(li, p) {
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 40;
    input.value = p.name;
    input.className = "rename-input";

    const save = document.createElement("button");
    save.className = "icon-btn"; save.title = "Save"; save.textContent = "✓";

    const cancel = document.createElement("button");
    cancel.className = "icon-btn"; cancel.title = "Cancel"; cancel.textContent = "✕";

    let done = false;
    function commit() {
      if (done) return; done = true;
      const name = input.value.trim();
      if (name && name !== p.name) updateName(p.id, name); // subscription re-renders
      else render(current);                                 // blank/unchanged: restore row
    }
    // render(current), NOT render(): render(list) sets current = list || [], so a
    // bare render() would blank the whole list.
    function abort() { if (done) return; done = true; render(current); }

    // mousedown + preventDefault keeps focus on the input so the click registers
    // (a plain click would blur the input first and trigger cancel).
    save.addEventListener("mousedown", (e) => { e.preventDefault(); commit(); });
    cancel.addEventListener("mousedown", (e) => { e.preventDefault(); abort(); });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); commit(); }
      else if (e.key === "Escape") { e.preventDefault(); abort(); }
    });
    input.addEventListener("blur", abort);

    li.innerHTML = "";
    li.append(input, save, cancel);
    input.focus();
    input.select();
  }

  function getAll() { return current; }

  return { init, getAll };
})();
