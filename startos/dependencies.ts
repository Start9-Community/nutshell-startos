import { storeJson } from './fileModels/store.json'
import { dependenciesForBackendState } from './lightningBackend'
import { sdk } from './sdk'

export const setDependencies = sdk.setupDependencies(async ({ effects }) => {
  const backend = await storeJson
    .read((store) => store.lightningBackend)
    .const(effects)

  return dependenciesForBackendState(backend)
})
