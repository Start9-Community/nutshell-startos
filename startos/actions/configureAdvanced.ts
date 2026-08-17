import { configYaml } from '../fileModels/config.yaml'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  log_level: Value.select({
    name: i18n('Log Level'),
    description: i18n(
      'Verbosity of the mint log. DEBUG is useful when troubleshooting.',
    ),
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
    name: i18n('Input Fee'),
    description: i18n(
      'Fee charged on token inputs, in parts per thousand (NUT-02). 0 charges no fee.',
    ),
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
    name: i18n('Maximum Mint Amount'),
    description: i18n(
      'Largest amount that can be turned into ecash in one operation. 0 is unlimited.',
    ),
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
    name: i18n('Maximum Melt Amount'),
    description: i18n(
      'Largest amount that can be redeemed to Lightning in one operation. 0 is unlimited.',
    ),
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
    name: i18n('Maximum Balance'),
    description: i18n(
      'Largest total balance the mint will hold. 0 is unlimited.',
    ),
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
    name: i18n('Redemptions Only'),
    description: i18n(
      'Stop issuing new ecash. Existing ecash can still be redeemed to Lightning.',
    ),
    warning: null,
    default: false,
  }),
  rate_limit: Value.toggle({
    name: i18n('Rate Limiting'),
    description: i18n(
      'Limit how many API requests the mint will answer per minute.',
    ),
    warning: null,
    default: true,
  }),
  rate_limit_per_minute: Value.number({
    name: i18n('Request Limit'),
    description: i18n(
      'Maximum API requests per minute while rate limiting is on.',
    ),
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

export const configureAdvanced = sdk.Action.withInput(
  'configure-advanced',

  async ({ effects }) => ({
    name: i18n('Advanced Settings'),
    description: i18n(
      'Set logging, input fees, transaction limits and rate limiting.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  inputSpec,

  async ({ effects }) =>
    (await configYaml.read((c) => c.advanced).once()) ?? {},

  async ({ effects, input }) => {
    await configYaml.merge(effects, { advanced: input })
  },
)
