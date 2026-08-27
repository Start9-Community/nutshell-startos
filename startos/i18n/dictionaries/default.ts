export const DEFAULT_LANG = 'en_US'

const dict = {
  // main.ts
  'Starting Nutshell': 0,
  'Cashu Mint': 1,
  'The mint is responsive': 2,
  'The mint is not ready': 3,
  'Core Lightning is not reachable on the internal network. Make sure Core Lightning is installed, running, and has CLNRest enabled in its config.': 4,
  "Core Lightning's CLNRest rune could not be read. Ensure CLNRest remains enabled in Core Lightning's config, restart it, and start Nutshell again.": 5,

  // interfaces.ts
  'Cashu Mint API': 6,
  'The Cashu API wallets connect to': 7,

  // actions/configureMintInfo.ts
  'Mint Info': 8,
  'Set the name, description and contact details wallets show for your mint (NUT-06).': 9,
  'Mint Name': 10,
  'Display name shown to wallets connecting to your mint.': 11,
  Description: 12,
  'Short description of your mint.': 13,
  'Long Description': 14,
  'Extended description with more detail about your mint.': 15,
  'Message of the Day': 16,
  'Temporary notice shown to wallet users.': 17,
  'Contact Email': 18,
  'Operator email address.': 19,
  'Contact Nostr': 20,
  'Operator Nostr public key (npub or hex).': 21,
  'Contact Twitter/X': 22,
  'Operator Twitter/X handle.': 23,
  'Icon URL': 24,
  "URL of your mint's icon or logo image.": 25,
  'Terms of Service URL': 26,
  "Link to your mint's terms of service.": 27,

  // actions/configureFees.ts
  'Lightning Fees': 28,
  'Set the routing-fee reserve held back on outgoing Lightning payments.': 29,
  'Lightning Fee Reserve': 30,
  'Percentage of each outgoing Lightning payment reserved for routing fees.': 31,
  'Minimum Fee Reserve': 32,
  'Minimum satoshi reserve added to outgoing Lightning payments.': 33,

  // actions/configureAdvanced.ts
  'Advanced Settings': 34,
  'Set logging, input fees, transaction limits and rate limiting.': 35,
  'Log Level': 36,
  'Verbosity of the mint log. DEBUG is useful when troubleshooting.': 37,
  'Input Fee': 38,
  'Fee charged on token inputs, in parts per thousand (NUT-02). 0 charges no fee.': 39,
  'Maximum Mint Amount': 40,
  'Largest amount that can be turned into ecash in one operation. 0 is unlimited.': 41,
  'Maximum Melt Amount': 42,
  'Largest amount that can be redeemed to Lightning in one operation. 0 is unlimited.': 43,
  'Maximum Balance': 44,
  'Largest total balance the mint will hold. 0 is unlimited.': 45,
  'Redemptions Only': 46,
  'Stop issuing new ecash. Existing ecash can still be redeemed to Lightning.': 47,
  'Rate Limiting': 48,
  'Limit how many API requests the mint will answer per minute.': 49,
  'Request Limit': 50,
  'Maximum API requests per minute while rate limiting is on.': 51,

  // actions/showMintInfo.ts
  'Mint Status': 52,
  'Show the mint seed status, Lightning backend, listener and database path.': 53,
  'Mint Seed': 54,
  'Whether the ecash seed exists on the volume. Its value is never shown.': 55,
  Present: 56,
  Missing: 57,
  'Lightning Backend': 58,
  'The wallet backend the mint settles payments through.': 59,
  'Listen Address': 60,
  'The address and port the mint binds inside its container.': 61,
  'Database Path': 62,
  'Where the mint database is stored inside the container.': 63,
  'Current logging verbosity.': 64,

  // actions/selectLightningBackend.ts
  'Select Lightning Backend': 65,
  'Choose the Lightning node this mint will use. The selection cannot be changed after it is validated.': 66,
  'This choice is permanent for this mint.': 67,
  'Lightning Node': 68,
  'Core Lightning (CLNRest)': 69,
  'LND (REST)': 70,

  // init/taskSelectLightningBackend.ts
  'Select the Lightning backend before starting Nutshell. This choice is permanent for this mint.': 71,

  // lightningConnection.ts
  'Core Lightning validation failed. Make sure Core Lightning is installed and running with CLNRest enabled, then try again.': 72,
  'LND validation failed. Make sure LND is installed, running, and its wallet is initialized and unlocked, then try again.': 73,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
