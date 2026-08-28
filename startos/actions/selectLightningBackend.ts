import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { validateThenLock } from '../lightningBackend'
import { validateLightningBackend } from '../lightningConnection'
import { sdk } from '../sdk'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  lightningBackend: Value.select({
    name: i18n('Lightning Node'),
    description: i18n(
      'Choose the Lightning node this mint will use. The selection cannot be changed after it is validated.',
    ),
    warning: i18n('This choice is permanent for this mint.'),
    default: 'clnrest',
    values: {
      clnrest: i18n('Core Lightning (CLNRest)'),
      lndrest: i18n('LND (REST)'),
    },
  }),
})

export const selectLightningBackend = sdk.Action.withInput(
  'select-lightning-backend',

  async () => ({
    name: i18n('Select Lightning Backend'),
    description: i18n(
      'Choose the Lightning node this mint will use. The selection cannot be changed after it is validated.',
    ),
    warning: i18n('This choice is permanent for this mint.'),
    allowedStatuses: 'only-stopped',
    group: null,
    visibility: 'hidden',
  }),

  inputSpec,

  async () => ({}),

  async ({ effects, input }) => {
    const current = await storeJson
      .read((store) => store.lightningBackend)
      .once()

    await validateThenLock(
      current,
      input.lightningBackend,
      (backend) => validateLightningBackend(effects, backend),
      (state) => storeJson.merge(effects, state),
      () => storeJson.read((store) => store.lightningBackend).once(),
    )
  },
)
