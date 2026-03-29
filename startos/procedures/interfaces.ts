import { sdk } from '../sdk'
import { configYaml } from '../fileModels/config.yaml'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const config = await configYaml.read().const(effects)
  const port = config?.network?.listen_port ?? 3338
  const protocol = config?.network?.protocol ?? 'http'

  const apiMulti = sdk.MultiHost.of(effects, 'api-multi')
  const apiOrigin = await apiMulti.bindPort(port, {
    protocol,
  })
  const api = sdk.createInterface(effects, {
    name: 'Cashu Mint API',
    id: 'api',
    description: 'The API interface for the Cashu mint.',
    type: 'api',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '',
    query: {},
  })
  const apiReceipt = await apiOrigin.export([api])

  return [apiReceipt]
})
