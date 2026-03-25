import { setupManifest } from '@start9labs/start-sdk'
import { short, long } from './i18n'

export const manifest = setupManifest({
  id: 'nutshell',
  title: 'Nutshell Cashu Mint',
  license: 'MIT',
  packageRepo: 'https://github.com/cashubtc/nutshell',
  upstreamRepo: 'https://github.com/cashubtc/nutshell',
  marketingUrl: 'https://cashu.space',
  donationUrl: null,
  docsUrls: ['https://github.com/cashubtc/nutshell'],
  description: { short, long },
  volumes: ['main'],
  images: {
    main: {
      source: {
        dockerBuild: {
          dockerfile: './Dockerfile',
          workdir: '.',
        },
      },
    },
  },
  alerts: {
    install: null,
    update: null,
    uninstall: null,
    restore: null,
    start: null,
    stop: null,
  },
  dependencies: {
    'c-lightning': {
      description: 'Required for settling Lightning payments.',
      optional: false,
      s9pk: null,
    },
  },
})
