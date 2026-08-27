import {
  assertLightningBackend,
  type LightningBackend,
} from './lightningBackendState.mjs'
import { lndDependencyMount, lndRestRuntime } from './lndRestRuntime.mjs'
import type { MintLightningConnection } from './mintEnvironment'

export type ConnectionReadMode = 'one-shot' | 'reactive'

export function readConnectionValue<T>(
  value: { once: () => Promise<T>; const: () => Promise<T> },
  mode: ConnectionReadMode,
) {
  return mode === 'reactive' ? value.const() : value.once()
}

const mainMount = {
  volumeId: 'main',
  subpath: null,
  mountpoint: '/data',
  readonly: false,
} as const

export function mountPolicyForBackend(backend: unknown) {
  assertLightningBackend(backend)

  return backend === 'clnrest'
    ? ({ main: mainMount, dependencies: [] } as const)
    : ({ main: mainMount, dependencies: [lndDependencyMount] } as const)
}

export function backendDisplayName(backend: unknown) {
  assertLightningBackend(backend)
  return backend === 'clnrest' ? 'CLNRestWallet' : 'LndRestWallet'
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
  connection: MintLightningConnection,
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
}

export function endpointForConnection(connection: MintLightningConnection) {
  assertRawAddress(connection.address)
  const scheme = connection.backend === 'clnrest' ? 'http' : 'https'
  return `${scheme}://${connection.address}`
}

export async function resolveSelectedRuntime(
  backendState: unknown,
  resolve: (backend: LightningBackend) => Promise<MintLightningConnection>,
) {
  assertLightningBackend(backendState)
  const connection = await resolve(backendState)
  assertConnection(backendState, connection)

  return {
    connection,
    mounts: mountPolicyForBackend(backendState),
    requiresRootCa: backendState === 'lndrest',
  }
}

type RuntimeCredentialAccess = {
  writeFile: (path: string, contents: string) => Promise<unknown>
  requireNonemptyFile: (path: string) => Promise<unknown>
}

export async function prepareRuntimeCredentials(
  runtime: Awaited<ReturnType<typeof resolveSelectedRuntime>>,
  rootCa: string | null,
  access: RuntimeCredentialAccess,
) {
  if (runtime.connection.backend === 'clnrest') return

  if (!rootCa?.trim()) {
    throw new Error('StartOS root CA is unavailable')
  }

  await access.writeFile(lndRestRuntime.rootCaPath, rootCa)
  await access.requireNonemptyFile(lndRestRuntime.macaroon)
}
