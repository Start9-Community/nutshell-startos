import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  buildProbeSpec,
  lndRestRuntime,
  probeExecTimeoutMs,
  probeHttpTimeoutSeconds,
  probeRuntimeForBackend,
  selectStartOsRootCa,
} from '../startos/lightningProbe.ts'

test('CLN probe authenticates without putting the rune in argv or env', () => {
  const spec = buildProbeSpec('clnrest', {
    endpoint: 'http://10.0.3.1:3010',
    credential: 'secret-rune',
  })

  assert.match(spec.env.PROBE_URL, /^http:/)
  assert.equal(spec.command.join(' ').includes('secret-rune'), false)
  assert.equal(Object.values(spec.env).includes('secret-rune'), false)
  assert.equal('PROBE_CREDENTIAL' in spec.env, false)
  assert.equal(spec.input, 'secret-rune')
  assert.match(spec.command.at(-1) ?? '', /\/v1\/listfunds/)
  assert.match(spec.command.at(-1) ?? '', /method=['"]POST['"]/)
  assert.match(spec.command.at(-1) ?? '', /sys\.stdin\.read\(\)/)
})

test('LND probe enables verification and uses an ephemeral credential file', () => {
  const spec = buildProbeSpec('lndrest', {
    endpoint: 'https://10.0.3.1:8080',
  })

  assert.equal(spec.env.PROBE_CERT_VERIFY, 'true')
  assert.equal(spec.env.PROBE_CERT, '/tmp/startos-root-ca.pem')
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

test('probe builder rejects backends outside the exact runtime allowlist', () => {
  assert.throws(
    () =>
      buildProbeSpec(
        // @ts-expect-error Exercise corrupt input at the JavaScript boundary.
        'fake',
        { endpoint: 'https://10.0.3.1:8080' },
      ),
    /invalid/i,
  )
})

test('neither backend receives a dependency mount and only LND gets proxy trust', () => {
  assert.deepEqual(probeRuntimeForBackend('clnrest'), { mounts: [] })
  assert.deepEqual(probeRuntimeForBackend('lndrest'), {
    mounts: [],
    tls: {
      source: 'startos-root-ca',
      rootCaPath: '/tmp/startos-root-ca.pem',
      verify: true,
    },
  })
  assert.deepEqual(lndRestRuntime, {
    rootCaPath: '/tmp/startos-root-ca.pem',
    macaroon: '/mnt/lnd/data/chain/bitcoin/mainnet/admin.macaroon',
  })
})

test('selects only a nonempty StartOS root CA from the certificate chain', () => {
  assert.equal(
    selectStartOsRootCa(['leaf', 'intermediate', 'root-ca']),
    'root-ca',
  )
  assert.throws(() => selectStartOsRootCa([]), /root CA/i)
  assert.throws(() => selectStartOsRootCa(['leaf', '  ']), /root CA/i)
})

test('SDK probe wiring consumes the pure runtime contract', () => {
  const source = readFileSync(
    new URL('../startos/lightningConnection.ts', import.meta.url),
    'utf8',
  )

  assert.match(source, /selectedRuntimeForConnection\(backend, connection\)/)
  assert.match(source, /sdk\.SubContainer\.withTemp\(/)
  assert.match(source, /sdk\.getSslCertificate\(effects, \[\]\)\.once\(\)/)
  assert.match(source, /subcontainer\.writeFile\(/)
  assert.doesNotMatch(source, /mountDependency/)
  assert.match(source, /input: spec\.input/)
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
