import { sdk } from '../sdk'
import { configureAdvanced } from './configureAdvanced'
import { configureFees } from './configureFees'
import { configureMintInfo } from './configureMintInfo'
import { showMintInfo } from './showMintInfo'

export const actions = sdk.Actions.of()
  .addAction(configureMintInfo)
  .addAction(configureFees)
  .addAction(configureAdvanced)
  .addAction(showMintInfo)
