import { i18n } from './i18n'
import { sdk } from './sdk'
import { MINT_PORT } from './mintEnvironment'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const apiMulti = sdk.MultiHost.of(effects, 'api-multi')
  const apiOrigin = await apiMulti.bindPort(MINT_PORT, { protocol: 'http' })
  const api = sdk.createInterface(effects, {
    name: i18n('Cashu Mint API'),
    id: 'api',
    description: i18n('The Cashu API wallets connect to'),
    type: 'api',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '',
    query: {},
  })

  return [await apiOrigin.export([api])]
})
