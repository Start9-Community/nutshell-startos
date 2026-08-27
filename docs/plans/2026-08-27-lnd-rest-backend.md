# Locked CLN or LND REST Backend Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a one-time, backed-up CLN-or-LND REST selection to the Nutshell StartOS wrapper while preserving legacy CLN mints and failing closed without backend fallback.

**Architecture:** Store only `clnrest` or `lndrest` in a wrapper-owned `store.json` on a new `startos` volume. A hidden critical-task action validates the exact selected runtime connection before atomically locking it; dependency setup, mounts, bridge resolution, and Nutshell environment construction then use only that value. Existing `0.20.3:0` installations migrate to locked CLN.

**Tech Stack:** TypeScript 6, `@start9labs/start-sdk` 2.0.9, `cln-startos`, `lnd-startos`, Node test runner, official `cashubtc/nutshell:0.20.3` image, `start-cli`, Make/s9pk.

---

Implementation must use `superpowers:test-driven-development`. Do not push,
open a pull request, mutate the Community remote, or perform financial tests as
part of these tasks. The `community` push URL is intentionally disabled.

### Task 1: Add the immutable backend state model

**Files:**

- Create: `startos/lightningBackend.ts`
- Create: `startos/fileModels/store.json.ts`
- Create: `tests/lightning-backend.test.ts`

**Step 1: Write the failing state tests**

Create import-free tests for these cases:

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertLightningBackend,
  lockLightningBackend,
} from '../startos/lightningBackend.ts'

test('locks an unselected mint to CLN', () => {
  assert.deepEqual(lockLightningBackend(undefined, 'clnrest'), {
    lightningBackend: 'clnrest',
  })
})

test('locks an unselected mint to LND', () => {
  assert.deepEqual(lockLightningBackend(undefined, 'lndrest'), {
    lightningBackend: 'lndrest',
  })
})

test('refuses every second selection, including the same backend', () => {
  assert.throws(
    () => lockLightningBackend('clnrest', 'clnrest'),
    /already locked/i,
  )
  assert.throws(
    () => lockLightningBackend('clnrest', 'lndrest'),
    /already locked/i,
  )
})

test('rejects missing and unknown runtime state', () => {
  assert.throws(() => assertLightningBackend(undefined), /not selected/i)
  assert.throws(() => assertLightningBackend('fake'), /invalid/i)
})
```

**Step 2: Run the test and verify it fails**

Run: `npm test`

Expected: FAIL because `startos/lightningBackend.ts` does not exist.

**Step 3: Implement the minimal pure state helpers**

Use a literal union and fail-closed assertions:

```ts
export const lightningBackends = ['clnrest', 'lndrest'] as const
export type LightningBackend = (typeof lightningBackends)[number]

export function assertLightningBackend(
  value: unknown,
): asserts value is LightningBackend {
  if (value === undefined || value === null) {
    throw new Error('Lightning backend has not been selected')
  }
  if (!lightningBackends.includes(value as LightningBackend)) {
    throw new Error('Stored Lightning backend is invalid')
  }
}

export function lockLightningBackend(
  current: LightningBackend | undefined,
  requested: LightningBackend,
) {
  if (current !== undefined) {
    throw new Error(`Lightning backend is already locked to ${current}`)
  }
  return { lightningBackend: requested }
}
```

Create `storeJson` with `FileHelper.json`, based on `sdk.volumes.startos`, and a
zod object whose only field is optional `lightningBackend`. Do not use a catch
that converts an unknown value into a default; corrupt state must surface as an
error.

**Step 4: Run tests and typecheck**

Run: `npm test && npm run check`

Expected: state tests PASS; typecheck will remain blocked until the manifest
declares the `startos` volume. Make that manifest-only addition if needed, then
rerun until PASS.

**Step 5: Commit**

```bash
git add startos/lightningBackend.ts startos/fileModels/store.json.ts \
  startos/manifest/index.ts tests/lightning-backend.test.ts
git commit -m "feat: add immutable lightning backend state"
```

### Task 2: Back up state and migrate existing mints to locked CLN

**Files:**

- Modify: `startos/backups.ts`
- Modify: `startos/init/seedFiles.ts`
- Create: `startos/versions/v0_20_3_0.ts`
- Modify: `startos/versions/current.ts`
- Modify: `startos/versions/index.ts`
- Test: `tests/lightning-backend.test.ts`

**Step 1: Add failing migration/default tests**

Export a pure `legacyLightningBackend()` helper returning `clnrest`, and assert:

```ts
test('migrates every legacy installation to locked CLN', () => {
  assert.equal(legacyLightningBackend(), 'clnrest')
})
```

Also add a source-level assertion that backups list both `main` and `startos`.
Keep this assertion narrow by exporting `backupVolumeIds` from `backups.ts` only
if it can stay SDK-free; otherwise test the pure constant from
`lightningBackend.ts` and pass it into `sdk.Backups.ofVolumes(...)`.

**Step 2: Run and verify failure**

Run: `npm test`

Expected: FAIL because the legacy helper and backup-volume declaration do not
exist.

**Step 3: Implement the version graph and backup changes**

- Move the existing `0.20.3:0` `VersionInfo` unchanged into
  `startos/versions/v0_20_3_0.ts`.
- Make `startos/versions/current.ts` version `0.20.3:1`.
- In its upward migration, merge
  `{ lightningBackend: legacyLightningBackend() }` into `storeJson`.
- Keep downgrade `IMPOSSIBLE`.
- Include `v_0_20_3_0` in `VersionGraph.other`.
- Seed `storeJson` with `{}` on every init without overwriting an existing
  backend.
- Back up both volumes with `sdk.Backups.ofVolumes('main', 'startos')`.

Fresh installs do not run the `0.20.3:0 -> 0.20.3:1` migration, so their state
remains unselected. Legacy updates and legacy restores do run it and become
locked CLN.

**Step 4: Verify**

Run: `npm test && npm run check && npm run build`

Expected: PASS.

**Step 5: Commit**

```bash
git add startos/backups.ts startos/init/seedFiles.ts startos/versions \
  startos/lightningBackend.ts tests/lightning-backend.test.ts
git commit -m "feat: migrate existing mints to locked CLN"
```

### Task 3: Declare both optional dependencies conditionally

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `startos/manifest/index.ts`
- Modify: `startos/manifest/i18n.ts`
- Modify: `startos/dependencies.ts`
- Modify: `startos/lightningBackend.ts`
- Test: `tests/lightning-backend.test.ts`

**Step 1: Write failing dependency tests**

Add tests around an import-free `dependencyForBackend` helper:

```ts
test('declares only CLN for a locked CLN mint', () => {
  assert.deepEqual(dependencyForBackend('clnrest'), {
    'c-lightning': {
      kind: 'running',
      versionRange: '>=26.6.6:1',
      healthChecks: ['lightningd'],
    },
  })
})

test('declares only LND for a locked LND mint', () => {
  assert.deepEqual(dependencyForBackend('lndrest'), {
    lnd: {
      kind: 'running',
      versionRange: '>=0.21.2-beta:3',
      healthChecks: ['lnd'],
    },
  })
})
```

There must be no case that returns both dependencies.

**Step 2: Run and verify failure**

Run: `npm test`

Expected: FAIL because `dependencyForBackend` does not exist.

**Step 3: Add the LND package types and manifest dependency**

Run:

```bash
npm install --save-exact 'lnd-startos@github:Start9Labs/lnd-startos#next'
```

Confirm `package-lock.json` resolves the Git dependency to a full immutable
commit. Add `lnd` metadata to the manifest and mark both `lnd` and
`c-lightning` optional. Use the current Start9 LND icon URL and localized
dependency descriptions.

**Step 4: Implement conditional dependency setup**

Read `storeJson.lightningBackend` reactively. Return `{}` only when no choice
exists so the critical task can own fresh-install blocking. For either stored
literal, return exactly `dependencyForBackend(value)`. Allow invalid file data
to throw; never default it.

**Step 5: Verify and commit**

Run: `npm test && npm run check && npm run build`

Expected: PASS.

```bash
git add package.json package-lock.json startos/manifest startos/dependencies.ts \
  startos/lightningBackend.ts tests/lightning-backend.test.ts
git commit -m "feat: declare conditional CLN and LND dependencies"
```

### Task 4: Add exact-path backend validation and the one-time selector

**Files:**

- Create: `startos/lightningConnection.ts`
- Create: `startos/lightningProbe.ts`
- Create: `startos/actions/selectLightningBackend.ts`
- Create: `startos/init/taskSelectLightningBackend.ts`
- Modify: `startos/actions/index.ts`
- Modify: `startos/init/index.ts`
- Modify: `startos/utils.ts`
- Modify: `startos/i18n/dictionaries/default.ts`
- Modify: `startos/i18n/dictionaries/translations.ts`
- Test: `tests/lightning-backend.test.ts`
- Create: `tests/lightning-probe.test.ts`

**Step 1: Write failing pure probe-spec tests**

Define a pure builder that returns a command and environment without importing
the SDK. Test these guarantees:

```ts
test('CLN probe authenticates without putting the rune in argv', () => {
  const spec = buildProbeSpec('clnrest', {
    endpoint: 'http://10.0.3.1:3010',
    credential: 'secret-rune',
  })
  assert.match(spec.env.PROBE_URL, /^http:/)
  assert.equal(spec.env.PROBE_CREDENTIAL, 'secret-rune')
  assert.equal(spec.command.join(' ').includes('secret-rune'), false)
})

test('LND probe enables verification and uses mounted credentials', () => {
  const spec = buildProbeSpec('lndrest', {
    endpoint: 'https://10.0.3.1:8080',
  })
  assert.equal(spec.env.PROBE_CERT_VERIFY, 'true')
  assert.equal(spec.env.PROBE_CERT, '/mnt/lnd/tls.cert')
  assert.equal(
    spec.env.PROBE_CREDENTIAL,
    '/mnt/lnd/data/chain/bitcoin/mainnet/admin.macaroon',
  )
})
```

Add lock tests confirming validation failure is evaluated before
`storeJson.merge` is called. Accomplish this with a small injected
`validateThenLock(current, requested, validate, persist)` helper rather than
mocking the SDK.

**Step 2: Run and verify failure**

Run: `npm test`

Expected: FAIL because probe and validate-then-lock helpers do not exist.

**Step 3: Resolve the current backend interfaces**

In `lightningConnection.ts`:

- CLN: import `clnrestPort`; resolve package `c-lightning`, host `clnrest`,
  `ssl: false`; read and decode `rune` from the CLNRest interface suffix.
- LND: import `controlHostId` and `restPort` from
  `lnd-startos/startos/interfaces`; resolve package `lnd`, control host, REST
  port, with `ssl` omitted because that binding publishes one TLS address.
- Throw backend-specific errors for missing address or credential/interface
  state.

Do not inspect the unselected backend.

**Step 4: Implement the exact runtime probe**

Use `sdk.SubContainer.withTemp` with the official Nutshell image. The CLN probe
has no dependency mount and POSTs `/v1/listfunds` with its rune header. The LND
probe mounts `lnd/main` at `/mnt/lnd` read-only and GETs `/v1/getinfo` using:

```text
endpoint = https://<resolved StartOS bridge>
certificate = /mnt/lnd/tls.cert
macaroon = /mnt/lnd/data/chain/bitcoin/mainnet/admin.macaroon
certificate verification = true
timeout = 5 seconds
```

Run the probe with `poetry run python -c <fixed script>` and pass secrets only
through the environment or mounted files. Cap the subcontainer exec at 15
seconds. On failure, discard stdout/stderr that could contain secrets and throw
a localized generic message naming only the selected backend and remediation.

This probe intentionally uses the same bridge and credential files as runtime;
it is the TLS evidence gate, not a synthetic check.

**Step 5: Implement the hidden action and critical task**

Use `Value.select()` with literals `clnrest` and `lndrest`. Metadata:

```ts
allowedStatuses: 'only-stopped'
visibility: 'hidden'
warning: 'This choice is permanent for this mint.'
```

The action reads state once, calls `validateThenLock`, and atomically merges the
value only after the probe succeeds. The init task checks state on every init
kind and creates its own `critical` task only when no backend exists. Register
actions before creating the task. Restores with backed-up state and upgraded
legacy mints therefore receive no task.

**Step 6: Verify and commit**

Run: `npm test && npm run check && npm run build`

Expected: PASS.

```bash
git add startos/actions startos/init startos/i18n startos/lightningConnection.ts \
  startos/lightningProbe.ts startos/utils.ts tests
git commit -m "feat: add one-time validated backend selection"
```

### Task 5: Map mutually exclusive Nutshell environments

**Files:**

- Modify: `startos/mintEnvironment.ts`
- Modify: `tests/mint-environment.test.ts`

**Step 1: Replace the single-backend test with failing discriminated tests**

Retain all existing general-configuration assertions. Add exact backend cases:

```ts
test('builds only the CLNRest environment for CLN', () => {
  const env = buildMintEnvironment(null, 'seed', {
    backend: 'clnrest',
    address: '10.0.3.1:3010',
    rune: 'rune',
  })
  assert.equal(env.MINT_BACKEND_BOLT11_SAT, 'CLNRestWallet')
  assert.equal(env.MINT_CLNREST_URL, 'http://10.0.3.1:3010')
  assert.equal(env.MINT_CLNREST_RUNE, 'rune')
  assert.equal('MINT_LND_REST_ENDPOINT' in env, false)
})

test('builds only the verified LND REST environment for LND', () => {
  const env = buildMintEnvironment(null, 'seed', {
    backend: 'lndrest',
    address: '10.0.3.1:8080',
  })
  assert.equal(env.MINT_BACKEND_BOLT11_SAT, 'LndRestWallet')
  assert.equal(env.MINT_LND_REST_ENDPOINT, 'https://10.0.3.1:8080')
  assert.equal(env.MINT_LND_REST_CERT, '/mnt/lnd/tls.cert')
  assert.equal(
    env.MINT_LND_REST_MACAROON,
    '/mnt/lnd/data/chain/bitcoin/mainnet/admin.macaroon',
  )
  assert.equal(env.MINT_LND_REST_CERT_VERIFY, 'true')
  assert.equal('MINT_CLNREST_RUNE' in env, false)
})
```

**Step 2: Run and verify failure**

Run: `npm test`

Expected: LND case FAIL and the old function type reject the discriminated
connection.

**Step 3: Implement minimal discriminated mapping**

Change the third parameter to:

```ts
type LightningConnection =
  | { backend: 'clnrest'; address: string; rune: string }
  | { backend: 'lndrest'; address: string }
```

Build common settings first, then add only the selected backend's variables in
one branch. Do not initialize all variables and delete the unused set later.

**Step 4: Verify and commit**

Run: `npm test && npm run check`

Expected: all tests PASS.

```bash
git add startos/mintEnvironment.ts tests/mint-environment.test.ts
git commit -m "feat: map CLN and LND mint environments"
```

### Task 6: Wire conditional mounts and startup without fallback

**Files:**

- Modify: `startos/main.ts`
- Modify: `startos/actions/showMintInfo.ts`
- Modify: `startos/utils.ts`
- Modify: `startos/i18n/dictionaries/default.ts`
- Modify: `startos/i18n/dictionaries/translations.ts`
- Test: `tests/lightning-backend.test.ts`

**Step 1: Add failing mount-policy tests**

Add a pure `mountPolicyForBackend` helper and test:

```ts
assert.deepEqual(mountPolicyForBackend('clnrest'), { mountLnd: false })
assert.deepEqual(mountPolicyForBackend('lndrest'), { mountLnd: true })
```

Also assert `backendDisplayName('clnrest')` and
`backendDisplayName('lndrest')` so Show Mint Info cannot remain hard-coded.

**Step 2: Run and verify failure**

Run: `npm test`

Expected: FAIL because the policy/display helpers do not exist.

**Step 3: Implement fail-closed main wiring**

At startup:

1. Read `storeJson.lightningBackend` with `.const(effects)`.
2. Call `assertLightningBackend`; do not default.
3. Resolve only that backend with `lightningConnection.ts`.
4. Start with the existing writable `main` mount for CLN.
5. For LND only, add `mountDependency<typeof lndManifest>` for `lnd/main` at
   `/mnt/lnd`, `subpath: null`, `readonly: true`.
6. Pass the discriminated connection to `buildMintEnvironment`.

Keep the existing mint port health check. If resolution or credentials fail,
throw before creating the daemon. Never branch to the other backend.

Update Show Mint Info to read the stored backend and display the real Nutshell
wallet class instead of always showing `CLNRestWallet`.

**Step 4: Verify and commit**

Run: `npm test && npm run check && npm run build`

Expected: PASS.

```bash
git add startos/main.ts startos/actions/showMintInfo.ts startos/utils.ts \
  startos/i18n startos/lightningBackend.ts tests/lightning-backend.test.ts
git commit -m "feat: start with only the locked lightning backend"
```

### Task 7: Synchronize user and maintainer documentation

**Files:**

- Modify: `README.md`
- Modify: `instructions.md`
- Modify: `UPDATING.md`
- Modify: `AGENTS.md`
- Modify: `assets/README.md`
- Modify: `startos/manifest/i18n.ts`
- Modify: `startos/i18n/dictionaries/default.ts`
- Modify: `startos/i18n/dictionaries/translations.ts`

**Step 1: Identify every obsolete CLN-only statement**

Run:

```bash
git grep -n -i -E 'only CLN|CLNRest is the only|Core Lightning is required|only supported Lightning|wired to.*Core Lightning'
```

Expected: matches in README, instructions, contributor guidance, and manifest
text.

**Step 2: Update all documentation together**

Document:

- explicit one-time CLN or LND choice;
- permanent lock and financial reason for it;
- existing upgrades automatically remaining CLN;
- CLNRest enablement and restricted rune;
- LND on the same StartOS system, internal HTTPS REST, verified certificate,
  read-only volume, and admin-macaroon privilege;
- no manual credential copy;
- fail-closed same-backend recovery;
- backup/restore preservation;
- public mint exposure remaining independent and compatible with LAN, Tor,
  domains, and Start Tunnel;
- x86 device evidence and ARM build-only evidence requirements in UPDATING.

Do not say StartOS or the mint is “LAN-only,” and do not imply that Start
Tunnel is disabled or unnecessary for public mint access. Do not advertise
remote/LAN Lightning nodes.

Translate every new StartOS action/error string in the existing locale set; do
not leave the translation records structurally incomplete.

**Step 3: Verify stale wording is gone**

Repeat the grep and manually inspect every remaining match. Expected: remaining
CLN-only wording appears only in historical/legacy explanations where accurate.

Run: `npm run check && npm run build`

Expected: PASS.

**Step 4: Commit**

```bash
git add README.md instructions.md UPDATING.md AGENTS.md assets/README.md \
  startos/manifest startos/i18n
git commit -m "docs: explain locked CLN and LND backends"
```

### Task 8: Run the complete static verification and build x86

**Files:**

- Modify mechanically as needed: formatted `startos/**/*.ts`, `tests/**/*.ts`
- Do not commit: `javascript/`, `*.s9pk`, image archives, keys, or evidence with
  secrets

**Step 1: Format and verify**

Run in order:

```bash
npm run prettier
npm test
npm run check
npm run build
npm run test:smoke
git diff --check
```

Expected: every command exits 0. Review formatting changes before committing.

**Step 2: Re-run the repository auditor**

Run:

```bash
python3 /home/missydog/.codex/skills/building-startos-community-packages/scripts/audit_repository.py \
  --root . --format text
```

Expected: no deterministic FAIL. Keep repository-topology, remote-role, and
device-lifecycle MANUAL/WARN results unresolved until their evidence exists.

**Step 3: Build and inspect x86**

Run:

```bash
make x86
start-cli s9pk inspect nutshell_x86_64.s9pk manifest
start-cli s9pk inspect nutshell_x86_64.s9pk commitment
sha256sum nutshell_x86_64.s9pk
```

If the Makefile emits a different artifact name, resolve it with
`find . -maxdepth 1 -name '*.s9pk' -type f` and use the exact path. Verify ID
`nutshell`, version `0.20.3:1`, architecture `x86_64`, both optional manifest
dependencies, and the reviewed image digest.

**Step 4: Commit formatting-only source changes**

```bash
git add startos tests
git commit -m "style: format LND backend support"
```

Skip the commit if formatting made no tracked change.

### Task 9: Stop for the x86 TLS and lifecycle evidence gate

**Files:**

- No repository changes unless a demonstrated defect requires a new TDD cycle
- Record redacted external evidence outside tracked package source

This task requires the user's authorized disposable x86 StartOS VM. Do not
manipulate another device and do not perform financial operations.

**Step 1: Establish device identity and starting state**

Record the StartOS URL/fingerprint, architecture, installed Nutshell/CLN/LND
versions, dependency health, and whether the VM snapshot or backup is safe to
replace. Redact credentials.

**Step 2: Prove the exact LND TLS path first**

Sideload the x86 artifact, fresh-install Nutshell, and choose LND. The selector
must succeed using the internal bridge, mounted `tls.cert`, mounted admin
macaroon, and verification enabled. Then start Nutshell and confirm the same
connection remains healthy.

If the selector or runtime reports certificate validation failure, stop. Do not
set `MINT_LND_REST_CERT_VERIFY=false`. Capture only the sanitized error and
return to systematic debugging/design review.

**Step 3: Exercise non-financial lifecycle cases**

- Fresh CLN selection and startup.
- Fresh LND selection and startup.
- Both nodes installed; stop the selected node and verify no fallback.
- Restart and verify the lock persists.
- Upgrade a disposable `0.20.3:0` CLN installation and verify locked CLN plus
  preserved seed/database identity.
- Backup, uninstall/reinstall, restore, and verify the same backend remains
  locked.
- Confirm the mint interface remains available through the configured StartOS
  exposure, including Start Tunnel when used.
- Use a clean reinstall or VM snapshot between backend paths.

**Step 4: Leave financial evidence unresolved unless separately authorized**

Do not mint, melt, pay an invoice, or move node funds. Record real CLN and LND
mint-and-melt testing as MANUAL until the user separately authorizes disposable
funds or provides evidence.

### Task 10: Build and inspect ARM, then close static evidence

**Files:**

- No tracked artifact changes

**Step 1: Build and inspect ARM**

Run:

```bash
make arm
start-cli s9pk inspect nutshell_aarch64.s9pk manifest
start-cli s9pk inspect nutshell_aarch64.s9pk commitment
sha256sum nutshell_aarch64.s9pk
```

Resolve the exact emitted name if different. Verify ID, ExVer, architecture,
dependency declarations, and upstream image digest. Report ARM as build and
inspection evidence only; do not claim ARM device runtime testing.

**Step 2: Verify both artifacts came from one reviewed tree**

Record:

```bash
git rev-parse HEAD
git status --short
sha256sum ./*.s9pk
```

Expected: clean tracked tree; one x86 and one ARM artifact from the same commit.

**Step 3: Run final source gates**

Run:

```bash
npm test
npm run check
npm run build
npm run test:smoke
git diff --check
python3 /home/missydog/.codex/skills/building-startos-community-packages/scripts/audit_repository.py \
  --root . --format text
```

Expected: static commands PASS and no deterministic audit FAIL. Device and
repository-host evidence remain explicitly MANUAL until completed.

### Task 11: Review and prepare the Community handoff without publishing

**Files:**

- Review: all changed files
- Do not create: release assets, GitHub release, PR, issue, registry request, or
  email without explicit authorization

**Step 1: Use the required review skills**

Invoke `superpowers:requesting-code-review`, address findings with TDD, then
invoke `superpowers:verification-before-completion` and rerun its required
evidence commands.

**Step 2: Resolve PR-source topology before any push**

Verify with current GitHub evidence:

- `Start9-Community/nutshell-startos` fork/parent status;
- the repository that will host this feature branch;
- whether that repository can be used as a GitHub PR head for Community main;
- each remote's fetch URL, push URL, and role.

The current `community` push target is `no-push.invalid` and must remain
untouched. Do not repoint or push until the user explicitly approves the exact
source repository and PR action.

**Step 3: Prepare the handoff summary**

Report:

- reviewed commit SHA;
- exact test/build commands and outcomes;
- x86 and ARM artifact names, sizes, and SHA-256 values;
- x86 lifecycle evidence;
- ARM runtime testing unavailable;
- financial test status;
- remaining auditor WARN/MANUAL items;
- proposed PR base/head, without opening it.
