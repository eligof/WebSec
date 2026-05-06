![License](https://img.shields.io/badge/license-MIT-green)
![BSCP](https://img.shields.io/badge/BSCP-exam%20coverage-purple)
![Vulns](https://img.shields.io/badge/vulnerabilities-23%20covered-blue)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-live-brightgreen)

# 🔐 Web App Pentesting Playbook

A workflow-first reference guide for web application penetration testing, covering 23 vulnerability classes with interactive checklists, Burp Suite workflows, real payloads, and BSCP exam coverage.

## What This Is

This is a **static HTML reference site** — no server required. You can open it directly in your browser or host it on GitHub Pages. It's built around a **5-day penetration testing methodology** that emphasizes breadth before depth: follow the structured workflow to identify vulnerability classes, then dive deep into individual pages when you find a signal during testing.

Each vulnerability page is **self-contained** with everything you need: Burp Suite step-by-step workflows, real payloads with one-click copy buttons, testing checklists (with browser-side progress tracking), WAF bypass techniques, and links to relevant PortSwigger Web Security Academy labs. The site is designed for technical beginners and candidates preparing for the BSCP (Burp Suite Certified Practitioner) exam.

**Key principle:** Read the playbook once to understand the methodology, then use individual vulnerability pages as a reference during live testing.

## Live Demo

🌐 **[eligof.github.io/WebSec](https://eligof.github.io/WebSec/)** — Open in your browser right now (no installation required).

## Features

- **5-day workflow-first structure** — Not just a list of vulnerabilities; a tested methodology for penetration testing
- **23 vulnerability deep-dives** — Each with Burp Suite workflows, real-world examples, and testing strategies
- **Real payloads with copy buttons** — No need to type; one-click payload copying
- **Interactive testing checklists** — Progress saved in browser localStorage across sessions
- **Workflow placement** — Every vulnerability mapped to its day in the 5-day timeline (Day 1–5)
- **Attack chains** — "See Also" links connecting related vulnerabilities
- **WAF bypass techniques** — Evasion methods for each vulnerability class
- **PortSwigger lab references** — Direct links to relevant Web Security Academy labs
- **Global Ctrl+K search** — Search across all 23 vulnerability pages instantly
- **BSCP exam coverage** — Clearly marked throughout the guide
- **No JavaScript frameworks, no build step** — Pure HTML/CSS/JS; runs in any browser

## Vulnerability Coverage

| Vulnerability | Severity | Day | BSCP Coverage |
|---|---|---|---|
| SQL Injection | 🔴 Critical | Day 4 | ✅ |
| Cross-Site Scripting (XSS) | 🟠 High | Day 5 | ✅ |
| Cross-Site Request Forgery (CSRF) | 🟠 High | Day 3 | ✅ |
| Authentication Bypass | 🔴 Critical | Day 2 | ✅ |
| Authorization Flaws | 🔴 Critical | Day 3 | ✅ |
| Insecure Deserialization | 🔴 Critical | Day 4 | ✅ |
| XML External Entity (XXE) | 🔴 Critical | Day 5 | ✅ |
| Server-Side Request Forgery (SSRF) | 🟠 High | Day 4 | ✅ |
| Command Injection | 🔴 Critical | Day 4 | ✅ |
| Path Traversal | 🟠 High | Day 4 | ✅ |
| Business Logic Flaws | 🟠 High | Day 2 | ✅ |
| Information Disclosure | 🟠 High | Day 1 | ✅ |
| Broken Access Control | 🔴 Critical | Day 3 | ✅ |
| Insecure File Upload | 🟠 High | Day 5 | ✅ |
| Server-Side Template Injection (SSTI) | 🔴 Critical | Day 5 | ✅ |
| API Vulnerabilities | 🟠 High | Day 2 | ✅ |
| NoSQL Injection | 🟠 High | Day 4 | ✅ |
| WebSocket Vulnerabilities | 🟠 High | Day 3 | ✅ |
| HTTP Request Smuggling | 🔴 Critical | Day 4 | ✅ |
| Race Conditions | 🟠 High | Day 5 | ✅ |
| Cache Poisoning | 🟠 High | Day 3 | ✅ |
| JWT Vulnerabilities | 🟠 High | Day 2 | ✅ |
| Subdomain Enumeration | 🟡 Medium | Day 1 | ✅ |

## Site Structure

```
WebSec/
├── index.html                    # Workflow-first home page
├── web-pentest-playbook.html     # Full methodology reference
├── README.md                     # This file
└── vulns/
    ├── style.css                 # Shared stylesheet
    ├── search.js                 # Global Ctrl+K search
    ├── sqli.html                 # SQL Injection
    ├── xss.html                  # Cross-Site Scripting
    ├── csrf.html                 # Cross-Site Request Forgery
    ├── auth.html                 # Authentication Bypass
    ├── authz.html                # Authorization Flaws
    ├── deserialization.html       # Insecure Deserialization
    ├── xxe.html                  # XML External Entity
    ├── ssrf.html                 # Server-Side Request Forgery
    ├── command-injection.html     # Command Injection
    ├── path-traversal.html        # Path Traversal
    ├── business-logic.html        # Business Logic Flaws
    ├── info-disclosure.html       # Information Disclosure
    ├── broken-access.html         # Broken Access Control
    ├── file-upload.html           # Insecure File Upload
    ├── ssti.html                  # Server-Side Template Injection
    ├── api-vulns.html             # API Vulnerabilities
    ├── nosql.html                 # NoSQL Injection
    ├── websocket.html             # WebSocket Vulnerabilities
    ├── http-smuggling.html        # HTTP Request Smuggling
    ├── race-conditions.html        # Race Conditions
    ├── cache-poison.html          # Cache Poisoning
    ├── jwt.html                   # JWT Vulnerabilities
    └── subdomain-enum.html        # Subdomain Enumeration
```

## How to Use

### Option 1: Local (No Server Required)

Clone the repository and open `index.html` directly in your browser:

```bash
git clone https://github.com/eligof/WebSec.git
cd WebSec
open index.html   # macOS
# or: xdg-open index.html (Linux)
# or: start index.html (Windows)
# or just double-click index.html in your file explorer
```

### Option 2: GitHub Pages (Live Online)

Visit **[eligof.github.io/WebSec](https://eligof.github.io/WebSec/)** to use the live version.

## 5-Day Methodology Overview

The playbook is structured around a tested 5-day penetration testing workflow:

| Day | Focus | Vulnerabilities | Goal |
|---|---|---|---|
| **Day 1** | Reconnaissance & Surface | Information Disclosure, Subdomain Enumeration | Map the application scope |
| **Day 2** | Authentication & APIs | Auth Bypass, Business Logic, APIs, JWT | Identify weak authentication |
| **Day 3** | Access Control & Session | Authorization Flaws, CSRF, WebSocket, Cache Poison | Find privilege escalation paths |
| **Day 4** | Injection & Protocol | SQL Injection, Command Injection, XXE, SSRF, NoSQL, HTTP Smuggling | Exploit data-level vulnerabilities |
| **Day 5** | Advanced & Client-Side | XSS, File Upload, SSTI, Race Conditions, Deserialization | Escalate findings into impact |

**See the full methodology** in [`web-pentest-playbook.html`](./web-pentest-playbook.html) for detailed workflows, attack chains, and lab mappings.

## Recommended Learning Path

1. **Start here:** Open `index.html` to see the 5-day overview
2. **Understand the methodology:** Read through `web-pentest-playbook.html`
3. **During testing:** When you spot a vulnerability class, jump to the corresponding page in `vulns/` for deep-dive guidance
4. **Reference:** Use the global search (Ctrl+K) to find payloads, bypass techniques, or lab links quickly

## Resources & Credits

- **PortSwigger Web Security Academy** — Primary lab resource (all vulnerabilities cross-referenced)
- **OWASP Testing Guide** — Industry standard for web application testing methodology
- **BSCP Exam Preparation** — Built with Burp Suite Certified Practitioner candidates in mind

## License

MIT License — Free to use, share, modify, and distribute with attribution.

## Contributing

Contributions are welcome! To contribute:

1. **New vulnerability pages** — Follow the template in existing pages (`vulns/sqli.html`) and submit a PR
2. **Payload additions** — Update payloads in any vulnerability page with new, tested examples
3. **Lab updates** — If PortSwigger Web Security Academy links change, submit a PR with updated URLs
4. **Methodology improvements** — Suggestions for the 5-day workflow are always welcome

Submit pull requests to [github.com/eligof/WebSec](https://github.com/eligof/WebSec).

---

**Questions?** Open an issue on GitHub. **Ready to test?** Open the [live site](https://eligof.github.io/WebSec/) and start with Day 1.
