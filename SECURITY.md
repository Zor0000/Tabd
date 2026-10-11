# Security

The current development branch (`main`) receives security fixes.

## Reporting a vulnerability

While this repository is private, report a vulnerability through a repository issue visible only to authorized collaborators. Include affected components, reproduction steps, expected impact, and a suggested fix if available. Redact credentials and personal data.

If this repository becomes public, enable GitHub private vulnerability reporting before accepting security reports. Do not disclose an unfixed vulnerability through a public issue.

## Credentials and account boundaries

- Keep local credentials in ignored environment files. Commit only empty or placeholder values in `.env.example` templates.
- Keep server secret keys out of browser code, extension builds, and `NEXT_PUBLIC_*` variables.
- Preserve session and extension-token validation, owner-scoped queries, and database row-level security when changing account or API behavior.
- Preserve private-network and redirect validation in metadata fetching.
- If a credential is accidentally committed, revoke or rotate it immediately; deleting the file in a later commit does not remove it from Git history.

CI uses local tests and preview mode; it does not require hosted database secrets.
