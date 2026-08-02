# AGENTS.md

This repository builds the `nutshell` StartOS service package. Follow the
current StartOS packaging guide at <https://docs.start9.com/packaging> and match
working Start9 Community package patterns.

## Package contract

- The official Nutshell image, version, digest, and architectures are defined in
  `startos/upstream.ts`.
- Persistent data is the `main` volume mounted at `/data`.
- The SQLite database is `/data/mint/mint.sqlite3` and the mint seed is
  `/data/mint_private_key`.
- Core Lightning is a required dependency. Runtime access uses its `clnrest`
  host binding over the plaintext StartOS bridge and the rune in the exported
  interface suffix.
- The internal API listener is fixed. Do not add user-configurable bind ports or
  TLS settings; StartOS interfaces own external networking.
- Only CLNRest is supported. Do not expose an upstream backend until its full
  credentials, dependency lifecycle, tests, and documentation are implemented.

## Workflow

Use test-first changes for runtime behavior. Keep `README.md`,
`instructions.md`, and `UPDATING.md` synchronized with code. Run `npm test`,
`npm run check`, and `npm run build` before packing. Run the Docker migration
smoke test for upstream changes, then pack both supported architectures.

Do not commit `.s9pk` files, generated `javascript/`, secrets, real mint seeds,
databases, StartOS developer keys, or machine-local configuration.

## Releases

Upstream releases can migrate the database. Review the full upstream range,
require a backup, test the upgrade, and make downgrade impossible unless it is
demonstrably safe. Follow `UPDATING.md` and the StartOS ExVer/tag convention.
