# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

StartOS v0.4.0 package for **Nutshell**, a Cashu ecash mint (Python). The package wraps Cashu v0.19.2 in a Docker container and uses the `@start9labs/start-sdk` TypeScript SDK to define the service manifest, configuration, interfaces, and lifecycle procedures.

## Build Commands

```bash
npm install            # install dependencies
npm run build          # bundle startos/index.ts → javascript/index.js (uses @vercel/ncc)

# Build .s9pk package (requires start-cli)
make                   # builds for default architectures (x86_64, aarch64)
make x86               # single arch (aliases: x86_64)
make arm               # single arch (aliases: aarch64, arm64)
make clean             # remove .s9pk, javascript/, node_modules/
make install           # sideload to a StartOS device (needs ~/.startos/config.yaml host)
make publish           # publish to registry (needs ~/.startos/config.yaml registry + s9pk-s3base, and s3cmd)
```

The build pipeline: TypeScript (`startos/`) → ncc → `javascript/index.js` → `start-cli s9pk pack` → `.s9pk`. Shared build logic lives in `s9pk.mk` (included by `Makefile`); do not edit `s9pk.mk` directly.

## Architecture

### SDK Singleton Pattern

All StartOS integration uses the v0.4.0 SDK pattern. The SDK singleton in `sdk.ts` is created via `StartSdk.of().withManifest(manifest).build(true)` — every procedure imports this `sdk` instance and calls `sdk.setup*()` methods to define lifecycle hooks.

### Entry Point and Init Chain

`index.ts` re-exports all procedures and calls `buildManifest(versionGraph, manifest)`. The init chain in `procedures/init.ts` wires together: restore → versionGraph → setInterfaces → setDependencies → actions → initializeService.

### Lightning Integration (CLNRest)

The mint connects to Core Lightning via **CLNRest** (not direct socket). In `procedures/main.ts`, when the backend is `CLNRestWallet`, the daemon discovers the CLNRest interface URL and rune from `sdk.serviceInterface.get()` using the `c-lightning` dependency's `clnrest` interface. There is no CLN volume mount — only a single `main` volume for mint data at `/data`.

### Config and File Models

Config is defined as a Zod schema in `fileModels/config.yaml.ts` using `FileHelper.yaml()`, stored at `main/startos/config.yaml`. The schema covers mint info (name, description), lightning backend type (`CLNRestWallet` | `FakeWallet` | `LNbitsWallet`), and fee settings.

### Version Graph

Package versions use `upstream:revision` format (e.g., `0.19.2:0`). New versions go in `install/versions/` as `VersionInfo.of()` objects and are wired into `install/versionGraph.ts`. The revision number increments for wrapper-only changes.

### Docker Layer

`Dockerfile` builds a Python 3.11-slim container with `cashu==0.19.2` (pinned `marshmallow<4`, `limits<5`). The mint runs on port 3338.

### Notable Dependencies

- `start-os/` — Git submodule containing the StartOS source (reference only, not used in build).
- `@start9labs/start-sdk ^0.4.0-beta` — The SDK is still in beta; API surface may change between minor versions.
