# Copilot Instructions

Read `AGENTS.md` before changing this repository. It is the canonical source for
architecture, conventions, testing, deployment, and security guidance.

Use the repo-owned commands instead of ad-hoc verification scripts:

```bash
npm test
npm run check
npm run build
npm run test:smoke
npm run ci
```

The browser smoke requires a one-time `npx playwright install chromium`.
There is no lint command. The commands above are the whole gate — there are
no other ad-hoc verification scripts in the tree.
