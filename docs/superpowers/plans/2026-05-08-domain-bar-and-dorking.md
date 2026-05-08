# Domain Bar + Google Dorking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a site-wide "target domain" bar that dynamically rewrites `https://example.com` placeholders in code snippets, plus a `vulns/google-dorking.html` page that consumes the bar.

**Architecture:** Single shared `domain-bar.js` (vanilla IIFE, ~120 lines) loaded with `defer` in every page's `<head>`. Bar HTML markup is duplicated below the `<nav class="topnav">` on every page (no template engine; same pattern as the existing topnav duplication). Substitution walks `Text` nodes inside `pre/code/.snippet` elements via TreeWalker, snapshotting originals into a per-text-node `WeakMap` so re-substitutions on target change work from the original — never from a previously-mutated state. Cross-tab sync via the `storage` event. The Google Dorking page reuses the same substitution mechanism plus a per-snippet "🔍 Run on Google" button that opens `google.com/search?q=<encoded substituted dork>` in a new tab.

**Tech Stack:** Vanilla HTML / CSS / JS (no build step), GitHub Pages deployment. Uses existing `vulns/style.css` design tokens. No new third-party dependencies.

---

## File structure

| File | Responsibility | Status |
|---|---|---|
| `domain-bar.js` (root) | IIFE; loads target from `localStorage['shared.target']`, walks snippet text nodes, swaps placeholder, manages bar UI + run-button enable/disable, listens for cross-tab `storage` events, watches `document.body` for dynamically added snippets via MutationObserver | Create |
| `vulns/style.css` | Append `~70 lines` for `.domain-bar`, status pill, `.dork-row`, `.dork-run-btn`, mobile breakpoint, print rule | Modify |
| `vulns/google-dorking.html` | Standalone vuln-page-style page with 6 dork categories and Run buttons | Create |
| `index.html` | Add bar HTML + script tag; add Google Dorking card to vuln-grid (between GraphQL and IDOR); add Google Dorking pill to the at-a-glance section | Modify |
| `web-pentest-playbook.html` | Add bar + script; add a "Google Dorking" link in the recon section | Modify |
| `thanks.html` | Add bar + script | Modify |
| `days/day1.html` … `day5.html` | Add bar + script (`../domain-bar.js`) | Modify (5 files) |
| `vulns/*.html` (23 files) | Add bar + script (`../domain-bar.js`) | Modify (23 files) |
| `report/index.html`, `report/finding.html`, `report/draft.html` | Add bar + script (`../domain-bar.js`) | Modify (3 files) |

Five tasks. Each ends with one commit on `gh-pages`.

---

## Task 1 — Build the domain-bar script + CSS, integrate with `index.html` only

**Goal of this task:** Create `domain-bar.js`, append the supporting CSS to `vulns/style.css`, and wire both into `index.html` only — so we have a single working test bed before mass-stamping every other page.

**Files:**
- Create: `domain-bar.js`
- Modify: `vulns/style.css` (append at end)
- Modify: `index.html` (insert script tag in `<head>`, insert bar HTML after `</nav>`)

- [ ] **Step 1: Create `domain-bar.js` at the repo root**

```javascript
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
  const TARGET_PATTERN = /(https?:\/\/)example\.com(?=[\/:?#"'\s<]|$)/g;
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
      ? original.replace(TARGET_PATTERN, '$1' + target)
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

  function onInput() {
    const v = inputEl.value.trim();
    if (v) {
      try { localStorage.setItem(STORAGE_KEY, v); }
      catch (e) { console.warn('[domain-bar] save failed', e); }
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    applyAll(v);
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
```

- [ ] **Step 2: Append the CSS block to `vulns/style.css`**

Append exactly this block to the END of `vulns/style.css`:

```css

/* ── Domain bar (site-wide target placeholder substitution) ── */
.domain-bar {
  position: sticky; top: 48px; z-index: 99;
  background: var(--surface); border-bottom: 1px solid var(--border);
  padding: 0.4rem 1.5rem;
  display: flex; align-items: center; gap: 0.75rem;
  font-size: 0.82rem; font-family: var(--font);
}
.domain-bar-label {
  display: inline-flex; align-items: center; gap: 0.4rem;
  color: var(--text-muted); font-weight: 600; white-space: nowrap;
}
.domain-bar input {
  flex: 1 1 auto; min-width: 12rem; max-width: 28rem;
  background: var(--surface2); border: 1px solid var(--border);
  color: var(--text); font-family: var(--mono);
  padding: 0.3rem 0.6rem; border-radius: 4px; font-size: 0.82rem;
}
.domain-bar input:focus { outline: none; border-color: var(--accent); }
.domain-bar button {
  background: transparent; border: 1px solid var(--border);
  color: var(--text-muted); font-family: var(--font);
  padding: 0.3rem 0.65rem; border-radius: 4px;
  font-size: 0.78rem; cursor: pointer; white-space: nowrap;
}
.domain-bar button:hover { border-color: var(--accent); color: var(--text); }
.domain-bar-status {
  margin-left: auto; padding: 0.2rem 0.6rem;
  border-radius: 999px; font-size: 0.72rem;
  font-weight: 700; letter-spacing: 0.03em; white-space: nowrap;
}
.domain-bar-status.active {
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
}
.domain-bar-status.inactive {
  background: var(--surface2); color: var(--text-muted);
  border: 1px solid var(--border);
}

@media (max-width: 768px) {
  .domain-bar { padding: 0.4rem 0.75rem; gap: 0.4rem; }
  .domain-bar-label { font-size: 0.72rem; }
  .domain-bar input { min-width: 8rem; }
  .domain-bar-status { padding: 0.2rem 0.4rem; font-size: 0.66rem; }
}

@media print {
  .domain-bar { display: none !important; }
}

/* ── Dork "Run on Google" buttons (used on vulns/google-dorking.html) ── */
.dork-row {
  display: flex; flex-direction: column; gap: 0.5rem;
  margin-bottom: 1.2rem;
}
.dork-run-btn {
  align-self: flex-start;
  background: var(--surface2); border: 1px solid var(--border);
  color: var(--text); border-radius: 6px;
  padding: 0.4rem 0.85rem; font-size: 0.82rem;
  font-family: var(--font); cursor: pointer;
  display: inline-flex; align-items: center; gap: 0.4rem;
  transition: all 0.15s;
}
.dork-run-btn:hover:not(:disabled) {
  border-color: var(--accent); color: var(--accent);
}
.dork-run-btn:disabled { opacity: 0.5; cursor: not-allowed; }
```

- [ ] **Step 3: Wire `domain-bar.js` into `index.html` head with `defer`**

In `index.html`, find the `<title>` line in the `<head>`. Insert this line directly after it:

```html
  <script src="domain-bar.js" defer></script>
```

The `defer` attribute ensures the script runs after HTML parsing but before `DOMContentLoaded`, which means snippet substitution happens essentially synchronously with first paint — minimal flicker.

- [ ] **Step 4: Insert the domain bar HTML into `index.html` immediately after `</nav>`**

Find the closing `</nav>` tag of the topnav block (the one that follows `<div class="nav-right">...</div></nav>`). Insert this block on the line right after `</nav>`:

```html

<div class="domain-bar" role="region" aria-label="Target domain bar">
  <span class="domain-bar-label">🎯 Target</span>
  <input type="text" id="db-target" placeholder="target.example.com"
         maxlength="253" autocomplete="off" inputmode="url"
         aria-label="Target domain">
  <button type="button" id="db-reset" title="Clear target and restore original snippets">↻ Reset</button>
  <span class="domain-bar-status inactive" id="db-status" aria-live="polite">○ Inactive</span>
</div>
```

- [ ] **Step 5: Smoke-test substitution locally**

```bash
cd "/home/eli/Development/application pentesting guide"
python3 -m http.server 8765 > /dev/null 2>&1 &
SERVER_PID=$!
sleep 1
echo "=== HTTP status ==="
for path in / /domain-bar.js /vulns/style.css; do
  c=$(/usr/bin/curl -s -o /dev/null -w '%{http_code}' "http://localhost:8765$path")
  echo "  $c  $path"
done

echo
echo "=== domain-bar.js exposes DomainBar global? ==="
/usr/bin/curl -s "http://localhost:8765/domain-bar.js" | grep -c 'global.DomainBar'

echo
echo "=== bar markup present in index.html? ==="
/usr/bin/curl -s "http://localhost:8765/index.html" | grep -cE 'domain-bar|db-target|db-reset|db-status'

kill $SERVER_PID 2>/dev/null
echo "=== server stopped ==="
```

Expected: all `200`; `global.DomainBar` count = 1; bar markup count ≥ 4 (one per id + one for the wrapper class).

- [ ] **Step 6: Manual browser test (operator step)**

Open `http://localhost:8765/index.html` in a browser:

1. The bar appears immediately below the topnav, sticky.
2. Status pill shows `○ Inactive`.
3. Type `target.acme.test` into the input. Status pill turns to `✓ Substituting` (orange/accent color).
4. Reload — input still shows `target.acme.test` (persisted in localStorage).
5. Click `↻ Reset` — input clears, status pill returns to `○ Inactive`.
6. Open the page in a second tab, change target there, watch tab 1 update without reload.

Note: index.html may have few/no `https://example.com` snippets, so the substitution may not be visually obvious from this page alone. We will validate substitution behavior on a vuln page in Task 2.

- [ ] **Step 7: Commit**

```bash
git add domain-bar.js vulns/style.css index.html
git commit -m "Add domain-bar.js + CSS + integrate with index.html (test bed)"
```

---

## Task 2 — Stamp the domain bar onto every other existing HTML page

**Goal:** Mechanically inject the same `<script src="..." defer>` tag and bar markup into all 32 remaining HTML pages: `thanks.html`, `web-pentest-playbook.html`, 5 day worksheets, 23 vuln pages, 3 report pages.

**Files modified:** All 32 HTML files except `index.html`. The Python script handles relative-path differences automatically (`domain-bar.js` for root pages, `../domain-bar.js` for pages in subdirectories).

- [ ] **Step 1: Run the idempotent stamp script**

```bash
cd "/home/eli/Development/application pentesting guide"
python3 - << 'PY'
from pathlib import Path
import re

# (relative_to_root_for_script_src, file_paths)
GROUPS = [
    ('domain-bar.js', ['thanks.html', 'web-pentest-playbook.html']),
    ('../domain-bar.js', [str(p) for p in sorted(Path('days').glob('day*.html'))]),
    ('../domain-bar.js', [str(p) for p in sorted(Path('vulns').glob('*.html'))]),
    ('../domain-bar.js', [str(p) for p in sorted(Path('report').glob('*.html'))]),
]

BAR_HTML = '''
<div class="domain-bar" role="region" aria-label="Target domain bar">
  <span class="domain-bar-label">🎯 Target</span>
  <input type="text" id="db-target" placeholder="target.example.com"
         maxlength="253" autocomplete="off" inputmode="url"
         aria-label="Target domain">
  <button type="button" id="db-reset" title="Clear target and restore original snippets">↻ Reset</button>
  <span class="domain-bar-status inactive" id="db-status" aria-live="polite">○ Inactive</span>
</div>
'''

modified = []
skipped_already = []
skipped_missing = []

for rel, files in GROUPS:
    script_tag = f'  <script src="{rel}" defer></script>\n'
    for fp in files:
        f = Path(fp)
        if not f.exists():
            skipped_missing.append(fp)
            continue
        src = f.read_text()
        changed = False

        # 1. Insert script tag in <head> if absent
        if 'domain-bar.js' not in src:
            # Insert directly before </head>
            new_src, n = re.subn(r'(\s*)</head>', script_tag + r'\1</head>', src, count=1)
            if n == 1:
                src = new_src
                changed = True
            else:
                print(f'  WARN no </head> found in {fp}')
                continue

        # 2. Insert bar markup after first </nav> if absent
        if 'id="db-target"' not in src:
            new_src, n = re.subn(r'(</nav>)', r'\1\n' + BAR_HTML.strip(), src, count=1)
            if n == 1:
                src = new_src
                changed = True
            else:
                print(f'  WARN no </nav> found in {fp}')

        if changed:
            f.write_text(src)
            modified.append(fp)
        else:
            skipped_already.append(fp)

print(f'\nModified: {len(modified)}')
for m in modified: print(f'  {m}')
print(f'\nAlready stamped (skipped): {len(skipped_already)}')
print(f'Missing files (skipped): {len(skipped_missing)}')
PY
```

Expected: ~32 files modified. Zero `WARN` messages. Re-running the script should report zero modifications (idempotent).

- [ ] **Step 2: Verify every page has both pieces**

```bash
cd "/home/eli/Development/application pentesting guide"
echo "=== files missing the script tag ==="
for f in thanks.html web-pentest-playbook.html days/day*.html vulns/*.html report/*.html; do
  grep -q 'domain-bar.js' "$f" || echo "  MISSING script: $f"
done
echo
echo "=== files missing the bar markup ==="
for f in thanks.html web-pentest-playbook.html days/day*.html vulns/*.html report/*.html; do
  grep -q 'id="db-target"' "$f" || echo "  MISSING markup: $f"
done
echo
echo "=== count of stamped files ==="
echo "  script-tag count: $(grep -lc 'domain-bar.js' thanks.html web-pentest-playbook.html days/day*.html vulns/*.html report/*.html | grep -c ':1')"
echo "  bar-markup count: $(grep -lc 'id=.db-target.' thanks.html web-pentest-playbook.html days/day*.html vulns/*.html report/*.html | grep -c ':1')"
```

Expected: zero MISSING messages; both counts equal 32 (1 thanks + 1 playbook + 5 days + 23 vulns + 3 report = 32 files modified, plus index.html from Task 1 = 33 total).

- [ ] **Step 3: Smoke-test substitution on a real vuln page**

```bash
cd "/home/eli/Development/application pentesting guide"
python3 -m http.server 8765 > /dev/null 2>&1 &
SERVER_PID=$!
sleep 1

echo "=== HTTP status across one page from each group ==="
for path in /index.html /thanks.html /web-pentest-playbook.html /days/day1.html /vulns/sqli.html /vulns/xss.html /report/index.html; do
  c=$(/usr/bin/curl -s -o /dev/null -w '%{http_code}' "http://localhost:8765$path")
  echo "  $c  $path"
done

echo
echo "=== bar markup live on vulns/xss.html? ==="
/usr/bin/curl -s "http://localhost:8765/vulns/xss.html" | grep -c 'db-target'

echo
echo "=== script tag uses correct relative path on vulns/xss.html? ==="
/usr/bin/curl -s "http://localhost:8765/vulns/xss.html" | grep -E 'domain-bar.js'

kill $SERVER_PID 2>/dev/null
echo "=== server stopped ==="
```

Expected: every path is `200`; bar markup count = 1 on xss.html; script src is `../domain-bar.js`.

- [ ] **Step 4: Manual browser test of substitution (operator step)**

Open `http://localhost:8765/vulns/xss.html` (which has many `https://example.com` snippets):

1. With no target set: snippets show `https://example.com` as authored.
2. Type `target.acme.test` in the bar at top. Every `https://example.com` URL in `<pre>`/`<code>` blocks updates to `https://target.acme.test` in place.
3. Verify `attacker@example.com` (or any email) is NOT substituted.
4. Verify `https://example.com.attacker.com` (chained subdomain — present in `days/day5.html`) is NOT substituted.
5. Open `vulns/xss.html` in a second tab — already-set target persists, snippets are pre-substituted on load.
6. Click `↻ Reset` — snippets revert to original `example.com` placeholders.

- [ ] **Step 5: Commit**

```bash
git add thanks.html web-pentest-playbook.html days/day*.html vulns/*.html report/*.html
git commit -m "Stamp domain bar onto every page (32 files): script tag + sticky bar markup"
```

---

## Task 3 — Build `vulns/google-dorking.html`

**Goal:** Create a new vuln-style page presenting six categories of Google dorks with copy-pastable snippets and one-click "Run on Google" buttons that prefill the target via the domain bar.

**Files:**
- Create: `vulns/google-dorking.html`

- [ ] **Step 1: Create the file**

Create `vulns/google-dorking.html` with EXACTLY this content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style id="cj-guard">html{display:none!important}</style>
  <script>(function(){if(self===top){var s=document.getElementById('cj-guard');if(s)s.parentNode.removeChild(s);}else{try{top.location.href=self.location.href;}catch(e){}}})();</script>
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ff6633' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/%3E%3C/svg%3E">
  <link rel="stylesheet" href="style.css">
  <script src="../domain-bar.js" defer></script>
  <title>Google Dorking & OSINT Recon · Web Pentest Playbook</title>
</head>
<body>

<svg class="icon-sprite" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <symbol id="icon-shield" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></symbol>
    <symbol id="icon-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></symbol>
  </defs>
</svg>

<nav class="topnav" aria-label="Primary">
  <div class="nav-logo">
    <a href="../index.html" class="logo-link">
      <div class="logo-icon"><svg class="icon" aria-hidden="true"><use href="#icon-shield"/></svg></div>
      <span class="logo-text">Web Pentest</span>
      <span class="logo-tag">v2026</span>
    </a>
  </div>
  <div class="nav-center">
    <a href="../index.html" class="nav-link">Home</a>
    <a href="../index.html#vulns" class="nav-link active">Vulnerabilities</a>
    <a href="../web-pentest-playbook.html" class="nav-link">Playbook</a>
    <a href="../days/day1.html" class="nav-link">Worksheets</a>
    <a href="../report/index.html" class="nav-link">Report</a>
  </div>
  <div class="nav-right">
    <a href="https://github.com/eligof/WebSec" target="_blank" rel="noopener noreferrer" class="nav-link" style="font-size:0.78rem;">GitHub</a>
    <button class="theme-toggle" id="theme-toggle" aria-label="Toggle color theme">☀ Light</button>
  </div>
</nav>

<div class="domain-bar" role="region" aria-label="Target domain bar">
  <span class="domain-bar-label">🎯 Target</span>
  <input type="text" id="db-target" placeholder="target.example.com"
         maxlength="253" autocomplete="off" inputmode="url"
         aria-label="Target domain">
  <button type="button" id="db-reset" title="Clear target and restore original snippets">↻ Reset</button>
  <span class="domain-bar-status inactive" id="db-status" aria-live="polite">○ Inactive</span>
</div>

<div class="content-wrap" style="padding-top:2rem">
  <div class="day-page-hero" style="--day-color: var(--accent)">
    <div class="day-num">Recon · OSINT</div>
    <h1>🔎 Google Dorking & OSINT Recon</h1>
    <p>Search-engine queries that surface forgotten files, login portals, error messages, leaked credentials, and old cached pages — the cheapest first step of any engagement. Set your <strong>target</strong> in the bar above and every dork below auto-fills with it.</p>
  </div>

  <section class="worksheet-section" style="border-left: 3px solid var(--warn); background: color-mix(in srgb, var(--warn) 6%, transparent);">
    <h2 style="color: var(--warn);">⚠ Stay legal</h2>
    <p>Aggressive recon against systems you don't own (or aren't explicitly authorized to test) is illegal in most jurisdictions. <strong>Only run these against targets in your engagement scope.</strong> Pure observation of indexed public results is generally fine; clicking through into discovered admin panels, downloading exposed databases, or pivoting to chained exploits without authorization is not.</p>
  </section>

  <section class="worksheet-section">
    <h2><span class="ws-section-num">1</span>Operator primer</h2>
    <p class="ws-intro">Combine these operators with parentheses, <code>OR</code>, and the leading minus <code>-</code> for exclusions.</p>
    <ul>
      <li><code>site:</code> — restrict to a domain (<code>site:example.com</code>) or subdomain pattern (<code>site:*.example.com</code>).</li>
      <li><code>inurl:</code> — match a substring in the URL path. Useful for admin panels, login pages, sensitive endpoints.</li>
      <li><code>intitle:</code> — match in the HTML <code>&lt;title&gt;</code>. Catches "Index of /", "Login", "phpMyAdmin".</li>
      <li><code>intext:</code> — match in page body text. Use for error messages, leaked tokens, credential strings.</li>
      <li><code>filetype:</code> / <code>ext:</code> — restrict to a file extension (<code>.env</code>, <code>.sql</code>, <code>.bak</code>, <code>.log</code>).</li>
      <li><code>cache:</code> — view Google's cached snapshot of a URL (<code>cache:example.com/login</code>). Survives takedowns briefly.</li>
      <li><code>-term</code> / <code>-site:foo.com</code> — exclude. Combine to filter out marketing pages.</li>
    </ul>
  </section>

  <section class="worksheet-section">
    <h2><span class="ws-section-num">2</span>🔓 Sensitive files & backups</h2>
    <p class="ws-intro">Forgotten env files, raw SQL dumps, backups, and config files left in webroot.</p>
    <div class="dork-row">
      <pre class="snippet"><span class="snippet-label">Public .env files (DB creds, API keys, JWT secrets)</span><code>site:example.com filetype:env</code></pre>
      <button class="dork-run-btn" type="button" data-query="site:example.com filetype:env" disabled>🔍 Run on Google (set target first)</button>
    </div>
    <div class="dork-row">
      <pre class="snippet"><span class="snippet-label">SQL dumps left in webroot</span><code>site:example.com filetype:sql</code></pre>
      <button class="dork-run-btn" type="button" data-query="site:example.com filetype:sql" disabled>🔍 Run on Google (set target first)</button>
    </div>
    <div class="dork-row">
      <pre class="snippet"><span class="snippet-label">App / web-server log files (often contain tokens, IPs, query strings)</span><code>site:example.com filetype:log</code></pre>
      <button class="dork-run-btn" type="button" data-query="site:example.com filetype:log" disabled>🔍 Run on Google (set target first)</button>
    </div>
    <div class="dork-row">
      <pre class="snippet"><span class="snippet-label">Public WordPress config (DB password)</span><code>site:example.com inurl:wp-config.php</code></pre>
      <button class="dork-run-btn" type="button" data-query="site:example.com inurl:wp-config.php" disabled>🔍 Run on Google (set target first)</button>
    </div>
    <div class="dork-row">
      <pre class="snippet"><span class="snippet-label">Editor / VCS backup files</span><code>site:example.com (ext:bak | ext:old | ext:swp | ext:backup)</code></pre>
      <button class="dork-run-btn" type="button" data-query="site:example.com (ext:bak | ext:old | ext:swp | ext:backup)" disabled>🔍 Run on Google (set target first)</button>
    </div>
  </section>

  <section class="worksheet-section">
    <h2><span class="ws-section-num">3</span>🚪 Login & admin surfaces</h2>
    <p class="ws-intro">Public-facing admin consoles and login forms to fingerprint and prioritize.</p>
    <div class="dork-row">
      <pre class="snippet"><span class="snippet-label">Generic admin panels</span><code>site:example.com inurl:admin</code></pre>
      <button class="dork-run-btn" type="button" data-query="site:example.com inurl:admin" disabled>🔍 Run on Google (set target first)</button>
    </div>
    <div class="dork-row">
      <pre class="snippet"><span class="snippet-label">Login pages by URL</span><code>site:example.com inurl:login</code></pre>
      <button class="dork-run-btn" type="button" data-query="site:example.com inurl:login" disabled>🔍 Run on Google (set target first)</button>
    </div>
    <div class="dork-row">
      <pre class="snippet"><span class="snippet-label">Login pages by title</span><code>site:example.com intitle:"login"</code></pre>
      <button class="dork-run-btn" type="button" data-query='site:example.com intitle:"login"' disabled>🔍 Run on Google (set target first)</button>
    </div>
    <div class="dork-row">
      <pre class="snippet"><span class="snippet-label">WordPress login</span><code>site:example.com inurl:wp-login</code></pre>
      <button class="dork-run-btn" type="button" data-query="site:example.com inurl:wp-login" disabled>🔍 Run on Google (set target first)</button>
    </div>
    <div class="dork-row">
      <pre class="snippet"><span class="snippet-label">phpMyAdmin (often default creds in old installs)</span><code>site:example.com inurl:phpmyadmin</code></pre>
      <button class="dork-run-btn" type="button" data-query="site:example.com inurl:phpmyadmin" disabled>🔍 Run on Google (set target first)</button>
    </div>
  </section>

  <section class="worksheet-section">
    <h2><span class="ws-section-num">4</span>💥 Error & config disclosure</h2>
    <p class="ws-intro">Indexed error pages and stack traces — instant leads on tech stack and injection points.</p>
    <div class="dork-row">
      <pre class="snippet"><span class="snippet-label">SQL syntax errors (instant SQLi candidate)</span><code>site:example.com intext:"sql syntax near"</code></pre>
      <button class="dork-run-btn" type="button" data-query='site:example.com intext:"sql syntax near"' disabled>🔍 Run on Google (set target first)</button>
    </div>
    <div class="dork-row">
      <pre class="snippet"><span class="snippet-label">PHP include warnings (LFI candidate)</span><code>site:example.com intext:"warning: include"</code></pre>
      <button class="dork-run-btn" type="button" data-query='site:example.com intext:"warning: include"' disabled>🔍 Run on Google (set target first)</button>
    </div>
    <div class="dork-row">
      <pre class="snippet"><span class="snippet-label">PHP fatal errors</span><code>site:example.com intext:"fatal error"</code></pre>
      <button class="dork-run-btn" type="button" data-query='site:example.com intext:"fatal error"' disabled>🔍 Run on Google (set target first)</button>
    </div>
    <div class="dork-row">
      <pre class="snippet"><span class="snippet-label">phpinfo() pages (full env disclosure)</span><code>site:example.com intitle:"phpinfo()"</code></pre>
      <button class="dork-run-btn" type="button" data-query='site:example.com intitle:"phpinfo()"' disabled>🔍 Run on Google (set target first)</button>
    </div>
    <div class="dork-row">
      <pre class="snippet"><span class="snippet-label">Spring Boot Whitelabel error</span><code>site:example.com intext:"Whitelabel Error Page"</code></pre>
      <button class="dork-run-btn" type="button" data-query='site:example.com intext:"Whitelabel Error Page"' disabled>🔍 Run on Google (set target first)</button>
    </div>
  </section>

  <section class="worksheet-section">
    <h2><span class="ws-section-num">5</span>🌐 Subdomain & directory discovery</h2>
    <p class="ws-intro">Pivot from the apex domain to forgotten subdomains and open directories.</p>
    <div class="dork-row">
      <pre class="snippet"><span class="snippet-label">Subdomain enumeration via Google index</span><code>site:*.example.com</code></pre>
      <button class="dork-run-btn" type="button" data-query="site:*.example.com" disabled>🔍 Run on Google (set target first)</button>
    </div>
    <div class="dork-row">
      <pre class="snippet"><span class="snippet-label">Subdomains excluding www (where the interesting stuff lives)</span><code>site:example.com -www</code></pre>
      <button class="dork-run-btn" type="button" data-query="site:example.com -www" disabled>🔍 Run on Google (set target first)</button>
    </div>
    <div class="dork-row">
      <pre class="snippet"><span class="snippet-label">Open directory listings</span><code>site:example.com intitle:"index of"</code></pre>
      <button class="dork-run-btn" type="button" data-query='site:example.com intitle:"index of"' disabled>🔍 Run on Google (set target first)</button>
    </div>
    <div class="dork-row">
      <pre class="snippet"><span class="snippet-label">Visible robots.txt entries (path leaks)</span><code>site:example.com inurl:robots.txt</code></pre>
      <button class="dork-run-btn" type="button" data-query="site:example.com inurl:robots.txt" disabled>🔍 Run on Google (set target first)</button>
    </div>
  </section>

  <section class="worksheet-section">
    <h2><span class="ws-section-num">6</span>🔑 Code & cloud disclosure</h2>
    <p class="ws-intro">Often the most damaging finds — credentials and configs leaked to public repos / paste sites / cloud buckets.</p>
    <div class="dork-row">
      <pre class="snippet"><span class="snippet-label">Code leaks on GitHub mentioning the target</span><code>site:github.com "example.com"</code></pre>
      <button class="dork-run-btn" type="button" data-query='site:github.com "example.com"' disabled>🔍 Run on Google (set target first)</button>
    </div>
    <div class="dork-row">
      <pre class="snippet"><span class="snippet-label">GitLab leaks with credentials</span><code>site:gitlab.com "example.com" "password"</code></pre>
      <button class="dork-run-btn" type="button" data-query='site:gitlab.com "example.com" "password"' disabled>🔍 Run on Google (set target first)</button>
    </div>
    <div class="dork-row">
      <pre class="snippet"><span class="snippet-label">Public S3 buckets referencing the target</span><code>site:s3.amazonaws.com "example.com"</code></pre>
      <button class="dork-run-btn" type="button" data-query='site:s3.amazonaws.com "example.com"' disabled>🔍 Run on Google (set target first)</button>
    </div>
    <div class="dork-row">
      <pre class="snippet"><span class="snippet-label">Trello boards leaked credentials</span><code>site:trello.com "example.com"</code></pre>
      <button class="dork-run-btn" type="button" data-query='site:trello.com "example.com"' disabled>🔍 Run on Google (set target first)</button>
    </div>
    <div class="dork-row">
      <pre class="snippet"><span class="snippet-label">Pastebin leaks</span><code>site:pastebin.com "example.com"</code></pre>
      <button class="dork-run-btn" type="button" data-query='site:pastebin.com "example.com"' disabled>🔍 Run on Google (set target first)</button>
    </div>
  </section>

  <section class="worksheet-section">
    <h2><span class="ws-section-num">7</span>📜 Old / cached content</h2>
    <p class="ws-intro">Survive takedowns and find old endpoints / forgotten subdomains.</p>
    <div class="dork-row">
      <pre class="snippet"><span class="snippet-label">Google's cached snapshot</span><code>cache:example.com/login</code></pre>
      <button class="dork-run-btn" type="button" data-query="cache:example.com/login" disabled>🔍 Run on Google (set target first)</button>
    </div>
    <div class="dork-row">
      <pre class="snippet"><span class="snippet-label">Wayback Machine archived pages</span><code>site:web.archive.org "example.com"</code></pre>
      <button class="dork-run-btn" type="button" data-query='site:web.archive.org "example.com"' disabled>🔍 Run on Google (set target first)</button>
    </div>
    <div class="dork-row">
      <pre class="snippet"><span class="snippet-label">Indexed PDFs (often forgotten internal docs)</span><code>site:example.com filetype:pdf</code></pre>
      <button class="dork-run-btn" type="button" data-query="site:example.com filetype:pdf" disabled>🔍 Run on Google (set target first)</button>
    </div>
  </section>

  <section class="worksheet-section">
    <h2><span class="ws-section-num">8</span>🛡 Defending against dorks</h2>
    <p class="ws-intro">If you're on the blue side, here's how to keep your target out of these results.</p>
    <ul>
      <li><strong>Don't rely on robots.txt for security.</strong> It's a hint to crawlers, not an access control. Anything sensitive must require authentication.</li>
      <li><strong>Audit public S3 buckets and GitHub orgs.</strong> Use tools like <code>truffleHog</code>, <code>gitleaks</code>, and AWS Config rules to catch leaks before crawlers do.</li>
      <li><strong>Never commit credentials to source control.</strong> Use environment variables, secret managers (AWS SM, HashiCorp Vault), and pre-commit hooks (<code>git-secrets</code>) to enforce.</li>
      <li><strong>Monitor your domain in Google.</strong> A weekly <code>site:yourdomain.com</code> review (or Google Alerts on sensitive substrings) catches surprises early.</li>
      <li><strong>Use the Search Console "Removals" tool</strong> for rapid takedown of accidentally-indexed sensitive pages — it removes from results within hours, but is no substitute for fixing the root cause.</li>
      <li><strong>Disable directory listings</strong> at the web-server level (<code>Options -Indexes</code> in Apache, <code>autoindex off;</code> in nginx).</li>
    </ul>
  </section>

  <section class="worksheet-section">
    <h2><span class="ws-section-num">9</span>📚 Cross-references</h2>
    <ul>
      <li>Day 1 worksheet — <a href="../days/day1.html">recon scoping & target enumeration</a>.</li>
      <li><a href="../web-pentest-playbook.html">Web pentest playbook</a> — full engagement workflow.</li>
      <li><a href="host-header.html">Host Header Injection</a> — often surfaces from `intitle:"index of"` finds.</li>
      <li><a href="idor.html">IDOR</a> — admin panels found via dorks are common IDOR sources.</li>
      <li>Google Hacking Database (GHDB) — <a href="https://www.exploit-db.com/google-hacking-database" target="_blank" rel="noopener noreferrer">exploit-db.com/google-hacking-database</a> — community-maintained dork list.</li>
    </ul>
  </section>

</div>

<script>
  // Theme toggle
  (function(){
    var t = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
    var btn = document.getElementById('theme-toggle');
    if(btn){
      btn.textContent = t === 'dark' ? '☀ Light' : '🌙 Dark';
      btn.addEventListener('click', function(){
        var n = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', n);
        localStorage.setItem('theme', n);
        btn.textContent = n === 'dark' ? '☀ Light' : '🌙 Dark';
      });
    }
  })();

  // Dork run-button click handlers
  document.querySelectorAll('.dork-run-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      var target = localStorage.getItem('shared.target') || '';
      if (!target) return; // disabled-styled by domain-bar.js when no target
      var dork = btn.getAttribute('data-query') || '';
      var substituted = dork.replace(/example\.com/g, target);
      var url = 'https://www.google.com/search?q=' + encodeURIComponent(substituted);
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  });
</script>

</body>
</html>
```

- [ ] **Step 2: Smoke-test the page**

```bash
cd "/home/eli/Development/application pentesting guide"
python3 -m http.server 8765 > /dev/null 2>&1 &
SERVER_PID=$!
sleep 1
echo "=== HTTP status ==="
c=$(/usr/bin/curl -s -o /dev/null -w '%{http_code}' "http://localhost:8765/vulns/google-dorking.html")
echo "  $c  /vulns/google-dorking.html"
echo
echo "=== Dork count (expect ~28 dork rows) ==="
/usr/bin/curl -s "http://localhost:8765/vulns/google-dorking.html" | grep -c 'class="dork-row"'
echo
echo "=== Run buttons (expect equal to dork count) ==="
/usr/bin/curl -s "http://localhost:8765/vulns/google-dorking.html" | grep -c 'dork-run-btn'
echo
echo "=== Bar markup present ==="
/usr/bin/curl -s "http://localhost:8765/vulns/google-dorking.html" | grep -c 'id="db-target"'
kill $SERVER_PID 2>/dev/null
echo "=== server stopped ==="
```

Expected: `200`; dork-row count = 27 (5+5+5+4+5+3); run-button count = 27 (equal to dork count); bar markup count = 1.

- [ ] **Step 3: Manual browser test (operator step)**

Open `http://localhost:8765/vulns/google-dorking.html`:

1. Page renders with hero, legal callout, operator primer, six dork categories, defensive notes, cross-references.
2. With no target set: Run buttons read `🔍 Run on Google (set target first)` and are visually disabled.
3. Set target `vuln.lab.test` in the bar. Snippets update from `site:example.com` → `site:vuln.lab.test`. Run buttons now read `🔍 Run on Google` and are enabled.
4. Click any Run button — Google opens in a new tab with the substituted dork prefilled in the query.

- [ ] **Step 4: Commit**

```bash
git add vulns/google-dorking.html
git commit -m "Add vulns/google-dorking.html — 6 dork categories with one-click Google launch"
```

---

## Task 4 — Add Google Dorking card + pill to homepage; add link in playbook

**Goal:** Make the new dorks page discoverable from the homepage's vuln-grid and at-a-glance pills, and from the playbook's recon section.

**Files:**
- Modify: `index.html` (insert one vuln-card and one vuln-pill)
- Modify: `web-pentest-playbook.html` (insert one recon link)

- [ ] **Step 1: Insert Google Dorking card into the vuln-grid**

In `index.html`, find the GraphQL card (around line 400-410) and the IDOR card (line 412+) — Google Dorking goes alphabetically between them.

Use Edit to insert this card directly AFTER the closing `</a>` of the GraphQL card and BEFORE the opening `<a class="vuln-card" href="vulns/idor.html"`:

```html

      <a class="vuln-card" href="vulns/google-dorking.html" data-search="google dorking osint recon search operators site filetype inurl intitle subdomain enumeration leak credentials" style="--card-accent:#ffb86c">
        <div class="card-header">
          <div class="card-icon"><svg class="icon" aria-hidden="true"><use href="#icon-search"/></svg></div>
          <div>
            <div class="card-name">Google Dorking & OSINT</div>
            <div class="card-abbr">Recon</div>
          </div>
        </div>
        <div class="card-desc">Surface forgotten files, login portals, error pages, and leaked credentials with search-engine operators.</div>
        <div class="card-footer"><span class="sev sev-info">Info</span></div>
      </a>
```

Note: this card uses `#icon-search`, which is already defined in `index.html`'s icon-sprite SVG block (line 23). No symbol addition needed.

- [ ] **Step 2: Insert Google Dorking pill into the at-a-glance section**

In `index.html`, the at-a-glance pill list contains a Host Header pill at line 327. Use Edit to insert this new pill on the line directly BEFORE the Host Header pill, preserving alphabetical order:

```html
        <a class="vuln-pill" href="vulns/google-dorking.html"><svg class="icon" aria-hidden="true"><use href="#icon-search"/></svg>Google Dorking<span class="pill-sev sev-info">Info</span></a>
```

The full Edit `old_string` should anchor on the exact existing Host Header pill line (so the Edit fails fast if the file shifted):

```
        <a class="vuln-pill" href="vulns/host-header.html"><svg class="icon" aria-hidden="true"><use href="#icon-tag"/></svg>Host Header<span class="pill-sev sev-high">High</span></a>
```

And the `new_string` is the new pill followed by the same Host Header line (so the Host Header pill is preserved unchanged below the new one).

- [ ] **Step 3: Insert recon link into the playbook**

In `web-pentest-playbook.html`, the recon section is a `<h2 id="recon">` followed by a `<table>` of tools (rows like `<tr><td>subfinder</td><td>Passive subdomain enum</td><td><code>...</code></td></tr>`). The table starts around line 2196 and ends with `</tbody>` around line 2211.

Use Edit to insert this row directly AFTER the existing `<tr><td>subfinder</td>...</tr>` row (line ~2199) and BEFORE the next row, so Google dorking appears at the top of the recon-tools table:

```html
      <tr><td><a href="vulns/google-dorking.html">Google dorking</a></td><td>Index-driven OSINT</td><td><code>site:target.com filetype:env</code></td></tr>
```

(The `target.com` placeholder used here matches the rest of the table's convention. The domain bar's substitution targets `https?://example.com` and won't touch `target.com` — leaving the playbook table consistent. A separate future plan could broaden substitution to also handle `target.com`.)

- [ ] **Step 4: Smoke-test the integration**

```bash
cd "/home/eli/Development/application pentesting guide"
python3 -m http.server 8765 > /dev/null 2>&1 &
SERVER_PID=$!
sleep 1
echo "=== Cards/pills/link landed ==="
echo "  vuln-card on index.html: $(/usr/bin/curl -s "http://localhost:8765/index.html" | grep -c 'vulns/google-dorking.html')"
echo "  link on playbook: $(/usr/bin/curl -s "http://localhost:8765/web-pentest-playbook.html" | grep -c 'vulns/google-dorking.html')"
echo
echo "=== icon-search symbol present on index.html ==="
/usr/bin/curl -s "http://localhost:8765/index.html" | grep -c 'id="icon-search"'
kill $SERVER_PID 2>/dev/null
echo "=== server stopped ==="
```

Expected: index.html has ≥ 2 references (one card + one pill); playbook has ≥ 1 reference; icon-search symbol present (1).

- [ ] **Step 5: Commit**

```bash
git add index.html web-pentest-playbook.html
git commit -m "Wire Google Dorking into homepage vuln-grid + at-a-glance pills + playbook recon"
```

---

## Task 5 — Local verification + push + verify live + final cross-task review

**Files:** none modified (verification + deployment only)

- [ ] **Step 1: Comprehensive local smoke test**

```bash
cd "/home/eli/Development/application pentesting guide"
python3 -m http.server 8765 > /dev/null 2>&1 &
SERVER_PID=$!
sleep 1
echo "=== HTTP status across representative pages ==="
for path in / /domain-bar.js /vulns/style.css \
           /vulns/google-dorking.html /vulns/sqli.html /vulns/xss.html \
           /index.html /thanks.html /web-pentest-playbook.html \
           /days/day1.html /days/day5.html \
           /report/index.html /report/finding.html /report/draft.html; do
  c=$(/usr/bin/curl -s -o /dev/null -w '%{http_code}' "http://localhost:8765$path")
  echo "  $c  $path"
done
echo
echo "=== domain-bar.js reachable from every section ==="
echo "  root:    $(/usr/bin/curl -s -o /dev/null -w '%{http_code}' http://localhost:8765/domain-bar.js)"
echo
echo "=== bar markup count across all stamped pages (expect 33) ==="
total=0
for f in index.html thanks.html web-pentest-playbook.html days/day*.html vulns/*.html report/*.html; do
  has=$(grep -c 'id="db-target"' "$f")
  total=$((total + has))
done
echo "  $total"
echo
echo "=== Google Dorking page sanity ==="
/usr/bin/curl -s "http://localhost:8765/vulns/google-dorking.html" | grep -cE 'dork-row|dork-run-btn'
kill $SERVER_PID 2>/dev/null
echo "=== server stopped ==="
```

Expected: every path is `200`; bar markup count = 33 (1 index + 1 thanks + 1 playbook + 5 days + 24 vulns including dorking + 3 report); dork-row + run-btn counts on dorking page are both > 25.

- [ ] **Step 2: Push to gh-pages**

```bash
cd "/home/eli/Development/application pentesting guide"
git push origin gh-pages
```

- [ ] **Step 3: Wait for GitHub Pages build**

```bash
SHA=$(git rev-parse HEAD | cut -c1-7)
echo "Watching for Pages build of $SHA..."
for i in $(seq 1 24); do
  s=$(gh api /repos/eligof/WebSec/pages/builds/latest --jq '"\(.commit[0:7]) \(.status)"' 2>/dev/null)
  echo "  attempt $i: $s"
  echo "$s" | grep -qE "^$SHA built" && { echo "Built ✅"; break; }
  sleep 8
done
```

- [ ] **Step 4: Verify live**

```bash
CB=$(date +%s)
echo "=== Live HTTP status ==="
for path in /domain-bar.js /vulns/google-dorking.html /index.html /vulns/xss.html /days/day1.html /report/finding.html; do
  c=$(/usr/bin/curl -sL -o /dev/null -w '%{http_code}' "https://eligof.github.io/WebSec$path?$CB")
  echo "  $c  $path"
done
echo
echo "=== Live: domain-bar.js exposes DomainBar global ==="
/usr/bin/curl -s "https://eligof.github.io/WebSec/domain-bar.js?$CB" | grep -c 'global.DomainBar'
echo
echo "=== Live: bar markup on vulns/xss.html ==="
/usr/bin/curl -s "https://eligof.github.io/WebSec/vulns/xss.html?$CB" | grep -c 'id="db-target"'
echo
echo "=== Live: dork rows on dorking page ==="
/usr/bin/curl -s "https://eligof.github.io/WebSec/vulns/google-dorking.html?$CB" | grep -c 'dork-row'
echo
echo "=== Live: substitution helpers in domain-bar.js ==="
js=$(/usr/bin/curl -s "https://eligof.github.io/WebSec/domain-bar.js?$CB")
for fn in walkSnippetTextNodes snapshot applyTo applyAll updateStatus updateRunButtons watchDynamic init; do
  c=$(echo "$js" | grep -c "$fn")
  echo "  $fn: $c"
done
```

Expected: every path is `200`; DomainBar count = 1; bar markup = 1 on xss.html; dork rows ≥ 27; every helper function ≥ 1 reference.

- [ ] **Step 5: Manual browser sanity check (operator step)**

In a real browser at https://eligof.github.io/WebSec/:

1. Open homepage. Domain bar visible below topnav.
2. Set target `target.acme.test`. Status pill turns active.
3. Click into `vulns/xss.html`. Bar shows `target.acme.test` (persisted). Snippets show `https://target.acme.test/...` instead of `https://example.com/...`.
4. Verify `attacker@example.com` (email examples) and `https://example.com.attacker.com` (chained domain in day5) are unchanged.
5. Click into `vulns/google-dorking.html`. Run buttons enabled. Click one — Google opens in new tab with the dork prefilled (`site:target.acme.test ...`).
6. Click `↻ Reset` from anywhere. All snippets revert. Run buttons disabled.

- [ ] **Step 6: Run a final cross-task code review**

Dispatch a code-reviewer subagent against the cumulative diff `<base SHA>..<head SHA>` where base SHA is `28276ce` (the previous gh-pages tip after the reporting layer + cleanup) and head SHA is the current HEAD after Task 5 push. Brief the reviewer on:

- Domain-bar.js architecture (IIFE, WeakMap of text-node originals, MutationObserver scope, regex semantics)
- Substitution scope (text nodes inside `pre/code/.snippet` — never touches attributes or markup, never uses innerHTML)
- The dork-page run-button click handler (in dorks page inline script, NOT in domain-bar.js)
- 33 pages were stamped via Python script; verify only the 2 expected lines were added per page (script tag + bar markup) with no drive-by edits

Address any Important / Critical issues found via fix subagent + re-review loop, same pattern as the reporting-layer execution.

---

## Self-review checklist

Before declaring the plan done, verify:

- [ ] **Spec coverage** — every requirement from the design spec is implemented:
  - [ ] Smart-regex substitution that skips emails and chained subdomains (✓ Task 1 — TARGET_PATTERN with lookahead)
  - [ ] Sticky bar below topnav with input + reset + status pill (✓ Task 1 — CSS + HTML; sticky at top:48px to clear topnav)
  - [ ] localStorage persistence under `shared.target` (✓ Task 1)
  - [ ] Cross-tab `storage` event sync (✓ Task 1 — onStorage handler)
  - [ ] WeakMap of text-node originals for re-substitution (✓ Task 1 — originals + snapshot/applyTo)
  - [ ] MutationObserver for dynamically added snippets (✓ Task 1 — watchDynamic)
  - [ ] Bar stamped onto every existing page (✓ Task 2 — 32 files)
  - [ ] vulns/google-dorking.html with 6 categories of dorks (✓ Task 3)
  - [ ] One-click "Run on Google" buttons that prefill target (✓ Task 3 — inline script handler)
  - [ ] Dork page card on homepage vuln-grid (✓ Task 4)
  - [ ] Dork page link in playbook recon section (✓ Task 4)
  - [ ] Live verification + final review (✓ Task 5)
- [ ] **No placeholders** — all code blocks contain real implementations
- [ ] **Type consistency** — function names match across tasks: `walkSnippetTextNodes`, `snapshot`, `applyTo`, `applyAll`, `updateStatus`, `updateRunButtons`, `onInput`, `onReset`, `onStorage`, `watchDynamic`, `init`. Storage key consistent: `shared.target`. Selector constant: `pre, code, .snippet`. Run-btn class: `.dork-run-btn`. Run-btn data attr: `data-query`.
- [ ] **Frequent commits** — five tasks, five commits.

## Out of scope (future plans)

- Multi-target / scope file (engagement scope with multiple URLs) — could integrate with the reporting layer's engagement section.
- Per-snippet override (right-click a snippet to keep its `example.com` even when bar is set).
- Additional search engines on dorks page (Bing, Shodan, GitHub code search, Wayback) as one-click buttons.
- "Save dork to findings" — push a dork hit into the reporting layer as a finding draft.
- A `recon/` top-level directory for future recon pages (subfinder, wayback, certificate transparency).
