import { VersionInfo } from '@start9labs/start-sdk'

export const v0_19_2_2 = VersionInfo.of({
  version: '0.19.2:2',
  releaseNotes:
    'Fix config schema: make all top-level sections optional with defaults ' +
    'so action merge works when config file is empty or partially populated.',
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
