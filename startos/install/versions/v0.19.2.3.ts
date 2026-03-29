import { VersionInfo } from '@start9labs/start-sdk'

export const v0_19_2_3 = VersionInfo.of({
  version: '0.19.2:3',
  releaseNotes:
    'Fix interface binding: remove preferredExternalPort to let StartOS ' +
    'auto-assign the external port as before.',
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
