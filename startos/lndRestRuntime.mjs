export const lndRestRuntime = Object.freeze({
  rootCaPath: '/tmp/startos-root-ca.pem',
  macaroon: '/mnt/lnd/data/chain/bitcoin/mainnet/admin.macaroon',
})

export const lndDependencyMount = Object.freeze({
  dependencyId: 'lnd',
  volumeId: 'main',
  subpath: 'data/chain/bitcoin/mainnet/admin.macaroon',
  mountpoint: lndRestRuntime.macaroon,
  type: 'file',
  readonly: true,
})
