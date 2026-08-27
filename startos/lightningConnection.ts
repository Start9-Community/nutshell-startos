import { T } from '@start9labs/start-sdk'
import { clnrestPort } from 'cln-startos/startos/utils'
import { controlHostId, restPort } from 'lnd-startos/startos/interfaces'
import type { manifest as lndManifest } from 'lnd-startos/startos/manifest'
import { i18n } from './i18n'
import {
  assertLightningBackend,
  type LightningBackend,
} from './lightningBackend'
import {
  buildProbeSpec,
  lndRestRuntime,
  probeExecTimeoutMs,
  probeRuntimeForBackend,
  selectStartOsRootCa,
} from './lightningProbe'
import {
  type ConnectionReadMode,
  endpointForConnection,
  readConnectionValue,
} from './lightningRuntime'
import type { MintLightningConnection } from './mintEnvironment'
import { sdk } from './sdk'
import { clnrestHostId, clnrestInterfaceId } from './utils'

export type LightningConnection = MintLightningConnection

async function resolveClnConnection(
  effects: T.Effects,
  readMode: ConnectionReadMode,
): Promise<LightningConnection> {
  const address = await readConnectionValue(
    sdk.host.getBridgeAddress(effects, {
      packageId: 'c-lightning',
      hostId: clnrestHostId,
      internalPort: clnrestPort,
      ssl: false,
    }),
    readMode,
  )
  if (!address) {
    throw new Error('Selected Core Lightning CLNRest address is unavailable')
  }

  const suffix = await readConnectionValue(
    sdk.host.get(
      effects,
      { packageId: 'c-lightning', hostId: clnrestHostId },
      (host) =>
        host?.bindings[clnrestPort]?.interfaces[clnrestInterfaceId]?.addressInfo
          .suffix ?? null,
    ),
    readMode,
  )
  const encodedRune = suffix?.match(/[?&]rune=([^&]*)/)?.[1]
  if (!encodedRune) {
    throw new Error('Selected Core Lightning CLNRest rune is unavailable')
  }

  let credential: string
  try {
    credential = decodeURIComponent(encodedRune)
  } catch {
    throw new Error('Selected Core Lightning CLNRest rune is invalid')
  }
  if (!credential) {
    throw new Error('Selected Core Lightning CLNRest rune is empty')
  }

  return {
    backend: 'clnrest',
    address,
    rune: credential,
  }
}

async function resolveLndConnection(
  effects: T.Effects,
  readMode: ConnectionReadMode,
): Promise<LightningConnection> {
  const address = await readConnectionValue(
    sdk.host.getBridgeAddress(effects, {
      packageId: 'lnd',
      hostId: controlHostId,
      internalPort: restPort,
    }),
    readMode,
  )
  if (!address) {
    throw new Error('Selected LND REST address is unavailable')
  }

  return {
    backend: 'lndrest',
    address,
  }
}

export function resolveLightningConnection(
  effects: T.Effects,
  backend: LightningBackend,
  readMode: ConnectionReadMode = 'one-shot',
) {
  assertLightningBackend(backend)
  switch (backend) {
    case 'clnrest':
      return resolveClnConnection(effects, readMode)
    case 'lndrest':
      return resolveLndConnection(effects, readMode)
  }
}

function probeMounts(backend: LightningBackend) {
  const runtime = probeRuntimeForBackend(backend)
  if (runtime.mounts.length === 0) return sdk.Mounts.of()

  return sdk.Mounts.of().mountDependency<typeof lndManifest>(runtime.mounts[0])
}

async function runLightningProbe(
  effects: T.Effects,
  connection: LightningConnection,
) {
  const backend = connection.backend
  const spec =
    connection.backend === 'clnrest'
      ? buildProbeSpec('clnrest', {
          endpoint: endpointForConnection(connection),
          credential: connection.rune,
        })
      : buildProbeSpec('lndrest', {
          endpoint: endpointForConnection(connection),
        })
  const rootCa =
    backend === 'lndrest'
      ? selectStartOsRootCa(await sdk.getSslCertificate(effects, []).once())
      : null

  const result = await sdk.SubContainer.withTemp(
    effects,
    { imageId: 'main' },
    probeMounts(backend),
    `validate-${backend}`,
    async (subcontainer) => {
      if (rootCa !== null) {
        await subcontainer.writeFile(lndRestRuntime.rootCaPath, rootCa)
      }
      return subcontainer.exec(
        spec.command,
        { env: spec.env, input: spec.input },
        probeExecTimeoutMs,
      )
    },
  )

  if (result.exitCode !== 0) {
    throw new Error(`Selected ${backend} probe failed`)
  }
}

export async function validateLightningBackend(
  effects: T.Effects,
  backend: LightningBackend,
) {
  try {
    const connection = await resolveLightningConnection(effects, backend)
    await runLightningProbe(effects, connection)
  } catch {
    if (backend === 'clnrest') {
      throw new Error(
        i18n(
          'Core Lightning validation failed. Make sure Core Lightning is installed and running with CLNRest enabled, then try again.',
        ),
      )
    }

    throw new Error(
      i18n(
        'LND validation failed. Make sure LND is installed, running, and its wallet is initialized and unlocked, then try again.',
      ),
    )
  }
}
