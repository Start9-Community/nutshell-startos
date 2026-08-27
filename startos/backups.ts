import {
  copyOptionalFile,
  requiredBackupVolumeIds,
  wrapperStorePaths,
} from './backupCompatibility'
import { sdk } from './sdk'

export const { createBackup, restoreInit } = sdk.setupBackups(async () =>
  sdk.Backups.ofVolumes(...requiredBackupVolumeIds)
    .setPostBackup(async () => {
      await copyOptionalFile(wrapperStorePaths.live, wrapperStorePaths.backup)
    })
    .setPostRestore(async () => {
      await copyOptionalFile(wrapperStorePaths.backup, wrapperStorePaths.live)
    }),
)
