# Release verification

Verified locally on **12 November 2026** with Node 24 and Chrome on macOS. GitHub Actions independently runs the required checks on Ubuntu/Chromium before deployment.

| Check | Result |
|---|---|
| Unit/integration suite | 66 passing tests across 4 files |
| Browser suite | 24 passing tests |
| Authored evaluation | 36 cases, zero expected-behavior regressions; known misses/false flags retained |
| TypeScript | Clean production type check |
| Vite production build | Successful static bundle |
| Responsive layout | No horizontal document overflow at 320, 390, 768 and 1440 px |
| Automated accessibility | No axe WCAG A/AA violations in the tested desktop/mobile workspace and five key dialogs |
| Privacy check | No external requests during the tested local review/export workflow |
| Media test | Generated silent WAV attaches and seeks to the selected original timestamp; no media in backups |
| Persistence/export | Save/reload, corrected SRT, original-evidence report, CSV and backup/restore exercised |
| Failure recovery | Corrupt saved data, unavailable storage, invalid imports and cross-tab conflicts exercised |

## Reproduce

```sh
npm ci
npm run check
npx playwright install chromium
CI=1 npm run test:e2e
```

`scripts/verify-release.mjs` additionally checks a production or deployed URL for load errors, persisted correction, downloaded SRT, mobile overflow and failed requests. It uses an isolated browser context, so it does not alter a user's normal browser workspace. Screenshots and a JSON record are written to the supplied output directory.

```sh
npm run preview -- --port 4184 --strictPort
# In another terminal (Chrome installed):
node scripts/verify-release.mjs http://127.0.0.1:4184/ /tmp/dubcheck-release
```

These checks establish the tested software behavior. They do not establish semantic correctness across languages, accessibility for all assistive technologies, simultaneous multi-tab transaction guarantees, or measurable creator outcomes. Independent bilingual validation, real-creator usability research, screen-reader testing, Safari and Firefox validation remain unperformed.
