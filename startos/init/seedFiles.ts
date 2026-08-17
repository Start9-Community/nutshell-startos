import { configYaml } from '../fileModels/config.yaml'
import { sdk } from '../sdk'

// An empty merge applies every `.catch()` default without touching a value the
// operator has already set, so it is safe on every init kind.
export const seedFiles = sdk.setupOnInit(async (effects) => {
  await configYaml.merge(effects, {})
})
