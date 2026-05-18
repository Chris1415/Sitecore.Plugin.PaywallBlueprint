/* =============================================================
 * Paywall Blueprint POC — v2 "Editorial Cadence"
 *   Vanilla JS — no build step, no frameworks.
 *
 *   Wires:
 *     1. Theme toggle (light / dark / system) — 3-state cycle + dropdown
 *     2. State toggle (locked / unlocked) — for POC comparison only;
 *        in the real app this is driven by useEntitlement.
 *     3. Counter ticks for P4 KPI tiles on unlock (rAF).
 *     4. Progress-fill (P2) on unlock — CSS custom property writes.
 *     5. Activity chart path-draw on unlock (CSS animation, no JS needed).
 *
 *   Note: this POC mounts BOTH the placeholder AND the real card content,
 *   then toggles visibility via body.locked / body.unlocked. In the
 *   production app, only one set mounts at a time and the unmount/mount
 *   is driven by entitlement state.
 * ============================================================= */

(function () {
  "use strict";

  // ---- Theme toggle ----

  const THEME_KEY = "poc-v2-prd002:theme";
  const VALID_THEMES = ["light", "dark", "system"];

  function getStoredTheme() {
    try {
      const v = localStorage.getItem(THEME_KEY);
      return VALID_THEMES.includes(v) ? v : "system";
    } catch {
      return "system";
    }
  }

  function applyTheme(theme) {
    if (!VALID_THEMES.includes(theme)) theme = "system";
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch {}

    // Update aria-checked on menu items
    document.querySelectorAll(".theme-toggle__item").forEach((btn) => {
      btn.setAttribute("aria-checked", btn.dataset.mode === theme ? "true" : "false");
    });
  }

  function initThemeToggle() {
    applyTheme(getStoredTheme());

    const toggle = document.querySelector(".theme-toggle");
    if (!toggle) return;
    const trigger = toggle.querySelector(".theme-toggle__trigger");
    const items = toggle.querySelectorAll(".theme-toggle__item");

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = toggle.getAttribute("data-open") === "true";
      toggle.setAttribute("data-open", open ? "false" : "true");
    });

    items.forEach((item) => {
      item.addEventListener("click", () => {
        applyTheme(item.dataset.mode);
        toggle.setAttribute("data-open", "false");
      });
    });

    // Close on outside click
    document.addEventListener("click", () => {
      toggle.setAttribute("data-open", "false");
    });

    // Close on Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") toggle.setAttribute("data-open", "false");
    });
  }

  // ---- State toggle (locked / unlocked) ----

  function setBodyState(state) {
    const body = document.body;
    body.classList.remove("locked", "unlocked");
    body.classList.add(state);

    // aria-hidden on the premium region in locked state per FR-6.5 / NFR-2
    const region = document.querySelector(".premium-region");
    if (region) region.setAttribute("aria-hidden", state === "locked" ? "true" : "false");

    // Update state-toggle button label
    const btn = document.querySelector(".state-toggle");
    if (btn) {
      btn.setAttribute("data-current", state);
      btn.textContent =
        state === "locked"
          ? "STATE: locked — preview unlocked →"
          : "STATE: unlocked — preview locked →";
    }

    // Re-run counter animations + reset progress when entering unlocked
    if (state === "unlocked") {
      runUnlockAnimations();
    } else {
      resetUnlockAnimations();
    }
  }

  function getInitialState() {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("state");
    if (fromUrl === "unlocked") return "unlocked";
    return "locked";
  }

  function initStateToggle() {
    setBodyState(getInitialState());

    const stateBtn = document.querySelector(".state-toggle");
    if (stateBtn) {
      stateBtn.addEventListener("click", () => {
        const current = document.body.classList.contains("unlocked") ? "unlocked" : "locked";
        setBodyState(current === "locked" ? "unlocked" : "locked");
      });
    }

    // Subscribe banner CTA → unlock
    const subBtn = document.querySelector(".subscribe-banner-cta");
    if (subBtn) {
      subBtn.addEventListener("click", () => setBodyState("unlocked"));
    }

    // "Lock again" affordance inside unlocked state (small ghost link)
    document.querySelectorAll(".lock-again").forEach((btn) => {
      btn.addEventListener("click", () => setBodyState("locked"));
    });
  }

  // ---- Unlock animations (counters + progress fills) ----

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function animateCounter(el, target, durationMs, formatter) {
    if (!el) return;
    const start = performance.now();
    function frame(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = easeOutCubic(progress);
      const value = target * eased;
      el.textContent = formatter(value, progress >= 1);
      if (progress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function runUnlockAnimations() {
    // Respect reduced motion
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // P2 — Content health progress bars
    document.querySelectorAll("[data-progress]").forEach((bar) => {
      const target = parseFloat(bar.dataset.progress) / 100;
      // Trigger via CSS custom property; the body.unlocked rule reads it.
      bar.style.setProperty("--progress-target", String(target));
    });

    if (reduced) {
      // Skip rAF animations; just set final values
      document.querySelectorAll("[data-counter]").forEach((el) => {
        el.textContent = el.dataset.counterFinal || el.dataset.counter;
      });
      return;
    }

    // P4 — Counter animations (delay slightly so they sync with stagger-in)
    const counterDelay = 600; // ms — after last hero stagger-in starts
    setTimeout(() => {
      document.querySelectorAll("[data-counter]").forEach((el) => {
        const target = parseFloat(el.dataset.counter);
        const format = el.dataset.counterFormat || "int";
        const finalText = el.dataset.counterFinal || el.dataset.counter;
        const formatter = (v, done) => {
          if (done) return finalText;
          if (format === "int") return Math.round(v).toLocaleString("en-US");
          if (format === "percent") return Math.round(v) + "%";
          if (format === "duration") {
            // value in seconds → "Xm Ys"
            const total = Math.round(v);
            const m = Math.floor(total / 60);
            const s = total % 60;
            return m + "m " + s + "s";
          }
          return String(Math.round(v));
        };
        animateCounter(el, target, 700, formatter);
      });
    }, counterDelay);
  }

  function resetUnlockAnimations() {
    // Reset counters to "—" placeholder
    document.querySelectorAll("[data-counter]").forEach((el) => {
      el.textContent = "—";
    });
    // Reset progress bar targets
    document.querySelectorAll("[data-progress]").forEach((bar) => {
      bar.style.removeProperty("--progress-target");
    });
  }

  // ---- Bootstrap ----

  function init() {
    initThemeToggle();
    initStateToggle();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
