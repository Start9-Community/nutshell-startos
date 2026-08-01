# Nutshell x86_64 S9PK Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the existing Nutshell `0.19.2:4` update and produce a verified `x86_64` StartOS package.

**Architecture:** Preserve the existing StartOS v0.4 SDK structure and limit source changes to update consistency. Rebuild the NCC JavaScript bundle, let the existing `make x86` target assemble the Docker image and package, then inspect the package manifest and checksum the artifact.

**Tech Stack:** TypeScript, `@start9labs/start-sdk` v0.4 beta, NCC, Docker, GNU Make, `start-cli` 1.1.0.

---

### Task 1: Complete the `0.19.2:4` release notes

**Files:**
- Modify: `startos/install/versions/v0.19.2.4.ts:5-8`

**Step 1: Run the release-note consistency check and verify it fails**

Run:

```bash
rg -n "CLNRest.*HTTP|HTTP.*CLNRest" startos/install/versions/v0.19.2.4.ts
```

Expected: exit 1 because the release notes currently omit the CLNRest HTTP correction.

**Step 2: Add the missing fix to the release notes**

Extend the release notes with this sentence:

```typescript
'Use HTTP for the internal CLNRest bridge to match the c-lightning interface.'
```

Keep the existing mint-info description intact.

**Step 3: Run the release-note consistency check again**

Run:

```bash
rg -n "HTTP.*CLNRest|CLNRest.*HTTP" startos/install/versions/v0.19.2.4.ts
```

Expected: exit 0 and output containing the new sentence.

### Task 2: Validate and commit the completed source update

**Files:**
- Modify: `CLAUDE.md`
- Modify: `startos/fileModels/config.yaml.ts`
- Modify: `startos/install/versionGraph.ts`
- Create: `startos/install/versions/v0.19.2.4.ts`
- Modify: `startos/procedures/actions.ts`
- Modify: `startos/procedures/main.ts`

**Step 1: Check patch formatting**

Run:

```bash
git diff --check
```

Expected: exit 0 with no output.

**Step 2: Compile without emitting files**

Run:

```bash
./node_modules/.bin/tsc --noEmit --pretty false
```

Expected: exit 0 with no TypeScript diagnostics.

**Step 3: Verify the version graph and CLNRest source behavior**

Run:

```bash
rg -n "current: v0_19_2_4|http://.*hostname|replace\(.*http://" startos/install/versionGraph.ts startos/procedures/main.ts
```

Expected: matches for the current version, constructed HTTP URL, and scheme replacement.

**Step 4: Review the exact update before committing**

Run:

```bash
git diff --stat
git diff --name-status
```

Expected: only the approved Nutshell update files are listed; planning documents are already committed separately.

**Step 5: Commit the source update**

Run:

```bash
git add CLAUDE.md startos/fileModels/config.yaml.ts startos/install/versionGraph.ts startos/install/versions/v0.19.2.4.ts startos/procedures/actions.ts startos/procedures/main.ts
git commit -m "fix: complete Nutshell 0.19.2:4 update"
```

Expected: one commit containing the existing mint-info work, version bump, CLNRest correction, and completed release notes.

### Task 3: Rebuild the StartOS JavaScript bundle

**Files:**
- Generate, ignored: `javascript/index.js`

**Step 1: Install exactly the locked dependencies**

Run:

```bash
npm ci
```

Expected: exit 0 with dependencies installed from `package-lock.json`.

**Step 2: Build the NCC bundle**

Run:

```bash
npm run build
```

Expected: exit 0 and `javascript/index.js` is produced.

**Step 3: Check the generated bundle contains the update**

Run:

```bash
rg -n "0\.19\.2:4|configure-mint-info|MINT_CLNREST_URL.*http://" javascript/index.js
```

Expected: all three update markers are present.

### Task 4: Build the x86_64 package

**Files:**
- Generate, ignored: `nutshell_x86_64.s9pk`

**Step 1: Build only the target architecture**

Run:

```bash
make x86
```

Expected: exit 0 and the build summary identifies `nutshell_x86_64.s9pk`.

**Step 2: Confirm the artifact exists and is non-empty**

Run:

```bash
test -s nutshell_x86_64.s9pk
```

Expected: exit 0.

### Task 5: Inspect and checksum the package

**Files:**
- Verify: `nutshell_x86_64.s9pk`

**Step 1: Inspect the manifest**

Run:

```bash
start-cli s9pk inspect nutshell_x86_64.s9pk manifest | jq '{id, title, version, sdkVersion, images, gitHash}'
```

Expected: package `nutshell`, version `0.19.2:4`, and image architecture `x86_64`.

**Step 2: Enforce the version and architecture assertions**

Run:

```bash
start-cli s9pk inspect nutshell_x86_64.s9pk manifest | jq -e '.id == "nutshell" and .version == "0.19.2:4" and ([.images[].arch // []] | flatten | index("x86_64") != null)'
```

Expected: `true` and exit 0.

**Step 3: Generate the checksum**

Run:

```bash
sha256sum nutshell_x86_64.s9pk
```

Expected: one SHA-256 digest followed by the artifact filename.

**Step 4: Confirm final repository state**

Run:

```bash
git status --short --branch
```

Expected: `main` has no uncommitted source changes; ignored build artifacts do not appear.
