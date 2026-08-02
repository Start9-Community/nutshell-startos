# Updating the upstream version

Nutshell runs the official `cashubtc/nutshell` multi-architecture image. The
GitHub stable release is the source of truth; the matching Docker Hub image is
what the package executes.

## Check for a release

```bash
gh release view -R cashubtc/nutshell --json tagName,publishedAt,url
```

Compare the tag with `UPSTREAM_VERSION` in `startos/upstream.ts`. Ignore
prereleases unless the package explicitly intends to ship one.

## Review compatibility first

Read every upstream release between the packaged and target versions. Check:

- database migrations and downgrade safety;
- renamed or removed environment variables;
- Python command or image working-directory changes;
- CLNRest URL, rune, and transport behavior;
- data paths and file ownership;
- supported architectures in the image manifest.

Never automate this review away. A scheduled workflow only opens an issue when
a new stable release appears.

## Pin the official image

Confirm the tag exists and record its multi-architecture index digest:

```bash
docker buildx imagetools inspect cashubtc/nutshell:<version>
```

Verify that the index contains `linux/amd64` and `linux/arm64`. Update
`UPSTREAM_VERSION` and `UPSTREAM_IMAGE_DIGEST` in `startos/upstream.ts`; the
manifest image reference and StartOS ExVer upstream portion derive from those
constants. Reset `DOWNSTREAM_REVISION` to `0` for a new upstream release.

Do not pin only a mutable tag. The digest is what makes a rebuild reproduce the
image that passed testing.

## Version and migration handling

The current package version lives in `startos/versions/current.ts`. Nutshell
migrates its own database, so StartOS migrations must not duplicate that work.
Use `IMPOSSIBLE` for downgrade whenever upstream schema changes are not proven
reversible, and clearly require a fresh backup in the localized release notes.

Only create a historical version file when a wrapper-owned migration must run
in sequence. Git history records migration-free releases.

## Verification

Run, in order:

```bash
npm ci
npm test
npm run check
npm run build
npm run test:smoke
make x86
make arm
```

Inspect both `.s9pk` manifests and test a clean install. For a migration-bearing
release, restore a disposable copy of a production-shaped backup, update it,
and exercise mint and melt transactions before tagging.

Tags use `v<upstream>_<downstream>`. Do not create or push the tag until the
StartOS device test is complete.
