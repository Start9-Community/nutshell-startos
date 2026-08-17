<p align="center">
  <img src="icon.png" alt="Nutshell Logo" width="21%" />
</p>

# Nutshell on StartOS

> Everything not listed in this document should behave the same as upstream
> Nutshell. If a feature, setting, or behavior is not mentioned here, the
> upstream documentation is accurate and fully applicable — see the
> Documentation section of `instructions.md` for links.

[Nutshell](https://github.com/cashubtc/nutshell) is a Cashu mint: a server that issues and redeems Chaumian ecash backed by Bitcoin, settling in and out over Lightning. This package runs the mint half against the operator's own Core Lightning node, with no upstream setup wizard and no credentials for the operator to copy between services.

- **Upstream repo:** <https://github.com/cashubtc/nutshell>
- **Wrapper repo:** <https://github.com/Start9-Community/nutshell-startos>

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

The official upstream image, unmodified, in one subcontainer.

| Property     | Value                                      |
| ------------ | ------------------------------------------ |
| Image        | `cashubtc/nutshell`, digest-pinned          |
| Architecture | x86_64, aarch64                            |
| Command      | `poetry run mint`                          |

| Subcontainer   | Purpose                                       |
| -------------- | --------------------------------------------- |
| `nutshell-sub` | The `primary` daemon — the one to `attach` to |

The image reference in the manifest carries both a tag and a `@sha256:` digest, so a rebuild resolves to the image that was actually tested rather than to whatever the tag points at later. Nothing in the image is patched; every setting this package controls is passed as environment on each start.

## Volume and Data Layout

One volume, mounted read/write, holding everything that cannot be recreated.

| Volume | Mount Point | Purpose                                              |
| ------ | ----------- | ---------------------------------------------------- |
| `main` | `/data`     | The mint database, the mint seed, and this package's settings |

| Path                        | Written by | Holds                                          |
| --------------------------- | ---------- | ---------------------------------------------- |
| `mint/mint.sqlite3`         | Nutshell   | Keysets, proofs, quotes — the mint's ledger    |
| `mint_private_key`          | Init       | The seed every issued proof derives from       |
| `startos/config.yaml`       | Init and the actions | The operator settings this package owns |

**The seed and the database are one unit.** The seed alone cannot tell you what has been issued, and the database alone cannot be spent against — a restore that pairs one with the other's counterpart makes outstanding ecash unredeemable. They live on the same volume and are backed up together for exactly that reason.

`MINT_DATABASE` points at the `mint/` **directory**; Nutshell chooses the filename inside it.

## File Models

One model, holding the settings the actions write.

| File                  | Format | Modelled          | Written by           |
| --------------------- | ------ | ----------------- | -------------------- |
| `startos/config.yaml` | YAML   | `FileHelper.yaml` | Init and the actions |

It is seeded on every init kind by an empty `merge`, which fills in each field's default without disturbing a value already set. Its three groups — `mint_info`, `fees`, `advanced` — map one-to-one onto the three configuration actions, and the mapping into Nutshell's environment happens on every start in `startos/mintEnvironment.ts`.

A hand edit to this file survives until an action rewrites the same group, but it will not reach the running mint until the service restarts, because the environment is built at start. Keys the wrapper does not model are preserved in the file and ignored.

Nutshell itself reads no configuration file here — everything reaches it as environment. That has a consequence worth knowing: a setting is consumed at launch, so nothing takes effect until the daemon restarts, and there is no in-container config to inspect for drift. The environment the mint was started with is what `mintEnvironment.ts` produced from this file.

## Dependencies

One, required.

| Dependency          | Required | Health checks | Why                                                   |
| ------------------- | -------- | ------------- | ----------------------------------------------------- |
| Core Lightning (`c-lightning`) | Yes | `lightningd` | Creates and settles the Lightning invoices that back every deposit and redemption |

No volume of Core Lightning's is mounted. The mint reaches it over the plaintext service bridge at the address `sdk.host.getBridgeAddress` resolves, and authenticates with the rune Core Lightning publishes as its CLNRest interface's `?rune=` query parameter — the only way a dependent can read that rune without mounting the volume it lives on.

**CLNRest has to be enabled in Core Lightning's own config.** It is not on by default, and when it is off Core Lightning exports no `clnrest` interface at all, so neither the address nor the rune resolves. Nutshell refuses to start in that case rather than coming up with no Lightning backend.

## Network Access and Interfaces

One interface, serving the Cashu API that wallets talk to.

| Interface      | Id    | Type | Port | Description                        |
| -------------- | ----- | ---- | ---- | ---------------------------------- |
| Cashu Mint API | `api` | api  | 3338 | The Cashu API wallets connect to   |

The mint speaks plain HTTP inside its container; StartOS terminates TLS and owns every external address. The interface is typed `api` rather than `ui` because it serves no browser UI — a wallet is the client. The listener is fixed and deliberately not configurable.

## Installation and First-Run Flow

There is no wizard and nothing to copy by hand. Install Core Lightning first, enable CLNRest in its config, and start it; then install this.

At install the package generates a 256-bit mint seed onto the volume and seeds `config.yaml` with defaults. On every start it resolves Core Lightning's bridge address and rune, builds the environment, and launches the mint. The defaults are a working mint — the configuration actions are for making it *yours*, not for making it run.

The one ordering constraint: Core Lightning must be running with CLNRest enabled before Nutshell will start. Nothing else about first run is manual.

## Actions

Four actions, all user-facing, and none of them required to get a working mint. All four take effect on the next restart, because Nutshell reads its settings from the environment at launch.

### Mint Info

**When to run it:** before publishing the mint's address to anyone. **What it changes:** the `mint_info` group in `config.yaml`, which becomes the NUT-06 metadata wallets display — name, descriptions, message of the day, and the operator contact and policy links. **Cost:** a restart. **Repeat safety:** idempotent; the submitted form is the whole group.

### Lightning Fees

**When to run it:** if outgoing payments are failing for want of routing budget, or if the reserve is costing more than it should. **What it changes:** the percentage and the minimum satoshi reserve held back on each outgoing Lightning payment. **Cost:** a restart. **Repeat safety:** idempotent.

Both are reserves, not charges — unused reserve is not spent. Setting them too low makes melts fail to route; too high makes redemption look expensive to the user.

### Advanced Settings

**When to run it:** to cap exposure, to charge an input fee, or to turn up logging while diagnosing something. **What it changes:** log level, the NUT-02 input fee, per-operation mint and melt ceilings, a total balance ceiling, a redemptions-only switch, and API rate limiting. **Cost:** a restart. **Repeat safety:** idempotent.

Two of these deserve care. A limit of **0 means unlimited**, not "nothing" — the wrapper omits the variable entirely rather than sending a zero Nutshell would read as a hard cap. And **Redemptions Only** stops the mint issuing new ecash while leaving existing ecash redeemable, which is how an operator winds a mint down without stranding anyone.

### Mint Status

**When to run it:** first, on any report that the mint is misbehaving. **What it returns:** whether the seed exists on the volume (never its value), the Lightning backend, the internal listener, the database path, and the current log level. **What it changes:** nothing. **Cost:** none — it reads the volume and the config file, not the container, so it answers while the service is stopped, which is when "is my seed still there?" is the question being asked.

A **Missing** seed on an install that has been running is the one result that is an emergency: without it no outstanding proof can be validated.

## Tasks

None. This package raises no tasks, so the service is never held on a prompt and its ordinary controls are always available.

The dependency on Core Lightning is enforced by StartOS's own dependency handling rather than by a task, and a Core Lightning without CLNRest enabled surfaces as a failed start with an explanatory error in the service log — not as a prompt.

## Health Checks

One check, on the only daemon.

| Check     | Displayed    | Method                    |
| --------- | ------------ | ------------------------- |
| `primary` | "Cashu Mint" | Port 3338 is listening    |

A failure in the first seconds of a start is the mint opening its database; a failure that persists means it exited. The two causes worth checking in that order are Core Lightning — unreachable, or reachable with CLNRest disabled, both of which make `main.ts` throw before the daemon is created — and an upstream database migration that did not complete, which the service log reports directly.

Note the check's limit: a listening port proves the mint is serving, not that it can settle a payment. Only a real mint or melt proves the Lightning path.

## Backups and Restore

The whole `main` volume is copied wholesale — `sdk.Backups.ofVolumes('main')`. Nothing is excluded and nothing is dumped-and-replayed, which for a mint is the only safe strategy: the database and the seed have to be captured as one consistent pair.

A restored instance needs nothing re-entered. The seed is on the volume, so init's existence check sees it and does **not** generate a new one — that check is the whole reason a restore is survivable. Core Lightning's address and rune are resolved fresh on every start, so a restore onto a server where Core Lightning has different ports needs no intervention.

What a restore cannot fix is a stale backup. Ecash issued after the backup exists in wallets but not in the restored ledger, and the mint will refuse those proofs. Back up after any period of real activity, not on a schedule chosen for a stateless service.

## Limitations and Differences

1. **CLNRest is the only Lightning backend.** Upstream's FakeWallet, LNbits, LND, Spark and the rest are not exposed.
2. **SQLite only.** Upstream's PostgreSQL option is not exposed.
3. **The internal listener is fixed.** External addressing and TLS belong to StartOS; there are no bind-address or TLS settings.
4. **Upstream management RPC, OIDC authentication, and the Redis cache are not exposed.**
5. **Upstream database migrations run when the mint starts**, which can make a downgrade unsafe. Take a fresh backup before an upstream version bump.
6. **No wallet.** Upstream ships a Cashu wallet alongside the mint; this package runs the mint only.
7. **x86_64 and aarch64 only.** The upstream image publishes no riscv64.

---

## Quick Reference for AI Consumers

```yaml
package_id: nutshell
image: cashubtc/nutshell # digest-pinned in the manifest
architectures:
  - x86_64
  - aarch64
subcontainers:
  - nutshell-sub # the only container
volumes:
  main: /data
file_models:
  - startos/config.yaml # mint_info, fees, advanced
startos_managed_env_vars:
  - MINT_DATABASE
  - MINT_LISTEN_HOST
  - MINT_LISTEN_PORT
  - MINT_PRIVATE_KEY
  - MINT_BACKEND_BOLT11_SAT
  - MINT_CLNREST_URL
  - MINT_CLNREST_RUNE
  - MINT_INFO_NAME
  - MINT_INFO_DESCRIPTION
  - MINT_INFO_DESCRIPTION_LONG
  - MINT_INFO_MOTD
  - MINT_INFO_CONTACT
  - MINT_INFO_ICON_URL
  - MINT_INFO_TOS_URL
  - LIGHTNING_FEE_PERCENT
  - LIGHTNING_RESERVE_FEE_MIN
  - LOG_LEVEL
  - MINT_INPUT_FEE_PPK
  - MINT_MAX_MINT_BOLT11_SAT # omitted when unlimited
  - MINT_MAX_MELT_BOLT11_SAT # omitted when unlimited
  - MINT_MAX_BALANCE # omitted when unlimited
  - MINT_BOLT11_DISABLE_MINT
  - MINT_RATE_LIMIT
  - MINT_GLOBAL_RATE_LIMIT_PER_MINUTE
dependencies:
  - c-lightning # required; health check "lightningd"; needs CLNRest enabled
interfaces:
  api: { type: api, port: 3338 }
actions:
  - configure-mint-info
  - configure-fees
  - configure-advanced
  - show-mint-info
tasks: []
health_checks:
  - primary # displayed "Cashu Mint"
```
