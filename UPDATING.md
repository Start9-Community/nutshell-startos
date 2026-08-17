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
- CLNRest URL, rune, and transport behavior;
- data paths and file ownership — `MINT_DATABASE` is a directory, and `mintDatabaseFile` in
  `startos/utils.ts` reports the filename inside it;
- supported architectures in the image manifest.

Two cross-package claims are worth re-checking on any cln bump rather than a Nutshell one:
`clnrestPort` is imported from `cln-startos/startos/utils` (so a change there is a build failure
here), but the `clnrest` host id and the `?rune=` query parameter are read by convention from
`cln-startos/startos/interfaces.ts`. If cln stops publishing the rune that way, `main.ts` throws
instead of starting a mint with no Lightning backend — loud, but still a break.

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
version you are upgrading *from*:

```sh
tests/smoke-nutshell.sh cashubtc/nutshell:0.20.3
```

Then install on a StartOS server and drive it: the daemon starts, the health check goes green,
and the Mint Status action reports the seed present. For a migration-bearing release, restore a
disposable copy of a production-shaped backup, update it, and **exercise a real mint and melt**
before tagging — a listening port proves the mint is serving, not that it can settle a payment.

Tags are `v<upstream>_<downstream>`. Do not create or push the tag until the device test is done.
