# Updating the upstream version

Nutshell runs the official `cashubtc/nutshell` multi-architecture image. The GitHub stable
release is the source of truth; the matching Docker Hub image is what the package executes.

The pin lives in `startos/manifest/index.ts` at `images.main.source.dockerTag`, and it carries
**both** a tag and a digest — `cashubtc/nutshell:<version>@sha256:<digest>`. A tag alone is not a
pin: the digest is what makes a rebuild reproduce the image that passed testing.

## Determining the upstream version

```sh
gh release view -R cashubtc/nutshell --json tagName,publishedAt,url
```

Ignore prereleases unless the package explicitly intends to ship one.

## Review compatibility first

Read every upstream release between the packaged and target versions, and never automate this
away. Check:

- database migrations and downgrade safety;
- renamed or removed environment variables — `startos/mintEnvironment.ts` builds the whole
  environment, and a renamed variable is not a type error: the mint starts anyway, on defaults;
- Python command or image working-directory changes (`exec.command` in `startos/main.ts`);
- CLNRest URL, rune, interface suffix, and plaintext bridge behavior;
- LND REST environment names, proxy-terminated HTTPS behavior, StartOS-root
  verification, and admin-macaroon encoding;
- data paths and file ownership — `MINT_DATABASE` is a directory, and `mintDatabaseFile` in
  `startos/utils.ts` reports the filename inside it;
- supported architectures in the image manifest.

Cross-package contracts must be re-checked when either Lightning package moves,
not only when Nutshell moves.

For Core Lightning:

`clnrestPort` is imported from `cln-startos/startos/utils` (so a change there is a build failure
here), but the `clnrest` host id and the `?rune=` query parameter are read by convention from
`cln-startos/startos/interfaces.ts`. If cln stops publishing the rune that way, `main.ts` throws
instead of starting a mint with no Lightning backend — loud, but still a break.

For LND, `controlHostId`, `restPort`, and `lndconnectRestId` are imported from
`lnd-startos/startos/interfaces`. Its masked `lnd-connect-rest` suffix must
continue to expose exactly one `query.macaroon` containing canonical base64url
raw admin-macaroon bytes. Runtime reads the address and suffix reactively;
validation reads them once. The wrapper decodes the credential in memory,
creates the fixed nested directory, writes the raw bytes with mode `0600`, and
requires the ephemeral file with exact `test -s` before probing or launching.
Neither Lightning dependency volume is mounted. Do not replace this with a
dependency file mount: the pinned SDK/OS stack does not support dependency file
mounts end to end, and mounting the whole LND volume overexposes node state.

The LND bridge is HTTPS terminated by the StartOS proxy. Nutshell must continue
to verify it against the root returned by `sdk.getSslCertificate(effects, [])`;
LND's own `tls.cert` is not the trust anchor for this path. Never make
`MINT_LND_REST_CERT_VERIFY` configurable or disable it to get a device test
through.

## Applying the bump

Confirm the tag exists and record its multi-architecture index digest:

```sh
docker buildx imagetools inspect cashubtc/nutshell:<version>
```

Verify the index contains `linux/amd64` and `linux/arm64`, then:

1. `startos/manifest/index.ts` — set `dockerTag` to `cashubtc/nutshell:<version>@sha256:<digest>`.
2. `startos/versions/current.ts` — set `version` to `'<version>:0'` and rewrite `releaseNotes`
   for all five locales. For a wrapper-only change with no upstream move, bump the downstream
   revision instead (`:0` → `:1`) and leave the image alone. Only spin off a historical version
   file when a wrapper-owned migration must run in sequence; Nutshell migrates its own database,
   so a StartOS migration must not duplicate that work. Keep `down: IMPOSSIBLE` unless upstream's
   schema change is demonstrably reversible.

## Verification

```sh
npm ci
npm test
npm run check
npm run build
npm run test:smoke        # pass the previously packaged image as $1
make x86
make arm
```

`test:smoke` writes a database with the previously packaged image, migrates it with the newly
pinned one, and asserts the schema version moved. Its baseline image is an argument, so pass the
version you are upgrading _from_:

```sh
tests/smoke-nutshell.sh cashubtc/nutshell:0.20.3
```

Build and inspect both declared architectures from the same reviewed commit.
The release gate requires successful `x86_64` and `aarch64` package builds and
manifest/commitment inspection. Current device evidence is available only on
the authorized disposable x86 StartOS VM; ARM evidence is build-and-inspection
only until an authorized ARM device is available. Do not describe an ARM
runtime as tested without that evidence.

On x86, verify three paths before tagging:

1. update an existing `0.20.3:0` CLN mint and confirm it becomes locked CLN
   without a new selection task or data loss;
2. fresh-install, select CLN, and confirm the restricted-rune path starts; and
3. fresh-install alongside initialized and unlocked LND, select LND, and prove
   the exact proxy HTTPS path uses the StartOS root and interface-delivered
   ephemeral admin macaroon with certificate verification enabled.

For every path, confirm the daemon starts, the health check goes green, and
Mint Status reports the seed and actual backend. Back up and restore the locked
selection, then confirm failure of the selected node stops Nutshell without
fallback. Keep the public mint exposure test independent: LAN, Tor, domains,
and Start Tunnel do not alter the internal same-StartOS Lightning connection.

For a migration-bearing release, restore a disposable production-shaped backup,
update it, and exercise the authorized non-production lifecycle evidence before
tagging. A listening port proves only that the mint is serving; any real mint or
melt test requires explicit authorization because it performs a financial
operation.

Tags are `v<upstream>_<downstream>`. Do not create or push the tag until the device test is done.
