import assert from 'node:assert/strict'
import test from 'node:test'

import { buildMintEnvironment } from '../startos/mintEnvironment.ts'
import { lndRestRuntime } from '../startos/lightningProbe.ts'

/**
 * Run with `npm test` (plain `node --test` — Node 22 strips the types, so this
 * needs no test framework and no devDependencies).
 *
 * The environment mapping is where an upstream variable rename lands silently:
 * a wrong name is not a type error and the mint starts anyway, on defaults.
 * `UPDATING.md` lists it as one of the things to re-check on every bump.
 */

const clnrest = {
  backend: 'clnrest' as const,
  address: '10.0.3.1:3010',
  rune: 'cln-rune',
}

const lndrest = {
  backend: 'lndrest' as const,
  address: '10.0.3.1:8080',
}

const config = {
  mint_info: {
    name: 'Sovereign Mint',
    description: 'Short description',
    description_long: 'Long description',
    motd: 'Hello',
    contact_email: 'mint@example.com',
    contact_nostr: 'npub1operator',
    contact_twitter: '@operator',
    icon_url: 'https://example.com/icon.png',
    tos_url: 'https://example.com/tos',
  },
  fees: {
    fee_percent: 1.5,
    fee_reserve_min: 250,
  },
  advanced: {
    log_level: 'WARNING' as const,
    input_fee_ppk: 2,
    max_peg_in: 1000,
    max_peg_out: 900,
    max_balance: 5000,
    peg_out_only: true,
    rate_limit: true,
    rate_limit_per_minute: 120,
  },
}

test('builds only the CLNRest environment for CLN', () => {
  const env = buildMintEnvironment(config, 'private-key', clnrest)

  assert.equal(env.MINT_DATABASE, '/data/mint')
  assert.equal(env.MINT_LISTEN_HOST, '0.0.0.0')
  assert.equal(env.MINT_LISTEN_PORT, '3338')
  assert.equal(env.MINT_BACKEND_BOLT11_SAT, 'CLNRestWallet')
  assert.equal(env.MINT_CLNREST_URL, 'http://10.0.3.1:3010')
  assert.equal(env.MINT_CLNREST_RUNE, 'cln-rune')
  assert.equal('MINT_LND_REST_ENDPOINT' in env, false)
  assert.equal('MINT_LND_REST_CERT' in env, false)
  assert.equal('MINT_LND_REST_MACAROON' in env, false)
  assert.equal('MINT_LND_REST_CERT_VERIFY' in env, false)
  assert.equal(env.MINT_PRIVATE_KEY, 'private-key')
})

test('builds only the verified LND REST environment for LND', () => {
  const env = buildMintEnvironment(null, 'seed', lndrest)

  assert.equal(env.MINT_BACKEND_BOLT11_SAT, 'LndRestWallet')
  assert.equal(env.MINT_LND_REST_ENDPOINT, 'https://10.0.3.1:8080')
  assert.equal(env.MINT_LND_REST_CERT, lndRestRuntime.rootCaPath)
  assert.equal(env.MINT_LND_REST_MACAROON, lndRestRuntime.macaroon)
  assert.equal(env.MINT_LND_REST_CERT_VERIFY, 'true')
  assert.equal('MINT_CLNREST_URL' in env, false)
  assert.equal('MINT_CLNREST_RUNE' in env, false)
})

test('does not accept caller-controlled LND credential paths', () => {
  const env = buildMintEnvironment(null, 'seed', {
    ...lndrest,
    // @ts-expect-error LND credential paths are fixed by the StartOS runtime.
    rootCaPath: '/caller/ca.pem',
    macaroonPath: '/caller/admin.macaroon',
  })

  assert.equal(env.MINT_LND_REST_CERT, lndRestRuntime.rootCaPath)
  assert.equal(env.MINT_LND_REST_MACAROON, lndRestRuntime.macaroon)
})

test('maps operator settings to current Nutshell environment variables', () => {
  const env = buildMintEnvironment(config, 'private-key', clnrest)

  assert.equal(env.MINT_INFO_NAME, 'Sovereign Mint')
  assert.equal(
    env.MINT_INFO_CONTACT,
    JSON.stringify([
      ['email', 'mint@example.com'],
      ['nostr', 'npub1operator'],
      ['twitter', '@operator'],
    ]),
  )
  assert.equal(env.LIGHTNING_FEE_PERCENT, '1.5')
  assert.equal(env.MINT_MAX_MINT_BOLT11_SAT, '1000')
  assert.equal(env.MINT_MAX_MELT_BOLT11_SAT, '900')
  assert.equal(env.MINT_MAX_BALANCE, '5000')
  assert.equal(env.MINT_BOLT11_DISABLE_MINT, 'true')
  assert.equal(env.MINT_RATE_LIMIT, 'true')
  assert.equal(env.MINT_GLOBAL_RATE_LIMIT_PER_MINUTE, '120')
})

test('omits optional values and deprecated variable names', () => {
  const env = buildMintEnvironment(
    {
      ...config,
      mint_info: {
        ...config.mint_info,
        contact_email: '',
        contact_nostr: '',
        contact_twitter: '',
        icon_url: '',
        tos_url: '',
      },
      advanced: {
        ...config.advanced,
        max_peg_in: 0,
        max_peg_out: 0,
        max_balance: 0,
      },
    },
    'private-key',
    clnrest,
  )

  assert.equal(env.MINT_INFO_CONTACT, undefined)
  assert.equal(env.MINT_INFO_ICON_URL, undefined)
  assert.equal(env.MINT_MAX_MINT_BOLT11_SAT, undefined)
  assert.equal(env.MINT_MAX_MELT_BOLT11_SAT, undefined)
  assert.equal(env.MINT_MAX_BALANCE, undefined)
  assert.equal(env.MINT_DATABASE_DIR, undefined)
  assert.equal(env.MINT_MAX_PEG_IN, undefined)
  assert.equal(env.MINT_MAX_PEG_OUT, undefined)
  assert.equal(env.MINT_PEG_OUT_ONLY, undefined)
})

test('keeps upstream rate limiting enabled when no preference is stored', () => {
  const env = buildMintEnvironment(null, 'private-key', clnrest)

  assert.equal(env.MINT_RATE_LIMIT, 'true')
  assert.equal(env.MINT_GLOBAL_RATE_LIMIT_PER_MINUTE, '60')
})
