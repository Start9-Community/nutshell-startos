import { Buffer } from 'node:buffer'
import { dirname } from 'node:path'
import {
  assertLightningBackend,
  type LightningBackend,
} from './lightningBackendState.mjs'
import { lndRestRuntime } from './lndRestRuntime.mjs'
import type { MintLightningConnection } from './mintEnvironment'

export type ResolvedLightningConnection =
  | {
      backend: 'clnrest'
      address: string
      rune: string
    }
  | {
      backend: 'lndrest'
      address: string
      macaroon: Uint8Array
    }

export type ConnectionReadMode = 'one-shot' | 'reactive'

export function readConnectionValue<T>(
  value: { once: () => Promise<T>; const: () => Promise<T> },
  mode: ConnectionReadMode,
) {
  return mode === 'reactive' ? value.const() : value.once()
}

export function suppressTemporaryClnRuneGap(
  previous: string | null,
  next: string | null,
) {
  return next === null || previous === next
}

const mainMount = {
  volumeId: 'main',
  subpath: null,
  mountpoint: '/data',
  readonly: false,
} as const

function unsupportedLightningBackend(backend: never): never {
  throw new Error(`Stored Lightning backend is invalid: ${String(backend)}`)
}

export function mountPolicyForBackend(backend: unknown) {
  assertLightningBackend(backend)

  switch (backend) {
    case 'clnrest':
      return { main: mainMount, dependencies: [] } as const
    case 'lndrest':
      return { main: mainMount, dependencies: [] } as const
    default:
      return unsupportedLightningBackend(backend)
  }
}

export function backendDisplayName(backend: unknown) {
  assertLightningBackend(backend)

  switch (backend) {
    case 'clnrest':
      return 'CLNRestWallet'
    case 'lndrest':
      return 'LndRestWallet'
    default:
      return unsupportedLightningBackend(backend)
  }
}

function assertRawAddress(address: string) {
  if (!address.trim()) {
    throw new Error('Selected Lightning address is empty')
  }
  if (address.includes('://')) {
    throw new Error('Selected Lightning address must not include a scheme')
  }
}

function assertConnection(
  backend: LightningBackend,
  connection: ResolvedLightningConnection,
) {
  if (connection.backend !== backend) {
    throw new Error(
      'Resolved Lightning backend does not match stored selection',
    )
  }

  assertRawAddress(connection.address)
  if (connection.backend === 'clnrest' && !connection.rune) {
    throw new Error('Selected Core Lightning rune is empty')
  }
  if (
    connection.backend === 'lndrest' &&
    connection.macaroon.byteLength === 0
  ) {
    throw new Error('Selected LND REST macaroon is empty')
  }
}

export function parseClnRestRuneSuffix(suffix: string | null | undefined) {
  const encodedRune = suffix?.match(/[?&]rune=([^&]*)/)?.[1]
  if (!encodedRune) {
    throw new Error('Selected Core Lightning CLNRest rune is unavailable')
  }

  let rune: string
  try {
    rune = decodeURIComponent(encodedRune)
  } catch {
    throw new Error('Selected Core Lightning CLNRest rune is invalid')
  }
  if (!rune) {
    throw new Error('Selected Core Lightning CLNRest rune is empty')
  }
  return rune
}

export function parseLndRestMacaroonSuffix(suffix: string | null | undefined) {
  if (!suffix) {
    throw new Error('Selected LND REST macaroon is unavailable')
  }

  const query = suffix.startsWith('?') ? suffix.slice(1) : suffix
  const encodedValues = new URLSearchParams(query).getAll('macaroon')
  if (encodedValues.length !== 1 || !encodedValues[0]) {
    throw new Error('Selected LND REST macaroon is unavailable')
  }

  const encoded = encodedValues[0]
  if (!/^[A-Za-z0-9_-]+$/.test(encoded) || encoded.length % 4 === 1) {
    throw new Error('Selected LND REST macaroon is invalid')
  }

  const macaroon = Buffer.from(encoded, 'base64url')
  if (macaroon.length === 0 || macaroon.toString('base64url') !== encoded) {
    throw new Error('Selected LND REST macaroon is invalid')
  }
  return macaroon
}

export function endpointForConnection(connection: MintLightningConnection) {
  assertRawAddress(connection.address)
  const backend: unknown = connection.backend
  assertLightningBackend(backend)

  switch (backend) {
    case 'clnrest':
      return `http://${connection.address}`
    case 'lndrest':
      return `https://${connection.address}`
    default:
      return unsupportedLightningBackend(backend)
  }
}

export async function resolveSelectedRuntime(
  backendState: unknown,
  resolve: (backend: LightningBackend) => Promise<ResolvedLightningConnection>,
) {
  assertLightningBackend(backendState)
  const connection = await resolve(backendState)
  return selectedRuntimeForConnection(backendState, connection)
}

export function selectedRuntimeForConnection(
  backendState: unknown,
  connection: ResolvedLightningConnection,
) {
  assertLightningBackend(backendState)
  assertConnection(backendState, connection)

  switch (connection.backend) {
    case 'clnrest':
      return {
        connection,
        lndMacaroon: null,
        mounts: mountPolicyForBackend(backendState),
        requiresRootCa: false,
      } as const
    case 'lndrest':
      return {
        connection: {
          backend: connection.backend,
          address: connection.address,
        } satisfies MintLightningConnection,
        lndMacaroon: Buffer.from(connection.macaroon),
        mounts: mountPolicyForBackend(backendState),
        requiresRootCa: true,
      } as const
    default:
      return unsupportedLightningBackend(connection)
  }
}

type RuntimeCredentialAccess = {
  ensureDirectory: (path: string) => Promise<unknown>
  writeFile: (path: string, contents: string | Uint8Array) => Promise<unknown>
  requireNonemptyFile: (path: string) => Promise<unknown>
}

export async function prepareRuntimeCredentials(
  runtime: Awaited<ReturnType<typeof resolveSelectedRuntime>>,
  rootCa: string | null,
  access: RuntimeCredentialAccess,
) {
  const backend: unknown = runtime.connection.backend
  assertLightningBackend(backend)
  switch (backend) {
    case 'clnrest':
      return
    case 'lndrest':
      break
    default:
      return unsupportedLightningBackend(backend)
  }

  if (!rootCa?.trim()) {
    throw new Error('StartOS root CA is unavailable')
  }
  if (!runtime.lndMacaroon?.byteLength) {
    throw new Error('Selected LND REST macaroon is empty')
  }

  await access.ensureDirectory(dirname(lndRestRuntime.macaroon))
  await access.writeFile(lndRestRuntime.rootCaPath, rootCa)
  await access.writeFile(lndRestRuntime.macaroon, runtime.lndMacaroon)
  await access.requireNonemptyFile(lndRestRuntime.macaroon)
}

export async function prepareSubcontainerOrDestroy<T>(
  prepare: () => Promise<T>,
  destroy: () => Promise<unknown>,
) {
  try {
    return await prepare()
  } catch (error) {
    await destroy()
    throw error
  }
}
