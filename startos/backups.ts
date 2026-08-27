import {
  optionalFileCopyHook,
  requiredBackupVolumeIds,
  wrapperStoreCopyOperations,
} from './backupCompatibility'
import { sdk } from './sdk'

export const { createBackup, restoreInit } = sdk.setupBackups(async () =>
  sdk.Backups.ofVolumes(...requiredBackupVolumeIds)
    .setPostBackup(optionalFileCopyHook(wrapperStoreCopyOperations.backup))
    .setPostRestore(optionalFileCopyHook(wrapperStoreCopyOperations.restore)),
)
