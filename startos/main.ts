import { clnrestPort } from 'cln-startos/startos/utils'
import { configYaml } from './fileModels/config.yaml'
import { i18n } from './i18n'
import { buildMintEnvironment, MINT_PORT } from './mintEnvironment'
import { sdk } from './sdk'
import { clnrestHostId, clnrestInterfaceId, mintSeedFile } from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting Nutshell'))

  const config = await configYaml.read().const(effects)
  const seed = await sdk.volumes.main
    .readFile(mintSeedFile, 'utf-8')
    .catch(() => '')

  // The bridge address changes only when cln is installed, uninstalled, or
  // rebound, so `.const()` restarts the mint exactly then.
  const clnrestAddress = await sdk.host
    .getBridgeAddress(effects, {
      packageId: 'c-lightning',
      hostId: clnrestHostId,
      internalPort: clnrestPort,
      ssl: false,
    })
    .const()
  if (!clnrestAddress) {
    throw new Error(
      i18n(
        'Core Lightning is not reachable on the internal network. Make sure Core Lightning is installed, running, and has CLNRest enabled in its config.',
      ),
    )
  }

  // cln publishes the rune as the clnrest interface's `?rune=` query, which is
  // the only place a dependent can read it without mounting cln's volume.
  const clnrestSuffix = await sdk.host
    .get(
      effects,
      { packageId: 'c-lightning', hostId: clnrestHostId },
      (host) =>
        host?.bindings[clnrestPort]?.interfaces[clnrestInterfaceId]?.addressInfo
          .suffix ?? null,
      // cln drops the interface while Revoke Runes mints a replacement, so an
      // absent suffix is a gap, not a removal. A CLNRest that is really gone
      // takes its binding with it, which the address read above already throws
      // on.
      (prev, next) => next === null || prev === next,
    )
    .const()
  const rune = clnrestSuffix?.match(/[?&]rune=([^&]*)/)?.[1]
  if (!rune) {
    throw new Error(
      i18n(
        "Core Lightning's CLNRest rune could not be read. Enable CLNRest in Core Lightning's config, restart it, and start Nutshell again.",
      ),
    )
  }

  return sdk.Daemons.of(effects).addDaemon('primary', {
    subcontainer: sdk.SubContainer.of(
      effects,
      { imageId: 'main' },
      sdk.Mounts.of().mountVolume({
        volumeId: 'main',
        subpath: null,
        mountpoint: '/data',
        readonly: false,
      }),
      'nutshell-sub',
    ),
    exec: {
      command: ['poetry', 'run', 'mint'],
      env: buildMintEnvironment(config, String(seed), {
        address: clnrestAddress,
        rune: decodeURIComponent(rune),
      }),
    },
    ready: {
      display: i18n('Cashu Mint'),
      fn: () =>
        sdk.healthCheck.checkPortListening(effects, MINT_PORT, {
          successMessage: i18n('The mint is responsive'),
          errorMessage: i18n('The mint is not ready'),
        }),
    },
    requires: [],
  })
})
