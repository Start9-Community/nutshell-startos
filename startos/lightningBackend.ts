export const lightningBackends = ['clnrest', 'lndrest'] as const
export type LightningBackend = (typeof lightningBackends)[number]

export function legacyLightningBackend(): LightningBackend {
  return 'clnrest'
}

export function legacyLightningBackendState() {
  return { lightningBackend: legacyLightningBackend() }
}

export async function migrateLegacyLightningBackend(
  writeState: (
    state: ReturnType<typeof legacyLightningBackendState>,
  ) => Promise<unknown>,
) {
  await writeState(legacyLightningBackendState())
}

export function assertLightningBackend(
  value: unknown,
): asserts value is LightningBackend {
  if (value === undefined || value === null) {
    throw new Error('Lightning backend is not selected')
  }
  if (!lightningBackends.includes(value as LightningBackend)) {
    throw new Error('Stored Lightning backend is invalid')
  }
}

export function lockLightningBackend(
  current: LightningBackend | undefined,
  requested: LightningBackend,
) {
  if (current !== undefined) {
    throw new Error(`Lightning backend is already locked to ${current}`)
  }
  return { lightningBackend: requested }
}
