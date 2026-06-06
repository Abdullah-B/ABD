/*
 * Store: a tiny data layer that persists collections either to a Firebase
 * Realtime Database (if configured) or to localStorage (fallback). Either way
 * it exposes the same API and a subscribe() so the UI updates on changes.
 *
 *   Store.subscribe(name, cb)  -> cb(value) now and on every change
 *   Store.set(name, value)     -> persist value
 *   Store.update(name, fn)     -> read-modify-write helper
 */
window.Store = (function () {
  const COLLECTIONS = ["participants", "program", "shopping", "map"];
  const DEFAULTS = {
    participants: [],
    program: [],
    shopping: [],
    map: { image: null, shapes: [] }
  };

  const subscribers = {}; // name -> [cb]
  const cache = {};       // name -> value
  let mode = "local";     // "local" | "cloud"
  let db = null;
  let room = window.BBQ_ROOM || "default-trip";

  function isConfigured() {
    const c = window.FIREBASE_CONFIG;
    return c && c.apiKey && !String(c.apiKey).startsWith("YOUR_") && typeof firebase !== "undefined";
  }

  function lsKey(name) { return `bbq:${room}:${name}`; }

  function notify(name) {
    (subscribers[name] || []).forEach((cb) => {
      try { cb(cache[name]); } catch (e) { console.error(e); }
    });
  }

  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }

  // ---- localStorage backend ----
  function localInit() {
    COLLECTIONS.forEach((name) => {
      try {
        const raw = localStorage.getItem(lsKey(name));
        cache[name] = raw ? JSON.parse(raw) : clone(DEFAULTS[name]);
      } catch (e) {
        cache[name] = clone(DEFAULTS[name]);
      }
    });
    // Keep tabs in the same browser in sync.
    window.addEventListener("storage", (e) => {
      COLLECTIONS.forEach((name) => {
        if (e.key === lsKey(name)) {
          try { cache[name] = e.newValue ? JSON.parse(e.newValue) : clone(DEFAULTS[name]); }
          catch (_) { cache[name] = clone(DEFAULTS[name]); }
          notify(name);
        }
      });
    });
  }

  function localSet(name, value) {
    cache[name] = value;
    try { localStorage.setItem(lsKey(name), JSON.stringify(value)); } catch (e) { console.error(e); }
    notify(name);
  }

  // ---- Firebase Realtime Database backend ----
  function cloudInit() {
    firebase.initializeApp(window.FIREBASE_CONFIG);
    db = firebase.database();
    COLLECTIONS.forEach((name) => {
      cache[name] = clone(DEFAULTS[name]);
      db.ref(`${room}/${name}`).on("value", (snap) => {
        const val = snap.val();
        cache[name] = val == null ? clone(DEFAULTS[name]) : val;
        notify(name);
      });
    });
  }

  function cloudSet(name, value) {
    cache[name] = value;
    db.ref(`${room}/${name}`).set(value).catch((e) => console.error("Save failed:", e));
    // notify() happens via the 'value' listener, but fire locally for snappiness.
    notify(name);
  }

  // ---- public API ----
  function init() {
    if (isConfigured()) {
      try { cloudInit(); mode = "cloud"; }
      catch (e) { console.warn("Firebase init failed, using local storage.", e); localInit(); mode = "local"; }
    } else {
      localInit();
      mode = "local";
    }
    return mode;
  }

  function get(name) {
    return cache[name] !== undefined ? cache[name] : clone(DEFAULTS[name]);
  }

  function set(name, value) {
    if (mode === "cloud") cloudSet(name, value);
    else localSet(name, value);
  }

  function update(name, fn) {
    const next = fn(clone(get(name)) ?? clone(DEFAULTS[name]));
    set(name, next);
  }

  function subscribe(name, cb) {
    (subscribers[name] = subscribers[name] || []).push(cb);
    if (cache[name] !== undefined) cb(cache[name]);
    return () => {
      subscribers[name] = (subscribers[name] || []).filter((f) => f !== cb);
    };
  }

  function getMode() { return mode; }

  return { init, get, set, update, subscribe, getMode };
})();

// Small shared id helper.
window.uid = function () {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
};
