import { configYaml } from '../fileModels/config.yaml'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  name: Value.text({
    name: i18n('Mint Name'),
    description: i18n('Display name shown to wallets connecting to your mint.'),
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
    name: i18n('Description'),
    description: i18n('Short description of your mint.'),
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
    name: i18n('Long Description'),
    description: i18n('Extended description with more detail about your mint.'),
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
    name: i18n('Message of the Day'),
    description: i18n('Temporary notice shown to wallet users.'),
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
    name: i18n('Contact Email'),
    description: i18n('Operator email address.'),
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
    name: i18n('Contact Nostr'),
    description: i18n('Operator Nostr public key (npub or hex).'),
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
    name: i18n('Contact Twitter/X'),
    description: i18n('Operator Twitter/X handle.'),
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
    name: i18n('Icon URL'),
    description: i18n("URL of your mint's icon or logo image."),
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
    name: i18n('Terms of Service URL'),
    description: i18n("Link to your mint's terms of service."),
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

export const configureMintInfo = sdk.Action.withInput(
  'configure-mint-info',

  async ({ effects }) => ({
    name: i18n('Mint Info'),
    description: i18n(
      'Set the name, description and contact details wallets show for your mint (NUT-06).',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  inputSpec,

  async ({ effects }) =>
    (await configYaml.read((c) => c.mint_info).once()) ?? {},

  // Every optional text field arrives as `string | null`; the model stores ''
  // for "unset", and an omitted key would leave the previous value in place.
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
