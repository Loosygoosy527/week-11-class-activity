/* DM3014 Interactive Devices, Ashley Hi 2026
   Week 11 – Remote Interaction
   Presence Page Plumbing
   You don't need to edit this file.
*/

(function () {
  const STALE_MS = 2500;
  const PRACTICE_NEAR_CM = 60; // matches NEAR_CM on the board
  const PRACTICE_FAR_CM = 200;

  const listeners = { change: [], near: [], far: [] };
  let connected = false;
  let hasData = false;
  let problem = "";
  let statusEl = null;

  function emit(type, ...args) {
    for (const fn of listeners[type]) {
      try {
        fn(...args);
      } catch (e) {
        console.error(e);
      }
    }
  }

  function apply(distance, near) {
    const was = sensor.near;
    sensor.distance = typeof distance === "number" ? distance : -1;
    sensor.near = !!near;
    sensor.lastUpdate = performance.now();
    hasData = true;
    emit("change", sensor.distance, sensor.near);
    if (sensor.near && !was) emit("near");
    if (!sensor.near && was) emit("far");
  }

  function startPractice() {
    sensor.practice = true;
    connected = true;
    let y = null;
    const move = (clientY) => {
      y = clientY;
    };
    window.addEventListener("mousemove", (e) => move(e.clientY));
    window.addEventListener("touchmove", (e) => move(e.touches[0].clientY), {
      passive: true,
    });
    document.addEventListener("mouseleave", () => {
      y = null;
    });
    setInterval(() => {
      if (y === null) return apply(-1, false);
      const t = Math.min(Math.max(y / window.innerHeight, 0), 1);
      const cm = PRACTICE_FAR_CM - t * (PRACTICE_FAR_CM - 5);
      apply(Math.round(cm * 10) / 10, cm < PRACTICE_NEAR_CM);
    }, 100);
    console.log(
      "[sensor] practice mode: no Firebase config yet. Move the mouse down the page to come closer."
    );
  }

  function startFirebase(config, path) {
    if (typeof firebase === "undefined") {
      problem = "Firebase didn't load: check your internet connection";
      return;
    }
    firebase.initializeApp(config);
    const db = firebase.database();
    db.ref(".info/connected").on("value", (snap) => {
      connected = snap.val() === true;
    });
    db.ref(path).on(
      "value",
      (snap) => {
        const v = snap.val();
        if (v) apply(v.distance, v.near);
      },
      (err) => {
        problem = "permission denied: publish the database rules";
        console.error("[sensor]", err.message);
      }
    );
  }

  function renderStatus() {
    statusEl = statusEl || document.getElementById("sensor-status");
    sensor.online =
      connected && hasData && performance.now() - sensor.lastUpdate < STALE_MS;
    if (!sensor.online && sensor.near) {
      sensor.near = false;
      emit("far");
    }
    if (!statusEl) return;
    let state, text;
    if (problem) {
      state = "error";
      text = problem;
    } else if (sensor.practice) {
      state = "practice";
      text = "practice mode · mouse is the sensor";
    } else if (!connected) {
      state = "error";
      text = "can't reach Firebase";
    } else if (!hasData) {
      state = "waiting";
      text = "connected · waiting for the board";
    } else if (!sensor.online) {
      state = "waiting";
      text =
        "board offline · last reading " +
        Math.round((performance.now() - sensor.lastUpdate) / 1000) +
        " s ago";
    } else {
      state = "live";
      text =
        sensor.distance < 0
          ? "live · nothing in range"
          : "live · " + Math.round(sensor.distance) + " cm";
    }
    statusEl.dataset.state = state;
    statusEl.textContent = text;
  }

  const sensor = {
    distance: -1,
    near: false,
    online: false,
    practice: false,
    lastUpdate: 0,

    connect(config, path) {
      const ready =
        config &&
        config.databaseURL &&
        !/your-project/.test(config.databaseURL);
      if (ready) startFirebase(config, path || "/sensor");
      else startPractice();
      setInterval(renderStatus, 250);
      renderStatus();
    },

    on(type, fn) {
      if (!listeners[type])
        throw new Error("sensor.on: unknown event '" + type + "'");
      listeners[type].push(fn);
    },
  };

  window.sensor = sensor;
})();
