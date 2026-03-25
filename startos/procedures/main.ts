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
    MINT_BACKEND_BOLT11_SAT: config?.lightning.type ?? 'CLNRestWallet',
    LIGHTNING_FEE_PERCENT: String(config?.fees.fee_percent ?? 0),
    LIGHTNING_RESERVE_FEE_MIN: String(config?.fees.fee_reserve_min ?? 100),
    MINT_DATABASE_DIR: '/data',
    MINT_LISTEN_HOST: '0.0.0.0',
    MINT_LISTEN_PORT: String(MINT_PORT),
    MINT_PRIVATE_KEY: String(privateKey ?? '').trim(),
  }

  if ((config?.lightning.type ?? 'CLNRestWallet') === 'CLNRestWallet') {
    const clnInterface = await sdk.serviceInterface
      .get(effects, { id: 'clnrest', packageId: 'c-lightning' })
      .const()

    if (clnInterface?.addressInfo) {
      const bridgeAddresses = clnInterface.addressInfo.filter({ kind: 'bridge' })
      const hostname = bridgeAddresses.hostnames[0]
      if (hostname) {
        const port = hostname.port ?? clnInterface.addressInfo.internalPort
        env['MINT_CLNREST_URL'] = `https://${hostname.hostname}:${port}`

        const suffix = clnInterface.addressInfo.suffix ?? ''
        const runeMatch = suffix.match(/[?&]rune=([^&]*)/)
        env['MINT_CLNREST_RUNE'] = runeMatch ? decodeURIComponent(runeMatch[1]) : ''
      }
    }

    // Fixup: if MINT_CLNREST_URL still has a non-HTTP scheme (e.g. clnrest://
    // auto-injected by StartOS), replace it with https://
    if (env['MINT_CLNREST_URL'] && !/^https?:\/\//.test(env['MINT_CLNREST_URL'])) {
      env['MINT_CLNREST_URL'] = env['MINT_CLNREST_URL'].replace(/^[a-z]+:\/\//, 'https://')
    }
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
        }),
      'primary',
    ),
    exec: {
      command: [
        'sh', '-c',
        // Fix clnrest:// scheme auto-injected by StartOS — cashu needs https://
        'if echo "$MINT_CLNREST_URL" | grep -q "^clnrest://"; then ' +
          'export MINT_CLNREST_URL="https://${MINT_CLNREST_URL#clnrest://}"; ' +
        'fi; ' +
        'exec python3 -m cashu.mint',
      ] as [string, ...string[]],
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
