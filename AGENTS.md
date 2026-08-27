# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

**Start every task at the recipe index** — `../start-technologies/projects/start-sdk/docs/src/recipes.md`
(or <https://docs.start9.com/packaging/recipes.html>). It maps an intent ("prompt the user to create
admin credentials", "expose a web UI") to the constructs, the reference pages, and a named production
package to copy. Find the recipe before you read this package's neighbours: a package you reach by
grepping may be non-conformant, and the recipe outranks it.

Freshly scaffolded? Work the
[New Package Checklist](../start-technologies/projects/start-sdk/docs/src/new-package-checklist.md)
(or <https://docs.start9.com/packaging/new-package-checklist.html>) from top to bottom. It is a
guide page, not a file in this repo — read it, don't copy it in.

Keep `README.md` (technical reference for an AI support or administering agent) and
`instructions.md` (end-user docs) in sync with your changes.

**Bugs and feature requests are GitHub issues on this repo** — file them as you find them.
Don't record work in the repo instead: no `TODO.md`, no `NOTES.md`, no `PLAN.md`. What you
verified, tried, and decided belongs in the commit message and the PR body.

## This repo

- **The mint seed is the one irreplaceable thing here.** Every proof the mint has ever issued derives from `mint_private_key`, and restore replays init as `kind === 'install'` — so the existence check in `init/generateMintSeed.ts` is what stops a restore minting a fresh seed and orphaning every outstanding token. Never make that write unconditional.
- **The image is digest-pinned.** `startos/manifest/index.ts` carries `cashubtc/nutshell:<version>@sha256:<digest>` so a rebuild reproduces the image that was tested. Bumping the tag without the digest is not a bump — see `UPDATING.md`.
- **`startos/mintEnvironment.ts` is import-free on purpose**, so `tests/mint-environment.test.ts` runs under plain `node --test` with no SDK and no framework. Node's resolver needs full specifiers, so _any_ relative import added there breaks the test rather than the build. Its config type is hand-written and its fields are **required** — that is what turns a rename in `fileModels/config.yaml.ts` into a compile error at the `main.ts` call site instead of a silently-defaulted variable.
- **Import `clnrestPort` from `cln-startos/startos/utils`, not a literal**, so a port change on cln's side is a build failure here. The host id is inlined because cln exports only its peer and watchtower ids.
- **The CLNRest rune is scraped from the interface's `?rune=` suffix.** That is the only way a dependent reads it without mounting cln's volume, and it is a real contract with `cln-startos/startos/interfaces.ts` — if cln stops publishing the rune as a query parameter, `main.ts` throws rather than starting a mint with no Lightning backend. Both that throw and the missing-address throw are deliberate: a mint that starts without a backend takes deposits it cannot settle.
- **Fresh mints lock exactly one Lightning backend.** `store.json` may contain only `clnrest` or `lndrest`; absence creates the critical first-run task, invalid state fails closed, and the `0.20.3:0` migration assigns CLN to existing mints. Never add a reset, switch, automatic detection, or fallback path. Changing wallets underneath an established mint can break its accounting and strand outstanding ecash.
- **LND credentials come from its masked interface, not its volume.** Resolve the same-StartOS `control` bridge and `lnd-connect-rest` suffix reactively at runtime. Strictly decode the single canonical base64url `query.macaroon`, keep it in memory, and write the raw bytes with mode `0600` to the fixed ephemeral Nutshell path. Neither backend receives a dependency volume mount; pinned StartOS does not support dependency file mounts end to end, and mounting all of `lnd/main` overexposes node state.
- **LND REST TLS stays verified.** The internal HTTPS bridge is terminated by the StartOS proxy, so the trust anchor is the root from `sdk.getSslCertificate(effects, [])`, not LND's `tls.cert`. Do not make the endpoint, certificate path, macaroon path, or verification flag configurable. The internal Lightning path is independent from publishing the Cashu Mint API over LAN, Tor, a domain, or Start Tunnel.
- **Backups preserve the locked backend.** `main` remains the required data volume, while the compatibility hooks copy `startos/store.json` when present so legacy one-volume backups still restore. Missing legacy wrapper state must migrate to CLN; it must not become a fresh choice.
- **`MINT_DATABASE` is a directory, not a file.** Nutshell writes `mint.sqlite3` inside it; `mintDatabaseFile` in `utils.ts` is what the Mint Status action reports, and the two must agree.
- **A zero limit means "omit the variable".** Nutshell reads an unset mint/melt/balance limit as unlimited, so sending a literal `0` would cap every operation at nothing.
- **The supported Lightning backends are CLNRest and LND REST.** Do not expose another upstream backend until its credentials, dependency lifecycle, immutable-selection behavior, tests, and documentation are implemented.
- **The internal listener is fixed.** External addressing and TLS belong to StartOS interfaces; don't add user-configurable bind ports.
- **Default branch is `main`, not `master`.** Its CI workflows reference `main`; leave them.

## Inspecting a running install

`start-cli package attach nutshell -n nutshell-sub -- <cmd>` — the package runs one subcontainer, named `nutshell-sub`.
