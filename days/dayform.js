/* ───────────────────────────────────────────────────────────
   Day Worksheet — auto-save + progress + reset + export
                  + cross-day shared keys + date correlation
                  + ready-to-fire snippet copy buttons
   ─────────────────────────────────────────────────────────── */
(function () {
  const dayId  = document.body.dataset.day;     // e.g. "day1"
  const dayNum = parseInt(document.body.dataset.dayNum || '0', 10);
  if (!dayId) {
    console.warn('[dayform] <body data-day="dayN"> is required');
    return;
  }
  const STORAGE_PREFIX = dayId + '.';

  /* Storage key for an element. data-key starting with "shared." is global
     (shared across all 5 days), everything else is namespaced under dayId. */
  function storageKey(el) {
    const k = el.dataset.key;
    return k.startsWith('shared.') ? k : (STORAGE_PREFIX + k);
  }

  /* ── Load saved values into the DOM ── */
  function loadAll() {
    document.querySelectorAll('[data-key]').forEach(el => {
      const stored = localStorage.getItem(storageKey(el));
      if (stored === null) return;
      if (el.type === 'checkbox') {
        el.checked = stored === 'true';
        toggleDoneClass(el);
      } else {
        el.value = stored;
      }
    });
  }

  function toggleDoneClass(el) {
    const li = el.closest('li');
    if (li) li.classList.toggle('done', el.checked);
  }

  function save(el) {
    const value = el.type === 'checkbox' ? String(el.checked) : el.value;
    try {
      localStorage.setItem(storageKey(el), value);
      flashSavedIndicator();
    } catch (e) {
      console.warn('[dayform] localStorage write failed', e);
    }
  }

  let saveTimer = null;
  function flashSavedIndicator() {
    const el = document.querySelector('.day-progress-saved');
    if (!el) return;
    el.classList.add('visible');
    el.textContent = '✓ Saved';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => el.classList.remove('visible'), 1200);
  }

  function updateProgress() {
    const boxes = document.querySelectorAll('[data-key^="check-"]');
    const done = Array.from(boxes).filter(b => b.checked).length;
    const total = boxes.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const bar = document.querySelector('.day-progress-bar');
    if (bar) bar.style.width = pct + '%';
    const text = document.querySelector('.day-progress-text');
    if (text) {
      text.innerHTML = `<strong>${done}</strong> / ${total} tasks · <strong>${pct}%</strong> complete`;
    }
  }

  /* ── Date correlation ──
     Engagement start date is stored under shared.startDate.
     Each day computes (start + dayNum - 1 days) and renders into
     every [data-day-date] element on the page. */
  function updateDayDate() {
    const start = localStorage.getItem('shared.startDate');
    const targets = document.querySelectorAll('[data-day-date]');
    if (!targets.length || !dayNum) return;

    if (!start) {
      targets.forEach(el => {
        el.textContent = dayNum === 1
          ? '◌ pick start date below'
          : '◌ no start date set (set on Day 1)';
        el.classList.add('unset');
      });
      return;
    }
    const d = new Date(start + 'T00:00:00');
    if (isNaN(d.getTime())) return;
    d.setDate(d.getDate() + (dayNum - 1));
    const formatted = d.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });
    targets.forEach(el => {
      el.textContent = formatted;
      el.classList.remove('unset');
    });
  }

  /* ── Reset everything for this day (does NOT touch shared.* keys) ── */
  function reset() {
    if (!confirm(`Reset all progress and notes for ${dayId.toUpperCase()}? This cannot be undone.`)) return;
    document.querySelectorAll('[data-key]').forEach(el => {
      const k = el.dataset.key;
      if (k.startsWith('shared.')) return;        // leave shared keys alone
      localStorage.removeItem(STORAGE_PREFIX + k);
      if (el.type === 'checkbox') {
        el.checked = false;
        toggleDoneClass(el);
      } else {
        el.value = '';
      }
    });
    updateProgress();
  }

  /* ── Export as plain-text report ── */
  function exportText() {
    const lines = [];
    const dayTitle = document.querySelector('.day-page-hero h1')?.innerText.trim() || dayId;
    const dateLine = document.querySelector('.day-date-display')?.textContent.trim() || '';
    lines.push('═══════════════════════════════════════════');
    lines.push(`  ${dayTitle}`);
    if (dateLine && !dateLine.startsWith('◌')) lines.push(`  Date: ${dateLine}`);
    lines.push(`  Exported: ${new Date().toISOString()}`);
    lines.push('═══════════════════════════════════════════\n');

    document.querySelectorAll('.worksheet-section').forEach(section => {
      const heading = section.querySelector('h2');
      if (!heading) return;
      lines.push(`\n## ${heading.innerText.trim()}\n`);

      section.querySelectorAll('.form-group').forEach(g => {
        const label = g.querySelector('label')?.innerText.trim() || '';
        const input = g.querySelector('[data-key]');
        if (!input) return;
        const v = (input.value || '').trim();
        if (v) lines.push(`${label}:\n  ${v.replace(/\n/g, '\n  ')}\n`);
      });

      section.querySelectorAll('.task-list li').forEach(li => {
        const cb = li.querySelector('input[type="checkbox"]');
        const label = li.querySelector('.task-label')?.innerText.trim() || li.innerText.trim();
        if (!cb) return;
        lines.push(`  ${cb.checked ? '[x]' : '[ ]'} ${label}`);
      });
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${dayId}-worksheet-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  /* ── Snippet copy buttons ── */
  function setupCopyButtons() {
    document.querySelectorAll('pre.snippet').forEach(pre => {
      if (pre.querySelector('.snippet-copy-btn')) return;
      const btn = document.createElement('button');
      btn.className = 'snippet-copy-btn';
      btn.textContent = 'Copy';
      btn.type = 'button';
      pre.appendChild(btn);
      btn.addEventListener('click', () => {
        const code = pre.querySelector('code')?.innerText
                  || pre.innerText.replace('Copy', '').trim();
        navigator.clipboard.writeText(code).then(() => {
          btn.textContent = '✓ Copied';
          btn.classList.add('copied');
          setTimeout(() => {
            btn.textContent = 'Copy';
            btn.classList.remove('copied');
          }, 1500);
        }).catch(() => {
          btn.textContent = '✗ Error';
          setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
        });
      });
    });
  }

  function init() {
    loadAll();
    updateProgress();
    updateDayDate();
    setupCopyButtons();

    document.querySelectorAll('[data-key]').forEach(el => {
      const ev = el.type === 'checkbox' ? 'change' : 'input';
      el.addEventListener(ev, () => {
        save(el);
        if (el.type === 'checkbox') {
          toggleDoneClass(el);
          updateProgress();
        }
        // If the user just changed the engagement start date, re-render every
        // day-date display on this page (and on other open tabs via 'storage').
        if (el.dataset.key === 'shared.startDate') updateDayDate();
      });
    });

    // Cross-tab: react if the user updates startDate on another worksheet tab
    window.addEventListener('storage', (e) => {
      if (e.key === 'shared.startDate') {
        const inp = document.querySelector('[data-key="shared.startDate"]');
        if (inp) inp.value = e.newValue || '';
        updateDayDate();
      }
    });

    document.getElementById('day-reset')?.addEventListener('click', reset);
    document.getElementById('day-export')?.addEventListener('click', exportText);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
