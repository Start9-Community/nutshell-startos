import { sdk } from '../sdk'
import { configYaml } from '../fileModels/config.yaml'
import { MINT_DATABASE, MINT_HOST, MINT_PORT } from '../config/mintEnvironment'

const { InputSpec, Value } = sdk

// --- Action 0: Mint Info ---

const mintInfoSpec = InputSpec.of({
  name: Value.text({
    name: 'Mint Name',
    description:
      'Display name shown to wallets connecting to your mint (NUT-06).',
    warning: null,
    default: 'My Sovereign Mint',
    required: true,
    placeholder: 'My Sovereign Mint',
    masked: false,
    minLength: null,
    maxLength: null,
    patterns: [],
    inputmode: 'text',
  }),
  description: Value.text({
    name: 'Description',
    description: 'Short description of your mint.',
    warning: null,
    default: 'A private Cashu ecash mint.',
    required: false,
    placeholder: 'A private Cashu ecash mint.',
    masked: false,
    minLength: null,
    maxLength: null,
    patterns: [],
    inputmode: 'text',
  }),
  description_long: Value.text({
    name: 'Long Description',
    description: 'Extended description with more detail about your mint.',
    warning: null,
    default: '',
    required: false,
    placeholder: '',
    masked: false,
    minLength: null,
    maxLength: null,
    patterns: [],
    inputmode: 'text',
  }),
  motd: Value.text({
    name: 'Message of the Day',
    description: 'Temporary notice shown to wallet users.',
    warning: null,
    default: '',
    required: false,
    placeholder: '',
    masked: false,
    minLength: null,
    maxLength: null,
    patterns: [],
    inputmode: 'text',
  }),
  contact_email: Value.text({
    name: 'Contact Email',
    description: 'Operator email address (shown in NUT-06 mint info).',
    warning: null,
    default: '',
    required: false,
    placeholder: 'admin@example.com',
    masked: false,
    minLength: null,
    maxLength: null,
    patterns: [],
    inputmode: 'email',
  }),
  contact_nostr: Value.text({
    name: 'Contact Nostr',
    description: 'Operator Nostr public key (npub or hex).',
    warning: null,
    default: '',
    required: false,
    placeholder: 'npub1...',
    masked: false,
    minLength: null,
    maxLength: null,
    patterns: [],
    inputmode: 'text',
  }),
  contact_twitter: Value.text({
    name: 'Contact Twitter/X',
    description: 'Operator Twitter/X handle.',
    warning: null,
    default: '',
    required: false,
    placeholder: '@handle',
    masked: false,
    minLength: null,
    maxLength: null,
    patterns: [],
    inputmode: 'text',
  }),
  icon_url: Value.text({
    name: 'Icon URL',
    description: "URL to your mint's icon or logo image.",
    warning: null,
    default: '',
    required: false,
    placeholder: 'https://example.com/icon.png',
    masked: false,
    minLength: null,
    maxLength: null,
    patterns: [],
    inputmode: 'url',
  }),
  tos_url: Value.text({
    name: 'Terms of Service URL',
    description: "Link to your mint's terms of service.",
    warning: null,
    default: '',
    required: false,
    placeholder: 'https://example.com/tos',
    masked: false,
    minLength: null,
    maxLength: null,
    patterns: [],
    inputmode: 'url',
  }),
})

const configureMintInfo = sdk.Action.withInput(
  'configure-mint-info',

  async ({ effects }) => ({
    name: 'Mint Info',
    description:
      'Configure mint name, description, contacts, and public metadata (NUT-06).',
    warning: null,
    allowedStatuses: 'any' as const,
    group: 'Configuration',
    visibility: 'enabled' as const,
  }),

  mintInfoSpec,

  async ({ effects }) => {
    const config = await configYaml.read().once()
    const mi = config?.mint_info
    return {
      name: mi?.name || 'My Sovereign Mint',
      description: mi?.description || 'A private Cashu ecash mint.',
      description_long: mi?.description_long || '',
      motd: mi?.motd || '',
      contact_email: mi?.contact_email || '',
      contact_nostr: mi?.contact_nostr || '',
      contact_twitter: mi?.contact_twitter || '',
      icon_url: mi?.icon_url || '',
      tos_url: mi?.tos_url || '',
    }
  },

  async ({ effects, input }) => {
    await configYaml.merge(effects, {
      mint_info: {
        name: input.name,
        description: input.description ?? '',
        description_long: input.description_long ?? '',
        motd: input.motd ?? '',
        contact_email: input.contact_email ?? '',
        contact_nostr: input.contact_nostr ?? '',
        contact_twitter: input.contact_twitter ?? '',
        icon_url: input.icon_url ?? '',
        tos_url: input.tos_url ?? '',
      },
    })
  },
)

// --- Action 1: Lightning Fees ---

const feesSpec = InputSpec.of({
  fee_percent: Value.number({
    name: 'Lightning Fee Reserve',
    description:
      'Percentage of each outgoing Lightning payment reserved for routing fees.',
    warning: null,
    default: 0,
    required: true,
    min: 0,
    max: 100,
    integer: false,
    units: '%',
    placeholder: '0',
  }),
  fee_reserve_min: Value.number({
    name: 'Minimum Fee Reserve',
    description:
      'Minimum satoshi reserve added to outgoing Lightning payments.',
    warning: null,
    default: 100,
    required: true,
    min: 0,
    max: null,
    integer: true,
    units: 'sats',
    placeholder: '100',
  }),
})

const configureFees = sdk.Action.withInput(
  'configure-fees',

  async () => ({
    name: 'Lightning Fees',
    description: 'Configure the routing-fee reserve for outgoing payments.',
    warning: null,
    allowedStatuses: 'any' as const,
    group: 'Configuration',
    visibility: 'enabled' as const,
  }),

  feesSpec,

  async () => {
    const config = await configYaml.read().once()
    return {
      fee_percent: config?.fees?.fee_percent ?? 0,
      fee_reserve_min: config?.fees?.fee_reserve_min ?? 100,
    }
  },

  async ({ effects, input }) => {
    await configYaml.merge(effects, { fees: input })
  },
)

// --- Action 2: Advanced Settings ---

const advancedSpec = InputSpec.of({
  log_level: Value.select({
    name: 'Log Level',
    description:
      'Controls verbosity of mint logs. DEBUG is useful for troubleshooting.',
    warning: null,
    default: 'INFO',
    values: {
      DEBUG: 'DEBUG',
      INFO: 'INFO',
      WARNING: 'WARNING',
      ERROR: 'ERROR',
    },
  }),
  input_fee_ppk: Value.number({
    name: 'Input Fee (ppk)',
    description: 'Parts-per-thousand fee on token inputs (NUT-02). 0 = no fee.',
    warning: null,
    default: 0,
    required: true,
    min: 0,
    max: null,
    integer: true,
    units: 'ppk',
    placeholder: '0',
  }),
  max_peg_in: Value.number({
    name: 'Max Peg-In',
    description: 'Maximum sats per mint operation. 0 = unlimited.',
    warning: null,
    default: 0,
    required: true,
    min: 0,
    max: null,
    integer: true,
    units: 'sats',
    placeholder: '0',
  }),
  max_peg_out: Value.number({
    name: 'Max Peg-Out',
    description: 'Maximum sats per melt operation. 0 = unlimited.',
    warning: null,
    default: 0,
    required: true,
    min: 0,
    max: null,
    integer: true,
    units: 'sats',
    placeholder: '0',
  }),
  max_balance: Value.number({
    name: 'Max Balance',
    description: 'Maximum total mint balance in sats. 0 = unlimited.',
    warning: null,
    default: 0,
    required: true,
    min: 0,
    max: null,
    integer: true,
    units: 'sats',
    placeholder: '0',
  }),
  peg_out_only: Value.toggle({
    name: 'Peg-Out Only',
    description: 'Disable minting (peg-in). Only melting (peg-out) is allowed.',
    warning: null,
    default: false,
  }),
  rate_limit: Value.toggle({
    name: 'Rate Limiting',
    description: 'Enable global rate limiting on API requests.',
    warning: null,
    default: true,
  }),
  rate_limit_per_minute: Value.number({
    name: 'Rate Limit (req/min)',
    description:
      'Maximum API requests per minute when rate limiting is enabled.',
    warning: null,
    default: 60,
    required: true,
    min: 1,
    max: null,
    integer: true,
    units: 'req/min',
    placeholder: '60',
  }),
})

const configureAdvanced = sdk.Action.withInput(
  'configure-advanced',

  async ({ effects }) => ({
    name: 'Advanced Settings',
    description: 'Configure logging, fees, peg limits, and rate limiting.',
    warning: null,
    allowedStatuses: 'any' as const,
    group: 'Configuration',
    visibility: 'enabled' as const,
  }),

  advancedSpec,

  async ({ effects }) => {
    const config = await configYaml.read().once()
    return {
      log_level: config?.advanced?.log_level ?? 'INFO',
      input_fee_ppk: config?.advanced?.input_fee_ppk ?? 0,
      max_peg_in: config?.advanced?.max_peg_in ?? 0,
      max_peg_out: config?.advanced?.max_peg_out ?? 0,
      max_balance: config?.advanced?.max_balance ?? 0,
      peg_out_only: config?.advanced?.peg_out_only ?? false,
      rate_limit: config?.advanced?.rate_limit ?? true,
      rate_limit_per_minute: config?.advanced?.rate_limit_per_minute ?? 60,
    }
  },

  async ({ effects, input }) => {
    await configYaml.merge(effects, { advanced: input })
  },
)

// --- Action 3: Mint Status ---

const showMintInfo = sdk.Action.withoutInput(
  'show-mint-info',

  async ({ effects }) => ({
    name: 'Mint Status',
    description: 'View mint configuration summary and key status.',
    warning: null,
    allowedStatuses: 'only-running' as const,
    group: null,
    visibility: 'enabled' as const,
  }),

  async ({ effects }) => {
    const config = await configYaml.read().once()

    let keyStatus = 'MISSING'
    try {
      const key = String(
        await sdk.volumes.main.readFile('mint_private_key', 'utf-8'),
      )
      if (key && key.trim().length > 0) {
        keyStatus = `Present (${key.trim().length} chars)`
      }
    } catch {
      keyStatus = 'MISSING'
    }

    return {
      version: '1' as const,
      title: 'Mint Status',
      message: null,
      result: {
        type: 'group' as const,
        value: [
          {
            name: 'Private Key',
            description: 'Whether the mint private key exists on the volume.',
            type: 'single' as const,
            value: keyStatus,
            copyable: false,
            qr: false,
            masked: false,
          },
          {
            name: 'Lightning Backend',
            description: 'The configured wallet backend.',
            type: 'single' as const,
            value: 'CLNRestWallet',
            copyable: false,
            qr: false,
            masked: false,
          },
          {
            name: 'Listen Address',
            description: 'The address and port the mint is bound to.',
            type: 'single' as const,
            value: `${MINT_HOST}:${MINT_PORT}`,
            copyable: true,
            qr: false,
            masked: false,
          },
          {
            name: 'Database Path',
            description: 'Where mint data is stored inside the container.',
            type: 'single' as const,
            value: `${MINT_DATABASE}.sqlite3`,
            copyable: false,
            qr: false,
            masked: false,
          },
          {
            name: 'Log Level',
            description: 'Current logging verbosity.',
            type: 'single' as const,
            value: config?.advanced?.log_level ?? 'INFO',
            copyable: false,
            qr: false,
            masked: false,
          },
        ],
      },
    }
  },
)

// --- Export all actions ---

export const actions = sdk.Actions.of()
  .addAction(configureMintInfo)
  .addAction(configureFees)
  .addAction(configureAdvanced)
  .addAction(showMintInfo)
