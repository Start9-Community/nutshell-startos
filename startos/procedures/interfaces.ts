import { sdk } from '../sdk'
import { MINT_PORT } from '../config/mintEnvironment'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const apiMulti = sdk.MultiHost.of(effects, 'api-multi')
  const apiOrigin = await apiMulti.bindPort(MINT_PORT, {
    protocol: 'http',
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
