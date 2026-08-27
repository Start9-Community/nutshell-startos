export const lndRestRuntime: {
  readonly rootCaPath: '/tmp/startos-root-ca.pem'
  readonly macaroon: '/mnt/lnd/data/chain/bitcoin/mainnet/admin.macaroon'
}

export const lndDependencyMount: {
  readonly dependencyId: 'lnd'
  readonly volumeId: 'main'
  readonly subpath: 'data/chain/bitcoin/mainnet/admin.macaroon'
  readonly mountpoint: '/mnt/lnd/data/chain/bitcoin/mainnet/admin.macaroon'
  readonly type: 'file'
  readonly readonly: true
}
