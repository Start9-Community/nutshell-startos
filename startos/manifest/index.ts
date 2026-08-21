import { setupManifest } from '@start9labs/start-sdk'
import { depClnDescription, long, short } from './i18n'

export const manifest = setupManifest({
  id: 'nutshell',
  title: 'Nutshell Cashu Mint',
  license: 'MIT',
  packageRepo: 'https://github.com/Start9-Community/nutshell-startos',
  upstreamRepo: 'https://github.com/cashubtc/nutshell',
  marketingUrl: 'https://cashu.space',
  donationUrl: null,
  description: { short, long },
  volumes: ['main'],
  images: {
    main: {
      // Digest-pinned so a rebuild reproduces the image that was tested; see
      // UPDATING.md for how to obtain the multi-arch index digest.
      source: {
        dockerTag:
          'cashubtc/nutshell:0.20.3@sha256:f039b0e61f64d67c7212f5472eb5d021c3703cd9e72170aa924906ce6bd1f2ed',
      },
      arch: ['x86_64', 'aarch64'],
    },
  },
  dependencies: {
    'c-lightning': {
      description: depClnDescription,
      optional: false,
      metadata: {
        title: 'Core Lightning',
        icon: 'https://raw.githubusercontent.com/Start9Labs/cln-startos/refs/heads/master/icon.svg',
      },
    },
  },
})
