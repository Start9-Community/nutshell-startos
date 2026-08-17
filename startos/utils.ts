// Here we define any constants or functions that are shared by multiple components
// throughout the package codebase.

import { MINT_DATABASE } from './mintEnvironment'

/** Reported to the operator by the Mint Status action. */
export const mintDatabaseFile = `${MINT_DATABASE}/mint.sqlite3`

/** The mint's ecash seed, generated at install and read back on every start. */
export const mintSeedFile = 'mint_private_key'

/**
 * cln exports only its peer and watchtower host ids, so this one is inlined —
 * see cln-startos/startos/interfaces.ts. Its port comes from cln's own utils.
 */
export const clnrestHostId = 'clnrest'
export const clnrestInterfaceId = 'clnrest'
