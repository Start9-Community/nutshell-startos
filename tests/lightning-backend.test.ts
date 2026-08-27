import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  assertLightningBackend,
  createValidateThenLock,
  dependencyForBackend,
  dependenciesForBackendState,
  legacyLightningBackend,
  legacyLightningBackendState,
  lockLightningBackend,
  migrateLegacyLightningBackend,
  validateThenLock,
} from '../startos/lightningBackend.ts'

test('declares no dependency while the backend is unselected', () => {
  assert.deepEqual(dependenciesForBackendState(undefined), {})
})

test('fails closed when stored backend state is null', () => {
  assert.throws(
    () => dependenciesForBackendState(null),
    /not selected|invalid/i,
  )
})

test('fails closed for corrupt stored backend state', () => {
  assert.throws(() => dependenciesForBackendState('fake'), /invalid/i)
})

test('reactively wires stored backend state into dependency selection', () => {
  const source = readFileSync(
    new URL('../startos/dependencies.ts', import.meta.url),
    'utf8',
  )

  assert.match(
    source,
    /storeJson\s*\.read\(\s*\(store\)\s*=>\s*store\.lightningBackend\s*\)\s*\.const\(effects\)/,
  )
  assert.match(source, /return dependenciesForBackendState\(backend\)/)
})

test('declares only CLN for a locked CLN mint', () => {
  assert.deepEqual(dependencyForBackend('clnrest'), {
    'c-lightning': {
      kind: 'running',
      versionRange: '>=26.6.6:1',
      healthChecks: ['lightningd'],
    },
  })
})

test('declares only LND for a locked LND mint', () => {
  assert.deepEqual(dependencyForBackend('lndrest'), {
    lnd: {
      kind: 'running',
      versionRange: '>=0.21.2-beta:3',
      healthChecks: ['lnd'],
    },
  })
})

test('refuses to declare dependencies for invalid backend state', () => {
  assert.throws(() => dependencyForBackend('fake'), /invalid/i)
})

test('migrates every legacy installation to locked CLN', () => {
  assert.equal(legacyLightningBackend(), 'clnrest')
})

test('builds the locked CLN state written by legacy migrations', () => {
  assert.deepEqual(legacyLightningBackendState(), {
    lightningBackend: 'clnrest',
  })
})

test('writes locked CLN through the legacy migration callback', async () => {
  let writtenState: unknown

  await migrateLegacyLightningBackend(async (state) => {
    writtenState = state
  })

  assert.deepEqual(writtenState, { lightningBackend: 'clnrest' })
})

test('locks an unselected mint to CLN', () => {
  assert.deepEqual(lockLightningBackend(undefined, 'clnrest'), {
    lightningBackend: 'clnrest',
  })
})

test('locks an unselected mint to LND', () => {
  assert.deepEqual(lockLightningBackend(undefined, 'lndrest'), {
    lightningBackend: 'lndrest',
  })
})

test('refuses every second selection, including the same backend', () => {
  assert.throws(
    () => lockLightningBackend('clnrest', 'clnrest'),
    /already locked/i,
  )
  assert.throws(
    () => lockLightningBackend('clnrest', 'lndrest'),
    /already locked/i,
  )
})

test('accepts CLN as valid runtime state', () => {
  assert.doesNotThrow(() => assertLightningBackend('clnrest'))
})

test('accepts LND as valid runtime state', () => {
  assert.doesNotThrow(() => assertLightningBackend('lndrest'))
})

test('rejects missing and unknown runtime state', () => {
  assert.throws(() => assertLightningBackend(undefined), /not selected/i)
  assert.throws(() => assertLightningBackend('fake'), /invalid/i)
})

test('validates before persisting the first backend selection', async () => {
  const events: string[] = []

  await validateThenLock(
    undefined,
    'lndrest',
    async (backend) => {
      events.push(`validate:${backend}`)
    },
    async (state) => {
      events.push(`persist:${state.lightningBackend}`)
    },
    async () => {
      events.push('re-read')
      return undefined
    },
  )

  assert.deepEqual(events, ['validate:lndrest', 're-read', 'persist:lndrest'])
})

test('does not persist when backend validation fails', async () => {
  let persistCalls = 0

  await assert.rejects(
    validateThenLock(
      undefined,
      'lndrest',
      async () => {
        throw new Error('probe failed')
      },
      async () => {
        persistCalls += 1
      },
      async () => undefined,
    ),
    /probe failed/,
  )

  assert.equal(persistCalls, 0)
})

test('refuses a second selection before validation', async () => {
  let validateCalls = 0
  let persistCalls = 0

  await assert.rejects(
    validateThenLock(
      'clnrest',
      'lndrest',
      async () => {
        validateCalls += 1
      },
      async () => {
        persistCalls += 1
      },
      async () => undefined,
    ),
    /already locked/i,
  )

  assert.equal(validateCalls, 0)
  assert.equal(persistCalls, 0)
})

test('fails closed when the wrapper state file is unavailable', async () => {
  let validateCalls = 0
  let persistCalls = 0

  await assert.rejects(
    validateThenLock(
      null,
      'clnrest',
      async () => {
        validateCalls += 1
      },
      async () => {
        persistCalls += 1
      },
      async () => undefined,
    ),
    /invalid/i,
  )

  assert.equal(validateCalls, 0)
  assert.equal(persistCalls, 0)
})

test('does not overwrite a selection committed during validation', async () => {
  let persistCalls = 0

  await assert.rejects(
    validateThenLock(
      undefined,
      'lndrest',
      async () => {},
      async () => {
        persistCalls += 1
      },
      async () => 'clnrest',
    ),
    /already locked/i,
  )

  assert.equal(persistCalls, 0)
})

test('serializes the final re-read and commit for concurrent selections', async () => {
  const select = createValidateThenLock()
  let stored: 'clnrest' | 'lndrest' | undefined
  let validations = 0
  let releaseValidations!: () => void
  const validationsReady = new Promise<void>((resolve) => {
    releaseValidations = resolve
  })
  let persistCalls = 0
  let releaseFirstPersist!: () => void
  const holdFirstPersist = new Promise<void>((resolve) => {
    releaseFirstPersist = resolve
  })
  let signalFirstPersist!: () => void
  const firstPersistStarted = new Promise<void>((resolve) => {
    signalFirstPersist = resolve
  })

  const validate = async () => {
    validations += 1
    if (validations === 2) releaseValidations()
    await validationsReady
  }
  const persist = async (state: {
    lightningBackend: 'clnrest' | 'lndrest'
  }) => {
    persistCalls += 1
    if (persistCalls === 1) {
      signalFirstPersist()
      await holdFirstPersist
    }
    stored = state.lightningBackend
  }
  const readCurrent = async () => stored

  const selections = [
    select(undefined, 'clnrest', validate, persist, readCurrent),
    select(undefined, 'lndrest', validate, persist, readCurrent),
  ]
  await firstPersistStarted
  releaseFirstPersist()
  const results = await Promise.allSettled(selections)

  assert.equal(
    results.filter((result) => result.status === 'fulfilled').length,
    1,
  )
  const rejected = results.find((result) => result.status === 'rejected')
  assert.ok(rejected && rejected.status === 'rejected')
  assert.match(String(rejected.reason), /already locked/i)
  assert.equal(persistCalls, 1)
  assert.ok(stored === 'clnrest' || stored === 'lndrest')
})

test('releases the final commit mutex when persistence fails', async () => {
  const select = createValidateThenLock()
  let stored: 'clnrest' | 'lndrest' | undefined

  await assert.rejects(
    select(
      undefined,
      'clnrest',
      async () => {},
      async () => {
        throw new Error('write failed')
      },
      async () => stored,
    ),
    /write failed/,
  )

  await select(
    undefined,
    'lndrest',
    async () => {},
    async (state) => {
      stored = state.lightningBackend
    },
    async () => stored,
  )

  assert.equal(stored, 'lndrest')
})
