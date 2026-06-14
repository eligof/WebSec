![License](https://img.shields.io/badge/license-MIT-green)
![BSCP](https://img.shields.io/badge/BSCP-23%20classes-purple)
![Pages](https://img.shields.io/badge/vulnerability%20pages-27-blue)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-live-brightgreen)

# 🔐 Web App Pentesting Playbook

A workflow-first reference guide for web application penetration testing, covering 27 vulnerability and recon pages with interactive checklists, Burp Suite workflows, real payloads, and BSCP exam coverage.

## What This Is

This is a **static HTML reference site** — no server required. You can open it directly in your browser or host it on GitHub Pages. It is built around a **5-day penetration testing methodology** that emphasizes breadth before depth: follow the structured workflow to identify vulnerability classes, then dive deep into individual pages when you find a signal during testing.

Each vulnerability page is **self-contained** with everything you need: Burp Suite step-by-step workflows, real payloads with one-click copy buttons, testing checklists (with browser-side progress tracking), WAF bypass techniques, and links to relevant PortSwigger Web Security Academy labs. The site is designed for technical beginners and candidates preparing for the BSCP (Burp Suite Certified Practitioner) exam.

**Key principle:** Read the playbook once to understand the methodology, then use individual vulnerability pages as a reference during live testing.

## Live Demo

🌐 **[eligof.github.io/Web-App-Pentesting-Playbook](https://eligof.github.io/Web-App-Pentesting-Playbook/)** — Open in your browser right now (no installation required).

## Features

- **5-day workflow-first structure** — Not just a list of vulnerabilities; a structured methodology for web application testing
- **27 vulnerability and recon pages** — Each with Burp Suite workflows, real-world examples, and testing strategies
- **23 classes mapped to BSCP** — Plus 4 additional modern and recon topics (AI prompt injection, cloud-native, supply-chain, OSINT)
- **Real payloads with copy buttons** — No need to type; one-click payload copying
- **Interactive testing checklists** — Progress saved in browser localStorage across sessions
- **Attack chains** — "See Also" links connecting related vulnerabilities
- **WAF bypass techniques** — Evasion methods for each vulnerability class
- **PortSwigger lab references** — Direct links to relevant Web Security Academy labs
- **Global Ctrl+K search** — Search across all vulnerability pages instantly
- **No JavaScript frameworks, no build step** — Pure HTML/CSS/JS; runs in any browser

## Vulnerability Coverage

| Vulnerability | Category | BSCP |
|---|---|---|
| Google Dorking & OSINT Recon | Recon | — |
| SQL Injection | Injection | ✅ |
| NoSQL Injection | Injection | ✅ |
| Command Injection | Injection | ✅ |
| Server-Side Template Injection (SSTI) | Injection | ✅ |
| XXE Injection | Injection | ✅ |
| Cross-Site Scripting (XSS) | Client-side | ✅ |
| Cross-Site Request Forgery (CSRF) | Client-side | ✅ |
| CORS Misconfiguration | Client-side | ✅ |
| Clickjacking | Client-side | ✅ |
| Prototype Pollution | Client-side | ✅ |
| IDOR | Access control | ✅ |
| Race Conditions | Logic | ✅ |
| JWT Attacks | Auth & session | ✅ |
| OAuth 2.0 Vulnerabilities | Auth & session | ✅ |
| Server-Side Request Forgery (SSRF) | Server-side request & file | ✅ |
| Insecure File Upload | Server-side request & file | ✅ |
| Path Traversal | Server-side request & file | ✅ |
| Insecure Deserialization | Server-side request & file | ✅ |
| HTTP Request Smuggling | Request-layer | ✅ |
| Web Cache Poisoning | Request-layer | ✅ |
| Host Header Injection | Request-layer | ✅ |
| WebSocket Vulnerabilities | Request-layer | ✅ |
| GraphQL | API | ✅ |
| AI Prompt Injection | Advanced / modern | — |
| Cloud-Native Pentesting | Advanced / modern | — |
| Supply-Chain Attacks | Advanced / modern | — |

## Site Structure

```
Web-App-Pentesting-Playbook/
├── index.html                    # Workflow-first home page
├── web-pentest-playbook.html     # Full methodology reference
├── setup.html                    # Environment / tooling setup
├── thanks.html                   # Credits
├── domain-bar.js                 # Target domain bar
├── engagement.js                 # Engagement state / progress
├── README.md                     # This file
├── days/                         # 5-day methodology
│   ├── day1.html
│   ├── day2.html
│   ├── day3.html
│   ├── day4.html
│   ├── day5.html
│   └── dayform.js
├── report/                       # Reporting helpers
│   ├── index.html
│   ├── draft.html
│   ├── finding.html
│   └── reportform.js
├── docs/                         # Supporting docs
└── vulns/                        # 27 vulnerability pages
    ├── style.css                 # Shared stylesheet
    ├── search.js                 # Global Ctrl+K search
    ├── sqli.html                 # SQL Injection
    ├── nosqli.html               # NoSQL Injection
    ├── cmdi.html                 # Command Injection
    ├── ssti.html                 # Server-Side Template Injection
    ├── xxe.html                  # XXE Injection
    ├── xss.html                  # Cross-Site Scripting
    ├── csrf.html                 # Cross-Site Request Forgery
    ├── cors.html                 # CORS Misconfiguration
    ├── clickjacking.html         # Clickjacking
    ├── prototype-pollution.html  # Prototype Pollution
    ├── idor.html                 # IDOR
    ├── race-conditions.html      # Race Conditions
    ├── jwt.html                  # JWT Attacks
    ├── oauth.html                # OAuth 2.0 Vulnerabilities
    ├── ssrf.html                 # Server-Side Request Forgery
    ├── file-upload.html          # Insecure File Upload
    ├── path-traversal.html       # Path Traversal
    ├── deserialization.html      # Insecure Deserialization
    ├── request-smuggling.html    # HTTP Request Smuggling
    ├── cache-poisoning.html      # Web Cache Poisoning
    ├── host-header.html          # Host Header Injection
    ├── websocket.html            # WebSocket Vulnerabilities
    ├── graphql.html              # GraphQL
    ├── google-dorking.html       # Google Dorking & OSINT Recon
    ├── ai-prompt-injection.html  # AI Prompt Injection
    ├── cloud-native.html         # Cloud-Native Pentesting
    └── supply-chain.html         # Supply-Chain Attacks
```

## How to Use

### Option 1: Local (No Server Required)

Clone the repository and open `index.html` directly in your browser:

```bash
git clone https://github.com/eligof/Web-App-Pentesting-Playbook.git
cd Web-App-Pentesting-Playbook
open index.html   # macOS
# or: xdg-open index.html (Linux)
# or: start index.html (Windows)
# or just double-click index.html in your file explorer
```

### Option 2: GitHub Pages (Live Online)

Visit **[eligof.github.io/Web-App-Pentesting-Playbook](https://eligof.github.io/Web-App-Pentesting-Playbook/)** to use the live version.

## 5-Day Methodology Overview

The playbook is structured around a 5-day penetration testing workflow:

| Day | Focus | Goal |
|---|---|---|
| **Day 1** | Reconnaissance & Surface | Map the application scope and attack surface |
| **Day 2** | Authentication & APIs | Identify weak authentication and API flaws |
| **Day 3** | Access Control & Session | Find privilege escalation and session paths |
| **Day 4** | Injection & Protocol | Exploit data-level and protocol vulnerabilities |
| **Day 5** | Advanced & Client-Side | Escalate findings into impact |

**See the full methodology** in [`web-pentest-playbook.html`](./web-pentest-playbook.html) for detailed workflows, attack chains, and lab mappings.

## Recommended Learning Path

1. **Start here:** Open `index.html` to see the 5-day overview
2. **Understand the methodology:** Read through `web-pentest-playbook.html`
3. **During testing:** When you spot a vulnerability class, jump to the corresponding page in `vulns/` for deep-dive guidance
4. **Reference:** Use the global search (Ctrl+K) to find payloads, bypass techniques, or lab links quickly

## Resources & Credits

- **PortSwigger Web Security Academy** — Primary lab resource (vulnerabilities cross-referenced to labs)
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

Submit pull requests to [github.com/eligof/Web-App-Pentesting-Playbook](https://github.com/eligof/Web-App-Pentesting-Playbook).

---

**Questions?** Open an issue on GitHub. **Ready to test?** Open the [live site](https://eligof.github.io/Web-App-Pentesting-Playbook/) and start with Day 1.
