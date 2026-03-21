import { sdk } from '../sdk'

export const setDependencies = sdk.setupDependencies(async ({ effects }) => {
  return {
    'c-lightning': {
      kind: 'running' as const,
      versionRange: '>=23.5.2',
      healthChecks: [],
    },
  }
})
