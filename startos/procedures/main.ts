import { sdk } from '../sdk'
import { configYaml } from '../fileModels/config.yaml'

const MINT_PORT = 3338

export const main = sdk.setupMain(async ({ effects }) => {
  const config = await configYaml.read().const(effects)

  const privateKey = await sdk.volumes.main
    .readFile('mint_private_key', 'utf-8')
    .catch(() => '')

  const env: Record<string, string> = {
    MINT_INFO_NAME: config?.mint_info.name ?? 'My Sovereign Mint',
    MINT_INFO_DESCRIPTION: config?.mint_info.description ?? 'A private Cashu ecash mint.',
    MINT_BACKEND_BOLT11_SAT: config?.lightning.type ?? 'CLNRpc',
    MINT_FEE_PERCENT: String(config?.fees.fee_percent ?? 0),
    MINT_FEE_RESERVE_MIN: String(config?.fees.fee_reserve_min ?? 100),
    MINT_DATABASE_DIR: '/data',
    MINT_LISTEN_HOST: '0.0.0.0',
    MINT_LISTEN_PORT: String(MINT_PORT),
    MINT_PRIVATE_KEY: String(privateKey ?? '').trim(),
  }

  if ((config?.lightning.type ?? 'CLNRpc') === 'CLNRpc') {
    env['MINT_LIGHTNING_CLIENT_RPC'] = '/home/bitcoin/.lightning/bitcoin/lightning-rpc'
  }

  return sdk.Daemons.of(effects).addDaemon('primary', {
    subcontainer: await sdk.SubContainer.of(
      effects,
      { imageId: 'main' },
      sdk.Mounts.of()
        .mountVolume({
          volumeId: 'main',
          subpath: null,
          mountpoint: '/data',
          readonly: false,
        })
        .mountVolume({
          volumeId: 'cln-data',
          subpath: null,
          mountpoint: '/home/bitcoin/.lightning',
          readonly: true,
        }),
      'primary',
    ),
    exec: {
      command: ['python3', '-m', 'cashu.mint'] as [string, ...string[]],
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
