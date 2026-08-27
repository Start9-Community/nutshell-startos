import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertLightningBackend,
  legacyLightningBackend,
  legacyLightningBackendState,
  lockLightningBackend,
  migrateLegacyLightningBackend,
} from '../startos/lightningBackend.ts'

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
