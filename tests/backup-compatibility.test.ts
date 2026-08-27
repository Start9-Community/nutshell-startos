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
  requiredBackupVolumeIds,
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
  assert.deepEqual(wrapperStorePaths, {
    live: '/media/startos/volumes/startos/store.json',
    backup: '/media/startos/backup/volumes/startos/store.json',
  })
})

test('restores a legacy one-volume layout without inventing wrapper state', async (t) => {
  const paths = await temporaryLayout(t)

  assert.equal(await copyOptionalFile(paths.backup, paths.live), false)
  await assert.rejects(access(paths.live), { code: 'ENOENT' })
})

test('copies wrapper state in backup and restore directions', async (t) => {
  const paths = await temporaryLayout(t)
  await mkdir(join(paths.live, '..'), { recursive: true })
  await writeFile(paths.live, '{"lightningBackend":"lndrest"}\n')

  assert.equal(await copyOptionalFile(paths.live, paths.backup), true)
  assert.equal(
    await readFile(paths.backup, 'utf8'),
    '{"lightningBackend":"lndrest"}\n',
  )

  await writeFile(paths.backup, '{"lightningBackend":"clnrest"}\n')
  assert.equal(await copyOptionalFile(paths.backup, paths.live), true)
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
