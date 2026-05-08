/* ───────────────────────────────────────────────────────────
   Domain Bar — site-wide target placeholder substitution
   ───────────────────────────────────────────────────────────
   Lets the pentester enter their authorized target host in a
   sticky bar below the topnav. Any text node inside a
   pre/code/.snippet element containing https?://example.com
   (followed by /, :, ?, #, ", ', whitespace, <, or end-of-line)
   gets rewritten in place to use the target.
   Persists in localStorage['shared.target'], synced across tabs
   via the storage event. Watches for dynamically added snippets
   via MutationObserver.
   ─────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'shared.target';
  // Match `example.com` in any context EXCEPT:
  //   - emails (lookbehind `@`):           attacker@example.com
  //   - chained subdomain (lookahead `.`): https://example.com.attacker.com
  //   - word-boundary cases:               myexample.com, example.commerce, pre-example.com
  // Substitutes prefixed forms like `FUZZ.example.com`, `mail.example.com`,
  // `*.example.com` — the user's target replaces the apex-and-tld, prefix kept.
  // Also catches URL contexts (https://example.com/...), CLI contexts
  // (subfinder -d example.com, waybackurls example.com), and search operators
  // (site:example.com, cache:example.com).
  const TARGET_PATTERN = /(?<![@\w-])example\.com(?![.\w-])/g;
  const SNIPPET_SELECTOR = 'pre, code, .snippet';
  const originals = new WeakMap();
  let inputEl = null, statusEl = null;

  function getTarget() {
    return localStorage.getItem(STORAGE_KEY) || '';
  }

  function walkSnippetTextNodes(fn) {
    const seen = new Set();
    document.querySelectorAll(SNIPPET_SELECTOR).forEach(root => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
      let node;
      while ((node = walker.nextNode())) {
        if (seen.has(node)) continue;
        seen.add(node);
        fn(node);
      }
    });
  }

  function snapshot(textNode) {
    if (!originals.has(textNode)) {
      originals.set(textNode, textNode.nodeValue);
    }
  }

  function applyTo(textNode, target) {
    const original = originals.get(textNode);
    if (original === undefined) return;
    textNode.nodeValue = target
      ? original.replace(TARGET_PATTERN, target)
      : original;
  }

  function applyAll(target) {
    walkSnippetTextNodes(t => {
      snapshot(t);
      applyTo(t, target);
    });
    updateStatus(target);
    updateRunButtons(target);
  }

  function updateStatus(target) {
    if (!statusEl) return;
    statusEl.textContent = target ? '✓ Substituting' : '○ Inactive';
    statusEl.className = 'domain-bar-status ' + (target ? 'active' : 'inactive');
  }

  function updateRunButtons(target) {
    document.querySelectorAll('.dork-run-btn').forEach(btn => {
      const enabled = !!target;
      btn.disabled = !enabled;
      btn.textContent = enabled
        ? '🔍 Run on Google'
        : '🔍 Run on Google (set target first)';
    });
  }

  function normalizeTarget(raw) {
    // Strip protocol prefix and trailing slashes if user pastes a full URL.
    return String(raw || '').trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  }

  function onInput() {
    const v = normalizeTarget(inputEl.value);
    if (v) {
      try { localStorage.setItem(STORAGE_KEY, v); }
      catch (e) { console.warn('[domain-bar] save failed', e); }
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    applyAll(v);
  }

  function onBlur() {
    // On blur, snap the displayed value to the normalized form.
    if (!inputEl) return;
    const v = normalizeTarget(inputEl.value);
    if (v !== inputEl.value) inputEl.value = v;
  }

  function onReset() {
    inputEl.value = '';
    localStorage.removeItem(STORAGE_KEY);
    applyAll('');
    inputEl.focus();
  }

  function onStorage(e) {
    if (e.key !== STORAGE_KEY) return;
    const v = getTarget();
    if (inputEl) inputEl.value = v;
    applyAll(v);
  }

  function watchDynamic() {
    if (typeof MutationObserver !== 'function') return;
    const obs = new MutationObserver(mutations => {
      let needsApply = false;
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue; // Element nodes only
          if ((node.matches && node.matches(SNIPPET_SELECTOR)) ||
              (node.querySelector && node.querySelector(SNIPPET_SELECTOR))) {
            needsApply = true;
            break;
          }
        }
        if (needsApply) break;
      }
      if (needsApply) applyAll(getTarget());
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    inputEl = document.getElementById('db-target');
    statusEl = document.getElementById('db-status');
    const resetBtn = document.getElementById('db-reset');
    if (inputEl && resetBtn) {
      inputEl.value = getTarget();
      inputEl.addEventListener('input', onInput);
      inputEl.addEventListener('blur', onBlur);
      resetBtn.addEventListener('click', onReset);
    }
    window.addEventListener('storage', onStorage);
    applyAll(getTarget());
    watchDynamic();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.DomainBar = { init: init, _apply: applyAll };
})(window);
