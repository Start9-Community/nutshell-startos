import { selectLightningBackend } from '../actions/selectLightningBackend'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

export const taskSelectLightningBackend = sdk.setupOnInit(async (effects) => {
  const backend = await storeJson.read((store) => store.lightningBackend).once()
  if (backend !== undefined) return

  await sdk.action.createOwnTask(effects, selectLightningBackend, 'critical', {
    reason: i18n(
      'Select the Lightning backend before starting Nutshell. This choice is permanent for this mint.',
    ),
  })
})
