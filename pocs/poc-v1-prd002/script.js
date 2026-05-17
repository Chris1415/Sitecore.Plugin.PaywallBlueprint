/* ===============================================================
 * Paywall Blueprint POC — v1 "Mosaic Discipline" — PRD-002
 *
 * Vanilla JS; no build step. Three responsibilities:
 *   1. Theme toggle (Light / Dark / System) — flips data-theme on <html>
 *   2. State toggle (locked / unlocked) — flips data-state on <body>
 *      + replays stagger-in cascade and KPI/progress/ring animations
 *   3. Subscribe banner anchor — measures .bento-grid__premium-region
 *      and writes top/height CSS vars onto .subscribe-banner so it
 *      visually overlays the locked premium region without a fragile
 *      grid-row hack
 * =============================================================== */

(function () {
  "use strict";

  /* -------------------------------------------------------------
   * Reduced motion helper
   * ----------------------------------------------------------- */
  var reducedMotionMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  function prefersReduced() {
    return reducedMotionMQ && reducedMotionMQ.matches;
  }

  /* -------------------------------------------------------------
   * Theme toggle (3-state: light / dark / system)
   * ----------------------------------------------------------- */
  var themeButtons = document.querySelectorAll(".theme-toggle-btn");
  function setTheme(mode) {
    document.documentElement.setAttribute("data-theme", mode);
    themeButtons.forEach(function (btn) {
      var isActive = btn.getAttribute("data-mode") === mode;
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
      if (isActive) {
        btn.classList.add("theme-toggle-btn--active");
      } else {
        btn.classList.remove("theme-toggle-btn--active");
      }
    });
  }
  themeButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setTheme(btn.getAttribute("data-mode"));
    });
  });

  /* -------------------------------------------------------------
   * State toggle (locked / unlocked) + Subscribe CTA shortcut
   * ----------------------------------------------------------- */
  var stateButtons = document.querySelectorAll(".state-toggle");
  var subscribeCTA = document.querySelector(".subscribe-banner-cta");

  function setState(target) {
    document.body.setAttribute("data-state", target);
    stateButtons.forEach(function (btn) {
      var isActive = btn.getAttribute("data-target") === target;
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
      if (isActive) {
        btn.classList.add("state-toggle--active");
      } else {
        btn.classList.remove("state-toggle--active");
      }
    });
    // When transitioning to unlocked, replay internal card animations.
    if (target === "unlocked") {
      replayPremiumAnimations();
    } else {
      resetPremiumAnimations();
    }
    // Re-anchor subscribe banner after state change.
    requestAnimationFrame(positionSubscribeBanner);
  }

  stateButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setState(btn.getAttribute("data-target"));
    });
  });

  if (subscribeCTA) {
    subscribeCTA.addEventListener("click", function () {
      // Spec § 3 Flow A: clicking Subscribe opens PaywallCheckoutDialog →
      // Stripe Checkout → reload → unlocked. In the POC, short-circuit
      // straight to unlocked so the operator sees the celebration.
      setState("unlocked");
    });
  }

  /* -------------------------------------------------------------
   * Subscribe banner anchor — measure premium region, write vars
   * ----------------------------------------------------------- */
  var bentoGrid = document.querySelector(".bento-grid");
  var premiumRegion = document.querySelector(".bento-grid__premium-region");
  var subscribeBanner = document.querySelector(".subscribe-banner");

  function positionSubscribeBanner() {
    if (!bentoGrid || !premiumRegion || !subscribeBanner) {
      return;
    }
    if (document.body.getAttribute("data-state") !== "locked") {
      return;
    }
    var gridRect = bentoGrid.getBoundingClientRect();
    var regionRect = premiumRegion.getBoundingClientRect();
    var topOffset = regionRect.top - gridRect.top;
    var height = regionRect.height;
    subscribeBanner.style.setProperty(
      "--subscribe-banner-top",
      topOffset + "px"
    );
    subscribeBanner.style.setProperty(
      "--subscribe-banner-height",
      height + "px"
    );
  }

  /* -------------------------------------------------------------
   * Premium card animations (counters, progress, ring)
   * ----------------------------------------------------------- */
  function easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function animateCounter(el, target, format) {
    if (prefersReduced()) {
      el.textContent = formatCounter(target, format);
      return;
    }
    var duration = 600;
    var start = null;
    function tick(ts) {
      if (!start) {
        start = ts;
      }
      var elapsed = ts - start;
      var t = Math.min(elapsed / duration, 1);
      var eased = easeOut(t);
      var current = target * eased;
      el.textContent = formatCounter(current, format);
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = formatCounter(target, format);
      }
    }
    requestAnimationFrame(tick);
  }

  function formatCounter(value, format) {
    if (format === "thousands") {
      return Math.round(value).toLocaleString("en-US");
    }
    if (format === "percent") {
      return Math.round(value) + "%";
    }
    if (format === "duration") {
      // value here is animating from 0 → 32 seconds; total is 4m + value
      return "4m " + Math.round(value) + "s";
    }
    return String(Math.round(value));
  }

  function animateProgressBars() {
    var bars = document.querySelectorAll(".blok-progress__fill");
    bars.forEach(function (bar) {
      var target = bar.style.width; // captured before reset
      bar.dataset.target = target;
      bar.style.width = "0%";
      // force reflow so the transition kicks
      // eslint-disable-next-line no-unused-expressions
      bar.offsetWidth;
      requestAnimationFrame(function () {
        bar.style.width = bar.dataset.target;
      });
    });
  }

  function animateRing() {
    var ring = document.querySelector(".bento-card__score-arc");
    if (!ring) return;
    var finalOffset = "26";
    // Start fully empty (offset = circumference = 201.06)
    ring.style.strokeDashoffset = "201";
    // eslint-disable-next-line no-unused-expressions
    ring.getBoundingClientRect();
    requestAnimationFrame(function () {
      ring.style.strokeDashoffset = finalOffset;
    });
  }

  function replayPremiumAnimations() {
    // Reset & replay counters
    var counterEls = document.querySelectorAll("[data-counter-target]");
    counterEls.forEach(function (el) {
      var target = parseFloat(el.getAttribute("data-counter-target"));
      var format = el.getAttribute("data-counter-format");
      // Stagger counters slightly so they don't all start at the same instant.
      // P4 enters at ~240ms cascade delay; nudge counters to begin ~50ms after.
      el.textContent = formatCounter(0, format);
      setTimeout(function () {
        animateCounter(el, target, format);
      }, 240 + 50);
    });
    // Progress bars (P2 enters at 80ms; animate ~50ms after)
    setTimeout(animateProgressBars, 80 + 50);
    // Ring + sparkline (P6 enters at 400ms)
    setTimeout(animateRing, 400 + 50);
  }

  function resetPremiumAnimations() {
    var counterEls = document.querySelectorAll("[data-counter-target]");
    counterEls.forEach(function (el) {
      var format = el.getAttribute("data-counter-format");
      var target = parseFloat(el.getAttribute("data-counter-target"));
      el.textContent = formatCounter(target, format);
    });
    var bars = document.querySelectorAll(".blok-progress__fill");
    bars.forEach(function (bar) {
      if (bar.dataset.target) {
        bar.style.width = bar.dataset.target;
      }
    });
    var ring = document.querySelector(".bento-card__score-arc");
    if (ring) ring.style.strokeDashoffset = "26";
  }

  /* -------------------------------------------------------------
   * Boot
   * ----------------------------------------------------------- */
  // Allow ?state=locked|unlocked and ?theme=light|dark|system URL overrides
  var params = new URLSearchParams(window.location.search);
  var initialState = params.get("state");
  var initialTheme = params.get("theme");
  if (initialState === "locked" || initialState === "unlocked") {
    setState(initialState);
  } else {
    // Default = locked (matches spec's default for new tenants)
    setState("locked");
  }
  if (
    initialTheme === "light" ||
    initialTheme === "dark" ||
    initialTheme === "system"
  ) {
    setTheme(initialTheme);
  }

  // Anchor banner on load + resize + theme change (font swap reflow).
  window.addEventListener("load", positionSubscribeBanner);
  window.addEventListener("resize", positionSubscribeBanner);
  // Initial measure after layout settles
  requestAnimationFrame(positionSubscribeBanner);
  // One more after fonts resolve
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(positionSubscribeBanner);
  }
})();
