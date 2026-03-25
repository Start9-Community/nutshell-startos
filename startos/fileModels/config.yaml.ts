import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

const shape = z.object({
  mint_info: z.object({
    name: z.string().optional().default('My Sovereign Mint'),
    description: z.string().optional().default('A private Cashu ecash mint.'),
  }),
  lightning: z.object({
    type: z.enum(['CLNRestWallet', 'FakeWallet', 'LNbitsWallet']).optional().default('CLNRestWallet'),
  }),
  fees: z.object({
    fee_percent: z.number().optional().default(0),
    fee_reserve_min: z.number().optional().default(100),
  }),
})

export type ConfigType = z.infer<typeof shape>

export const configYaml = FileHelper.yaml(
  { base: sdk.volumes.main, subpath: 'startos/config.yaml' },
  shape,
)
