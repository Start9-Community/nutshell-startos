export const MINT_DATABASE = '/data/mint'
export const MINT_HOST = '0.0.0.0'
export const MINT_PORT = 3338

type MintInfoConfig = {
  name?: string
  description?: string
  description_long?: string
  motd?: string
  contact_email?: string
  contact_nostr?: string
  contact_twitter?: string
  icon_url?: string
  tos_url?: string
}

type FeeConfig = {
  fee_percent?: number
  fee_reserve_min?: number
}

type AdvancedConfig = {
  log_level?: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR'
  input_fee_ppk?: number
  max_peg_in?: number
  max_peg_out?: number
  max_balance?: number
  peg_out_only?: boolean
  rate_limit?: boolean
  rate_limit_per_minute?: number
}

export type MintEnvironmentConfig = {
  mint_info?: MintInfoConfig
  fees?: FeeConfig
  advanced?: AdvancedConfig
} | null

export type ClnrestConnection = {
  address: string
  rune: string
}

export const buildMintEnvironment = (
  config: MintEnvironmentConfig,
  privateKey: string,
  clnrest: ClnrestConnection | null,
): Record<string, string> => {
  const mintInfo = config?.mint_info
  const fees = config?.fees
  const advanced = config?.advanced

  const env: Record<string, string> = {
    MINT_INFO_NAME: mintInfo?.name ?? 'My Sovereign Mint',
    MINT_INFO_DESCRIPTION:
      mintInfo?.description ?? 'A private Cashu ecash mint.',
    MINT_INFO_DESCRIPTION_LONG: mintInfo?.description_long ?? '',
    MINT_INFO_MOTD: mintInfo?.motd ?? '',
    MINT_BACKEND_BOLT11_SAT: 'CLNRestWallet',
    LIGHTNING_FEE_PERCENT: String(fees?.fee_percent ?? 0),
    LIGHTNING_RESERVE_FEE_MIN: String(fees?.fee_reserve_min ?? 100),
    MINT_DATABASE,
    MINT_LISTEN_HOST: MINT_HOST,
    MINT_LISTEN_PORT: String(MINT_PORT),
    MINT_PRIVATE_KEY: privateKey.trim(),
    LOG_LEVEL: advanced?.log_level ?? 'INFO',
    MINT_INPUT_FEE_PPK: String(advanced?.input_fee_ppk ?? 0),
    MINT_BOLT11_DISABLE_MINT: advanced?.peg_out_only ? 'true' : 'false',
    MINT_RATE_LIMIT: (advanced?.rate_limit ?? true) ? 'true' : 'false',
    MINT_GLOBAL_RATE_LIMIT_PER_MINUTE: String(
      advanced?.rate_limit_per_minute ?? 60,
    ),
  }

  if (mintInfo?.icon_url) env.MINT_INFO_ICON_URL = mintInfo.icon_url
  if (mintInfo?.tos_url) env.MINT_INFO_TOS_URL = mintInfo.tos_url

  const contacts: string[][] = []
  if (mintInfo?.contact_email) {
    contacts.push(['email', mintInfo.contact_email])
  }
  if (mintInfo?.contact_nostr) {
    contacts.push(['nostr', mintInfo.contact_nostr])
  }
  if (mintInfo?.contact_twitter) {
    contacts.push(['twitter', mintInfo.contact_twitter])
  }
  if (contacts.length > 0) {
    env.MINT_INFO_CONTACT = JSON.stringify(contacts)
  }

  if ((advanced?.max_peg_in ?? 0) > 0) {
    env.MINT_MAX_MINT_BOLT11_SAT = String(advanced?.max_peg_in)
  }
  if ((advanced?.max_peg_out ?? 0) > 0) {
    env.MINT_MAX_MELT_BOLT11_SAT = String(advanced?.max_peg_out)
  }
  if ((advanced?.max_balance ?? 0) > 0) {
    env.MINT_MAX_BALANCE = String(advanced?.max_balance)
  }

  if (clnrest) {
    env.MINT_CLNREST_URL = `http://${clnrest.address}`
    if (clnrest.rune) env.MINT_CLNREST_RUNE = clnrest.rune
  }

  return env
}
