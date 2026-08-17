import { utils } from '@start9labs/start-sdk'
import { sdk } from '../sdk'
import { mintSeedFile } from '../utils'

/**
 * The mint's ecash seed. Every proof the mint has ever issued is derived from
 * it, so it is generated once and never regenerated: restore replays init as
 * `kind === 'install'`, and without the existence check below a restore would
 * mint a fresh seed and orphan every outstanding token in the restored
 * database.
 */
export const generateMintSeed = sdk.setupOnInit(async (effects, kind) => {
  if (kind !== 'install') return

  const exists = await sdk.volumes.main
    .readFile(mintSeedFile, 'utf-8')
    .then(() => true)
    .catch(() => false)
  if (exists) return

  await sdk.volumes.main.writeFile(
    mintSeedFile,
    utils.getDefaultString({ charset: 'a-f,0-9', len: 64 }),
  )
})
