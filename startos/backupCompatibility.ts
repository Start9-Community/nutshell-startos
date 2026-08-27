import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

export const requiredBackupVolumeIds = ['main'] as const

export const wrapperStorePaths = {
  live: '/media/startos/volumes/startos/store.json',
  backup: '/media/startos/backup/volumes/startos/store.json',
} as const

export async function copyOptionalFile(source: string, destination: string) {
  let contents: Buffer
  try {
    contents = await readFile(source)
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false
    }
    throw error
  }

  await mkdir(dirname(destination), { recursive: true })
  await writeFile(destination, contents)
  return true
}
