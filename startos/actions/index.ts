import { sdk } from '../sdk'
import { configureAdvanced } from './configureAdvanced'
import { configureFees } from './configureFees'
import { configureMintInfo } from './configureMintInfo'
import { selectLightningBackend } from './selectLightningBackend'
import { showMintInfo } from './showMintInfo'

export const actions = sdk.Actions.of()
  .addAction(selectLightningBackend)
  .addAction(configureMintInfo)
  .addAction(configureFees)
  .addAction(configureAdvanced)
  .addAction(showMintInfo)
