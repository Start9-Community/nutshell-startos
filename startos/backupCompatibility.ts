import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

export const requiredBackupVolumeIds = ['main'] as const
export const wrapperStoreVolumeId = 'startos' as const
export const wrapperStoreSubpath = 'store.json' as const

export const wrapperStorePaths = {
  live: `/media/startos/volumes/${wrapperStoreVolumeId}/${wrapperStoreSubpath}`,
  backup: `/media/startos/backup/volumes/${wrapperStoreVolumeId}/${wrapperStoreSubpath}`,
} as const

export const wrapperStoreCopyOperations = {
  backup: {
    source: wrapperStorePaths.live,
    destination: wrapperStorePaths.backup,
  },
  restore: {
    source: wrapperStorePaths.backup,
    destination: wrapperStorePaths.live,
  },
} as const

export type OptionalFileCopyOperation = {
  readonly source: string
  readonly destination: string
}

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

export function optionalFileCopyHook(operation: OptionalFileCopyOperation) {
  return async () => {
    await copyOptionalFile(operation.source, operation.destination)
  }
}
