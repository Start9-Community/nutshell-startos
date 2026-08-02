# Registry-Ready Upstream Sync Design

**Date:** 2026-08-02

## Goal

Turn `nutshell-startos` into a maintainable StartOS wrapper that follows stable
Nutshell releases with a small, auditable update process and is suitable for
submission to the Start9 Community Registry.

## Approach

Use Nutshell's official multi-architecture Docker image rather than rebuilding
the PyPI package in a local Dockerfile. Pin the image by both release tag and
immutable manifest-list digest so the tested `x86_64` and `aarch64` contents are
reproducible.

Keep the StartOS wrapper deliberately narrower than upstream. The first
registry submission supports Core Lightning through CLNRest, the backend that
is integrated and runtime-tested today. Unsupported FakeWallet and LNbits
choices will not be presented as working production configurations.

## Upstream Tracking

- Store the upstream version, image repository, and immutable digest in one
  TypeScript module.
- Derive the StartOS ExVer upstream portion and Docker image reference from that
  module.
- Keep downstream wrapper revisions separate and reset them to `0` for each new
  upstream release.
- Add an `UPDATING.md` playbook and a scheduled release check. Detection may be
  automated, but upgrades remain reviewed because Nutshell releases can include
  database migrations.

## Container and Data

- Target Nutshell `0.20.3` using the official `cashubtc/nutshell` image.
- Advertise and build `x86_64` and `aarch64` packages.
- Mount the StartOS `main` volume at `/data`.
- Set `MINT_DATABASE=/data/mint` explicitly. This resolves to the same
  `/data/mint/mint.sqlite3` database used by the existing package while avoiding
  reliance on container working-directory behavior.
- Run the upstream-supported mint command and configure it through environment
  variables.

Nutshell performs its own schema migrations during startup. The StartOS version
migration therefore does not alter the database, and downgrading after the
`0.20.3` migration is marked impossible. Update messaging must tell operators to
take a fresh StartOS backup before installing.

## StartOS Integration

- Update to the current stable Start SDK used by Community packages and include
  its shared `s9pk.mk` from `node_modules`.
- Adopt the canonical `startos/versions/current.ts` and
  `startos/versions/index.ts` layout with a lean version graph.
- Keep the internal mint listener fixed at `0.0.0.0:3338` over HTTP. StartOS
  interfaces are responsible for external addressing and TLS.
- Preserve NUT-06 metadata, fees, limits, rate limiting, backup/restore, health,
  and the CLNRest service-interface integration.
- Map existing configuration fields to current Nutshell environment variables
  so upgrades preserve operator settings.

## Repository and Registry Readiness

- Point `packageRepo` at the public
  `https://github.com/mdubore/nutshell-startos` repository and keep
  `upstreamRepo` pointed at `cashubtc/nutshell`.
- Add a registry-oriented `README.md`, refresh `instructions.md`, and document
  every action, volume, port, dependency, health check, and limitation without
  embedding a release version.
- Add current Community-style build and release workflows while retaining local
  reproducible build commands.
- Use StartOS tag convention `v<upstream>_<downstream>`.

## Verification

Verification proceeds from cheap to expensive:

1. configuration/version consistency tests;
2. `npm ci`, formatting/type checks, and the NCC bundle;
3. clean Nutshell startup and API smoke test;
4. synthetic `0.19.2` SQLite database upgraded by `0.20.3`;
5. `.s9pk` pack and manifest inspection for `x86_64` and `aarch64`;
6. backup, update, health, API, and transaction testing on StartOS before
   Community Registry submission.

The existing successful `0.19.2:4` transaction on the Pure server is the
baseline behavior the update must preserve.
