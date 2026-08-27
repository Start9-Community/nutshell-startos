import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertLightningBackend,
  backupVolumeIds,
  legacyLightningBackend,
  lockLightningBackend,
} from '../startos/lightningBackend.ts'

test('migrates every legacy installation to locked CLN', () => {
  assert.equal(legacyLightningBackend(), 'clnrest')
})

test('backs up mint data and wrapper selection state', () => {
  assert.deepEqual(backupVolumeIds, ['main', 'startos'])
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
