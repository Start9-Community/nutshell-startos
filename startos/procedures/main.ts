import { sdk } from '../sdk'
import { configYaml } from '../fileModels/config.yaml'

export const main = sdk.setupMain(async ({ effects }) => {
  const config = await configYaml.read().const(effects)

  const privateKey = await sdk.volumes.main
    .readFile('mint_private_key', 'utf-8')
    .catch(() => '')

  const port = config?.network?.listen_port ?? 3338

  const env: Record<string, string> = {
    // Mint info
    MINT_INFO_NAME: config?.mint_info.name ?? 'My Sovereign Mint',
    MINT_INFO_DESCRIPTION: config?.mint_info.description ?? 'A private Cashu ecash mint.',
    MINT_INFO_DESCRIPTION_LONG: config?.mint_info.description_long ?? '',
    MINT_INFO_MOTD: config?.mint_info.motd ?? '',

    // Mint info (optional metadata)
    ...(config?.mint_info.icon_url ? { MINT_INFO_ICON_URL: config.mint_info.icon_url } : {}),
    ...(config?.mint_info.tos_url ? { MINT_INFO_TOS_URL: config.mint_info.tos_url } : {}),

    // Lightning backend
    MINT_BACKEND_BOLT11_SAT: config?.lightning.type ?? 'CLNRestWallet',

    // Fees
    LIGHTNING_FEE_PERCENT: String(config?.fees.fee_percent ?? 0),
    LIGHTNING_RESERVE_FEE_MIN: String(config?.fees.fee_reserve_min ?? 100),

    // Database
    MINT_DATABASE_DIR: '/data',

    // Network
    MINT_LISTEN_HOST: config?.network?.listen_host ?? '0.0.0.0',
    MINT_LISTEN_PORT: String(port),

    // Key
    MINT_PRIVATE_KEY: String(privateKey ?? '').trim(),

    // Advanced: logging
    LOG_LEVEL: config?.advanced?.log_level ?? 'INFO',

    // Advanced: fees
    MINT_INPUT_FEE_PPK: String(config?.advanced?.input_fee_ppk ?? 0),

    // Advanced: operation controls
    MINT_PEG_OUT_ONLY: config?.advanced?.peg_out_only ? 'true' : 'false',
    MINT_RATE_LIMIT: config?.advanced?.rate_limit ? 'true' : 'false',
    MINT_GLOBAL_RATE_LIMIT_PER_MINUTE: String(config?.advanced?.rate_limit_per_minute ?? 60),
  }

  // Build NUT-06 contact list from individual contact fields
  const contactList: string[][] = []
  if (config?.mint_info.contact_email) contactList.push(['email', config.mint_info.contact_email])
  if (config?.mint_info.contact_nostr) contactList.push(['nostr', config.mint_info.contact_nostr])
  if (config?.mint_info.contact_twitter) contactList.push(['twitter', config.mint_info.contact_twitter])
  if (contactList.length > 0) env['MINT_INFO_CONTACT'] = JSON.stringify(contactList)

  // Only set peg/balance limits when non-zero (unset = unlimited in Cashu)
  const maxPegIn = config?.advanced?.max_peg_in ?? 0
  if (maxPegIn > 0) env['MINT_MAX_PEG_IN'] = String(maxPegIn)

  const maxPegOut = config?.advanced?.max_peg_out ?? 0
  if (maxPegOut > 0) env['MINT_MAX_PEG_OUT'] = String(maxPegOut)

  const maxBalance = config?.advanced?.max_balance ?? 0
  if (maxBalance > 0) env['MINT_MAX_BALANCE'] = String(maxBalance)

  if ((config?.lightning.type ?? 'CLNRestWallet') === 'CLNRestWallet') {
    const clnInterface = await sdk.serviceInterface
      .get(effects, { id: 'clnrest', packageId: 'c-lightning' })
      .const()

    if (clnInterface?.addressInfo) {
      const bridgeAddresses = clnInterface.addressInfo.filter({ kind: 'bridge' })
      const hostname = bridgeAddresses.hostnames[0]
      if (hostname) {
        const clnPort = hostname.port ?? clnInterface.addressInfo.internalPort
        env['MINT_CLNREST_URL'] = `http://${hostname.hostname}:${clnPort}`

        const suffix = clnInterface.addressInfo.suffix ?? ''
        const runeMatch = suffix.match(/[?&]rune=([^&]*)/)
        env['MINT_CLNREST_RUNE'] = runeMatch ? decodeURIComponent(runeMatch[1]) : ''
      }
    }

    // Fixup: if MINT_CLNREST_URL still has a non-HTTP scheme (e.g. clnrest://
    // auto-injected by StartOS), replace it with http://
    if (env['MINT_CLNREST_URL'] && !/^https?:\/\//.test(env['MINT_CLNREST_URL'])) {
      env['MINT_CLNREST_URL'] = env['MINT_CLNREST_URL'].replace(/^[a-z]+:\/\//, 'http://')
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
        // Fix clnrest:// scheme auto-injected by StartOS — cashu needs http://
        'if echo "$MINT_CLNREST_URL" | grep -q "^clnrest://"; then ' +
          'export MINT_CLNREST_URL="http://${MINT_CLNREST_URL#clnrest://}"; ' +
        'fi; ' +
        'exec python3 -m cashu.mint',
      ] as [string, ...string[]],
      env,
    },
    ready: {
      display: 'Cashu Mint',
      fn: () =>
        sdk.healthCheck.checkPortListening(effects, port, {
          successMessage: 'The mint is responsive.',
          errorMessage: 'The mint is not ready.',
        }),
    },
    requires: [],
  })
})
