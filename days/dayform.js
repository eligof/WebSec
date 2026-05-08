/* ───────────────────────────────────────────────────────────
   Day Worksheet — auto-save + progress + reset + export
   ───────────────────────────────────────────────────────────
   Each <input data-key="…"> on the page is namespaced under the
   day id (set via <body data-day="day1">) and persisted to
   localStorage on every change.

   Conventions:
   - Checkboxes:  data-key="check-<short>" → stored as "true"/"false"
   - Text inputs: data-key="text-<short>"   → stored as a string
   - Textareas:   data-key="text-<short>"   → stored as a string
   ─────────────────────────────────────────────────────────── */
(function () {
  const dayId = document.body.dataset.day;
  if (!dayId) {
    console.warn('[dayform] <body data-day="dayN"> is required');
    return;
  }
  const STORAGE_PREFIX = dayId + '.';

  /* ── Load saved values into the DOM ── */
  function loadAll() {
    document.querySelectorAll('[data-key]').forEach(el => {
      const key = STORAGE_PREFIX + el.dataset.key;
      const stored = localStorage.getItem(key);
      if (stored === null) return;
      if (el.type === 'checkbox') {
        el.checked = stored === 'true';
        toggleDoneClass(el);
      } else {
        el.value = stored;
      }
    });
  }

  /* ── Mark a task <li> as done when its checkbox flips ── */
  function toggleDoneClass(el) {
    const li = el.closest('li');
    if (!li) return;
    li.classList.toggle('done', el.checked);
  }

  /* ── Save a single field ── */
  function save(el) {
    const key = STORAGE_PREFIX + el.dataset.key;
    const value = el.type === 'checkbox' ? String(el.checked) : el.value;
    try {
      localStorage.setItem(key, value);
      flashSavedIndicator();
    } catch (e) {
      console.warn('[dayform] localStorage write failed', e);
    }
  }

  /* ── "Saved" indicator next to the progress bar ── */
  let saveTimer = null;
  function flashSavedIndicator() {
    const el = document.querySelector('.day-progress-saved');
    if (!el) return;
    el.classList.add('visible');
    el.textContent = '✓ Saved';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => el.classList.remove('visible'), 1200);
  }

  /* ── Update the progress bar based on checkboxes ── */
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

  /* ── Reset everything for this day ── */
  function reset() {
    if (!confirm(`Reset all progress and notes for ${dayId.toUpperCase()}? This cannot be undone.`)) return;
    document.querySelectorAll('[data-key]').forEach(el => {
      const key = STORAGE_PREFIX + el.dataset.key;
      localStorage.removeItem(key);
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
    lines.push('═══════════════════════════════════════════');
    lines.push(`  ${dayTitle}`);
    lines.push(`  Exported: ${new Date().toISOString()}`);
    lines.push('═══════════════════════════════════════════\n');

    document.querySelectorAll('.worksheet-section').forEach(section => {
      const heading = section.querySelector('h2');
      if (!heading) return;
      const title = heading.innerText.trim();
      lines.push(`\n## ${title}\n`);

      // Form fields (text/textarea)
      section.querySelectorAll('.form-group').forEach(g => {
        const label = g.querySelector('label')?.innerText.trim() || '';
        const input = g.querySelector('[data-key]');
        if (!input) return;
        const v = input.value.trim();
        if (v) lines.push(`${label}:\n  ${v.replace(/\n/g, '\n  ')}\n`);
      });

      // Task checkboxes
      section.querySelectorAll('.task-list li').forEach(li => {
        const cb = li.querySelector('input[type="checkbox"]');
        const label = li.querySelector('.task-label')?.innerText.trim() || li.innerText.trim();
        if (!cb) return;
        const mark = cb.checked ? '[x]' : '[ ]';
        lines.push(`  ${mark} ${label}`);
      });
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${dayId}-worksheet-${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  /* ── Wire it up ── */
  function init() {
    loadAll();
    updateProgress();

    // Auto-save on every input change
    document.querySelectorAll('[data-key]').forEach(el => {
      const ev = el.type === 'checkbox' ? 'change' : 'input';
      el.addEventListener(ev, () => {
        save(el);
        if (el.type === 'checkbox') {
          toggleDoneClass(el);
          updateProgress();
        }
      });
    });

    // Reset / Export buttons
    document.getElementById('day-reset')?.addEventListener('click', reset);
    document.getElementById('day-export')?.addEventListener('click', exportText);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
