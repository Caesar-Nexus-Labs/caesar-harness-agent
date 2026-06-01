# Security Policy

## Supported versions

Security fixes target the current `main` branch and the latest published CaesarAgent packages. If versioned releases are added later, this policy should be updated with supported release lines.

## Reporting a vulnerability

Use GitHub private vulnerability reporting for this repository. Do not open a public issue for suspected vulnerabilities.

GitHub private vulnerability reporting must be enabled before the repository is made public. If it is not visible yet, ask Caesar Nexus Labs maintainers through the existing private repository or organization channel to enable it before launch. Do not publish exploit details publicly while a report is unresolved.

## What to report

Please report issues such as:

- command injection in CLI or build scripts
- path traversal or unsafe file writes during install/build flows
- unsafe handling of generated agent output
- dependency or supply-chain risk that affects consumers
- validation bypasses that allow malformed or unsafe agent definitions
- secrets, credentials, or local-only data accidentally exposed in tracked files

## What to include

Include enough detail for maintainers to reproduce and fix the issue safely:

- affected package, command, or file path
- minimal reproduction steps
- expected impact
- relevant logs or error output
- suggested fix if known

## Maintainer response

Maintainers will triage private reports, confirm impact, prepare a fix, and coordinate disclosure timing. Public disclosure should wait until maintainers have released or documented the fix.
