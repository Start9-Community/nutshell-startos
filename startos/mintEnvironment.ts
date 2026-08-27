/**
 * Pure mapping from the operator's settings to Nutshell's environment.
 *
 * Deliberately import-free so `tests/mint-environment.test.ts` runs under plain
 * `node --test` without the SDK: Node's resolver needs full specifiers, so any
 * relative import here would break the test rather than the build.
 *
 * That costs a hand-written config type, which `config.yaml.ts` would otherwise
 * own. The fields below are therefore **required**, not optional — that is what
 * makes a rename in the zod shape a compile error at the `main.ts` call site
 * instead of a silently-defaulted environment variable.
 */
export type MintEnvironmentConfig = {
  mint_info: {
    name: string
    description: string
    description_long: string
    motd: string
    contact_email: string
    contact_nostr: string
    contact_twitter: string
    icon_url: string
    tos_url: string
  }
  fees: {
    fee_percent: number
    fee_reserve_min: number
  }
  advanced: {
    log_level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR'
    input_fee_ppk: number
    max_peg_in: number
    max_peg_out: number
    max_balance: number
    peg_out_only: boolean
    rate_limit: boolean
    rate_limit_per_minute: number
  }
}

export type LightningConnection =
  | {
      backend: 'clnrest'
      address: string
      rune: string
    }
  | {
      backend: 'lndrest'
      address: string
      rootCaPath: string
      macaroonPath: string
    }

/** Nutshell's internal HTTP listener. StartOS owns external addressing. */
export const MINT_PORT = 3338
export const MINT_HOST = '0.0.0.0'

/** A directory, not a file — Nutshell writes `mint.sqlite3` inside it. */
export const MINT_DATABASE = '/data/mint'

export const buildMintEnvironment = (
  config: MintEnvironmentConfig | null,
  seed: string,
  lightning: LightningConnection,
): Record<string, string> => {
  const mintInfo = config?.mint_info
  const fees = config?.fees
  const advanced = config?.advanced

  const env: Record<string, string> = {
    MINT_INFO_NAME: mintInfo?.name || 'My Sovereign Mint',
    MINT_INFO_DESCRIPTION:
      mintInfo?.description || 'A private Cashu ecash mint.',
    MINT_INFO_DESCRIPTION_LONG: mintInfo?.description_long ?? '',
    MINT_INFO_MOTD: mintInfo?.motd ?? '',
    LIGHTNING_FEE_PERCENT: String(fees?.fee_percent ?? 0),
    LIGHTNING_RESERVE_FEE_MIN: String(fees?.fee_reserve_min ?? 100),
    MINT_DATABASE,
    MINT_LISTEN_HOST: MINT_HOST,
    MINT_LISTEN_PORT: String(MINT_PORT),
    MINT_PRIVATE_KEY: seed.trim(),
    LOG_LEVEL: advanced?.log_level ?? 'INFO',
    MINT_INPUT_FEE_PPK: String(advanced?.input_fee_ppk ?? 0),
    MINT_BOLT11_DISABLE_MINT: advanced?.peg_out_only ? 'true' : 'false',
    MINT_RATE_LIMIT: (advanced?.rate_limit ?? true) ? 'true' : 'false',
    MINT_GLOBAL_RATE_LIMIT_PER_MINUTE: String(
      advanced?.rate_limit_per_minute ?? 60,
    ),
  }

  switch (lightning.backend) {
    case 'clnrest':
      env.MINT_BACKEND_BOLT11_SAT = 'CLNRestWallet'
      env.MINT_CLNREST_URL = `http://${lightning.address}`
      env.MINT_CLNREST_RUNE = lightning.rune
      break
    case 'lndrest':
      env.MINT_BACKEND_BOLT11_SAT = 'LndRestWallet'
      env.MINT_LND_REST_ENDPOINT = `https://${lightning.address}`
      env.MINT_LND_REST_CERT = lightning.rootCaPath
      env.MINT_LND_REST_MACAROON = lightning.macaroonPath
      env.MINT_LND_REST_CERT_VERIFY = 'true'
      break
    default:
      throw new Error('Unsupported lightning backend')
  }

  if (mintInfo?.icon_url) env.MINT_INFO_ICON_URL = mintInfo.icon_url
  if (mintInfo?.tos_url) env.MINT_INFO_TOS_URL = mintInfo.tos_url

  const contacts: string[][] = []
  if (mintInfo?.contact_email) contacts.push(['email', mintInfo.contact_email])
  if (mintInfo?.contact_nostr) contacts.push(['nostr', mintInfo.contact_nostr])
  if (mintInfo?.contact_twitter) {
    contacts.push(['twitter', mintInfo.contact_twitter])
  }
  if (contacts.length > 0) {
    env.MINT_INFO_CONTACT = JSON.stringify(contacts)
  }

  // Nutshell reads an unset limit as "no limit", so 0 means omit the variable
  // rather than send a literal zero, which would cap every operation at nothing.
  if (advanced && advanced.max_peg_in > 0) {
    env.MINT_MAX_MINT_BOLT11_SAT = String(advanced.max_peg_in)
  }
  if (advanced && advanced.max_peg_out > 0) {
    env.MINT_MAX_MELT_BOLT11_SAT = String(advanced.max_peg_out)
  }
  if (advanced && advanced.max_balance > 0) {
    env.MINT_MAX_BALANCE = String(advanced.max_balance)
  }

  return env
}
