# Claude Code Guidance

Read `AGENTS.md` before changing this repository. It is the canonical source for
architecture, conventions, testing, deployment, and security guidance.

Use the repo-owned validation commands:

```bash
npm test
npm run check
npm run build
npm run test:smoke
npm run ci
```

The browser smoke requires a one-time `npx playwright install chromium`.
There is no lint command. Deployments use the existing `deploy.py` with
`DEPLOY_TOKEN` supplied through the process environment; never store a token in
source control.
