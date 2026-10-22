# DrumMaster AI Testing

## Plug-and-Play (No Local Browser/System Setup)

### Option A: GitHub Actions (No local execution)
1. Push branch to GitHub.
2. Open Actions tab.
3. Run **DrumMaster AI Tests** workflow (or let it run on push/PR).

This runs:
- Unit tests (Vitest)
- E2E tests (Playwright)
- Production build

### Option B: Docker one-command run
From project root:

```bash
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from tester
```

No local Playwright browser deps are required.

## Local (optional)
```bash
npm run test:unit
npm run test:e2e
npm run test:coverage
```
