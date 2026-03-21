# Nutshell StartOS Project Overview

This project is a [StartOS](https://start9.com) service package for **Nutshell**, a [Cashu](https://cashu.space) ecash mint implementation written in Python.

**Target Architecture:** StartOS v0.4.0 (TypeScript SDK)

## Project Structure

The project is transitioning from the legacy v0.3.x (YAML/Shell) architecture to the modern v0.4.0 (TypeScript SDK) architecture.

### Current (Legacy v0.3.x)
- `manifest.yaml`: Metadata and static configuration.
- `scripts/`: Shell scripts for config and health checks.
- `docker_entrypoint.sh`: Container startup logic.

### Target (Modern v0.4.0)
- `startos/`: Core TypeScript logic for the service.
  - `manifest/`: Programmatic manifest definition (`index.ts`, `i18n.ts`).
  - `procedures/`: Service lifecycle logic (`main.ts`, `init.ts`, `config.ts`, `interfaces.ts`, etc.).
  - `fileModels/`: Type-safe configuration file definitions.
  - `install/`: Version graph and migration history.
- `assets/`: Static assets (icon, screenshots).
- `Makefile` & `s9pk.mk`: Modernized build system.
- `instructions.md`: User-facing instructions.

## Migration Plan to v0.4.0 (COMPLETED)

1.  **Initialize `startos/` Directory:** Setup the TypeScript project structure. (Done)
2.  **Define Manifest:** Migrate `manifest.yaml` to `startos/manifest/index.ts`. (Done)
3.  **Implement Procedures:**
    - Migrate startup logic to `startos/procedures/main.ts`.
    - Migrate config to `startos/procedures/config.ts`.
    - Migrate health checks to `setupMain()`. (Done)
4.  **Update Build System:** Replace custom `Makefile` with `s9pk.mk` integration and add `instructions.md`. (Done)

## Building and Running (v0.4.0)
... (rest of the content)
