import assert from 'node:assert/strict'
import test from 'node:test'

import {
  backendDisplayName,
  endpointForConnection,
  mountPolicyForBackend,
  prepareRuntimeCredentials,
  prepareSubcontainerOrDestroy,
  readConnectionValue,
  resolveSelectedRuntime,
} from '../startos/lightningRuntime.ts'
import { lightningBackends } from '../startos/lightningBackendState.mjs'
import { lndRestRuntime } from '../startos/lndRestRuntime.mjs'

test('runtime accepts exactly the two supported backend identifiers', () => {
  assert.deepEqual(lightningBackends, ['clnrest', 'lndrest'])
})

test('mounts only the writable mint volume for CLN', () => {
  assert.deepEqual(mountPolicyForBackend('clnrest'), {
    main: {
      volumeId: 'main',
      subpath: null,
      mountpoint: '/data',
      readonly: false,
    },
    dependencies: [],
  })
})

test('mounts only the read-only LND admin macaroon file for LND', () => {
  assert.deepEqual(mountPolicyForBackend('lndrest'), {
    main: {
      volumeId: 'main',
      subpath: null,
      mountpoint: '/data',
      readonly: false,
    },
    dependencies: [
      {
        dependencyId: 'lnd',
        volumeId: 'main',
        subpath: 'data/chain/bitcoin/mainnet/admin.macaroon',
        mountpoint: '/mnt/lnd/data/chain/bitcoin/mainnet/admin.macaroon',
        type: 'file',
        readonly: true,
      },
    ],
  })
})

test('fails closed before building mounts for missing or invalid state', () => {
  assert.throws(() => mountPolicyForBackend(undefined), /not selected/i)
  assert.throws(() => mountPolicyForBackend('invalid'), /invalid/i)
})

test('maps the stored backend to the real Nutshell wallet class', () => {
  assert.equal(backendDisplayName('clnrest'), 'CLNRestWallet')
  assert.equal(backendDisplayName('lndrest'), 'LndRestWallet')
  assert.throws(() => backendDisplayName(undefined), /not selected/i)
  assert.throws(() => backendDisplayName('invalid'), /invalid/i)
})

test('resolves only the selected LND connection and keeps its address raw', async () => {
  const resolved: string[] = []

  const runtime = await resolveSelectedRuntime('lndrest', async (backend) => {
    resolved.push(backend)
    return {
      backend: 'lndrest',
      address: '10.0.3.1:8080',
    }
  })

  assert.deepEqual(resolved, ['lndrest'])
  assert.deepEqual(runtime.connection, {
    backend: 'lndrest',
    address: '10.0.3.1:8080',
  })
  assert.equal(
    endpointForConnection(runtime.connection),
    'https://10.0.3.1:8080',
  )
  assert.equal(runtime.mounts.dependencies.length, 1)
})

test('resolves only the selected CLN connection and preserves its rune', async () => {
  const resolved: string[] = []

  const runtime = await resolveSelectedRuntime('clnrest', async (backend) => {
    resolved.push(backend)
    return {
      backend: 'clnrest',
      address: '10.0.3.2:3010',
      rune: 'restricted-rune',
    }
  })

  assert.deepEqual(resolved, ['clnrest'])
  assert.deepEqual(runtime.connection, {
    backend: 'clnrest',
    address: '10.0.3.2:3010',
    rune: 'restricted-rune',
  })
  assert.equal(
    endpointForConnection(runtime.connection),
    'http://10.0.3.2:3010',
  )
  assert.deepEqual(runtime.mounts.dependencies, [])
})

test('does not inspect any connection when stored state is missing or invalid', async () => {
  let resolveCalls = 0
  const resolve = async () => {
    resolveCalls += 1
    return {
      backend: 'lndrest' as const,
      address: '10.0.3.1:8080',
    }
  }

  await assert.rejects(
    resolveSelectedRuntime(undefined, resolve),
    /not selected/i,
  )
  await assert.rejects(resolveSelectedRuntime('invalid', resolve), /invalid/i)
  assert.equal(resolveCalls, 0)
})

test('refuses fallback, mismatched connections, and incomplete credentials', async () => {
  await assert.rejects(
    resolveSelectedRuntime('lndrest', async () => ({
      backend: 'clnrest',
      address: '10.0.3.2:3010',
      rune: 'restricted-rune',
    })),
    /does not match/i,
  )

  await assert.rejects(
    resolveSelectedRuntime('clnrest', async () => ({
      backend: 'clnrest',
      address: '10.0.3.2:3010',
      rune: '',
    })),
    /rune.*empty/i,
  )

  await assert.rejects(
    resolveSelectedRuntime('lndrest', async () => ({
      backend: 'lndrest',
      address: '',
    })),
    /address.*empty/i,
  )
})

test('rejects pre-schemed bridge addresses instead of double-prefixing them', async () => {
  await assert.rejects(
    resolveSelectedRuntime('lndrest', async () => ({
      backend: 'lndrest',
      address: 'https://10.0.3.1:8080',
    })),
    /scheme/i,
  )
})

test('rejects connections outside the exact runtime backend allowlist', () => {
  assert.throws(
    () =>
      endpointForConnection({
        // @ts-expect-error Exercise corrupt runtime input at the JS boundary.
        backend: 'invalid',
        address: '10.0.3.1:8080',
      }),
    /invalid/i,
  )
})

test('prepares LND credentials in the daemon subcontainer before use', async () => {
  const events: string[] = []
  const runtime = await resolveSelectedRuntime('lndrest', async () => ({
    backend: 'lndrest',
    address: '10.0.3.1:8080',
  }))

  await prepareRuntimeCredentials(runtime, 'root-ca', {
    writeFile: async (path, contents) => {
      events.push(`write:${path}:${contents}`)
    },
    requireNonemptyFile: async (path) => {
      events.push(`require:${path}`)
    },
  })

  assert.deepEqual(events, [
    `write:${lndRestRuntime.rootCaPath}:root-ca`,
    `require:${lndRestRuntime.macaroon}`,
  ])
})

test('fails before touching the subcontainer when the LND root is missing', async () => {
  let ioCalls = 0
  const runtime = await resolveSelectedRuntime('lndrest', async () => ({
    backend: 'lndrest',
    address: '10.0.3.1:8080',
  }))

  await assert.rejects(
    prepareRuntimeCredentials(runtime, '', {
      writeFile: async () => {
        ioCalls += 1
      },
      requireNonemptyFile: async () => {
        ioCalls += 1
      },
    }),
    /root CA.*unavailable/i,
  )
  assert.equal(ioCalls, 0)
})

test('does not prepare dependency credentials for CLN', async () => {
  let ioCalls = 0
  const runtime = await resolveSelectedRuntime('clnrest', async () => ({
    backend: 'clnrest',
    address: '10.0.3.2:3010',
    rune: 'restricted-rune',
  }))

  await prepareRuntimeCredentials(runtime, null, {
    writeFile: async () => {
      ioCalls += 1
    },
    requireNonemptyFile: async () => {
      ioCalls += 1
    },
  })

  assert.equal(ioCalls, 0)
})

test('rejects invalid backend state before preparing credentials', async () => {
  let ioCalls = 0

  await assert.rejects(
    prepareRuntimeCredentials(
      {
        connection: {
          // @ts-expect-error Exercise corrupt runtime input at the JS boundary.
          backend: 'invalid',
          address: '10.0.3.1:8080',
        },
        mounts: mountPolicyForBackend('lndrest'),
        requiresRootCa: true,
      },
      'root-ca',
      {
        writeFile: async () => {
          ioCalls += 1
        },
        requireNonemptyFile: async () => {
          ioCalls += 1
        },
      },
    ),
    /invalid/i,
  )

  assert.equal(ioCalls, 0)
})

test('destroys a prepared subcontainer before rethrowing preparation failure', async () => {
  const events: string[] = []
  const failure = new Error('credential preparation failed')

  await assert.rejects(
    prepareSubcontainerOrDestroy(
      async () => {
        events.push('prepare')
        throw failure
      },
      async () => {
        events.push('destroy')
      },
    ),
    (error) => error === failure,
  )

  assert.deepEqual(events, ['prepare', 'destroy'])
})

test('reactive runtime reads subscribe without performing a one-shot read', async () => {
  const events: string[] = []
  const value = await readConnectionValue(
    {
      once: async () => {
        events.push('once')
        return 'one-shot'
      },
      const: async () => {
        events.push('const')
        return 'reactive'
      },
    },
    'reactive',
  )

  assert.equal(value, 'reactive')
  assert.deepEqual(events, ['const'])
})

test('validation reads once without creating a reactive subscription', async () => {
  const events: string[] = []
  const value = await readConnectionValue(
    {
      once: async () => {
        events.push('once')
        return 'one-shot'
      },
      const: async () => {
        events.push('const')
        return 'reactive'
      },
    },
    'one-shot',
  )

  assert.equal(value, 'one-shot')
  assert.deepEqual(events, ['once'])
})
