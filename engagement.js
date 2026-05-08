/* ───────────────────────────────────────────────────────────
   Engagement — read-only helpers over report.engagement
   ───────────────────────────────────────────────────────────
   The setup wizard (setup.html) and report/draft.html both write
   to localStorage['report.engagement'] (a JSON object). This
   module exposes 4 read-side helpers consumed by the homepage
   and the day worksheets:
     - getDayCount(): 1–10, default 5
     - getDayIndexToday(): 1-based day index based on startDate, or null
     - setupComplete(): bool, true if user has run the setup wizard
     - daysToShow(): array [1..N] of day indices that should appear in nav/home
   ─────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';
  function load() {
    try { return JSON.parse(localStorage.getItem('report.engagement') || '{}') || {}; }
    catch (e) { return {}; }
  }
  function getDayCount() {
    const v = parseInt(load().dayCount, 10);
    if (!Number.isFinite(v) || v < 1) return 5;
    return Math.min(10, v);
  }
  function setupComplete() {
    return !!load().setupCompleteAt;
  }
  function getDayIndexToday() {
    const start = load().startDate || localStorage.getItem('shared.startDate') || '';
    if (!start) return null;
    const d0 = new Date(start + 'T00:00:00');
    if (isNaN(d0.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ms = today.getTime() - d0.getTime();
    if (ms < 0) return null;
    return Math.floor(ms / 86400000) + 1; // day 1 = startDate itself
  }
  function daysToShow() {
    const n = getDayCount();
    return Array.from({ length: n }, (_, i) => i + 1);
  }
  global.Engagement = { getDayCount, setupComplete, getDayIndexToday, daysToShow };
})(window);
