import { sdk } from '../sdk'
import { utils } from '@start9labs/start-sdk'

export const initializeService = sdk.setupOnInit(async (effects, kind) => {
  if (kind === 'install') {
    const privateKeyPath = 'mint_private_key'
    let exists = false
    try {
      await sdk.volumes.main.readFile(privateKeyPath, 'utf-8')
      exists = true
    } catch {
      exists = false
    }
    if (!exists) {
      const privateKey = utils.getDefaultString({
        charset: 'a-f,0-9',
        len: 64,
      })
      await sdk.volumes.main.writeFile(privateKeyPath, privateKey)
    }
  }
})
