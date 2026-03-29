import { VersionInfo } from '@start9labs/start-sdk'

export const v0_19_2_1 = VersionInfo.of({
  version: '0.19.2:1',
  releaseNotes:
    'Configurable network settings (bind address, port, protocol). ' +
    'Advanced controls: logging, input fees, peg limits, rate limiting. ' +
    'Dashboard actions for network config, advanced tuning, and mint status. ' +
    'Extended NUT-06 mint info (long description, MOTD).',
  migrations: {
    up: async ({ effects }) => {
      // All new Zod fields use .optional().default(), so reading the old
      // config through the new schema auto-fills defaults. No explicit
      // data migration needed — volumes persist automatically.
    },
    down: async ({ effects }) => {
      // The v0.19.2:0 schema ignores unknown keys via Zod parsing.
      // Extra YAML keys from v0.19.2:1 are harmless on downgrade.
    },
  },
})
