export const lightningBackends = Object.freeze(['clnrest', 'lndrest'])

export function assertLightningBackend(value) {
  if (value === undefined || value === null) {
    throw new Error('Lightning backend is not selected')
  }
  if (!lightningBackends.includes(value)) {
    throw new Error('Stored Lightning backend is invalid')
  }
}
