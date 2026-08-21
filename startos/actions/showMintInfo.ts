import { configYaml } from '../fileModels/config.yaml'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { MINT_HOST, MINT_PORT } from '../mintEnvironment'
import { mintDatabaseFile, mintSeedFile } from '../utils'

export const showMintInfo = sdk.Action.withoutInput(
  'show-mint-info',

  async ({ effects }) => ({
    name: i18n('Mint Status'),
    description: i18n(
      'Show the mint seed status, Lightning backend, listener and database path.',
    ),
    warning: null,
    // Reads the volume and the config file, not the container, so it answers
    // while the mint is stopped — which is when "is my seed still there?" is
    // the question being asked.
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  async ({ effects }) => {
    const logLevel = await configYaml.read((c) => c.advanced.log_level).once()
    const hasSeed = await sdk.volumes.main
      .readFile(mintSeedFile, 'utf-8')
      .then((k) => String(k).trim().length > 0)
      .catch(() => false)

    return {
      version: '1' as const,
      title: i18n('Mint Status'),
      message: null,
      result: {
        type: 'group' as const,
        value: [
          {
            name: i18n('Mint Seed'),
            description: i18n(
              'Whether the ecash seed exists on the volume. Its value is never shown.',
            ),
            type: 'single' as const,
            value: hasSeed ? i18n('Present') : i18n('Missing'),
            copyable: false,
            qr: false,
            masked: false,
          },
          {
            name: i18n('Lightning Backend'),
            description: i18n(
              'The wallet backend the mint settles payments through.',
            ),
            type: 'single' as const,
            value: 'CLNRestWallet',
            copyable: false,
            qr: false,
            masked: false,
          },
          {
            name: i18n('Listen Address'),
            description: i18n(
              'The address and port the mint binds inside its container.',
            ),
            type: 'single' as const,
            value: `${MINT_HOST}:${MINT_PORT}`,
            copyable: true,
            qr: false,
            masked: false,
          },
          {
            name: i18n('Database Path'),
            description: i18n(
              'Where the mint database is stored inside the container.',
            ),
            type: 'single' as const,
            value: mintDatabaseFile,
            copyable: false,
            qr: false,
            masked: false,
          },
          {
            name: i18n('Log Level'),
            description: i18n('Current logging verbosity.'),
            type: 'single' as const,
            value: logLevel ?? 'INFO',
            copyable: false,
            qr: false,
            masked: false,
          },
        ],
      },
    }
  },
)
