import { FileHelper, z } from '@start9labs/start-sdk'
import { lightningBackends } from '../lightningBackend'
import { sdk } from '../sdk'

const shape = z.object({
  lightningBackend: z.enum(lightningBackends).optional(),
})

export const storeJson = FileHelper.json(
  { base: sdk.volumes.startos, subpath: 'store.json' },
  shape,
)
