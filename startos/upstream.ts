export const UPSTREAM_VERSION = '0.20.3' as const
export const DOWNSTREAM_REVISION = 0 as const
export const UPSTREAM_IMAGE = 'cashubtc/nutshell' as const
export const UPSTREAM_IMAGE_DIGEST =
  'sha256:f039b0e61f64d67c7212f5472eb5d021c3703cd9e72170aa924906ce6bd1f2ed' as const
export const SUPPORTED_ARCHITECTURES = ['x86_64', 'aarch64'] as const

export const UPSTREAM_IMAGE_REFERENCE =
  `${UPSTREAM_IMAGE}:${UPSTREAM_VERSION}@${UPSTREAM_IMAGE_DIGEST}` as const
export const PACKAGE_VERSION =
  `${UPSTREAM_VERSION}:${DOWNSTREAM_REVISION}` as const
