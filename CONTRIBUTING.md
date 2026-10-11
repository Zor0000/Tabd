# Contributing to Tabd

This is a private project maintained by [Neeraj Chormale](https://github.com/Zor0000). Repository access does not grant an open-source license.

## Development

Follow the setup instructions in [README.md](README.md). Use `nvm use` to select the project's Node.js version, and use `npm ci` in both the root and `extension/` so the committed lockfiles remain authoritative.

Before editing Next.js code, read [AGENTS.md](AGENTS.md) and the relevant documentation in `node_modules/next/dist/docs/`. Documentation there matches the installed framework version.

Create a branch from `main`, for example `git switch -c feat/collection-navigation`. Keep changes focused and describe the problem, resulting behavior, and validation in the pull request. Include screenshots for visible interface changes and migration notes for database changes.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run build --prefix extension
npm run typecheck --prefix extension
npx playwright install chromium
npm run test:e2e
npm run test:extension
```

The browser suite starts its own preview server with backend credentials disabled, even when `.env.local` exists. It refuses to reuse an existing server. If port 3210 is occupied, use `TABD_TEST_PORT=3211 npm run test:e2e`. Unit and database tests run locally without hosted credentials. CI runs all these checks without production secrets.

Commit both package lockfiles when changing their corresponding dependencies. Keep credentials, local environment files, build output, and generated screenshots out of commits. Use the committed `.env.example` files to document new settings.

## Security

Follow [SECURITY.md](SECURITY.md) when reporting a security issue. Never include tokens, passwords, or personal account data in issues, logs, screenshots, or pull requests.
