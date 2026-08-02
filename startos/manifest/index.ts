import { setupManifest } from '@start9labs/start-sdk'
import { short, long } from './i18n'
import { SUPPORTED_ARCHITECTURES, UPSTREAM_IMAGE_REFERENCE } from '../upstream'

export const manifest = setupManifest({
  id: 'nutshell',
  title: 'Nutshell Cashu Mint',
  license: 'MIT',
  packageRepo: 'https://github.com/mdubore/nutshell-startos',
  upstreamRepo: 'https://github.com/cashubtc/nutshell',
  marketingUrl: 'https://cashu.space',
  donationUrl: null,
  docsUrls: ['https://github.com/cashubtc/nutshell'],
  description: { short, long },
  volumes: ['main'],
  images: {
    main: {
      source: { dockerTag: UPSTREAM_IMAGE_REFERENCE },
      arch: [...SUPPORTED_ARCHITECTURES],
    },
  },
  dependencies: {
    'c-lightning': {
      description: 'Required for settling Lightning payments.',
      optional: false,
      s9pk: null,
    },
  },
})
