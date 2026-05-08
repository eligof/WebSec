# Reporting Layer (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reporting layer to the Web Pentest Playbook so testers can move from worksheet notes → finished pentest report without leaving the site. Includes individual finding templates, an inline CVSS 3.1 calculator, and an auto-populated report draft that pulls from existing day-worksheet localStorage state. Markdown export + print-to-PDF.

**Architecture:** New `/report/` subdirectory with 4 standalone HTML pages sharing `report/reportform.js`. Findings are stored in localStorage as a JSON array under `report.findings`. The `draft.html` page reads both that array and existing `dayN.text-confirmed`, `text-final`, `text-poc` keys from the day worksheets to assemble a Markdown report. CVSS calc is a self-contained JS function exported from `reportform.js` and embedded as a widget inside `finding.html`.

**Tech Stack:** Vanilla HTML/CSS/JS. No build step, no dependencies. Same self-hosted Inter + JetBrains Mono via the existing shared `vulns/style.css`. localStorage for persistence (consistent with worksheets). `Blob` + anchor-download for Markdown export. `window.print()` + `@media print` for PDF.

**Phase scope:** This plan implements ONLY the reporting layer. Out of scope (future plans):

- Phase 2 — Engagement scoping (RoE, credentials matrix, "ask the client" pre-flight)
- Phase 3 — Methodology variants (REST-only, GraphQL-only, SPA, multi-tenant SaaS)
- Phase 4 — Modern attack-surface chapters (GraphQL worksheet, AI prompt-injection, supply-chain, cloud-native)
- Phase 5 — Cross-cutting polish (unified Ctrl+K, OWASP/NIST cross-mapping, PortSwigger lab links per vuln, changelog)

---

## Data Model (read this before any task)

All keys live in `localStorage`.

```js
// Per-finding (array index)
report.findings = [
  {
    id: "f-1715000000-abc",        // generated on creation
    title: "SQL Injection at /search?q=",
    severity: "critical",          // critical | high | medium | low | info
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
    cvssScore: 9.8,                // computed from vector
    description: "...",            // multi-line
    impact: "...",
    repro: "1. ...\n2. ...",
    evidence: "GET /search?q=...\n\nHTTP/1.1 500 ...",
    remediation: "...",
    references: "OWASP A03:2021\nCWE-89",
    status: "open",                // open | fixed | retest-pending | accepted
    discoveredOn: "day4"           // dayN | manual
  }
];

// Engagement metadata (single object)
report.engagement = {
  client: "Acme Corp",
  scope: "https://target.example.com\n*.example.com",
  startDate: "2026-05-08",
  endDate: "2026-05-12",
  testers: "Eli G. (lead)",
  execSummary: "..."
};
```

The day-worksheet keys we READ but do not write:

- `dayN.text-confirmed` — confirmed bugs (Days 3, 4)
- `dayN.text-poc` — POC drafts (Day 4)
- `dayN.text-final` — final shortlist (Day 5)
- `dayN.text-deepdive` — Day-4 leads (Day 2)
- `shared.startDate` — engagement start date

---

## File Structure

**New files:**

| Path | Responsibility |
|---|---|
| `report/reportform.js` | Findings CRUD, CVSS 3.1 base-score calc, draft assembly, MD export, print trigger |
| `report/index.html` | Landing page for `/report/` — explains the layer, links to draft / finding / playbook |
| `report/finding.html` | Editor for a single finding (with embedded CVSS widget). Used to add or edit one finding from the array. |
| `report/draft.html` | The showpiece. Reads `report.findings` + day-worksheet state. Renders an editable assembled report. Markdown export + print-PDF. |

**Modified files:**

| Path | Change |
|---|---|
| `vulns/style.css` | Append `.report-*`, `.severity-pill`, `.cvss-widget`, `.finding-card`, `@media print` rules |
| `index.html` | Add "Report" entry between "Playbook" and "Worksheets" in `.nav-center` |
| `days/day1.html` … `days/day5.html` | Add a small "Open Report Draft →" link in the End-of-Day section's `.day-actions` row |
| `web-pentest-playbook.html` | Add "Report" entry in the inline-styled topnav `nav-center` |

---

## Tasks

### Task 1 — Append reporting CSS to shared stylesheet

**Files:**
- Modify: `vulns/style.css` (append at end of file)

- [ ] **Step 1: Append the report-layer CSS block**

Open `vulns/style.css` and append the following (yes, all of it — no placeholders):

```css

/* ═══════════════════════════════════════════
   REPORT LAYER (/report/*.html)
═══════════════════════════════════════════ */

/* Severity pills (used in findings list, draft, finding card) */
.severity-pill {
  display: inline-flex; align-items: center; gap: 0.3rem;
  padding: 0.2em 0.7em; border-radius: 4px;
  font-size: 0.7rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.05em;
  border: 1px solid transparent;
}
.severity-pill.severity-critical { background: var(--sev-critical-bg); color: var(--sev-critical-fg); border-color: color-mix(in srgb, var(--sev-critical-fg) 35%, transparent); }
.severity-pill.severity-high     { background: var(--sev-high-bg);     color: var(--sev-high-fg);     border-color: color-mix(in srgb, var(--sev-high-fg) 35%, transparent); }
.severity-pill.severity-medium   { background: var(--sev-medium-bg);   color: var(--sev-medium-fg);   border-color: color-mix(in srgb, var(--sev-medium-fg) 35%, transparent); }
.severity-pill.severity-low      { background: var(--surface2);        color: var(--text-muted);      border-color: var(--border); }
.severity-pill.severity-info     { background: var(--surface);         color: var(--text-muted);      border-color: var(--border); }

/* Finding card (in list views) */
.finding-card {
  background: var(--surface); border: 1px solid var(--border);
  border-left: 3px solid var(--card-accent, var(--accent));
  border-radius: 8px; padding: 1rem 1.2rem;
  margin-bottom: 0.8rem;
  display: grid; grid-template-columns: 1fr auto; gap: 0.5rem 1rem;
}
.finding-card .finding-card-title { font-weight: 700; color: var(--text); }
.finding-card .finding-card-meta { font-size: 0.78rem; color: var(--text-muted); margin-top: 0.2rem; }
.finding-card .finding-card-actions { display: flex; gap: 0.4rem; align-self: flex-start; }
.finding-card .finding-card-actions button,
.finding-card .finding-card-actions a {
  background: var(--surface2); border: 1px solid var(--border); color: var(--text-muted);
  border-radius: 4px; padding: 0.25rem 0.6rem; font-size: 0.75rem;
  cursor: pointer; text-decoration: none;
}
.finding-card .finding-card-actions button:hover,
.finding-card .finding-card-actions a:hover { color: var(--text); border-color: var(--accent); }
.finding-card .finding-card-actions button.danger { color: var(--danger); }

/* CVSS calculator widget */
.cvss-widget {
  background: var(--surface2); border: 1px solid var(--border); border-radius: 8px;
  padding: 1rem; margin-bottom: 1rem;
}
.cvss-widget .cvss-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem 1rem; margin-bottom: 0.8rem;
}
.cvss-widget label {
  display: block; font-size: 0.7rem; font-weight: 600; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem;
}
.cvss-widget select {
  width: 100%; background: var(--surface); border: 1px solid var(--border);
  color: var(--text); border-radius: 4px; padding: 0.4rem 0.5rem;
  font-family: var(--font); font-size: 0.85rem;
}
.cvss-widget .cvss-score {
  display: flex; align-items: center; gap: 0.6rem;
  padding: 0.6rem 0.9rem; background: var(--surface);
  border: 1px solid var(--border); border-radius: 6px;
}
.cvss-widget .cvss-score-number { font-size: 1.6rem; font-weight: 800; color: var(--accent); }
.cvss-widget .cvss-vector { font-family: var(--mono); font-size: 0.78rem; color: var(--text-muted); flex: 1; word-break: break-all; }

/* Report draft layout */
.report-draft { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem 2rem; }
.report-draft h2 { font-size: 1.2rem; margin: 1.5rem 0 0.6rem; padding-top: 1rem; border-top: 1px solid var(--border); }
.report-draft h2:first-child { margin-top: 0; padding-top: 0; border-top: 0; }
.report-draft h3 { font-size: 1rem; margin: 1rem 0 0.4rem; color: var(--text); }
.report-draft .findings-table {
  width: 100%; border-collapse: collapse; margin-bottom: 1rem;
  font-size: 0.88rem;
}
.report-draft .findings-table th,
.report-draft .findings-table td {
  padding: 0.5rem 0.7rem; border-bottom: 1px solid var(--border);
  text-align: left; vertical-align: top;
}
.report-draft .findings-table th { color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; }
.report-draft .findings-table tr:last-child td { border-bottom: 0; }

/* Action toolbar (Add / Export / Print) */
.report-toolbar {
  display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.5rem;
}
.report-toolbar button,
.report-toolbar a.btn {
  background: var(--surface2); border: 1px solid var(--border); color: var(--text);
  border-radius: 6px; padding: 0.5rem 0.9rem; font-size: 0.85rem; font-weight: 600;
  cursor: pointer; text-decoration: none; font-family: var(--font);
  display: inline-flex; align-items: center; gap: 0.4rem;
}
.report-toolbar button:hover,
.report-toolbar a.btn:hover { border-color: var(--accent); }
.report-toolbar .primary {
  background: var(--accent); border-color: var(--accent); color: #fff;
}
.report-toolbar .primary:hover { background: var(--accent2); border-color: var(--accent2); color: #fff; }

/* Empty state */
.empty-state {
  padding: 3rem 2rem; text-align: center;
  border: 2px dashed var(--border); border-radius: 8px;
  color: var(--text-muted);
}
.empty-state .empty-state-icon { font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5; }

/* Print stylesheet — for window.print() PDF export */
@media print {
  body { background: #fff !important; color: #000 !important; font-family: 'Inter', sans-serif; }
  .topnav, .home-footer, .day-page-hero, .report-toolbar,
  nav.day-nav-buttons, .day-actions, .finding-card-actions,
  button { display: none !important; }
  .report-draft { border: 0 !important; padding: 0 !important; background: #fff !important; }
  .report-draft h2 { border-color: #000 !important; }
  .severity-pill { border: 1px solid #000 !important; }
  pre, code { font-family: 'JetBrains Mono', monospace; color: #000 !important; }
  pre { border: 1px solid #999; padding: 0.5rem; page-break-inside: avoid; }
  .findings-table { font-size: 11px; page-break-inside: avoid; }
  .finding-card { page-break-inside: avoid; border: 1px solid #999 !important; background: #fff !important; }
  a { color: #000 !important; text-decoration: underline; }
  /* Show URLs after each external link */
  a[href^="http"]::after { content: " (" attr(href) ")"; font-size: 0.85em; color: #555; }
}
```

- [ ] **Step 2: Verify CSS still parses**

```bash
cd "/home/eli/Development/application pentesting guide"
# Quick sanity check — count opening vs closing braces
python3 -c "
s = open('vulns/style.css').read()
print('Open braces:', s.count('{'))
print('Close braces:', s.count('}'))
assert s.count('{') == s.count('}'), 'Brace mismatch — fix before continuing'
print('OK — brace count balanced')
"
```

Expected: `Open braces` and `Close braces` print identical numbers, `OK — brace count balanced` printed.

- [ ] **Step 3: Commit**

```bash
git add vulns/style.css
git commit -m "Add report-layer CSS (severity pills, finding card, CVSS widget, print)"
```

---

### Task 2 — Create `report/reportform.js` (shared JS library)

**Files:**
- Create: `report/reportform.js`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p "/home/eli/Development/application pentesting guide/report"
```

- [ ] **Step 2: Write the full library file**

Create `report/reportform.js` with the following content:

```js
/* ───────────────────────────────────────────────────────────
   Report Layer — shared library
   ───────────────────────────────────────────────────────────
   Storage:
     report.findings          → JSON array of finding objects
     report.engagement        → JSON object (client, scope, dates, summary)
   ─────────────────────────────────────────────────────────── */
(function (global) {
  'use strict';

  const KEY_FINDINGS  = 'report.findings';
  const KEY_ENGAGEMENT = 'report.engagement';

  /* ── Storage helpers ── */
  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn('[report] failed to parse', key, e);
      return fallback;
    }
  }
  function saveJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (e) { console.warn('[report] save failed', e); }
  }

  function getFindings()       { return loadJSON(KEY_FINDINGS, []); }
  function setFindings(arr)    { saveJSON(KEY_FINDINGS, arr); }
  function getEngagement()     { return loadJSON(KEY_ENGAGEMENT, {}); }
  function setEngagement(obj)  { saveJSON(KEY_ENGAGEMENT, obj); }

  function newId() {
    return 'f-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
  }

  function upsertFinding(finding) {
    const arr = getFindings();
    const idx = arr.findIndex(f => f.id === finding.id);
    if (idx === -1) arr.push(finding);
    else arr[idx] = finding;
    setFindings(arr);
  }

  function deleteFinding(id) {
    setFindings(getFindings().filter(f => f.id !== id));
  }

  /* ── CVSS 3.1 base score ─────────────────────────────────
     Spec: https://www.first.org/cvss/v3.1/specification-document
     Returns { score: number, severity: string }
     ───────────────────────────────────────────────────────── */
  const CVSS_METRICS = {
    AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.20 }, // Attack Vector
    AC: { L: 0.77, H: 0.44 },                   // Attack Complexity
    PR: {
      U: { N: 0.85, L: 0.62, H: 0.27 },         // Scope Unchanged
      C: { N: 0.85, L: 0.68, H: 0.50 }          // Scope Changed
    },
    UI: { N: 0.85, R: 0.62 },                   // User Interaction
    CIA: { N: 0.0, L: 0.22, H: 0.56 }           // C / I / A impact
  };

  // CVSS spec roundup: ceil to one decimal place.
  // (See https://www.first.org/cvss/v3.1/specification-document, Appendix A.)
  function cvssRoundUp(x) {
    const intInput = Math.round(x * 100000);
    if (intInput % 10000 === 0) return intInput / 100000;
    return (Math.floor(intInput / 10000) + 1) / 10;
  }

  function computeCvss(metrics) {
    // metrics: { AV, AC, PR, UI, S, C, I, A }
    const { AV, AC, PR, UI, S, C, I, A } = metrics;
    if (![AV, AC, PR, UI, S, C, I, A].every(v => v != null)) {
      return { score: 0, severity: 'none', vector: '' };
    }
    const av = CVSS_METRICS.AV[AV];
    const ac = CVSS_METRICS.AC[AC];
    const pr = CVSS_METRICS.PR[S][PR];
    const ui = CVSS_METRICS.UI[UI];
    const c = CVSS_METRICS.CIA[C];
    const i = CVSS_METRICS.CIA[I];
    const a = CVSS_METRICS.CIA[A];

    const ISS = 1 - ((1 - c) * (1 - i) * (1 - a));
    let impact;
    if (S === 'U') impact = 6.42 * ISS;
    else           impact = 7.52 * (ISS - 0.029) - 3.25 * Math.pow(ISS - 0.02, 15);
    const exploitability = 8.22 * av * ac * pr * ui;

    let score;
    if (impact <= 0) score = 0;
    else if (S === 'U') score = cvssRoundUp(Math.min(impact + exploitability, 10));
    else                score = cvssRoundUp(Math.min(1.08 * (impact + exploitability), 10));

    let severity;
    if (score === 0)        severity = 'none';
    else if (score < 4)     severity = 'low';
    else if (score < 7)     severity = 'medium';
    else if (score < 9)     severity = 'high';
    else                    severity = 'critical';

    const vector = `CVSS:3.1/AV:${AV}/AC:${AC}/PR:${PR}/UI:${UI}/S:${S}/C:${C}/I:${I}/A:${A}`;

    return { score, severity, vector };
  }

  function parseVector(vector) {
    // "CVSS:3.1/AV:N/AC:L/..." → { AV: 'N', AC: 'L', ... }
    const out = {};
    if (!vector) return out;
    vector.split('/').forEach(p => {
      const [k, v] = p.split(':');
      if (k && v && k !== 'CVSS') out[k] = v;
    });
    return out;
  }

  /* ── Render the CVSS calculator widget into a host element ──
     onChange callback receives { score, severity, vector }. */
  function createCvssWidget(host, initialVector, onChange) {
    const fields = [
      { key: 'AV', label: 'Attack Vector',         opts: [['N','Network'],['A','Adjacent'],['L','Local'],['P','Physical']] },
      { key: 'AC', label: 'Attack Complexity',     opts: [['L','Low'],['H','High']] },
      { key: 'PR', label: 'Privileges Required',   opts: [['N','None'],['L','Low'],['H','High']] },
      { key: 'UI', label: 'User Interaction',      opts: [['N','None'],['R','Required']] },
      { key: 'S',  label: 'Scope',                 opts: [['U','Unchanged'],['C','Changed']] },
      { key: 'C',  label: 'Confidentiality',       opts: [['N','None'],['L','Low'],['H','High']] },
      { key: 'I',  label: 'Integrity',             opts: [['N','None'],['L','Low'],['H','High']] },
      { key: 'A',  label: 'Availability',          opts: [['N','None'],['L','Low'],['H','High']] }
    ];

    host.classList.add('cvss-widget');
    host.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'cvss-grid';
    host.appendChild(grid);

    const initial = parseVector(initialVector);
    const state = {};
    fields.forEach(f => state[f.key] = initial[f.key] || f.opts[0][0]);

    fields.forEach(f => {
      const wrap = document.createElement('div');
      wrap.innerHTML = `<label for="cvss-${f.key}">${f.label}</label>`;
      const sel = document.createElement('select');
      sel.id = `cvss-${f.key}`;
      f.opts.forEach(([v, label]) => {
        const o = document.createElement('option');
        o.value = v; o.textContent = `${v} — ${label}`;
        if (v === state[f.key]) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener('change', () => {
        state[f.key] = sel.value;
        recompute();
      });
      wrap.appendChild(sel);
      grid.appendChild(wrap);
    });

    const scoreBox = document.createElement('div');
    scoreBox.className = 'cvss-score';
    scoreBox.innerHTML =
      '<span class="cvss-score-number">0.0</span>' +
      '<span class="severity-pill severity-info">none</span>' +
      '<span class="cvss-vector">CVSS:3.1/...</span>';
    host.appendChild(scoreBox);

    function recompute() {
      const r = computeCvss(state);
      scoreBox.querySelector('.cvss-score-number').textContent = r.score.toFixed(1);
      const pill = scoreBox.querySelector('.severity-pill');
      pill.textContent = r.severity;
      pill.className = 'severity-pill severity-' + r.severity;
      scoreBox.querySelector('.cvss-vector').textContent = r.vector;
      if (typeof onChange === 'function') onChange(r);
    }
    recompute();

    return { recompute, getState: () => ({ ...state }) };
  }

  /* ── Pull untyped findings from day-worksheet textareas ──
     Returns array of { source, text } so the draft page can show
     "from Day 4 'Confirmed'" alongside the prose. */
  function extractDayLeads() {
    const days = ['day1', 'day2', 'day3', 'day4', 'day5'];
    const fields = [
      ['text-confirmed', 'Confirmed'],
      ['text-final',     'Final shortlist'],
      ['text-poc',       'POC'],
      ['text-deepdive',  'Deep-dive leads'],
      ['text-leads',     'Leads'],
      ['text-chains',    'Chains']
    ];
    const out = [];
    days.forEach(d => {
      fields.forEach(([k, label]) => {
        const text = localStorage.getItem(`${d}.${k}`);
        if (text && text.trim()) out.push({ source: `${d.toUpperCase()} · ${label}`, text: text.trim() });
      });
    });
    return out;
  }

  /* ── Markdown report assembly ── */
  function generateMarkdown() {
    const eng = getEngagement();
    const findings = getFindings().slice().sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
      return (order[a.severity] ?? 99) - (order[b.severity] ?? 99);
    });

    const lines = [];
    lines.push(`# Pentest Report — ${eng.client || '[Client]'}`);
    lines.push('');
    if (eng.startDate || eng.endDate) {
      lines.push(`**Engagement window:** ${eng.startDate || '?'} → ${eng.endDate || '?'}`);
    }
    if (eng.testers) lines.push(`**Testers:** ${eng.testers}`);
    if (eng.scope)   lines.push(`**Scope:**\n\`\`\`\n${eng.scope}\n\`\`\``);
    lines.push('');

    lines.push('## Executive Summary');
    lines.push('');
    lines.push(eng.execSummary || '_(Add executive summary in the engagement section.)_');
    lines.push('');

    lines.push('## Findings Overview');
    lines.push('');
    if (!findings.length) {
      lines.push('_No findings recorded yet._');
    } else {
      lines.push('| # | Severity | CVSS | Title | Status |');
      lines.push('|---|---|---|---|---|');
      findings.forEach((f, i) => {
        lines.push(`| ${i + 1} | ${f.severity || '?'} | ${(f.cvssScore ?? '').toString()} | ${(f.title || '').replace(/\|/g, '\\|')} | ${f.status || 'open'} |`);
      });
    }
    lines.push('');

    lines.push('## Findings');
    lines.push('');
    findings.forEach((f, i) => {
      lines.push(`### ${i + 1}. ${f.title || '(untitled)'}`);
      lines.push('');
      lines.push(`**Severity:** ${f.severity || '?'}  ·  **CVSS:** ${f.cvssScore ?? '?'} (\`${f.cvssVector || ''}\`)  ·  **Status:** ${f.status || 'open'}`);
      lines.push('');
      if (f.description) { lines.push('**Description**'); lines.push(''); lines.push(f.description); lines.push(''); }
      if (f.impact)      { lines.push('**Impact**');      lines.push(''); lines.push(f.impact); lines.push(''); }
      if (f.repro)       { lines.push('**Reproduction**'); lines.push(''); lines.push('```\n' + f.repro + '\n```'); lines.push(''); }
      if (f.evidence)    { lines.push('**Evidence**');     lines.push(''); lines.push('```\n' + f.evidence + '\n```'); lines.push(''); }
      if (f.remediation) { lines.push('**Remediation**');  lines.push(''); lines.push(f.remediation); lines.push(''); }
      if (f.references)  { lines.push('**References**');   lines.push(''); lines.push(f.references); lines.push(''); }
    });

    lines.push('## Working Notes (from day worksheets)');
    lines.push('');
    extractDayLeads().forEach(({ source, text }) => {
      lines.push(`### ${source}`);
      lines.push('');
      lines.push('```\n' + text + '\n```');
      lines.push('');
    });

    return lines.join('\n');
  }

  function downloadMarkdown() {
    const md = generateMarkdown();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().slice(0, 10);
    a.download = `pentest-report-${stamp}.md`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  /* ── Public API ── */
  global.Report = {
    getFindings, setFindings, upsertFinding, deleteFinding,
    getEngagement, setEngagement,
    newId,
    computeCvss, parseVector, createCvssWidget,
    extractDayLeads,
    generateMarkdown, downloadMarkdown
  };
})(window);
```

- [ ] **Step 3: Smoke-test the CVSS calc in node**

```bash
cd "/home/eli/Development/application pentesting guide"
node -e "
const fs = require('fs');
const code = fs.readFileSync('report/reportform.js', 'utf8');
// emulate browser: window + localStorage
const window = {};
const localStorage = { _s:{}, getItem(k){return this._s[k]??null}, setItem(k,v){this._s[k]=v}, removeItem(k){delete this._s[k]} };
new Function('window','localStorage','document','console', code)(window, localStorage,
  { createElement: () => ({ classList:{add(){}}, appendChild(){}, querySelector:()=>({textContent:'',className:''}) }),
    body:{appendChild(){},removeChild(){}} },
  console);
const Report = window.Report;
// CVSS 9.8 — AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
console.log('AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H →', Report.computeCvss({AV:'N',AC:'L',PR:'N',UI:'N',S:'U',C:'H',I:'H',A:'H'}));
// CVSS 5.4 — AV:N/AC:L/PR:L/UI:R/S:C/C:L/I:L/A:N (well-known sample)
console.log('AV:N/AC:L/PR:L/UI:R/S:C/C:L/I:L/A:N →', Report.computeCvss({AV:'N',AC:'L',PR:'L',UI:'R',S:'C',C:'L',I:'L',A:'N'}));
"
```

Expected output (scores must match exactly):

```
AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H → { score: 9.8, severity: 'critical', vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H' }
AV:N/AC:L/PR:L/UI:R/S:C/C:L/I:L/A:N → { score: 5.4, severity: 'medium', vector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:R/S:C/C:L/I:L/A:N' }
```

If either score is off, the bug is in `cvssRoundUp` or the metric tables. Stop and fix before continuing.

- [ ] **Step 4: Commit**

```bash
git add report/reportform.js
git commit -m "Add report/reportform.js — findings storage, CVSS 3.1 calc, MD export"
```

---

### Task 3 — Create `report/index.html` (landing page)

**Files:**
- Create: `report/index.html`

- [ ] **Step 1: Write the file**

Create `report/index.html` with:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style id="cj-guard">html{display:none!important}</style>
  <script>(function(){if(self===top){var s=document.getElementById('cj-guard');if(s)s.parentNode.removeChild(s);}else{try{top.location.href=self.location.href;}catch(e){}}})();</script>
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Reporting layer — turn worksheet notes into a finished pentest report.">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ff6633' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/%3E%3C/svg%3E">
  <link rel="stylesheet" href="../vulns/style.css">
  <title>Report Layer · Web Pentest Playbook</title>
</head>
<body>

<svg class="icon-sprite" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <symbol id="icon-shield" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></symbol>
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
    <a href="../index.html#vulns" class="nav-link">Vulnerabilities</a>
    <a href="../web-pentest-playbook.html" class="nav-link">Playbook</a>
    <a href="../days/day1.html" class="nav-link">Worksheets</a>
    <a href="index.html" class="nav-link active">Report</a>
  </div>
  <div class="nav-right">
    <a href="https://github.com/eligof/WebSec" target="_blank" rel="noopener noreferrer" class="nav-link" style="font-size:0.78rem;">GitHub</a>
    <button class="theme-toggle" id="theme-toggle" aria-label="Toggle color theme">☀ Light</button>
  </div>
</nav>

<div class="content-wrap" style="padding-top:2rem">
  <div class="hero-wrap">
    <h1 class="hero-title">Report <span>Layer</span></h1>
    <p class="hero-sub">Turn your worksheet notes into a deliverable. Findings get a CVSS 3.1 vector, severity sort, Markdown export, and a print-friendly stylesheet for PDF.</p>
  </div>

  <div class="content-wrap" style="padding:0">
    <div class="vuln-grid" style="margin-top:1rem">

      <a class="vuln-card" href="finding.html" style="--card-accent: var(--accent)">
        <div class="card-header">
          <div class="card-icon" style="background: color-mix(in srgb, var(--accent) 15%, var(--surface2)); color: var(--accent);">+</div>
          <div>
            <div class="card-name">New / Edit Finding</div>
            <div class="card-abbr">finding.html</div>
          </div>
        </div>
        <div class="card-desc">Add a finding with title, severity, CVSS vector, description, repro, evidence, remediation. Auto-saves.</div>
      </a>

      <a class="vuln-card" href="draft.html" style="--card-accent: var(--accent2)">
        <div class="card-header">
          <div class="card-icon" style="background: color-mix(in srgb, var(--accent2) 15%, var(--surface2)); color: var(--accent2);">📄</div>
          <div>
            <div class="card-name">Report Draft</div>
            <div class="card-abbr">draft.html</div>
          </div>
        </div>
        <div class="card-desc">Auto-assembled report from your findings + day-worksheet notes. Markdown export. Print-PDF ready.</div>
      </a>

    </div>
  </div>

</div>

<script src="reportform.js"></script>
<script>
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
</script>

</body>
</html>
```

- [ ] **Step 2: Verify it loads**

```bash
cd "/home/eli/Development/application pentesting guide"
python3 -m http.server 8765 &
SERVER_PID=$!
sleep 1
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8765/report/
# Expected: 200
kill $SERVER_PID
```

- [ ] **Step 3: Commit**

```bash
git add report/index.html
git commit -m "Add report/index.html — landing page for the report layer"
```

---

### Task 4 — Create `report/finding.html` (single-finding editor)

**Files:**
- Create: `report/finding.html`

- [ ] **Step 1: Write the file**

Create `report/finding.html` with:

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
  <link rel="stylesheet" href="../vulns/style.css">
  <title>Finding · Report · Web Pentest Playbook</title>
</head>
<body>

<svg class="icon-sprite" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <symbol id="icon-shield" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></symbol>
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
    <a href="../index.html#vulns" class="nav-link">Vulnerabilities</a>
    <a href="../web-pentest-playbook.html" class="nav-link">Playbook</a>
    <a href="../days/day1.html" class="nav-link">Worksheets</a>
    <a href="index.html" class="nav-link active">Report</a>
  </div>
  <div class="nav-right">
    <a href="https://github.com/eligof/WebSec" target="_blank" rel="noopener noreferrer" class="nav-link" style="font-size:0.78rem;">GitHub</a>
    <button class="theme-toggle" id="theme-toggle" aria-label="Toggle color theme">☀ Light</button>
  </div>
</nav>

<div class="content-wrap" style="padding-top:2rem">
  <div class="day-page-hero" style="--day-color: var(--accent)">
    <div class="day-num">Report · Finding editor</div>
    <h1>New / edit finding</h1>
    <p>Fill in the fields below — they auto-save. Use the CVSS widget to compute the vector and score. Click <strong>Save finding</strong> when done; it'll appear in the report draft.</p>
  </div>

  <section class="worksheet-section">
    <h2><span class="ws-section-num">1</span>Existing findings</h2>
    <p class="ws-intro">Click one to edit; <strong>+ New</strong> below to add another.</p>
    <div id="finding-list"></div>
    <div class="report-toolbar" style="margin-top:1rem">
      <button id="btn-new" class="primary">+ New finding</button>
      <a href="draft.html" class="btn">Open report draft →</a>
    </div>
  </section>

  <section class="worksheet-section" id="editor" style="display:none">
    <h2><span class="ws-section-num">2</span>Editor</h2>

    <div class="form-group">
      <label for="f-title">Title</label>
      <input type="text" id="f-title" placeholder="SQL Injection at /search?q=">
    </div>

    <div class="form-group">
      <label for="f-status">Status</label>
      <select id="f-status">
        <option value="open">open</option>
        <option value="retest-pending">retest-pending</option>
        <option value="fixed">fixed</option>
        <option value="accepted">accepted (risk acknowledged)</option>
      </select>
    </div>

    <div class="form-group">
      <label>CVSS 3.1 — base score</label>
      <div id="cvss-host"></div>
    </div>

    <div class="form-group">
      <label for="f-description">Description</label>
      <textarea id="f-description" placeholder="What's broken, in plain English. 2-4 sentences."></textarea>
    </div>

    <div class="form-group">
      <label for="f-impact">Impact</label>
      <textarea id="f-impact" placeholder="What an attacker can actually achieve. Be concrete."></textarea>
    </div>

    <div class="form-group">
      <label for="f-repro">Reproduction steps</label>
      <textarea id="f-repro" class="mono" placeholder="1. Send POST /search with q='...&#10;2. Observe HTTP 500 with MySQL error&#10;3. Replace with UNION SELECT..."></textarea>
    </div>

    <div class="form-group">
      <label for="f-evidence">Evidence (request / response)</label>
      <textarea id="f-evidence" class="mono" placeholder="GET /search?q=' HTTP/1.1&#10;Host: target.example.com&#10;...&#10;&#10;HTTP/1.1 500 Internal Server Error&#10;..."></textarea>
    </div>

    <div class="form-group">
      <label for="f-remediation">Remediation</label>
      <textarea id="f-remediation" placeholder="Use parameterized queries / prepared statements. Apply input validation as defense-in-depth."></textarea>
    </div>

    <div class="form-group">
      <label for="f-references">References (one per line)</label>
      <textarea id="f-references" placeholder="OWASP A03:2021&#10;CWE-89&#10;https://portswigger.net/web-security/sql-injection"></textarea>
    </div>

    <div class="day-actions">
      <button id="btn-save" class="report-toolbar primary" type="button" style="background:var(--accent);color:#fff;border-color:var(--accent)">💾 Save finding</button>
      <button id="btn-cancel" type="button">Cancel</button>
      <button id="btn-delete" class="danger" type="button" style="margin-left:auto">↺ Delete this finding</button>
    </div>
  </section>

</div>

<script src="reportform.js"></script>
<script>
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

  // ── Finding editor wiring ──
  let current = null;
  let cvssWidget = null;

  function renderList() {
    const host = document.getElementById('finding-list');
    const findings = Report.getFindings();
    if (!findings.length) {
      host.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div>No findings yet — click <strong>+ New finding</strong> to add the first one.</div>';
      return;
    }
    host.innerHTML = findings.map(f => `
      <div class="finding-card" style="--card-accent: var(--sev-${f.severity || 'info'}-fg, var(--accent))">
        <div>
          <div class="finding-card-title">${escapeHtml(f.title || '(untitled)')}</div>
          <div class="finding-card-meta">
            <span class="severity-pill severity-${f.severity || 'info'}">${f.severity || 'unset'}</span>
            CVSS ${f.cvssScore ?? '—'} · ${f.status || 'open'}
          </div>
        </div>
        <div class="finding-card-actions">
          <button data-edit="${f.id}">Edit</button>
        </div>
      </div>
    `).join('');
    host.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => openEditor(btn.dataset.edit));
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function openEditor(id) {
    const editor = document.getElementById('editor');
    editor.style.display = '';
    if (id) {
      current = Report.getFindings().find(f => f.id === id) || null;
    }
    if (!current) {
      current = { id: Report.newId(), title: '', severity: 'info', cvssVector: '', cvssScore: 0, status: 'open' };
    }
    document.getElementById('f-title').value       = current.title || '';
    document.getElementById('f-status').value      = current.status || 'open';
    document.getElementById('f-description').value = current.description || '';
    document.getElementById('f-impact').value      = current.impact || '';
    document.getElementById('f-repro').value       = current.repro || '';
    document.getElementById('f-evidence').value    = current.evidence || '';
    document.getElementById('f-remediation').value = current.remediation || '';
    document.getElementById('f-references').value  = current.references || '';

    cvssWidget = Report.createCvssWidget(
      document.getElementById('cvss-host'),
      current.cvssVector,
      (r) => {
        current.cvssVector = r.vector;
        current.cvssScore = r.score;
        current.severity = r.severity;
      }
    );
    editor.scrollIntoView({ behavior: 'smooth' });
  }

  document.getElementById('btn-new').addEventListener('click', () => { current = null; openEditor(null); });

  document.getElementById('btn-save').addEventListener('click', () => {
    if (!current) return;
    current.title       = document.getElementById('f-title').value.trim();
    current.status      = document.getElementById('f-status').value;
    current.description = document.getElementById('f-description').value;
    current.impact      = document.getElementById('f-impact').value;
    current.repro       = document.getElementById('f-repro').value;
    current.evidence    = document.getElementById('f-evidence').value;
    current.remediation = document.getElementById('f-remediation').value;
    current.references  = document.getElementById('f-references').value;
    Report.upsertFinding(current);
    renderList();
    document.getElementById('editor').style.display = 'none';
    current = null;
  });

  document.getElementById('btn-cancel').addEventListener('click', () => {
    document.getElementById('editor').style.display = 'none';
    current = null;
  });

  document.getElementById('btn-delete').addEventListener('click', () => {
    if (!current) return;
    if (!confirm(`Delete "${current.title || '(untitled)'}"?`)) return;
    Report.deleteFinding(current.id);
    renderList();
    document.getElementById('editor').style.display = 'none';
    current = null;
  });

  renderList();
</script>

</body>
</html>
```

- [ ] **Step 2: Smoke-test in preview**

```bash
cd "/home/eli/Development/application pentesting guide"
python3 -m http.server 8765 &
SERVER_PID=$!
sleep 1
curl -s -o /dev/null -w "finding.html: %{http_code}\n" http://localhost:8765/report/finding.html
kill $SERVER_PID
```

Expected: `finding.html: 200`

- [ ] **Step 3: Commit**

```bash
git add report/finding.html
git commit -m "Add report/finding.html — single-finding editor with embedded CVSS widget"
```

---

### Task 5 — Create `report/draft.html` (auto-populated draft)

**Files:**
- Create: `report/draft.html`

- [ ] **Step 1: Write the file**

Create `report/draft.html` with:

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
  <link rel="stylesheet" href="../vulns/style.css">
  <title>Report Draft · Web Pentest Playbook</title>
</head>
<body>

<svg class="icon-sprite" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <symbol id="icon-shield" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></symbol>
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
    <a href="../index.html#vulns" class="nav-link">Vulnerabilities</a>
    <a href="../web-pentest-playbook.html" class="nav-link">Playbook</a>
    <a href="../days/day1.html" class="nav-link">Worksheets</a>
    <a href="index.html" class="nav-link active">Report</a>
  </div>
  <div class="nav-right">
    <a href="https://github.com/eligof/WebSec" target="_blank" rel="noopener noreferrer" class="nav-link" style="font-size:0.78rem;">GitHub</a>
    <button class="theme-toggle" id="theme-toggle" aria-label="Toggle color theme">☀ Light</button>
  </div>
</nav>

<div class="content-wrap" style="padding-top:2rem">
  <div class="day-page-hero" style="--day-color: var(--accent2)">
    <div class="day-num">Report · Draft</div>
    <h1>Report draft</h1>
    <p>Auto-assembled from your findings (entered via <a href="finding.html">Finding editor</a>) plus working notes pulled from your day worksheets. Edit the engagement metadata below; everything auto-saves. Export Markdown, or use your browser's Print → Save as PDF.</p>
  </div>

  <!-- Engagement metadata -->
  <section class="worksheet-section">
    <h2><span class="ws-section-num">1</span>Engagement</h2>
    <div class="form-group"><label for="e-client">Client</label><input type="text" id="e-client"></div>
    <div class="form-group"><label for="e-scope">Scope (one URL per line)</label><textarea id="e-scope" class="mono"></textarea></div>
    <div class="form-group" style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
      <div><label for="e-startDate">Start date</label><input type="date" id="e-startDate"></div>
      <div><label for="e-endDate">End date</label><input type="date" id="e-endDate"></div>
    </div>
    <div class="form-group"><label for="e-testers">Testers</label><input type="text" id="e-testers" placeholder="Eli G. (lead), Jane S."></div>
    <div class="form-group"><label for="e-execSummary">Executive summary</label><textarea id="e-execSummary" placeholder="2-4 paragraphs. Risk posture, top concerns, recommended roadmap, retest schedule." style="min-height:140px"></textarea></div>
  </section>

  <!-- Toolbar -->
  <div class="report-toolbar">
    <a href="finding.html" class="btn">+ Add a finding</a>
    <button id="btn-export-md" class="primary">📄 Export Markdown</button>
    <button id="btn-print">🖨 Print / Save as PDF</button>
    <button id="btn-export-json">⬇ Export raw JSON</button>
    <input type="file" id="import-json" accept=".json" style="display:none">
    <button id="btn-import-json">⬆ Import JSON</button>
  </div>

  <!-- Live draft preview -->
  <section class="report-draft" id="draft">
    <!-- filled by render() below -->
  </section>

</div>

<script src="reportform.js"></script>
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

  // Engagement form
  const FIELDS = ['client', 'scope', 'startDate', 'endDate', 'testers', 'execSummary'];
  function loadEngagement() {
    const eng = Report.getEngagement();
    // Pull engagement.startDate from the shared worksheet key if not set yet
    if (!eng.startDate && localStorage.getItem('shared.startDate')) {
      eng.startDate = localStorage.getItem('shared.startDate');
    }
    FIELDS.forEach(k => { document.getElementById('e-' + k).value = eng[k] || ''; });
    return eng;
  }
  function saveEngagement() {
    const eng = {};
    FIELDS.forEach(k => { eng[k] = document.getElementById('e-' + k).value; });
    Report.setEngagement(eng);
    if (eng.startDate) localStorage.setItem('shared.startDate', eng.startDate);
    return eng;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function render() {
    const eng = saveEngagement();
    const findings = Report.getFindings().slice().sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
      return (order[a.severity] ?? 99) - (order[b.severity] ?? 99);
    });
    const leads = Report.extractDayLeads();

    let html = '';

    html += `<h2>Pentest Report — ${escapeHtml(eng.client || '[Client]')}</h2>`;
    if (eng.startDate || eng.endDate) {
      html += `<p><strong>Engagement window:</strong> ${escapeHtml(eng.startDate || '?')} → ${escapeHtml(eng.endDate || '?')}</p>`;
    }
    if (eng.testers) html += `<p><strong>Testers:</strong> ${escapeHtml(eng.testers)}</p>`;
    if (eng.scope) html += `<p><strong>Scope:</strong></p><pre>${escapeHtml(eng.scope)}</pre>`;

    html += `<h2>Executive Summary</h2>`;
    html += `<p>${eng.execSummary ? escapeHtml(eng.execSummary).replace(/\n/g, '<br>') : '<em>(Add executive summary above.)</em>'}</p>`;

    html += `<h2>Findings Overview</h2>`;
    if (!findings.length) {
      html += '<p><em>No findings recorded yet — open <a href="finding.html">Finding editor</a> to add the first one.</em></p>';
    } else {
      html += '<table class="findings-table"><thead><tr><th>#</th><th>Severity</th><th>CVSS</th><th>Title</th><th>Status</th></tr></thead><tbody>';
      findings.forEach((f, i) => {
        html += `<tr>
          <td>${i + 1}</td>
          <td><span class="severity-pill severity-${f.severity || 'info'}">${f.severity || '?'}</span></td>
          <td>${f.cvssScore ?? '—'}</td>
          <td>${escapeHtml(f.title || '(untitled)')}</td>
          <td>${escapeHtml(f.status || 'open')}</td>
        </tr>`;
      });
      html += '</tbody></table>';
    }

    html += `<h2>Findings</h2>`;
    findings.forEach((f, i) => {
      html += `<h3>${i + 1}. ${escapeHtml(f.title || '(untitled)')}</h3>`;
      html += `<p><span class="severity-pill severity-${f.severity || 'info'}">${f.severity || '?'}</span>`;
      html += ` · CVSS ${f.cvssScore ?? '—'} · <code>${escapeHtml(f.cvssVector || '')}</code> · status: ${escapeHtml(f.status || 'open')}</p>`;
      if (f.description) html += `<p><strong>Description.</strong> ${escapeHtml(f.description).replace(/\n/g, '<br>')}</p>`;
      if (f.impact)      html += `<p><strong>Impact.</strong> ${escapeHtml(f.impact).replace(/\n/g, '<br>')}</p>`;
      if (f.repro)       html += `<p><strong>Reproduction</strong></p><pre>${escapeHtml(f.repro)}</pre>`;
      if (f.evidence)    html += `<p><strong>Evidence</strong></p><pre>${escapeHtml(f.evidence)}</pre>`;
      if (f.remediation) html += `<p><strong>Remediation.</strong> ${escapeHtml(f.remediation).replace(/\n/g, '<br>')}</p>`;
      if (f.references)  html += `<p><strong>References</strong></p><pre>${escapeHtml(f.references)}</pre>`;
    });

    if (leads.length) {
      html += `<h2>Working notes (from day worksheets)</h2>`;
      leads.forEach(({ source, text }) => {
        html += `<h3>${escapeHtml(source)}</h3><pre>${escapeHtml(text)}</pre>`;
      });
    }

    document.getElementById('draft').innerHTML = html;
  }

  // Auto-save on engagement edits + re-render
  loadEngagement();
  FIELDS.forEach(k => {
    document.getElementById('e-' + k).addEventListener('input', render);
  });

  // Toolbar
  document.getElementById('btn-export-md').addEventListener('click', () => Report.downloadMarkdown());
  document.getElementById('btn-print').addEventListener('click', () => window.print());
  document.getElementById('btn-export-json').addEventListener('click', () => {
    const dump = {
      version: 1,
      exportedAt: new Date().toISOString(),
      engagement: Report.getEngagement(),
      findings: Report.getFindings(),
      worksheets: Object.fromEntries(
        Object.keys(localStorage)
          .filter(k => k.startsWith('day') || k.startsWith('shared.'))
          .map(k => [k, localStorage.getItem(k)])
      )
    };
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pentest-engagement-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  });
  document.getElementById('btn-import-json').addEventListener('click', () => document.getElementById('import-json').click());
  document.getElementById('import-json').addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!confirm('Importing will OVERWRITE current findings, engagement metadata, and day-worksheet state. Continue?')) return;
        if (data.engagement) Report.setEngagement(data.engagement);
        if (Array.isArray(data.findings)) Report.setFindings(data.findings);
        if (data.worksheets) Object.entries(data.worksheets).forEach(([k, v]) => localStorage.setItem(k, v));
        loadEngagement();
        render();
        alert('Imported. Worksheet pages will pick up new state on reload.');
      } catch (err) {
        alert('Failed to parse JSON: ' + err.message);
      }
    };
    reader.readAsText(f);
  });

  render();
</script>

</body>
</html>
```

- [ ] **Step 2: Smoke-test in browser**

```bash
cd "/home/eli/Development/application pentesting guide"
python3 -m http.server 8765 &
SERVER_PID=$!
sleep 1
curl -s -o /dev/null -w "draft.html: %{http_code}\n" http://localhost:8765/report/draft.html
# Manually open http://localhost:8765/report/draft.html in a browser
# Verify: page renders, engagement form accepts input, toolbar buttons present
kill $SERVER_PID
```

Expected: `draft.html: 200`. Visual check confirms hero, engagement section, toolbar, empty draft area.

- [ ] **Step 3: Commit**

```bash
git add report/draft.html
git commit -m "Add report/draft.html — auto-populated report draft + MD/JSON/print export"
```

---

### Task 6 — Wire navigation links across the site

**Files:**
- Modify: `index.html` (add Report nav-center entry)
- Modify: `web-pentest-playbook.html` (same in inline-styled topnav)
- Modify: `days/day1.html` through `days/day5.html` (add report link in EOD section)
- Modify: `thanks.html` (add Report nav entry — even though it's an easter egg, keeps nav consistent)

- [ ] **Step 1: Add Report entry to `index.html` nav**

In `index.html`, find the `.nav-center` block (currently has Home, Vulnerabilities, Playbook, Labs ↗). Insert a Report link AFTER the Worksheets link or wherever Worksheets is currently. If "Worksheets" isn't in nav-center, add both. The final block should look like:

```html
<div class="nav-center">
  <a href="index.html" class="nav-link active">Home</a>
  <a href="#vulns" class="nav-link">Vulnerabilities</a>
  <a href="web-pentest-playbook.html" class="nav-link">Playbook</a>
  <a href="days/day1.html" class="nav-link">Worksheets</a>
  <a href="report/index.html" class="nav-link">Report</a>
  <a href="https://portswigger.net/web-security" target="_blank" rel="noopener noreferrer" class="nav-link">Labs ↗</a>
</div>
```

Use the Edit tool to replace the existing nav-center block exactly.

- [ ] **Step 2: Add Report entry to `web-pentest-playbook.html` topnav**

The playbook nav uses inline styles. Find the inline-styled `<a>` link block in the topnav (between line ~480 and ~510 — search for the existing "Playbook" link with `style="...background:#1a1828;"`). Add this `<a>` after the Worksheets / Playbook links and before the Labs ↗ link, copying the EXISTING inline-style pattern from a sibling `<a>`:

```html
<a href="report/index.html" style="font-size:0.8rem;color:#8b949e;text-decoration:none;padding:0.3rem 0.75rem;border-radius:6px;">Report</a>
```

(Use the same color/font-size/padding as the other nav links in this file.)

- [ ] **Step 3: Add report link to all 5 day worksheets**

In each of `days/day1.html`, `days/day2.html`, `days/day3.html`, `days/day4.html`, `days/day5.html`:

a) Add `<a href="../report/index.html" class="nav-link">Report</a>` to the topnav `nav-center` block, AFTER the current `<a class="nav-link active">Worksheets</a>` link.

b) Add a "Open report draft →" link in the End-of-Day section's `.day-actions` row, alongside the existing Export and Reset buttons. Find the `<div class="day-actions">` near the bottom of the worksheet, and add as the FIRST element:

```html
<a href="../report/draft.html" class="btn" style="background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:6px;padding:0.45rem 0.85rem;font-size:0.82rem;text-decoration:none;display:inline-flex;align-items:center;gap:0.4rem;">📄 Open report draft</a>
```

Repeat the same change for all 5 day worksheets. Use a Python script if it's faster:

```bash
cd "/home/eli/Development/application pentesting guide"
python3 - << 'PY'
from pathlib import Path
import re
for n in range(1, 6):
    f = Path(f'days/day{n}.html')
    src = f.read_text()
    # 1. Topnav: add Report after Worksheets
    if '../report/index.html' not in src:
        src = src.replace(
            '<a href="../index.html#day' + str(n) + '" class="nav-link active">Worksheets</a>',
            '<a href="../index.html#day' + str(n) + '" class="nav-link active">Worksheets</a>\n    <a href="../report/index.html" class="nav-link">Report</a>',
            1
        )
    # 2. day-actions: add Open report draft as the first child button
    if 'Open report draft' not in src:
        src = re.sub(
            r'(<div class="day-actions">\s*\n)',
            r'\1      <a href="../report/draft.html" style="background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:6px;padding:0.45rem 0.85rem;font-size:0.82rem;text-decoration:none;display:inline-flex;align-items:center;gap:0.4rem;">📄 Open report draft</a>\n',
            src,
            count=1
        )
    f.write_text(src)
    print(f'  {f}')
PY
```

- [ ] **Step 4: Add Report entry to `thanks.html` nav**

Same pattern as `index.html` — add `<a href="report/index.html" class="nav-link">Report</a>` to the `.nav-center` block in `thanks.html`.

- [ ] **Step 5: Verify all pages have the Report link**

```bash
cd "/home/eli/Development/application pentesting guide"
for f in index.html thanks.html web-pentest-playbook.html days/day*.html; do
  c=$(grep -c 'report/index.html\|report/draft.html' "$f")
  echo "  $f: $c report link(s)"
done
```

Expected: every file shows ≥ 1.

- [ ] **Step 6: Commit**

```bash
git add index.html thanks.html web-pentest-playbook.html days/day*.html
git commit -m "Wire Report nav link across homepage, thanks, playbook, day worksheets"
```

---

### Task 7 — Local verification + push + verify live

**Files:** none modified (verification only)

- [ ] **Step 1: Boot the local preview server**

```bash
cd "/home/eli/Development/application pentesting guide"
python3 -m http.server 8765 &
SERVER_PID=$!
sleep 1
```

- [ ] **Step 2: HTTP-status checks**

```bash
for path in / /report/ /report/finding.html /report/draft.html /report/reportform.js \
            /index.html /days/day1.html; do
  c=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:8765$path")
  echo "  $c  $path"
done
```

Expected: all `200`.

- [ ] **Step 3: Functional check — round-trip a finding**

Open `http://localhost:8765/report/finding.html` in a browser:

1. Click `+ New finding`
2. Fill title: "Test SQLi"
3. Click on the CVSS dropdowns — set AV:N, AC:L, PR:N, UI:N, S:U, C:H, I:H, A:H. Score should display as **9.8 critical**.
4. Fill description: "Test"
5. Click `💾 Save finding`
6. Confirm finding appears in the list with severity pill "critical" and CVSS 9.8

Then navigate to `http://localhost:8765/report/draft.html`:

7. Confirm the finding appears in the Findings Overview table and as a section under "Findings"
8. Click `📄 Export Markdown` — confirm a .md file downloads
9. Open the downloaded .md file in a text editor — confirm the finding is rendered as expected (title, severity, CVSS, description, etc.)
10. Click `🖨 Print / Save as PDF` — confirm browser print dialog opens with the report rendered cleanly (no nav, no toolbar, no buttons)

- [ ] **Step 4: Stop the local preview**

```bash
kill $SERVER_PID
```

- [ ] **Step 5: Push to gh-pages**

```bash
git push origin gh-pages
```

- [ ] **Step 6: Wait for Pages build**

```bash
until s=$(gh api /repos/eligof/WebSec/pages/builds/latest --jq '.commit + " " + .status' 2>/dev/null); echo "$s" | grep -qE "$(git rev-parse HEAD | cut -c1-7).*built"; do sleep 8; done
echo "Built: $s"
```

- [ ] **Step 7: Verify live**

```bash
echo "=== Live check ==="
for path in /report/ /report/finding.html /report/draft.html /report/reportform.js; do
  c=$(/usr/bin/curl -s -o /dev/null -w '%{http_code}' "https://eligof.github.io/WebSec$path")
  echo "  $c  $path"
done

echo
echo "=== draft.html mentions key features? ==="
/usr/bin/curl -s "https://eligof.github.io/WebSec/report/draft.html?$(date +%s)" | \
  grep -cE "(Export Markdown|Print|Engagement|Findings Overview)"
```

Expected: every path is 200; the second grep returns 4.

- [ ] **Step 8: Verify nav links to Report exist on live**

```bash
echo "=== Report link count on live homepage ==="
/usr/bin/curl -s "https://eligof.github.io/WebSec/index.html?$(date +%s)" | grep -c "report/index.html\|report/draft.html"

echo "=== Report link on day worksheets ==="
for n in 1 2 3 4 5; do
  c=$(/usr/bin/curl -s "https://eligof.github.io/WebSec/days/day$n.html?$(date +%s)" | grep -c "report/")
  echo "  day$n: $c"
done
```

Expected: homepage ≥ 1, each day worksheet ≥ 2 (one in topnav, one in EOD actions).

---

## Self-review checklist

Before declaring the plan done, the engineer should verify:

- [ ] **Spec coverage** — every requirement from the senior-pentester review's "🔴 Critical missing pieces #1 (reporting layer)" is implemented:
  - [ ] Finding template (✓ `report/finding.html`)
  - [ ] Executive summary (✓ inline in `report/draft.html` engagement section)
  - [ ] CVSS calculator (✓ widget in `finding.html`)
  - [ ] Report assembly (✓ `report/draft.html`)
  - [ ] Markdown export (✓ `Report.downloadMarkdown`)
  - [ ] PDF export (✓ `@media print` + `window.print()`)
  - [ ] JSON export/import (✓ toolbar buttons in `draft.html`)
- [ ] **No placeholders** — all code blocks above contain real implementations, no `TODO` / `TBD` / `// implement here`
- [ ] **Type consistency** — function names match across tasks: `Report.upsertFinding`, `Report.computeCvss`, `Report.createCvssWidget`, `Report.generateMarkdown`, `Report.downloadMarkdown`, `Report.extractDayLeads`, `Report.getEngagement`, `Report.setEngagement`, `Report.getFindings`, `Report.setFindings`, `Report.deleteFinding`, `Report.newId`, `Report.parseVector`
- [ ] **Frequent commits** — each task ends with its own commit (7 commits total)

## Out-of-scope (future plans)

- Phase 2 — Engagement scoping (RoE template, credentials matrix, "ask the client" pre-flight checklist) — `report/scope.html` + `report/credentials.html`
- Phase 3 — Methodology variants (REST-only / GraphQL-only / SPA / multi-tenant) — variant pickers + reordered task lists
- Phase 4 — Modern attack-surface chapters (GraphQL worksheet, AI prompt-injection, supply-chain, cloud-native) — new `vulns/*.html` pages + worksheet sections
- Phase 5 — Cross-cutting polish (unified Ctrl+K search across the site, OWASP/NIST cross-mapping per vuln, PortSwigger lab links per vuln, changelog page, sticky TOC on worksheets, "today is Day N" auto-highlight, cleanup-banner on Day 5, README refresh, first-time-visitor landing modal)

Each gets its own plan when ready.
