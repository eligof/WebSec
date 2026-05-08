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
    function mdCell(s) {
      return String(s ?? '').replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');
    }
    function mdFence(body) {
      const longest = (String(body).match(/`+/g) || []).reduce((m, s) => Math.max(m, s.length), 0);
      const f = '`'.repeat(Math.max(3, longest + 1));
      return `${f}\n${body}\n${f}`;
    }

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
    if (eng.scope)   lines.push(`**Scope:**\n${mdFence(eng.scope)}`);
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
        lines.push(`| ${i + 1} | ${mdCell(f.severity || '?')} | ${mdCell(f.cvssScore ?? '')} | ${mdCell(f.title || '')} | ${mdCell(f.status || 'open')} |`);
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
      if (f.repro)       { lines.push('**Reproduction**'); lines.push(''); lines.push(mdFence(f.repro)); lines.push(''); }
      if (f.evidence)    { lines.push('**Evidence**');     lines.push(''); lines.push(mdFence(f.evidence)); lines.push(''); }
      if (f.remediation) { lines.push('**Remediation**');  lines.push(''); lines.push(f.remediation); lines.push(''); }
      if (f.references)  { lines.push('**References**');   lines.push(''); lines.push(f.references); lines.push(''); }
    });

    lines.push('## Working Notes (from day worksheets)');
    lines.push('');
    extractDayLeads().forEach(({ source, text }) => {
      lines.push(`### ${source}`);
      lines.push('');
      lines.push(mdFence(text));
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
