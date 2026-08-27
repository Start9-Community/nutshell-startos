import { T } from '@start9labs/start-sdk'
import { clnrestPort } from 'cln-startos/startos/utils'
import { controlHostId, restPort } from 'lnd-startos/startos/interfaces'
import type { manifest as lndManifest } from 'lnd-startos/startos/manifest'
import { i18n } from './i18n'
import { LightningBackend } from './lightningBackend'
import {
  buildProbeSpec,
  probeExecTimeoutMs,
  probeRuntimeForBackend,
} from './lightningProbe'
import { sdk } from './sdk'
import { clnrestHostId, clnrestInterfaceId } from './utils'

export type LightningConnection =
  | {
      backend: 'clnrest'
      endpoint: string
      credential: string
    }
  | {
      backend: 'lndrest'
      endpoint: string
    }

async function resolveClnConnection(
  effects: T.Effects,
): Promise<LightningConnection> {
  const address = await sdk.host
    .getBridgeAddress(effects, {
      packageId: 'c-lightning',
      hostId: clnrestHostId,
      internalPort: clnrestPort,
      ssl: false,
    })
    .once()
  if (!address) {
    throw new Error('Selected Core Lightning CLNRest address is unavailable')
  }

  const suffix = await sdk.host
    .get(
      effects,
      { packageId: 'c-lightning', hostId: clnrestHostId },
      (host) =>
        host?.bindings[clnrestPort]?.interfaces[clnrestInterfaceId]?.addressInfo
          .suffix ?? null,
    )
    .once()
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
    endpoint: `http://${address}`,
    credential,
  }
}

async function resolveLndConnection(
  effects: T.Effects,
): Promise<LightningConnection> {
  const address = await sdk.host
    .getBridgeAddress(effects, {
      packageId: 'lnd',
      hostId: controlHostId,
      internalPort: restPort,
    })
    .once()
  if (!address) {
    throw new Error('Selected LND REST address is unavailable')
  }

  return {
    backend: 'lndrest',
    endpoint: `https://${address}`,
  }
}

export function resolveLightningConnection(
  effects: T.Effects,
  backend: LightningBackend,
) {
  return backend === 'clnrest'
    ? resolveClnConnection(effects)
    : resolveLndConnection(effects)
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
      ? buildProbeSpec('clnrest', connection)
      : buildProbeSpec('lndrest', connection)

  const result = await sdk.SubContainer.withTemp(
    effects,
    { imageId: 'main' },
    probeMounts(backend),
    `validate-${backend}`,
    (subcontainer) =>
      subcontainer.exec(spec.command, { env: spec.env }, probeExecTimeoutMs),
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
