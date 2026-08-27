import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  buildProbeSpec,
  lndCredentialPaths,
  probeExecTimeoutMs,
  probeHttpTimeoutSeconds,
  probeRuntimeForBackend,
} from '../startos/lightningProbe.ts'

test('CLN probe authenticates without putting the rune in argv', () => {
  const spec = buildProbeSpec('clnrest', {
    endpoint: 'http://10.0.3.1:3010',
    credential: 'secret-rune',
  })

  assert.match(spec.env.PROBE_URL, /^http:/)
  assert.equal(spec.env.PROBE_CREDENTIAL, 'secret-rune')
  assert.equal(spec.command.join(' ').includes('secret-rune'), false)
  assert.match(spec.command.at(-1) ?? '', /\/v1\/listfunds/)
  assert.match(spec.command.at(-1) ?? '', /method=['"]POST['"]/)
})

test('LND probe enables verification and uses mounted credentials', () => {
  const spec = buildProbeSpec('lndrest', {
    endpoint: 'https://10.0.3.1:8080',
  })

  assert.equal(spec.env.PROBE_CERT_VERIFY, 'true')
  assert.equal(spec.env.PROBE_CERT, '/mnt/lnd/tls.cert')
  assert.equal(
    spec.env.PROBE_CREDENTIAL,
    '/mnt/lnd/data/chain/bitcoin/mainnet/admin.macaroon',
  )
  assert.match(spec.command.at(-1) ?? '', /\/v1\/getinfo/)
  assert.match(spec.command.at(-1) ?? '', /create_default_context/)
})

test('probe scripts use fixed client and exec timeouts', () => {
  const cln = buildProbeSpec('clnrest', {
    endpoint: 'http://10.0.3.1:3010',
    credential: 'rune',
  })
  const lnd = buildProbeSpec('lndrest', {
    endpoint: 'https://10.0.3.1:8080',
  })

  assert.equal(probeHttpTimeoutSeconds, 5)
  assert.equal(probeExecTimeoutMs, 15_000)
  assert.match(cln.command.at(-1) ?? '', /timeout=5/)
  assert.match(lnd.command.at(-1) ?? '', /timeout=5/)
})

test('only LND receives the exact read-only dependency mount', () => {
  assert.deepEqual(probeRuntimeForBackend('clnrest'), { mounts: [] })
  assert.deepEqual(probeRuntimeForBackend('lndrest'), {
    mounts: [
      {
        dependencyId: 'lnd',
        volumeId: 'main',
        subpath: null,
        mountpoint: '/mnt/lnd',
        readonly: true,
      },
    ],
  })
  assert.deepEqual(lndCredentialPaths, {
    certificate: '/mnt/lnd/tls.cert',
    macaroon: '/mnt/lnd/data/chain/bitcoin/mainnet/admin.macaroon',
  })
})

test('SDK probe wiring consumes the pure runtime contract', () => {
  const source = readFileSync(
    new URL('../startos/lightningConnection.ts', import.meta.url),
    'utf8',
  )

  assert.match(source, /probeRuntimeForBackend\(backend\)/)
  assert.match(source, /sdk\.SubContainer\.withTemp\(/)
  assert.match(source, /probeExecTimeoutMs/)
})

test('actions are registered before the missing-selection task is created', () => {
  const actionsSource = readFileSync(
    new URL('../startos/actions/index.ts', import.meta.url),
    'utf8',
  )
  const initSource = readFileSync(
    new URL('../startos/init/index.ts', import.meta.url),
    'utf8',
  )

  assert.match(actionsSource, /\.addAction\(selectLightningBackend\)/)
  assert.ok(
    initSource.indexOf('actions,') <
      initSource.indexOf('taskSelectLightningBackend,'),
  )
})
