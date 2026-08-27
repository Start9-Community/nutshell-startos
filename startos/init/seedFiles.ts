import { configYaml } from '../fileModels/config.yaml'
import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'

// Empty merges create missing files and preserve existing values. Invalid
// Lightning backend state remains invalid instead of being defaulted.
export const seedFiles = sdk.setupOnInit(async (effects) => {
  await configYaml.merge(effects, {})
  await storeJson.merge(effects, {})
})
