# Locked CLN or LND REST Backend Design

## Status

Approved on 2026-08-27 for implementation against
`Start9-Community/nutshell-startos` through a pull request. The implementation
branch is based on Community `main` at
`a41ed037c926a59b9b4c5df580c23feb09235b06`.

## Goal

Add LND REST as a second Lightning backend without allowing an established
Cashu mint to change wallets. A fresh installation must explicitly select CLN
or LND once. The selected backend is then locked, backed up, and restored with
the mint. Nutshell must fail closed when that backend is unavailable and must
never detect or fall back to another Lightning node.

## Existing Behavior

The current package has one mandatory `c-lightning` dependency. At every start
it resolves CLNRest over the plaintext StartOS service bridge, reads the
restricted rune from CLN's exported interface, and starts Nutshell with
`CLNRestWallet`. Missing CLNRest connectivity or a missing rune prevents the
daemon from being created.

This design preserves that fail-closed behavior while replacing the hard-coded
backend with an explicit, immutable choice.

## Non-Goals

- Switching backends after selection.
- Automatically detecting an installed Lightning node.
- Falling back when the selected node is stopped or unhealthy.
- Connecting to an LND or CLN node on another StartOS server or elsewhere on
  the LAN or Internet.
- Adding configurable Lightning hosts, ports, TLS modes, or credential paths.
- Disabling LND REST TLS.
- Changing Nutshell's public interface or how operators expose it through LAN,
  Tor, a domain, or Start Tunnel.

## Selection State and Lifecycle

The manifest will declare both `c-lightning` and `lnd` as optional
dependencies. A new, backed-up `startos` volume will contain a small
wrapper-owned `store.json`. The only persistent backend values are:

```text
clnrest
lndrest
```

An absent value means that a fresh installation has not completed setup. It is
not a default.

Fresh installations receive a critical setup task that invokes a hidden
backend-selection action. Nutshell cannot start while the value is absent. The
action is available only while the service is stopped and performs these steps
in order:

1. Refuse the request if a backend is already recorded.
2. Resolve the selected StartOS dependency and its required interface.
3. Perform an authenticated API probe with the selected credentials.
4. Atomically write the choice only after the probe succeeds.
5. Complete the critical setup task.

A failed probe writes nothing and leaves the setup task open. The action remains
defensively non-repeatable after success even if called outside the task UI.
There will be no reset or switch action.

The wrapper-owned migration from `0.20.3:0` assigns `clnrest` to every existing
installation. This preserves the backend on which those mints were created and
does not interrupt them with a new setup decision. A backup made after this
change includes both `main` and `startos`; restore therefore preserves the
choice. Restoring or upgrading legacy data through the version graph also
assigns CLN rather than treating it as a fresh mint.

## Conditional Dependencies and Startup

`setupDependencies` reads the locked value and returns exactly one dependency:

- `c-lightning`, running at the supported version with its `lightningd` health
  check; or
- `lnd`, running at the supported version with the health checks required by
  the current StartOS LND package.

No selected value, an unknown value, or unreadable state produces a blocking
error. Startup uses the same value and constructs only the selected backend's
mounts, bridge address, credentials, and Nutshell environment. Code must not
load credentials or emit environment variables for the unselected backend.

Full chain or graph synchronization is not required to save the initial
selection. The authenticated API and credentials must work; subsequent node
readiness is governed by StartOS dependency health and normal runtime behavior.

## CLNRest Connection

The CLN path retains the current contract:

- Resolve CLNRest over the plaintext internal StartOS service bridge.
- Read the restricted rune from the exported CLNRest interface suffix.
- Authenticate an API probe before committing a fresh selection.
- Start Nutshell with `MINT_BACKEND_BOLT11_SAT=CLNRestWallet`, the internal HTTP
  URL, and the decoded rune.
- Do not mount a CLN volume.

If the address or rune is unavailable, selection or startup fails with a
specific operator-facing message.

## LND REST Connection

The LND path follows Nutshell's supported `LndRestWallet` configuration and
working StartOS service-to-service patterns:

- Resolve LND REST over the HTTPS internal StartOS service bridge.
- Mount LND's main volume read-only into the Nutshell subcontainer.
- Use the mounted LND TLS certificate and Bitcoin mainnet admin macaroon.
- Authenticate `/v1/getinfo` with certificate verification enabled before
  committing a fresh selection.
- Start Nutshell with `MINT_BACKEND_BOLT11_SAT=LndRestWallet`, its internal
  HTTPS REST endpoint, mounted certificate path, mounted macaroon path, and
  certificate verification enabled.

The certificate and macaroon are referenced in place. They are not copied into
`store.json`, Nutshell configuration, task results, or logs. The LND volume is
never mounted writable.

LND's current REST binding uses StartOS SSL rewrapping. Therefore both the
selection probe and the first x86 device test must use the exact runtime path:
the resolved bridge endpoint, the read-only mounted `tls.cert`, certificate
verification enabled, and the mounted admin macaroon. A successful build does
not prove this certificate path. If the authenticated probe fails, stop and
revisit the integration boundary; do not silently disable verification or lock
the backend.

LND's admin macaroon is more privileged than CLN's restricted rune. This is the
credential documented by Nutshell for LND REST and used by existing StartOS
integrations. Documentation must state this difference and the fact that the
credential is exposed only to the selected Nutshell container.

## Networking Boundary

The Lightning dependency and the public mint interface are independent paths:

```text
Public mint access:
Internet clients -> VPS / Start Tunnel / StartOS exposure -> Nutshell interface

Lightning dependency on the same StartOS system:
Nutshell container -> internal StartOS bridge -> selected CLN or LND container
```

LND and Nutshell must be installed on the same StartOS system. The internal LND
connection uses LND's service certificate. It does not use or constrain the
public certificate or exposure method for the Nutshell interface. The package
will not expose a configurable remote LND endpoint.

User-facing wording should mirror the current CLN documentation: install and
start the selected Lightning node, the services find each other, and the mint's
public address remains independently available over LAN, Tor, a domain, or
Start Tunnel as the operator chooses.

## Failure and Recovery Behavior

The locked backend is authoritative. If it is stopped, unhealthy, uninstalled,
unreachable, or rejects its credentials, Nutshell remains stopped with a
backend-specific dependency or startup error. It never inspects or activates
the other backend, even when both are installed.

Missing or corrupted selection state fails closed rather than choosing CLN or
LND. Sensitive URLs, runes, macaroons, certificates, and the mint seed must not
appear in logs or action output.

Recovery means repairing, starting, or reinstalling the same selected
Lightning node. An operator who intentionally wants another backend must create
a genuinely fresh Nutshell installation and mint; no in-place escape hatch is
provided.

## Documentation

Update the manifest descriptions, `README.md`, `instructions.md`, `UPDATING.md`,
and contributor guidance together. Documentation must cover:

- the one-time CLN-or-LND choice and why it cannot be changed;
- prerequisites and setup steps for both local StartOS dependencies;
- CLNRest enablement and rune behavior;
- LND's internal REST TLS, read-only credential mount, and admin-macaroon scope;
- fail-closed behavior and same-backend recovery;
- backup and restore preservation;
- the separation between internal Lightning connectivity and public mint
  exposure through LAN, Tor, domains, or Start Tunnel.

## Verification

Automated tests must cover:

- CLN and LND environment mapping;
- absence of unselected-backend variables and credentials;
- successful one-time selection and refusal to switch;
- failure without saving when API or credential validation fails;
- legacy migration to locked CLN;
- missing, unknown, or corrupt state failing closed;
- exactly one conditional dependency;
- backup inclusion of both volumes.

Run the repository-native test, typecheck, bundle, and smoke-test commands. Pack
and inspect both `x86_64` and `aarch64` artifacts from the same reviewed commit.
Architecture build and package inspection are required for both, but device
runtime evidence will be available only for `x86_64`.

On the authorized disposable x86 StartOS VM:

1. Upgrade an existing `0.20.3:0` CLN installation and verify it becomes locked
   CLN without losing mint data.
2. Fresh-install and select CLN.
3. Fresh-install Nutshell and LND on the same StartOS system, then verify the
   authenticated internal HTTPS REST connection.
4. Verify the Nutshell interface remains independently available through the
   operator's configured StartOS exposure, including Start Tunnel when used.
5. With both Lightning nodes installed, stop the selected node and verify there
   is no fallback.
6. Restart and verify selection persistence.
7. Back up, reinstall, restore, and verify the same backend remains locked.
8. Use a clean reinstall or VM snapshot between CLN and LND paths.

Financial mint-and-melt operations must not be automated or inferred. A real
round-trip for each backend is a manual release gate using explicitly
authorized disposable funds or user-supplied evidence. Until recorded, it
remains unresolved device evidence rather than a passing claim.

## Community Handoff Gates

Before any push or pull request, verify the PR-source repository, fork
relationship, branch target, and every remote's fetch and push role. The
`community` remote remains push-disabled. Re-run the Community repository
auditor on the final tree and preserve exact build, artifact, checksum, CI, and
x86 device evidence. ARM runtime testing must be reported as unavailable, not
implied by a successful ARM build.
