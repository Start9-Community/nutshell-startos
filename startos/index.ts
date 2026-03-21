export { createBackup } from './procedures/backups'
export { main } from './procedures/main'
export { init, uninit } from './procedures/init'
export { actions } from './procedures/actions'

import { buildManifest } from '@start9labs/start-sdk'
import { manifest as sdkManifest } from './manifest'
import { versionGraph } from './install/versionGraph'

export const manifest = buildManifest(versionGraph, sdkManifest)
