export const lightningBackends = ['clnrest', 'lndrest'] as const
export type LightningBackend = (typeof lightningBackends)[number]

export function dependencyForBackend(backend: unknown) {
  assertLightningBackend(backend)

  if (backend === 'clnrest') {
    return {
      'c-lightning': {
        kind: 'running',
        versionRange: '>=26.6.6:1',
        healthChecks: ['lightningd'],
      },
    } as const
  }

  return {
    lnd: {
      kind: 'running',
      versionRange: '>=0.21.2-beta:3',
      healthChecks: ['lnd'],
    },
  } as const
}

export function dependenciesForBackendState(backend: unknown) {
  return backend === undefined ? ({} as const) : dependencyForBackend(backend)
}

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
  current: LightningBackend | null | undefined,
  requested: LightningBackend,
) {
  if (current === null) {
    throw new Error('Stored Lightning backend state is invalid')
  }
  if (current !== undefined) {
    throw new Error(`Lightning backend is already locked to ${current}`)
  }
  return { lightningBackend: requested }
}

export async function validateThenLock(
  current: LightningBackend | null | undefined,
  requested: LightningBackend,
  validate: (backend: LightningBackend) => Promise<unknown>,
  persist: (state: { lightningBackend: LightningBackend }) => Promise<unknown>,
  readCurrent: () => Promise<LightningBackend | null | undefined>,
) {
  const state = lockLightningBackend(current, requested)
  await validate(requested)
  lockLightningBackend(await readCurrent(), requested)
  await persist(state)
}
