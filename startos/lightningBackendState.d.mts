export declare const lightningBackends: readonly ['clnrest', 'lndrest']
export type LightningBackend = (typeof lightningBackends)[number]

export declare function assertLightningBackend(
  value: unknown,
): asserts value is LightningBackend
