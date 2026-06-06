/* App bootstrap: tab switching, storage status, and module init. */
(function () {
  function initTabs() {
    const tabs = document.querySelectorAll(".tab");
    const panels = document.querySelectorAll(".panel");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const target = tab.dataset.tab;
        tabs.forEach((t) => t.classList.toggle("active", t === tab));
        panels.forEach((p) => p.classList.toggle("active", p.id === "tab-" + target));
      });
    });
  }

  function showStorageStatus(mode) {
    const dot = document.getElementById("status-dot");
    const text = document.getElementById("status-text");
    if (mode === "cloud") {
      dot.className = "dot cloud";
      text.textContent = "Synced via Firebase";
    } else {
      dot.className = "dot local";
      text.textContent = "Saved on this device";
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    const mode = Store.init();
    showStorageStatus(mode);

    Participants.init();
    Groups.init();
    Program.init();
    AreaMap.init();
    Shopping.init();
  });
})();
