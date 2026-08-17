import { configYaml } from '../fileModels/config.yaml'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  fee_percent: Value.number({
    name: i18n('Lightning Fee Reserve'),
    description: i18n(
      'Percentage of each outgoing Lightning payment reserved for routing fees.',
    ),
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
    name: i18n('Minimum Fee Reserve'),
    description: i18n(
      'Minimum satoshi reserve added to outgoing Lightning payments.',
    ),
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

export const configureFees = sdk.Action.withInput(
  'configure-fees',

  async ({ effects }) => ({
    name: i18n('Lightning Fees'),
    description: i18n(
      'Set the routing-fee reserve held back on outgoing Lightning payments.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  inputSpec,

  async ({ effects }) => (await configYaml.read((c) => c.fees).once()) ?? {},

  async ({ effects, input }) => {
    await configYaml.merge(effects, { fees: input })
  },
)
