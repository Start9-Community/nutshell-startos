import { VersionInfo } from '@start9labs/start-sdk'

export const v0_19_2_4 = VersionInfo.of({
  version: '0.19.2:4',
  releaseNotes:
    'Add NUT-06 mint info fields: operator contacts (email, nostr, twitter), ' +
    'icon URL, and terms of service URL. New "Mint Info" dashboard action ' +
    'for configuring mint name, description, MOTD, and contact metadata. ' +
    'Use HTTP for the internal CLNRest bridge to match the c-lightning interface.',
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
})
