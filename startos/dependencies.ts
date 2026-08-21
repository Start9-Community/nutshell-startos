import { sdk } from './sdk'

export const setDependencies = sdk.setupDependencies(async ({ effects }) => ({
  'c-lightning': {
    kind: 'running' as const,
    versionRange: '>=26.6.6:1',
    healthChecks: ['lightningd'],
  },
}))
