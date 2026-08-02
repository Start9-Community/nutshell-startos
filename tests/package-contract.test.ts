import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
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
