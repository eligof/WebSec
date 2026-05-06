(function() {
  const GS_INDEX = [
    { name: 'SQL Injection', abbr: 'SQLi', icon: '🗄️', url: 'sqli.html', day: 'Day 4', severity: 'critical', keywords: 'sql injection database union blind error time based boolean' },
    { name: 'Cross-Site Scripting', abbr: 'XSS', icon: '⚡', url: 'xss.html', day: 'Day 5', severity: 'high', keywords: 'xss cross site scripting reflected stored dom javascript alert cookie steal' },
    { name: 'Cross-Site Request Forgery', abbr: 'CSRF', icon: '🎭', url: 'csrf.html', day: 'Day 3', severity: 'high', keywords: 'csrf cross site request forgery state change token samesite' },
    { name: 'IDOR / Access Control', abbr: 'IDOR', icon: '🚪', url: 'idor.html', day: 'Day 2', severity: 'high', keywords: 'idor insecure direct object reference access control authorization privilege' },
    { name: 'Command Injection', abbr: 'CMDi', icon: '💻', url: 'cmdi.html', day: 'Day 4', severity: 'critical', keywords: 'command injection os shell rce remote code execution semicolon' },
    { name: 'Server-Side Request Forgery', abbr: 'SSRF', icon: '📡', url: 'ssrf.html', day: 'Day 4', severity: 'critical', keywords: 'ssrf server side request forgery internal network cloud metadata aws' },
    { name: 'File Upload', abbr: 'File Upload', icon: '📂', url: 'file-upload.html', day: 'Day 3', severity: 'critical', keywords: 'file upload webshell php rce bypass extension mime type' },
    { name: 'Path Traversal', abbr: 'LFI', icon: '📁', url: 'path-traversal.html', day: 'Day 3', severity: 'high', keywords: 'path traversal directory lfi dot dot slash etc passwd' },
    { name: 'XML External Entity', abbr: 'XXE', icon: '📄', url: 'xxe.html', day: 'Day 4', severity: 'high', keywords: 'xxe xml external entity doctype ssrf file read' },
    { name: 'JWT Attacks', abbr: 'JWT', icon: '🎫', url: 'jwt.html', day: 'Day 2', severity: 'critical', keywords: 'jwt json web token algorithm none confusion weak secret rs256 hs256' },
    { name: 'Server-Side Template Injection', abbr: 'SSTI', icon: '📝', url: 'ssti.html', day: 'Day 4', severity: 'critical', keywords: 'ssti template injection jinja2 twig freemarker rce 7*7 49' },
    { name: 'Insecure Deserialization', abbr: 'Deserialization', icon: '📦', url: 'deserialization.html', day: 'Day 4', severity: 'critical', keywords: 'deserialization java php python pickle gadget ysoserial rO0AB' },
    { name: 'CORS Misconfiguration', abbr: 'CORS', icon: '🌍', url: 'cors.html', day: 'Day 3', severity: 'high', keywords: 'cors cross origin resource sharing acao acac null reflect' },
    { name: 'OAuth 2.0 Vulnerabilities', abbr: 'OAuth', icon: '🔗', url: 'oauth.html', day: 'Day 2', severity: 'critical', keywords: 'oauth openid oidc state csrf redirect uri code flow authorization' },
    { name: 'Race Conditions', abbr: 'Race Condition', icon: '⏱️', url: 'race-conditions.html', day: 'Day 4', severity: 'high', keywords: 'race condition toctou parallel requests limit bypass turbo intruder http2 coupon' },
    { name: 'GraphQL Vulnerabilities', abbr: 'GraphQL', icon: '🔷', url: 'graphql.html', day: 'Day 3', severity: 'high', keywords: 'graphql introspection batching idor injection schema enumeration voyager' },
    { name: 'WebSocket Vulnerabilities', abbr: 'CSWSH', icon: '🔌', url: 'websocket.html', day: 'Day 3', severity: 'high', keywords: 'websocket cswsh cross site hijacking xss injection ws wss origin' },
    { name: 'Prototype Pollution', abbr: 'PP', icon: '☣️', url: 'prototype-pollution.html', day: 'Day 5', severity: 'high', keywords: 'prototype pollution javascript proto object property injection gadget' },
    { name: 'Clickjacking', abbr: 'Clickjacking', icon: '🖱️', url: 'clickjacking.html', day: 'Day 3', severity: 'medium', keywords: 'clickjacking iframe opacity x-frame-options csp ui redressing' },
    { name: 'Host Header Injection', abbr: 'Host Header', icon: '🏷️', url: 'host-header.html', day: 'Day 5', severity: 'high', keywords: 'host header injection password reset poisoning x-forwarded-host virtual hosting' },
    { name: 'Web Cache Poisoning', abbr: 'Cache Poisoning', icon: '☠️', url: 'cache-poisoning.html', day: 'Day 5', severity: 'high', keywords: 'cache poisoning unkeyed header cdn x-cache param miner vary' },
    { name: 'NoSQL Injection', abbr: 'NoSQLi', icon: '🍃', url: 'nosqli.html', day: 'Day 4', severity: 'high', keywords: 'nosql injection mongodb ne gt regex where operator json authentication bypass' },
    { name: 'HTTP Request Smuggling', abbr: 'Smuggling', icon: '🚢', url: 'request-smuggling.html', day: 'Day 4', severity: 'critical', keywords: 'request smuggling http cl te transfer encoding content length desync' },
  ];

  let gsSelectedIndex = -1;

  function getSeverityStyles(severity) {
    switch (severity) {
      case 'critical':
        return 'background: #3d0a5e; color: #e879f9;';
      case 'high':
        return 'background: #231500; color: #fb923c;';
      case 'medium':
        return 'background: #0e1530; color: #93c5fd;';
      default:
        return 'background: #1a1828; color: #9d99c0;';
    }
  }

  function filterResults(query) {
    if (!query.trim()) {
      return [];
    }

    const q = query.toLowerCase();
    return GS_INDEX.filter(item => {
      return (
        item.name.toLowerCase().includes(q) ||
        item.abbr.toLowerCase().includes(q) ||
        item.keywords.toLowerCase().includes(q)
      );
    }).slice(0, 8);
  }

  function renderResults(results, query) {
    const resultsDiv = document.getElementById('gs-results');
    if (!resultsDiv) return;

    gsSelectedIndex = -1;

    if (results.length === 0) {
      if (query.trim()) {
        // Safe DOM construction — avoids XSS from unsanitized query input
        const noResultDiv = document.createElement('div');
        noResultDiv.style.cssText = 'padding: 1rem; text-align: center; color: #9d99c0; font-size: 0.9rem;';
        noResultDiv.appendChild(document.createTextNode("No results for '"));
        const strong = document.createElement('strong');
        strong.textContent = query; // textContent is XSS-safe
        noResultDiv.appendChild(strong);
        noResultDiv.appendChild(document.createTextNode("'"));
        resultsDiv.innerHTML = '';
        resultsDiv.appendChild(noResultDiv);
      } else {
        resultsDiv.innerHTML = '';
      }
      return;
    }

    const html = results.map((item, idx) => {
      const severityStyle = getSeverityStyles(item.severity);
      return `
        <div class="gs-result-item" data-idx="${idx}" style="padding: 0.75rem 1rem; border-bottom: 1px solid #2d2550; cursor: pointer; transition: background 0.15s; display: flex; align-items: center; gap: 0.75rem;">
          <div style="font-size: 1.25rem; flex-shrink: 0;">${item.icon}</div>
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
              <span style="font-weight: 600; color: #e2e0f0; font-size: 0.95rem;">${item.name}</span>
              <span style="padding: 0.2rem 0.5rem; border-radius: 3px; font-size: 0.7rem; font-weight: 500; background: #1a1828; color: #9d99c0;">${item.abbr}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem;">
              <span style="padding: 0.15rem 0.5rem; border-radius: 12px; background: #1a1828; color: #9d99c0;">${item.day}</span>
              <span style="padding: 0.15rem 0.5rem; border-radius: 3px; font-size: 0.7rem; font-weight: 500; ${severityStyle}">${item.severity.toUpperCase()}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    resultsDiv.innerHTML = html;

    // Attach click handlers to result items
    const items = resultsDiv.querySelectorAll('.gs-result-item');
    items.forEach(item => {
      item.addEventListener('mouseenter', () => {
        const idx = parseInt(item.dataset.idx, 10);
        setSelectedIndex(idx);
      });
      item.addEventListener('click', () => {
        const idx = parseInt(item.dataset.idx, 10);
        navigateToResult(results[idx]);
      });
    });
  }

  function setSelectedIndex(idx) {
    const items = document.querySelectorAll('.gs-result-item');
    items.forEach((item, i) => {
      if (i === idx) {
        item.style.background = '#1a1828';
      } else {
        item.style.background = 'transparent';
      }
    });
    gsSelectedIndex = idx;
  }

  function handleInputChange() {
    const input = document.getElementById('gs-input');
    const query = input.value;
    const results = filterResults(query);
    renderResults(results, query);
  }

  function handleKeydown(e) {
    const input = document.getElementById('gs-input');
    const query = input.value;
    const results = filterResults(query);

    if (e.key === 'Escape') {
      gsClose();
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (gsSelectedIndex < results.length - 1) {
        setSelectedIndex(gsSelectedIndex + 1);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (gsSelectedIndex > 0) {
        setSelectedIndex(gsSelectedIndex - 1);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (gsSelectedIndex >= 0 && gsSelectedIndex < results.length) {
        navigateToResult(results[gsSelectedIndex]);
      }
    }
  }

  function navigateToResult(item) {
    window.location.href = item.url;
  }

  function gsOpen() {
    const overlay = document.getElementById('gs-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
      const input = document.getElementById('gs-input');
      input.focus();
      input.value = '';
      renderResults([], '');
    }
  }

  function gsClose() {
    const overlay = document.getElementById('gs-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }

  // Expose functions globally
  window.gsOpen = gsOpen;
  window.gsClose = gsClose;

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', function() {
    // Inject trigger button into .topnav
    const topnav = document.querySelector('.topnav');
    if (topnav) {
      const navLinks = topnav.querySelector('.nav-links');
      const button = document.createElement('button');
      button.className = 'gs-trigger';
      button.innerHTML = '🔍 Search';
      button.onclick = gsOpen;
      button.style.cssText = 'background: #1c2128; border: 1px solid #2d2550; color: #9d99c0; border-radius: 6px; padding: 0.2rem 0.7rem; font-size: 0.78rem; cursor: pointer; font-family: inherit; margin-right: 0.5rem; transition: all 0.15s;';

      // Add hover state
      button.addEventListener('mouseenter', function() {
        this.style.background = '#1a1828';
        this.style.borderColor = '#444c56';
        this.style.color = '#e2e0f0';
      });
      button.addEventListener('mouseleave', function() {
        this.style.background = '#1c2128';
        this.style.borderColor = '#2d2550';
        this.style.color = '#9d99c0';
      });

      if (navLinks) {
        topnav.insertBefore(button, navLinks);
      } else {
        topnav.appendChild(button);
      }
    }

    // Inject modal HTML into body
    const modalHTML = `
      <div class="gs-overlay" id="gs-overlay" onclick="if(event.target===this)gsClose()" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.6); z-index: 10000; align-items: flex-start; justify-content: center; padding-top: 10vh; padding-bottom: 10vh;">
        <div class="gs-box" style="background: #0c0b14; border: 1px solid #2d2550; border-radius: 8px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); width: 90%; max-width: 600px; max-height: 70vh; display: flex; flex-direction: column; overflow: hidden;">
          <div class="gs-input-wrap" style="padding: 1rem; border-bottom: 1px solid #2d2550; display: flex; align-items: center; gap: 0.75rem;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #9d99c0; flex-shrink: 0;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input class="gs-input" id="gs-input" type="text" placeholder="Search vulnerabilities…" autocomplete="off" style="flex: 1; background: transparent; border: none; color: #e2e0f0; font-size: 1rem; outline: none; font-family: inherit;">
            <kbd class="gs-kbd" onclick="gsClose()" style="padding: 0.2rem 0.5rem; background: #1a1828; border: 1px solid #2d2550; border-radius: 4px; font-size: 0.75rem; color: #9d99c0; cursor: pointer; font-family: inherit;">Esc</kbd>
          </div>
          <div class="gs-results" id="gs-results" style="flex: 1; overflow-y: auto; color: #9d99c0;"></div>
          <div class="gs-footer" style="padding: 0.75rem 1rem; border-top: 1px solid #2d2550; display: flex; justify-content: flex-end; gap: 1.5rem; font-size: 0.75rem; color: #9d99c0; background: #0c0b14;">
            <span><kbd style="padding: 0.15rem 0.35rem; background: #1a1828; border: 1px solid #2d2550; border-radius: 3px; font-family: inherit;">↑↓</kbd> navigate</span>
            <span><kbd style="padding: 0.15rem 0.35rem; background: #1a1828; border: 1px solid #2d2550; border-radius: 3px; font-family: inherit;">↵</kbd> open</span>
            <span><kbd style="padding: 0.15rem 0.35rem; background: #1a1828; border: 1px solid #2d2550; border-radius: 3px; font-family: inherit;">Esc</kbd> close</span>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Attach event listeners to modal input
    const gsInput = document.getElementById('gs-input');
    gsInput.addEventListener('input', handleInputChange);
    gsInput.addEventListener('keydown', handleKeydown);

    // Attach global keyboard shortcut for Ctrl+K and Cmd+K
    document.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        gsOpen();
      }
    });
  });
})();
