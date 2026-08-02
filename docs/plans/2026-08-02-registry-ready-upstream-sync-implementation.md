# Registry-Ready Upstream Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade `nutshell-startos` to Nutshell 0.20.3 and make the wrapper reproducible, maintainable, and ready for Start9 Community Registry review.

**Architecture:** Run Nutshell's official multi-architecture image pinned by immutable digest, while StartOS owns its persistent `/data` volume, CLNRest dependency discovery, network interface, backups, and operator-facing actions. Keep upstream release metadata in one TypeScript module, validate cross-file consistency in tests, and detect new stable releases without automatically applying migration-bearing upgrades.

**Tech Stack:** TypeScript, `@start9labs/start-sdk`, Node test runner with `tsx`, Docker/OCI images, GitHub Actions, Start CLI, Make.

---

### Task 1: Add package metadata contract tests

**Files:**
- Create: `tests/package-contract.test.ts`
- Modify: `package.json`

**Step 1: Write the failing test**

Create tests that import `startos/upstream.ts` and assert:

- upstream version is `0.20.3`;
- image is `cashubtc/nutshell`;
- digest is a `sha256:` value;
- supported architectures are exactly `x86_64` and `aarch64`;
- package ExVer is derived as `0.20.3:0`;
- the official image reference contains both the release tag and digest.

Also read the manifest source and verify that `packageRepo` is
`https://github.com/mdubore/nutshell-startos` while `upstreamRepo` remains
`https://github.com/cashubtc/nutshell`.

**Step 2: Run the test to verify it fails**

Run: `npm test`

Expected: FAIL because the test runner and `startos/upstream.ts` do not exist.

**Step 3: Add only the test runner**

Add `tsx` and scripts:

```json
"test": "node --import tsx --test tests/**/*.test.ts",
"check": "tsc --noEmit"
```

Run `npm install` to update the lockfile.

**Step 4: Run the test again**

Expected: FAIL with a missing `startos/upstream.ts` import.

**Step 5: Commit**

```bash
git add package.json package-lock.json tests/package-contract.test.ts
git commit -m "test: define package metadata contract"
```

### Task 2: Centralize upstream and package versions

**Files:**
- Create: `startos/upstream.ts`
- Create: `startos/versions/current.ts`
- Create: `startos/versions/index.ts`
- Modify: `startos/index.ts`
- Delete: `startos/install/versionGraph.ts`
- Delete: `startos/install/versions/v0.19.2.0.ts`
- Delete: `startos/install/versions/v0.19.2.1.ts`
- Delete: `startos/install/versions/v0.19.2.2.ts`
- Delete: `startos/install/versions/v0.19.2.3.ts`
- Delete: `startos/install/versions/v0.19.2.4.ts`

**Step 1: Implement the minimal upstream module**

Export immutable constants for version `0.20.3`, downstream revision `0`,
official image name, manifest-list digest, supported architectures, complete
image reference, and package ExVer.

**Step 2: Add the canonical current version**

Create `current.ts` using the derived ExVer. Include localized release notes
covering major upstream changes, the database migration, the required backup,
and the full upstream release link. Use an empty `up` migration because Nutshell
migrates its own database and `IMPOSSIBLE` for `down`.

**Step 3: Replace the old version graph**

Create `startos/versions/index.ts` with `current` and `other: []`, then update
imports in `startos/index.ts` and initialization.

**Step 4: Run tests and type checks**

Run: `npm test && npm run check`

Expected: metadata tests PASS; type checking may identify SDK migration work
reserved for Task 3, but no version-module errors remain.

**Step 5: Commit**

```bash
git add startos tests
git commit -m "refactor: centralize upstream release metadata"
```

### Task 3: Modernize the Start SDK and build system

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `Makefile`
- Modify: `tsconfig.json`
- Delete: `s9pk.mk`
- Modify: StartOS TypeScript files reported by the 2.0.9 compiler types

**Step 1: Pin current tooling**

Pin `@start9labs/start-sdk` to `2.0.9`, add the package override used by current
Community packages, and pin build/test development dependencies. Change the
build script to remove stale `javascript/` output before bundling.

**Step 2: Use the SDK build include**

Replace the local plumbing with:

```make
ARCHES ?= x86 arm
include node_modules/@start9labs/start-sdk/s9pk.mk
```

**Step 3: Install and expose compiler failures**

Run: `npm install && npm run check`

Expected: dependency installation succeeds; any SDK API incompatibilities fail
with exact TypeScript diagnostics.

**Step 4: Adapt only the reported API differences**

Follow current SDK types and Community package patterns without changing
Nutshell behavior.

**Step 5: Verify build tooling**

Run: `npm test && npm run check && npm run build`

Expected: all PASS and `javascript/index.js` exists.

**Step 6: Commit**

```bash
git add package.json package-lock.json Makefile tsconfig.json startos
git rm s9pk.mk
git commit -m "chore: modernize StartOS package tooling"
```

### Task 4: Switch to the official Nutshell image

**Files:**
- Modify: `tests/package-contract.test.ts`
- Modify: `startos/manifest/index.ts`
- Modify: `startos/procedures/main.ts`
- Delete: `Dockerfile`

**Step 1: Extend the failing contract test**

Assert that the manifest uses the centralized immutable `dockerTag`, declares
both supported architectures, and no longer contains `dockerBuild`. Assert that
runtime source sets `MINT_DATABASE` to `/data/mint` and does not set the obsolete
`MINT_DATABASE_DIR`.

**Step 2: Run the test to verify it fails**

Run: `npm test`

Expected: FAIL on the old Docker build and database variable.

**Step 3: Implement the image and data-path change**

Use `dockerTag: UPSTREAM_IMAGE_REFERENCE` and the centralized architectures in
the manifest. Set `MINT_DATABASE=/data/mint` in the daemon, retain the `/data`
volume mount, and use the upstream-supported mint command.

**Step 4: Remove the custom Dockerfile**

The official image replaces the Python base, pip resolution, and local package
pinning.

**Step 5: Verify**

Run: `npm test && npm run check && npm run build`

Expected: all PASS.

**Step 6: Commit**

```bash
git add tests startos
git rm Dockerfile
git commit -m "build: use official Nutshell image"
```

### Task 5: Make runtime configuration current and registry-safe

**Files:**
- Create: `startos/config/mintEnvironment.ts`
- Create: `tests/mint-environment.test.ts`
- Modify: `startos/procedures/main.ts`
- Modify: `startos/fileModels/config.yaml.ts`
- Modify: `startos/procedures/actions.ts`
- Modify: `startos/procedures/interfaces.ts`
- Modify: `startos/procedures/dependencies.ts`

**Step 1: Write failing environment tests**

Test a pure environment builder for:

- explicit `/data/mint`, `0.0.0.0`, and port `3338`;
- CLNRest backend selection and HTTP bridge URL;
- current max-mint, max-melt, and disable-mint variable names;
- NUT-06 contacts and optional metadata;
- no obsolete database, peg, or unsupported backend values.

**Step 2: Run tests to verify failure**

Run: `npm test`

Expected: FAIL because the pure environment builder does not exist.

**Step 3: Implement the pure builder and integrate it**

Move deterministic environment mapping out of `main.ts`; leave reactive
dependency interface discovery in `main.ts`. Preserve existing config file
fields while mapping them to current upstream names.

**Step 4: Remove misleading configuration choices**

Make CLNRest the only supported backend. Fix the internal listener and transport
instead of exposing settings that can make the StartOS interface unreachable.
Keep operator metadata, fee, limit, logging, and rate-limit actions.

**Step 5: Verify**

Run: `npm test && npm run check && npm run build`

Expected: all PASS.

**Step 6: Commit**

```bash
git add startos tests
git commit -m "fix: align runtime configuration with Nutshell"
```

### Task 6: Add registry documentation and update automation

**Files:**
- Create: `README.md`
- Create: `UPDATING.md`
- Create: `AGENTS.md`
- Create: `.github/workflows/build.yml`
- Create: `.github/workflows/release.yml`
- Create: `.github/workflows/tagAndRelease.yml`
- Create: `.github/workflows/upstream-check.yml`
- Modify: `instructions.md`
- Modify: `assets/ABOUT.md`
- Modify: `CLAUDE.md`
- Remove or replace stale project notes if they contradict the package

**Step 1: Add documentation contract assertions**

Extend package tests to require the registry documents/workflows and prohibit
hard-coded upstream version numbers in `README.md`.

**Step 2: Run tests to verify failure**

Run: `npm test`

Expected: FAIL because the registry documentation and workflows are absent.

**Step 3: Write registry-facing documentation**

Document image/runtime, data layout, setup, actions, interfaces, backups,
health, dependency, limitations, unchanged upstream behavior, contribution
path, and an AI quick reference. Keep end-user instructions concise and
accurate.

**Step 4: Add update and Community workflows**

Use current Start9 reusable build/release workflows on `main`. Add a scheduled
workflow that compares the centralized version with the latest stable GitHub
release and opens or updates an issue when they differ; never auto-merge an
upstream database migration.

**Step 5: Verify**

Run: `npm test && npm run check && npm run build`

Expected: all PASS.

**Step 6: Commit**

```bash
git add README.md UPDATING.md AGENTS.md instructions.md assets CLAUDE.md .github tests
git commit -m "docs: prepare Community Registry submission"
```

### Task 7: Test clean startup and database migration

**Files:**
- Create: `tests/smoke-nutshell.sh`
- Modify: `package.json`

**Step 1: Write the smoke test**

The script must:

1. create an isolated temporary directory;
2. start `cashubtc/nutshell:0.19.2` with FakeWallet to create a real old SQLite
   database and confirm `/v1/info`;
3. stop the old container;
4. start the pinned `0.20.3` image against the same database;
5. wait for health and confirm `/v1/info` reports the new version;
6. verify the migrated database remains present;
7. clean up containers and the temporary directory on exit.

**Step 2: Run it and capture the first failure**

Run: `bash tests/smoke-nutshell.sh`

Expected: first run may expose an incorrect command, permission, or environment
assumption; preserve the failure as evidence before adjusting runtime code.

**Step 3: Fix only the demonstrated integration issue**

Update package runtime settings if the official image proves a documented
assumption wrong.

**Step 4: Re-run all checks**

Run: `npm test && npm run check && npm run build && npm run test:smoke`

Expected: all PASS, including successful schema migration.

**Step 5: Commit**

```bash
git add tests package.json package-lock.json startos
git commit -m "test: cover Nutshell database upgrade"
```

### Task 8: Pack and inspect both architectures

**Files:**
- Modify only if verification exposes a packaging defect

**Step 1: Verify a clean source build**

Run: `npm ci && npm test && npm run check && npm run build`

Expected: all PASS.

**Step 2: Pack x86_64**

Run: `make x86`

Expected: a clean `nutshell_x86_64.s9pk` whose manifest reports `0.20.3:0`, the
current SDK, and `x86_64`.

**Step 3: Pack aarch64**

Run: `make arm`

Expected: a clean `nutshell_aarch64.s9pk` whose manifest reports `0.20.3:0`, the
current SDK, and `aarch64`.

**Step 4: Inspect artifacts and record checksums**

Run `start-cli s9pk inspect` for manifests and `sha256sum` for both packages.
Ensure the packed Git hash is not marked modified.

**Step 5: Review repository state**

Run: `git diff --check && git status --short --branch && git log --oneline -12`

Expected: only ignored build artifacts and the pre-existing untracked `.agents/`
remain.

### Task 9: Publish source and prepare device update

**Files:** None unless final review identifies a defect.

**Step 1: Push `main`**

Run: `git push origin main`

Expected: the public `mdubore/nutshell-startos` remote advances to the verified
commit.

**Step 2: Do not tag until StartOS device verification**

Back up the Pure server, install the `x86_64` package, confirm health and API,
and perform a real mint/melt transaction. Only after this soak test should
`v0.20.3_0` be created and pushed for registry release automation.
