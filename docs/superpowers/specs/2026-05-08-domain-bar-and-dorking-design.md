# Domain Bar + Google Dorking — Design Spec

**Date:** 2026-05-08
**Branch:** `gh-pages`
**Scope:** A site-wide "target domain" bar that dynamically substitutes the
`example.com` placeholder in code snippets, plus a new `vulns/google-dorking.html`
page that consumes the bar.

---

## Goal

Two related features that ship together:

1. **Domain bar** — a sticky strip below the topnav on every page where the
   user enters their authorized engagement target (e.g. `target.example.com`).
   Any `<pre>`, `<code>`, or `.snippet` element containing
   `https://example.com` (or `http://example.com`) is rewritten in-place to
   show the user's target. Persists in `localStorage['shared.target']`.
   Cross-tab synced via the `storage` event.

2. **Google Dorking page** — a new vuln/recon page (`vulns/google-dorking.html`)
   with six categories of dorks as copy-pastable snippets, each with a
   one-click "🔍 Run on Google" button that opens a search prefilled with the
   user's target (via the same domain bar mechanism).

The two features are co-designed because the dorks page is the showcase
consumer of the domain bar — `site:target.example.com` is dramatically more
useful when prefilled.

## Non-goals

- No backend, no third-party CDN, no fingerprinting.
- No support for multi-target / multi-tenant scoping in v1 (one target at a time).
- No support for substituting attacker domains, victim emails, or other
  placeholders. Only the `https?://example.com` URL pattern.
- No support for arbitrary search engines beyond Google in the dork "Run"
  buttons. (Future work could add Bing/Shodan/etc.)

## Architecture

### Domain bar — substitution rule

A single regex applied to every static `<pre>`, `<code>`, and `.snippet`
element on the page (and to dynamically inserted ones via MutationObserver):

```js
const TARGET_PATTERN = /(https?:\/\/)example\.com(?=[\/:?#"'\s<]|$)/g;
```

**Matches:**
- `https://example.com`
- `http://example.com:8080/path`
- `https://example.com?q=x`
- `https://example.com/foo</code>`

**Skips (these contexts must NOT be substituted):**
- `attacker@example.com`, `victim@example.com` — email addresses; no `http(s)://` prefix
- `https://example.com.attacker.com` — chained subdomain in open-redirect bypass; lookahead requires safe terminator (`/`, `:`, `?`, `#`, quote, whitespace, `<`, or end)
- Bare `example.com` text in prose

**Replacement:** `$1<TARGET>` — the protocol is preserved, the host is replaced.

### Domain bar — UI

A 36px sticky strip immediately below the topnav, full-width:

```
┌──────────────────────────────────────────────────────────────────────┐
│ 🎯 Target  [target.example.com_______]  [↻ Reset]   ✓ Substituting   │
└──────────────────────────────────────────────────────────────────────┘
```

- **Input:** `<input type="text" id="db-target" placeholder="target.example.com">`
- **Reset button:** `<button id="db-reset">↻ Reset</button>` — clears the input,
  removes `localStorage['shared.target']`, restores all snippets to their
  original textContent.
- **Status pill:** Two states.
  - Green `✓ Substituting` — when input has a non-empty value.
  - Grey `○ Inactive` — when input is empty.
- **Sticky behavior:** `position: sticky; top: <topnav-height>;` so the bar
  stays visible while scrolling content but is not fixed (collapses naturally
  when topnav scrolls out on overflow).
- **Mobile breakpoint:** below 768px, the status pill collapses to just the
  icon (`✓` / `○`) with `aria-label`.

### Domain bar — re-substitution mechanic

On first run (DOMContentLoaded):
1. Walk `document.querySelectorAll('pre, code, .snippet')`.
2. For each element, snapshot its `textContent` into a `WeakMap<Element, string>`.
3. Apply substitution from snapshot to live DOM via `textContent =` (NOT
   `innerHTML`, to avoid XSS through whatever the snippet contains).
4. Wire `MutationObserver` on `document.body` watching for added subtrees
   that contain `pre`, `code`, or `.snippet` — when found, snapshot + apply.

On every input event (`input` listener on the bar's `<input>`):
1. Save the new value to `localStorage['shared.target']` (or remove the key
   if value is empty).
2. Walk the WeakMap, re-substitute every snapshotted element from its
   original text, using the new target value.

On `storage` event (cross-tab sync):
1. If the changed key is `shared.target`, update the input's value and
   re-substitute all elements.

### Domain bar — file layout

- `domain-bar.js` (root, ~80 lines) — exposes `window.DomainBar.init()`.
  IIFE-wrapped, no globals besides `window.DomainBar`.
- The bar's HTML markup (~6 lines) is duplicated into every HTML page
  immediately after the `<nav class="topnav">` block.
- CSS is appended to the existing `vulns/style.css` (~40 lines for the bar
  and the dork "Run" button styling).

### Google dorking page

`vulns/google-dorking.html` follows the established vuln-page template:
- cj-guard frame-buster
- referrer meta tag
- shield favicon (data: SVG)
- icon-sprite SVG
- shared topnav (with Worksheets / Report / etc.)
- domain bar below the topnav
- `day-page-hero` with eyebrow `Recon · OSINT`, h1 `🔎 Google Dorking & OSINT Recon`, intro
- legal-courtesy callout: only run aggressive dorks against authorized targets
- "operators primer" section: `site:`, `inurl:`, `intitle:`, `intext:`,
  `filetype:`, `cache:`, `-`/`OR`
- six `worksheet-section` blocks, one per category, each with 4–6 dork
  snippets in `<pre class="snippet">` blocks, plus a "🔍 Run on Google"
  button per snippet
- defensive notes section
- cross-references footer linking to Day 1 worksheet, the playbook,
  and `vulns/host-header.html` / `vulns/idor.html`
- standard footer + theme-toggle script

#### Six dork categories

1. **🔓 Sensitive files & backups**
   - `site:example.com filetype:env`
   - `site:example.com filetype:sql`
   - `site:example.com filetype:log`
   - `site:example.com inurl:wp-config.php`
   - `site:example.com (ext:bak | ext:old | ext:swp | ext:backup)`

2. **🚪 Login & admin surfaces**
   - `site:example.com inurl:admin`
   - `site:example.com inurl:login`
   - `site:example.com intitle:"login"`
   - `site:example.com inurl:wp-login`
   - `site:example.com inurl:phpmyadmin`

3. **💥 Error & config disclosure**
   - `site:example.com intext:"sql syntax near"`
   - `site:example.com intext:"warning: include"`
   - `site:example.com intext:"fatal error"`
   - `site:example.com intitle:"phpinfo()"`
   - `site:example.com intext:"Whitelabel Error Page"`

4. **🌐 Subdomain & directory discovery**
   - `site:*.example.com`
   - `site:example.com -www`
   - `site:example.com intitle:"index of"`
   - `site:example.com inurl:robots.txt`

5. **🔑 Code & cloud disclosure**
   - `site:github.com "example.com"`
   - `site:gitlab.com "example.com" "password"`
   - `site:s3.amazonaws.com "example.com"`
   - `site:trello.com "example.com"`
   - `site:pastebin.com "example.com"`

6. **📜 Old / cached content**
   - `cache:example.com/login`
   - `site:web.archive.org "example.com"`
   - `site:example.com filetype:pdf`

#### "Run on Google" button

Each `<pre class="snippet">` is wrapped in a `<div class="dork-row">` that
contains the snippet plus a `<button class="dork-run-btn" data-query="...">`.
The data-query attribute holds the original (pre-substitution) dork; on
click, the handler reads `localStorage['shared.target']`:

- If empty: button shows `🔍 Run on Google (set target first)` (disabled-style).
- If set: button shows `🔍 Run on Google`. Click opens
  `https://www.google.com/search?q=<encodeURIComponent(dork-with-target-substituted)>`
  in a new tab via `window.open(url, '_blank', 'noopener,noreferrer')`.

The button text and disabled state update reactively via the same
`storage` event hook the domain bar uses.

### Substitution scope vs. dynamic content

The domain bar substitutes static authored snippets (and any new `<pre>`/`<code>`
nodes added later via MutationObserver). The reporting layer's `draft.html`
renders dynamic content from saved findings via `innerHTML`; those generated
`<pre>` nodes will be picked up by the observer and substituted. This is
acceptable because:
- A finding's saved evidence usually contains the user's *real* target host
  (typed in by the pentester), not the literal string `https://example.com`.
- If a finding *does* contain `https://example.com` (e.g. in a stored test
  payload), substituting it is correct behavior.

### Localization / accessibility

- `aria-label="Target domain"` on the input.
- `aria-live="polite"` on the status pill so screen readers announce
  state changes.
- Reset button has visible text plus `title="Clear target and restore original snippets"`.
- Bar is keyboard-focusable; tab order: input → reset button → first
  topnav link below the bar.
- Color contrast on green/grey pills meets WCAG AA in both light and dark
  themes (uses existing `--accent` / `--text-muted` / `--surface2` tokens).

### Security

- `textContent` is used for substitution — never `innerHTML`. The user's
  target value never reaches an HTML interpreter.
- Reset clears the localStorage key entirely (not just the input value).
- The "Run on Google" `<a>` / button uses `target="_blank" rel="noopener noreferrer"`.
- No third-party assets (no analytics, no Google fonts, no CDN scripts).
- Input has `maxlength="253"` (the DNS hostname limit) and `autocomplete="off"`.
- `inputmode="url"` for the on-screen keyboard hint on mobile.
- The bar does not validate the target as a real domain — pentesters
  routinely test IP addresses, ports, and weird hostnames; we don't get
  in the way.

## Components

| Unit | Responsibility | Public API | Depends on |
|---|---|---|---|
| `domain-bar.js` | Manage target, substitute snippets, sync across tabs | `window.DomainBar.init(opts?)` | `localStorage`, `MutationObserver`, vanilla DOM |
| Domain-bar HTML partial | Render the bar inline on each page | (markup only) | `domain-bar.js`, CSS |
| Domain-bar CSS | Style bar, status pill, run button | (classes only) | shared CSS variables (existing) |
| `vulns/google-dorking.html` | Present dorks, expose Run buttons | (page only) | `domain-bar.js`, shared `vulns/style.css` |

## Data flow

```
User types into #db-target
   │
   ▼
input event
   │
   ├─► localStorage['shared.target'] = value (or removeItem if empty)
   │
   ├─► WeakMap<Element, originalText> walked
   │     for each entry, set element.textContent = original.replace(TARGET_PATTERN, `$1${value}`)
   │
   └─► .domain-bar-status pill class updated (active/inactive)
         and "Run on Google" buttons toggle disabled-state

User clicks "Run on Google" on a dork
   │
   ▼
read localStorage['shared.target']
   │
   ├─► empty → no-op (button is disabled-styled)
   │
   └─► set → window.open(`https://www.google.com/search?q=${encodeURIComponent(substitutedDork)}`,
                          '_blank', 'noopener,noreferrer')

Other tab: storage event fires
   │
   ▼
if event.key === 'shared.target':
   ├─► update #db-target.value
   └─► re-walk WeakMap and re-substitute
```

## Error handling

- Empty target value: substitution becomes a no-op (snippets revert to
  original text via the WeakMap snapshot path).
- localStorage quota error on `setItem`: caught and logged via
  `console.warn`; the in-memory state still updates so the page session
  still works (just won't persist across reloads).
- MutationObserver throws on disconnected nodes: tolerable — observer is
  bound to `document.body` for the page lifetime.
- Regex catastrophe / no match: the `replace()` is bounded by the pattern;
  no backtracking risk.

## Testing

Manual smoke tests (no test framework on this site, consistent with how
the reporting layer was tested):

1. Load `index.html` with no target set — bar shows `○ Inactive`.
2. Type `acme.test.com` in the bar — every snippet on every page shows
   `https://acme.test.com` instead of `https://example.com`. Email and
   chained-domain examples remain unchanged.
3. Reload `index.html` — target persists, substitution applies.
4. Open `vulns/xss.html` in a new tab — same target carries over.
5. Change target to `another.test` in tab 2 — tab 1 picks up the change
   without a reload.
6. Click `↻ Reset` — input clears, snippets revert, localStorage key gone.
7. On `vulns/google-dorking.html` with no target: Run button shows
   `set target first`. Set a target: click Run → Google opens with
   `site:acme.test.com filetype:env` (URL-encoded).
8. Worksheet pages (which dynamically render some snippets) — confirm
   that newly-rendered `<pre>` blocks pick up the substitution.

Cross-cutting smoke (live):
- Every existing page still loads (HTTP 200).
- No JS console errors on any page.
- Dark/light theme toggle still works after the bar's HTML/CSS additions.

## Risks

- **MutationObserver on `document.body`** — could fire frequently on pages
  with dynamic UI (worksheets, draft.html). Mitigated by filtering the
  observed mutation list for nodes that contain `pre`/`code`/`.snippet`
  before doing any work.
- **Snippet count is ~hundreds across the site.** Snapshot + first-pass
  substitution should be sub-10ms total based on the current snippet
  density. Worth a real measurement if anything feels slow.
- **Bar adds ~36px of vertical space site-wide.** Acceptable given the
  utility; sticky behavior keeps the bar useful even when scrolling.

## Plan: order of implementation

5 tasks (each ends with a commit on `gh-pages`):

1. **`domain-bar.js` + CSS + integrate into `index.html` only** as a single
   test bed. Verify substitution + persistence + cross-tab sync on the
   homepage's existing snippets.
2. **Stamp the bar onto every other existing HTML page** (28 files) via a
   Python pass for the markup + `<script>` include. Mechanical.
3. **Build `vulns/google-dorking.html`** — full dorks page with Run buttons.
4. **Add the Google Dorking card to the homepage vuln-grid** + add a Recon
   link in the playbook.
5. **Local verification + push + verify live** + final cross-task review.

## Out of scope (future)

- Multi-target / scope file (a richer engagement scope with multiple URLs).
- Per-snippet override (right-click a snippet to keep its `example.com`
  even when the bar is set).
- Additional search engines on the dorks page (Bing, Shodan, GitHub code
  search, Wayback) as one-click buttons.
- "Save dork to findings" — a button on the dorks page that pushes a
  failed dork hit into the reporting layer as a finding.
- A `recon/` top-level directory for future recon pages (subfinder,
  wayback, certificate transparency).
