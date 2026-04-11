# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly via email to **hello@satsrail.com** with the subject line "Security: PrivaPaid Stream".

Please include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge your report within 48 hours and aim to provide a fix or mitigation plan within 7 days for critical issues.

**Do not** open a public GitHub issue for security vulnerabilities.

## Scope

The following areas are in scope for security reports:

- **Encryption** — AES-256-GCM implementation, key handling, IV generation, client-side decryption
- **Authentication** — Macaroon validation, session management, API token handling
- **Payment flow** — Checkout session integrity, macaroon issuance, access gating
- **API routes** — Input validation, authorization checks, rate limiting
- **Content isolation** — Source URL exposure, encrypted blob leakage, key persistence

## Out of Scope

- Vulnerabilities in third-party dependencies (report these upstream)
- Self-hosted instance misconfigurations
- Denial of service attacks
- Social engineering

## Security Architecture

PrivaPaid Stream is designed with a split-trust model:

- **SatsRail** holds encryption keys and processes payments but never sees content
- **PrivaPaid Stream** hosts encrypted content but never holds decryption keys
- **The browser** performs decryption via Web Crypto API — keys exist only in memory

No single system has access to both the content and the keys to unlock it.

## Responsible Disclosure

We ask that you give us reasonable time to address any reported vulnerability before public disclosure. We are committed to working with security researchers and will credit reporters (with permission) in release notes.
