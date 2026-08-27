import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertLightningBackend,
  dependencyForBackend,
  dependenciesForBackendState,
  legacyLightningBackend,
  legacyLightningBackendState,
  lockLightningBackend,
  migrateLegacyLightningBackend,
} from '../startos/lightningBackend.ts'

test('declares no dependency while the backend is unselected', () => {
  assert.deepEqual(dependenciesForBackendState(undefined), {})
})

test('fails closed for corrupt stored backend state', () => {
  assert.throws(() => dependenciesForBackendState('fake'), /invalid/i)
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
