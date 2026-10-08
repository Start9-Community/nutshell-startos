import { depClnDescription } from './manifest/i18n'
import { sdk } from './sdk'

export const dependencies = sdk.Dependencies.of().addDependency(
  sdk.Dependency.required('c-lightning', {
    description: depClnDescription,
    metadata: {
      title: 'Core Lightning',
      icon: 'https://raw.githubusercontent.com/Start9Labs/cln-startos/refs/heads/master/icon.svg',
    },
    versionRange: '>=26.6.6:1',
    kind: 'running',
    healthChecks: ['lightningd'],
  }),
)
