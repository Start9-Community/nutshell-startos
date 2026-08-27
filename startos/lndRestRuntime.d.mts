export const lndRestRuntime: {
  readonly rootCaPath: '/tmp/startos-root-ca.pem'
  readonly macaroon: '/mnt/lnd/data/chain/bitcoin/mainnet/admin.macaroon'
}

export const lndDependencyMount: {
  readonly dependencyId: 'lnd'
  readonly volumeId: 'main'
  readonly subpath: null
  readonly mountpoint: '/mnt/lnd'
  readonly readonly: true
}
