import { sdk } from '../sdk'
import { configYaml } from '../fileModels/config.yaml'

const { InputSpec, Value } = sdk

// --- Action 1: Network Settings ---

const networkSpec = InputSpec.of({
  listen_host: Value.select({
    name: 'Bind Address',
    description: 'Which network interfaces the mint listens on inside the container.',
    warning: null,
    default: '0.0.0.0',
    values: {
      '0.0.0.0': 'All Interfaces (0.0.0.0)',
      '127.0.0.1': 'Localhost Only (127.0.0.1)',
    },
  }),
  listen_port: Value.number({
    name: 'Listen Port',
    description: 'TCP port the mint listens on. Must be between 1024 and 65535.',
    warning: null,
    default: 3338,
    required: true,
    min: 1024,
    max: 65535,
    integer: true,
    units: null,
    placeholder: '3338',
  }),
  protocol: Value.select({
    name: 'Protocol',
    description:
      'HTTP exposes the API without SSL wrapping (recommended for Holesail tunnels). ' +
      'HTTPS adds StartOS SSL termination.',
    warning: null,
    default: 'http',
    values: {
      http: 'HTTP (no SSL wrapper)',
      https: 'HTTPS (SSL-wrapped)',
    },
  }),
})

const configureNetwork = sdk.Action.withInput(
  'configure-network',

  async ({ effects }) => ({
    name: 'Network Settings',
    description: 'Configure bind address, port, and protocol.',
    warning: null,
    allowedStatuses: 'any' as const,
    group: 'Configuration',
    visibility: 'enabled' as const,
  }),

  networkSpec,

  async ({ effects }) => {
    const config = await configYaml.read().once()
    return {
      listen_host: config?.network?.listen_host ?? '0.0.0.0',
      listen_port: config?.network?.listen_port ?? 3338,
      protocol: config?.network?.protocol ?? 'http',
    }
  },

  async ({ effects, input }) => {
    await configYaml.merge(effects, { network: input })
  },
)

// --- Action 2: Advanced Settings ---

const advancedSpec = InputSpec.of({
  log_level: Value.select({
    name: 'Log Level',
    description: 'Controls verbosity of mint logs. DEBUG is useful for troubleshooting.',
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
    default: false,
  }),
  rate_limit_per_minute: Value.number({
    name: 'Rate Limit (req/min)',
    description: 'Maximum API requests per minute when rate limiting is enabled.',
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
      rate_limit: config?.advanced?.rate_limit ?? false,
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
      const key = String(await sdk.volumes.main.readFile('mint_private_key', 'utf-8'))
      if (key && key.trim().length > 0) {
        keyStatus = `Present (${key.trim().length} chars)`
      }
    } catch {
      keyStatus = 'MISSING'
    }

    const host = config?.network?.listen_host ?? '0.0.0.0'
    const port = config?.network?.listen_port ?? 3338

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
            value: config?.lightning?.type ?? 'CLNRestWallet',
            copyable: false,
            qr: false,
            masked: false,
          },
          {
            name: 'Listen Address',
            description: 'The address and port the mint is bound to.',
            type: 'single' as const,
            value: `${host}:${port}`,
            copyable: true,
            qr: false,
            masked: false,
          },
          {
            name: 'Database Path',
            description: 'Where mint data is stored inside the container.',
            type: 'single' as const,
            value: '/data',
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
  .addAction(configureNetwork)
  .addAction(configureAdvanced)
  .addAction(showMintInfo)
