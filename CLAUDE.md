# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

StartOS v0.4.0 package for **Nutshell**, a Cashu ecash mint (Python). The package wraps Cashu v0.19.2 in a Docker container and uses the `@start9labs/start-sdk` TypeScript SDK to define the service manifest, configuration, interfaces, and lifecycle procedures.

## Build Commands

```bash
# Install dependencies
npm install

# Compile TypeScript to javascript/index.js
npm run build          # runs esbuild bundling startos/index.ts

# Build .s9pk package (requires start-cli installed)
make                   # builds for all architectures (x86_64, aarch64)
make x86_64            # single arch
make aarch64           # single arch
```

The build pipeline: TypeScript (`startos/`) → esbuild → `javascript/index.js` → `start-cli` packages into `.s9pk`.

## Architecture

### TypeScript SDK Layer (`startos/`)

All StartOS integration is in `startos/` using the v0.4.0 SDK pattern:

- **`index.ts`** — Entry point, re-exports all procedures and builds the manifest
- **`sdk.ts`** — SDK singleton (`StartSdk.of().build(true)`)
- **`manifest/index.ts`** — Service manifest: ID (`nutshell`), volumes (`main`, `cln-data`), images, dependency on `c-lightning`
- **`procedures/`** — Lifecycle hooks:
  - `main.ts` — Reads config, sets env vars, creates daemon on port 3338, mounts volumes
  - `config.ts` — Config schema (mint info, lightning backend type, fees)
  - `init.ts` — Initialization chain: restore → versionGraph → setInterfaces → setDependencies → actions → initializeService
  - `interfaces.ts` — Exposes "Cashu Mint API" on port 3338 (HTTP)
  - `dependencies.ts` — Requires c-lightning >=23.5.2
  - `backups.ts` — Volume-based backup of `main`
  - `actions.ts` — Custom actions (currently empty)
- **`install/`** — Version graph and migration definitions
- **`fileModels/config.yaml.ts`** — Type-safe config file model at `main/startos/config.yaml`
- **`procedures/initializeService.ts`** — Generates 64-char hex private key on first install

### Docker Layer

The `Dockerfile` builds a Python 3.11-slim container with `cashu==0.19.2`. The mint runs on port 3338 with data stored in `/data`. Core Lightning socket is accessed via the `cln-data` volume mounted at `/home/bitcoin/.lightning`.

### Lightning Backend Options

Config supports three backends: **CLNRpc** (Core Lightning, default), **FakeWallet** (testing), and **LNbitsWallet**.
