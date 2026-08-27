import { sdk } from './sdk'
import { backupVolumeIds } from './lightningBackend'

export const { createBackup, restoreInit } = sdk.setupBackups(
  async ({ effects }) => sdk.Backups.ofVolumes(...backupVolumeIds),
)
