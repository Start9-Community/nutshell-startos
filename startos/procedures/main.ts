import { sdk } from '../sdk'
import { configYaml } from '../fileModels/config.yaml'
import { buildMintEnvironment, MINT_PORT } from '../config/mintEnvironment'

const clnrestHostId = 'clnrest'
const clnrestInterfaceId = 'clnrest'
const clnrestPort = 3010

export const main = sdk.setupMain(async ({ effects }) => {
  const config = await configYaml.read().const(effects)
  const privateKey = await sdk.volumes.main
    .readFile('mint_private_key', 'utf-8')
    .catch(() => '')

  const clnrestAddress = await sdk.host
    .getBridgeAddress(effects, {
      packageId: 'c-lightning',
      hostId: clnrestHostId,
      internalPort: clnrestPort,
      ssl: false,
    })
    .const()

  const clnrestSuffix = await sdk.host
    .get(
      effects,
      { packageId: 'c-lightning', hostId: clnrestHostId },
      (host) =>
        host?.bindings[clnrestPort]?.interfaces[clnrestInterfaceId]?.addressInfo
          .suffix ?? null,
    )
    .const()

  const runeMatch = clnrestSuffix?.match(/[?&]rune=([^&]*)/)
  const rune = runeMatch ? decodeURIComponent(runeMatch[1]) : ''
  const env = buildMintEnvironment(
    config,
    String(privateKey),
    clnrestAddress ? { address: clnrestAddress, rune } : null,
  )

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
      'primary',
    ),
    exec: {
      command: ['poetry', 'run', 'mint'],
      env,
    },
    ready: {
      display: 'Cashu Mint',
      fn: () =>
        sdk.healthCheck.checkPortListening(effects, MINT_PORT, {
          successMessage: 'The mint is responsive.',
          errorMessage: 'The mint is not ready.',
        }),
    },
    requires: [],
  })
})
