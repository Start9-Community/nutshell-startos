import assert from 'node:assert/strict'
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  copyOptionalFile,
  optionalFileCopyHook,
  requiredBackupVolumeIds,
  wrapperStoreSubpath,
  wrapperStoreVolumeId,
  wrapperStoreCopyOperations,
  wrapperStorePaths,
} from '../startos/backupCompatibility.ts'

async function temporaryLayout(t: test.TestContext) {
  const root = await mkdtemp(join(tmpdir(), 'nutshell-backup-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  return {
    live: join(root, 'media/startos/volumes/startos/store.json'),
    backup: join(root, 'media/startos/backup/volumes/startos/store.json'),
  }
}

test('declares only main as mandatory and keeps wrapper state optional', () => {
  assert.deepEqual(requiredBackupVolumeIds, ['main'])
  assert.equal(wrapperStoreVolumeId, 'startos')
  assert.equal(wrapperStoreSubpath, 'store.json')
  assert.deepEqual(wrapperStorePaths, {
    live: '/media/startos/volumes/startos/store.json',
    backup: '/media/startos/backup/volumes/startos/store.json',
  })
  assert.deepEqual(wrapperStoreCopyOperations, {
    backup: {
      source: wrapperStorePaths.live,
      destination: wrapperStorePaths.backup,
    },
    restore: {
      source: wrapperStorePaths.backup,
      destination: wrapperStorePaths.live,
    },
  })
})

test('restores a legacy one-volume layout without inventing wrapper state', async (t) => {
  const paths = await temporaryLayout(t)
  const restore = optionalFileCopyHook({
    source: paths.backup,
    destination: paths.live,
  })

  await restore()
  await assert.rejects(access(paths.live), { code: 'ENOENT' })
})

test('copies wrapper state in backup and restore directions', async (t) => {
  const paths = await temporaryLayout(t)
  const backup = optionalFileCopyHook({
    source: paths.live,
    destination: paths.backup,
  })
  const restore = optionalFileCopyHook({
    source: paths.backup,
    destination: paths.live,
  })
  await mkdir(join(paths.live, '..'), { recursive: true })
  await writeFile(paths.live, '{"lightningBackend":"lndrest"}\n')

  await backup()
  assert.equal(
    await readFile(paths.backup, 'utf8'),
    '{"lightningBackend":"lndrest"}\n',
  )

  await writeFile(paths.backup, '{"lightningBackend":"clnrest"}\n')
  await restore()
  assert.equal(
    await readFile(paths.live, 'utf8'),
    '{"lightningBackend":"clnrest"}\n',
  )
})

test('does not swallow unexpected copy errors', async (t) => {
  const paths = await temporaryLayout(t)
  await mkdir(join(paths.live, '..'), { recursive: true })
  await writeFile(paths.live, '{}\n')
  await mkdir(paths.backup, { recursive: true })

  await assert.rejects(copyOptionalFile(paths.live, paths.backup), {
    code: 'EISDIR',
  })
})
