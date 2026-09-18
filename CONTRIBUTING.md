# Contributing

This repository ships the real, buildable TypeScript source for the **Drug Safety & Recall Monitor - FDA & EMA Regulatory Alerts (Global Pharma Compliance)** Apify Actor. It is independently maintained by Stefano Seggio as part of the [Delta Registry](https://github.com/stefanoseggio) fleet — there is no separate contributor team, but external bug reports, source-coverage proposals, and documentation fixes are welcome.

## Local setup

```bash
git clone https://github.com/stefanoseggio/actor-22-drug-safety-recalls-monitor.git
cd actor-22-drug-safety-recalls-monitor
npm install
apify login          # paste your token from console.apify.com/settings/integrations
```

No third-party credential is required — both the FDA openFDA drug enforcement API and the EMA DHPC safety-alert feed are open and unauthenticated. The optional `fdaApiKey` input only raises your own openFDA rate ceiling (240 req/min + 1,000 req/day without a key, vs. 120,000 req/day with a free one); it is never required for normal development volumes.

## Development workflow

```bash
npm run start:dev     # tsx src/main.ts, runs against the live FDA/EMA APIs
npm run lint           # eslint
npm run lint:fix       # eslint --fix
npm run format         # prettier --write .
npm run build          # tsc
npm test               # vitest run, against the live-captured fixtures in test/fixtures/
```

## Branch naming

- `fix/<short-description>` — bug fixes
- `feat/<short-description>` — new input fields, new output fields, new source coverage
- `docs/<short-description>` — README/documentation-only changes
- `chore/<short-description>` — dependency bumps, tooling, CI changes

## Commit convention

This repository follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <short summary>

<optional body>
```

Types used here: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`. The `type` prefix drives automated changelog generation via `release-please` (see [`.github/workflows/release.yml`](.github/workflows/release.yml)) — a `feat:` commit triggers a minor version bump, `fix:` triggers a patch bump, and `feat!:`/a `BREAKING CHANGE:` footer triggers a major bump. Non-conventional commit messages are still accepted but won't be reflected in the auto-generated changelog entry for that change.

## Pull requests

1. Fork or branch, make your change, and ensure `npm run lint`, `npm run build`, and `npm test` all pass locally.
2. Open a PR against `main` using the repository's [PR template](.github/PULL_REQUEST_TEMPLATE.md).
3. CI (`.github/workflows/test.yaml`) runs automatically and must pass before merge.
4. Behavioral changes to the Actor's input/output schema should also update `.actor/input_schema.json` / `.actor/dataset_schema.json` and the corresponding README sections in the same PR — schema and documentation drift is treated as a real bug, not a follow-up.

## Questions or non-code issues

For questions that aren't a code change (pricing, licensing, enterprise inquiries), use the Apify Store's Issues tab on the [live Actor page](https://apify.com/stefano_seggio/actor-22-drug-safety-recalls-monitor) rather than a GitHub issue.
