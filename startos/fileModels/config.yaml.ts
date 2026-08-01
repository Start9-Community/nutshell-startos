import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

const shape = z.object({
  mint_info: z.object({
    name: z.string().optional().default('My Sovereign Mint'),
    description: z.string().optional().default('A private Cashu ecash mint.'),
    description_long: z.string().optional().default(''),
    motd: z.string().optional().default(''),
    contact_email: z.string().optional().default(''),
    contact_nostr: z.string().optional().default(''),
    contact_twitter: z.string().optional().default(''),
    icon_url: z.string().optional().default(''),
    tos_url: z.string().optional().default(''),
  }).optional().default({
    name: 'My Sovereign Mint',
    description: 'A private Cashu ecash mint.',
    description_long: '',
    motd: '',
    contact_email: '',
    contact_nostr: '',
    contact_twitter: '',
    icon_url: '',
    tos_url: '',
  }),
  lightning: z.object({
    type: z.enum(['CLNRestWallet', 'FakeWallet', 'LNbitsWallet']).optional().default('CLNRestWallet'),
  }).optional().default({
    type: 'CLNRestWallet',
  }),
  fees: z.object({
    fee_percent: z.number().optional().default(0),
    fee_reserve_min: z.number().optional().default(100),
  }).optional().default({
    fee_percent: 0,
    fee_reserve_min: 100,
  }),
  network: z.object({
    listen_host: z.enum(['0.0.0.0', '127.0.0.1']).optional().default('0.0.0.0'),
    listen_port: z.number().int().min(1024).max(65535).optional().default(3338),
    protocol: z.enum(['http', 'https']).optional().default('http'),
  }).optional().default({
    listen_host: '0.0.0.0',
    listen_port: 3338,
    protocol: 'http',
  }),
  advanced: z.object({
    log_level: z.enum(['DEBUG', 'INFO', 'WARNING', 'ERROR']).optional().default('INFO'),
    input_fee_ppk: z.number().int().min(0).optional().default(0),
    max_peg_in: z.number().int().min(0).optional().default(0),
    max_peg_out: z.number().int().min(0).optional().default(0),
    max_balance: z.number().int().min(0).optional().default(0),
    peg_out_only: z.boolean().optional().default(false),
    rate_limit: z.boolean().optional().default(false),
    rate_limit_per_minute: z.number().int().min(1).optional().default(60),
  }).optional().default({
    log_level: 'INFO',
    input_fee_ppk: 0,
    max_peg_in: 0,
    max_peg_out: 0,
    max_balance: 0,
    peg_out_only: false,
    rate_limit: false,
    rate_limit_per_minute: 60,
  }),
})

export type ConfigType = z.infer<typeof shape>

export const configYaml = FileHelper.yaml(
  { base: sdk.volumes.main, subpath: 'startos/config.yaml' },
  shape,
)
