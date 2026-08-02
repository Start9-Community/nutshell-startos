<p align="center">
  <img src="icon.png" alt="Nutshell Logo" width="21%" />
</p>

# Nutshell on StartOS

> **Upstream docs:** <https://github.com/cashubtc/nutshell>
>
> Everything not listed here should behave the same as upstream Nutshell. If a
> feature, setting, or behavior is not mentioned here, the upstream
> documentation remains applicable.

This repository packages the [Nutshell Cashu mint](https://github.com/cashubtc/nutshell)
for StartOS. StartOS manages its persistent data, Core Lightning connection,
network interface, backups, and operator configuration.

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Configuration Management](#configuration-management)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Actions (StartOS UI)](#actions-startos-ui)
- [Backups and Restore](#backups-and-restore)
- [Health Checks](#health-checks)
- [Dependencies](#dependencies)
- [Limitations and Differences](#limitations-and-differences)
- [What Is Unchanged from Upstream](#what-is-unchanged-from-upstream)
- [Contributing](#contributing)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

The package runs the official `cashubtc/nutshell` image, pinned to an immutable
multi-architecture digest in `startos/upstream.ts`. The package supports
`x86_64` and `aarch64` StartOS servers.

StartOS launches the upstream `mint` command through Poetry. Runtime settings
are supplied as environment variables; the upstream image is not modified.

## Volume and Data Layout

The StartOS `main` volume is mounted read/write at `/data` and included in
backups.

| Path | Purpose |
| --- | --- |
| `/data/mint/mint.sqlite3` | Nutshell SQLite database |
| `/data/mint_private_key` | StartOS-generated mint seed |
| `/data/startos/config.yaml` | StartOS-managed operator settings |

The mint seed and database must be backed up together. Losing either can make
outstanding ecash unrecoverable.

## Installation and First-Run Flow

On a fresh installation, StartOS generates a cryptographically random mint seed
and stores it in the main volume. The service then discovers Core Lightning's
CLNRest bridge address and restricted rune at runtime.

Core Lightning must be installed and its CLNRest interface enabled. No upstream
setup wizard is used.

## Configuration Management

| StartOS-managed | Upstream-managed or fixed |
| --- | --- |
| Mint name, descriptions, MOTD, contacts, icon, and terms URL | SQLite database location |
| Lightning routing-fee reserve | CLNRest backend and bridge address |
| Input fee, mint/melt limits, maximum balance, and peg-out-only mode | Internal listen address and port |
| API rate limiting and log level | Mint seed |

Settings changed through StartOS actions take effect when the service restarts.
Unknown keys already present in the YAML file are preserved, but only the
documented settings are supported by this wrapper.

## Network Access and Interfaces

Nutshell listens over plaintext HTTP inside its isolated container. StartOS
publishes the `Cashu Mint API` interface and handles reachable LAN, Tor,
clearnet, tunnel, and TLS addresses.

The same API URL can be entered into a compatible Cashu wallet or service such
as cashu.me. Do not expose the container port directly outside StartOS.

## Actions (StartOS UI)

- **Mint Info** (`configure-mint-info`) — visible in any service state. Sets
  NUT-06 public metadata and operator contacts.
- **Lightning Fees** (`configure-fees`) — visible in any service state. Sets the
  percentage and minimum routing-fee reserve used for outgoing payments.
- **Advanced Settings** (`configure-advanced`) — visible in any service state.
  Sets logging, input fees, transaction limits, peg-out-only mode, and API rate
  limiting.
- **Mint Status** (`show-mint-info`) — available while running. Shows the mint
  seed status, backend, internal listener, database path, and log level without
  revealing the seed.

## Backups and Restore

StartOS snapshots the complete `main` volume while the service is stopped. A
restore returns the database, mint seed, and StartOS configuration together.

Create a fresh backup before every upstream upgrade that carries database
migrations. Downgrading after such a migration may be blocked.

## Health Checks

The primary daemon becomes ready when its internal API port accepts TCP
connections. A failed check reports that the mint is not ready and leaves the
service health red for log inspection.

## Dependencies

**Core Lightning (`c-lightning`) is required.** Nutshell uses its CLNRest
interface to create and settle Lightning invoices. The wrapper resolves the
live StartOS bridge address and extracts the restricted rune from the exported
interface; no Core Lightning volume is mounted.

## Limitations and Differences

1. CLNRest is the only supported Lightning backend. Upstream FakeWallet,
   LNbits, LND, Spark, and other backend options are not exposed.
2. The wrapper uses embedded SQLite. PostgreSQL is not exposed as an option.
3. Upstream management RPC, OIDC authentication, and Redis cache settings are
   not exposed through StartOS actions.
4. The internal listener is intentionally fixed. External addressing and TLS
   belong to StartOS interfaces.
5. Upstream database migrations run when the mint starts and may make a
   downgrade unsafe.

## What Is Unchanged from Upstream

- Cashu mint and melt APIs
- keyset and proof handling
- supported Cashu NUT behavior
- wallet interoperability
- upstream SQLite schema and migrations
- upstream logging and error handling

## Contributing

Read [AGENTS.md](AGENTS.md) before changing the package. Upstream release bumps
follow [UPDATING.md](UPDATING.md). Pull requests should include the exact test
and pack commands run.

---

## Quick Reference for AI Consumers

```yaml
package_id: nutshell
architectures: [x86_64, aarch64]
volumes:
  main: /data
ports:
  api: 3338
dependencies: [c-lightning]
startos_managed_env_vars:
  - MINT_DATABASE
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
  - MINT_INPUT_FEE_PPK
  - MINT_MAX_MINT_BOLT11_SAT
  - MINT_MAX_MELT_BOLT11_SAT
  - MINT_MAX_BALANCE
  - MINT_BOLT11_DISABLE_MINT
  - MINT_RATE_LIMIT
  - MINT_GLOBAL_RATE_LIMIT_PER_MINUTE
actions:
  - configure-mint-info
  - configure-fees
  - configure-advanced
  - show-mint-info
```
