import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  PACKAGE_VERSION,
  SUPPORTED_ARCHITECTURES,
  UPSTREAM_IMAGE,
  UPSTREAM_IMAGE_DIGEST,
  UPSTREAM_IMAGE_REFERENCE,
  UPSTREAM_VERSION,
} from '../startos/upstream'

test('tracks the approved stable Nutshell release from one module', () => {
  assert.equal(UPSTREAM_VERSION, '0.20.3')
  assert.equal(UPSTREAM_IMAGE, 'cashubtc/nutshell')
  assert.match(UPSTREAM_IMAGE_DIGEST, /^sha256:[a-f0-9]{64}$/)
  assert.deepEqual(SUPPORTED_ARCHITECTURES, ['x86_64', 'aarch64'])
  assert.equal(PACKAGE_VERSION, '0.20.3:0')
  assert.equal(
    UPSTREAM_IMAGE_REFERENCE,
    `${UPSTREAM_IMAGE}:${UPSTREAM_VERSION}@${UPSTREAM_IMAGE_DIGEST}`,
  )
})

test('distinguishes the wrapper repository from the upstream repository', async () => {
  const manifestSource = await readFile('startos/manifest/index.ts', 'utf8')

  assert.match(
    manifestSource,
    /packageRepo:\s*'https:\/\/github\.com\/mdubore\/nutshell-startos'/,
  )
  assert.match(
    manifestSource,
    /upstreamRepo:\s*'https:\/\/github\.com\/cashubtc\/nutshell'/,
  )
})

test('uses the official immutable multi-architecture image', async () => {
  const manifestSource = await readFile('startos/manifest/index.ts', 'utf8')

  assert.match(manifestSource, /dockerTag:\s*UPSTREAM_IMAGE_REFERENCE/)
  assert.match(manifestSource, /arch:\s*\[\.\.\.SUPPORTED_ARCHITECTURES\]/)
  assert.doesNotMatch(manifestSource, /dockerBuild/)
})

test('stores the SQLite database on the StartOS data volume explicitly', async () => {
  const environmentSource = await readFile(
    'startos/config/mintEnvironment.ts',
    'utf8',
  )

  assert.match(environmentSource, /MINT_DATABASE\s*=\s*'\/data\/mint'/)
  assert.doesNotMatch(environmentSource, /MINT_DATABASE_DIR/)
})

test('exposes only the supported CLNRest backend and fixed internal network', async () => {
  const configSource = await readFile('startos/fileModels/config.yaml.ts', 'utf8')
  const actionsSource = await readFile('startos/procedures/actions.ts', 'utf8')
  const interfacesSource = await readFile(
    'startos/procedures/interfaces.ts',
    'utf8',
  )

  assert.doesNotMatch(configSource, /FakeWallet|LNbitsWallet/)
  assert.doesNotMatch(configSource, /listen_host|listen_port|protocol/)
  assert.doesNotMatch(actionsSource, /configure-network/)
  assert.match(actionsSource, /configure-fees/)
  assert.match(interfacesSource, /bindPort\(MINT_PORT/)
  assert.match(interfacesSource, /protocol:\s*'http'/)
})

test('includes the Community Registry documentation and automation surface', async () => {
  const requiredFiles = [
    'README.md',
    'UPDATING.md',
    'AGENTS.md',
    '.github/workflows/build.yml',
    '.github/workflows/release.yml',
    '.github/workflows/tagAndRelease.yml',
    '.github/workflows/upstream-check.yml',
  ]

  await Promise.all(requiredFiles.map((path) => access(path)))

  const readme = await readFile('README.md', 'utf8')
  assert.doesNotMatch(readme, new RegExp(UPSTREAM_VERSION.replaceAll('.', '\\.')))
  assert.match(readme, /## Image and Container Runtime/)
  assert.match(readme, /## Actions \(StartOS UI\)/)
  assert.match(readme, /## Quick Reference for AI Consumers/)
})
