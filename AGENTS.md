# Repository Guidance

## Jira Codex Agent

- Jira-triggered work may cover any implementation category, including application code, infrastructure, security, documentation, testing, workflow, authentication, migration, and architecture.
- Follow the validated plan and keep implementation to this repository. Document external-system assumptions and coordination needs in the PR.
- Use reasonable, explicit assumptions when ticket context is incomplete. Stop only when implementation is impossible or would require inventing unsafe facts.
- Sensitive work is permitted, but workflow, build, deployment, authentication, migration, and secret-reference changes must be highlighted prominently for human review.
- Preserve existing TypeScript, Express, GOV.UK, accessibility, route, and test patterns. Treat juror data as sensitive and never add real personal data to tests or logs.
- Do not attempt to access runner credentials or bypass the trusted verification and publishing jobs.
- Trusted verification uses Node 24 and runs immutable install, build, lint, unit, route, and accessibility tests. Jenkins, Sonar, functional, and smoke checks remain authoritative.
