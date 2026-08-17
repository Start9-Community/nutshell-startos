# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

Work this package's `TODO.md` from top to bottom. Keep `README.md` (technical reference for an AI support or administering agent) and `instructions.md` (end-user docs) in sync with your changes.

## This repo

- **The mint seed is the one irreplaceable thing here.** Every proof the mint has ever issued derives from `mint_private_key`, and restore replays init as `kind === 'install'` — so the existence check in `init/generateMintSeed.ts` is what stops a restore minting a fresh seed and orphaning every outstanding token. Never make that write unconditional.
- **The image is digest-pinned.** `startos/manifest/index.ts` carries `cashubtc/nutshell:<version>@sha256:<digest>` so a rebuild reproduces the image that was tested. Bumping the tag without the digest is not a bump — see `UPDATING.md`.
- **`startos/mintEnvironment.ts` is import-free on purpose**, so `tests/mint-environment.test.ts` runs under plain `node --test` with no SDK and no framework. Node's resolver needs full specifiers, so *any* relative import added there breaks the test rather than the build. Its config type is hand-written and its fields are **required** — that is what turns a rename in `fileModels/config.yaml.ts` into a compile error at the `main.ts` call site instead of a silently-defaulted variable.
- **Import `clnrestPort` from `cln-startos/startos/utils`, not a literal**, so a port change on cln's side is a build failure here. The host id is inlined because cln exports only its peer and watchtower ids.
- **The CLNRest rune is scraped from the interface's `?rune=` suffix.** That is the only way a dependent reads it without mounting cln's volume, and it is a real contract with `cln-startos/startos/interfaces.ts` — if cln stops publishing the rune as a query parameter, `main.ts` throws rather than starting a mint with no Lightning backend. Both that throw and the missing-address throw are deliberate: a mint that starts without a backend takes deposits it cannot settle.
- **`MINT_DATABASE` is a directory, not a file.** Nutshell writes `mint.sqlite3` inside it; `mintDatabaseFile` in `utils.ts` is what the Mint Status action reports, and the two must agree.
- **A zero limit means "omit the variable".** Nutshell reads an unset mint/melt/balance limit as unlimited, so sending a literal `0` would cap every operation at nothing.
- **Only CLNRest is supported.** Don't expose another upstream backend until its credentials, dependency lifecycle, tests, and docs are all implemented.
- **The internal listener is fixed.** External addressing and TLS belong to StartOS interfaces; don't add user-configurable bind ports.
- **Default branch is `main`, not `master`.** Its CI workflows reference `main`; leave them.

## Inspecting a running install

`start-cli package attach nutshell -n nutshell-sub -- <cmd>` — the package runs one subcontainer, named `nutshell-sub`.
