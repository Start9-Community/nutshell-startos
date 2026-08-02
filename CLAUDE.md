# CLAUDE.md

This is a StartOS service-package repository for the Nutshell Cashu mint. Read
`AGENTS.md` first and use the current StartOS packaging guide.

## Commands

```bash
npm ci
npm test
npm run check
npm run build
npm run test:smoke
make x86
make arm
```

## Architecture

- `startos/upstream.ts` is the source of truth for the upstream release, image
  digest, architectures, and derived package version.
- `startos/versions/` defines the lean ExVer graph.
- `startos/config/mintEnvironment.ts` is a pure, tested mapping from StartOS
  operator settings to Nutshell environment variables.
- `startos/procedures/main.ts` resolves Core Lightning's live CLNRest binding and
  rune, mounts `/data`, and launches the official image.
- `startos/fileModels/config.yaml.ts` stores StartOS-managed configuration.
- `startos/procedures/actions.ts` exposes mint metadata, fees, advanced settings,
  and status.

Follow `UPDATING.md` for upstream releases. Do not tag migration-bearing updates
until a backed-up StartOS device has completed API and transaction testing.
