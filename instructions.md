# Nutshell Cashu Mint

> [!IMPORTANT]
> **Choose Core Lightning or LND once for a new mint.** The selected Lightning
> backend is permanent after Nutshell validates it. Switching wallets underneath
> an established mint can break its accounting and strand users' ecash, so there
> is no switch, reset, or automatic fallback. Existing Nutshell installations
> remain locked to Core Lightning when they update.

> [!WARNING]
> **You are holding other people's money.** A Cashu mint issues bearer tokens
> against Bitcoin you custody. If you lose the mint's seed or database, the
> ecash your users hold cannot be redeemed. Back up early, back up after real
> activity, and confirm at least once that a backup restores.

## Documentation

- [Nutshell README](https://github.com/cashubtc/nutshell/blob/main/README.md) — the upstream project, including what each mint setting does.
- [Cashu documentation](https://docs.cashu.space) — how Cashu itself works: mints, proofs, and the NUT specifications the settings refer to.

## What you get on StartOS

- A Cashu mint connected to the Core Lightning or LND node you select on the
  same StartOS system. The services exchange connection details automatically;
  there is no rune, macaroon, certificate, or configuration file to copy.
- An address for Cashu wallets. Public mint access is independent from the
  internal Lightning connection, so you can expose the same mint over LAN, Tor,
  a domain, or Start Tunnel as you choose.
- The mint seed, database, settings, and locked backend in one backup flow, so
  restoring preserves both the mint and its Lightning choice.

## Getting set up

Nutshell starts with working mint defaults, but a fresh installation must lock
one Lightning backend first:

1. **Choose the node this mint will use permanently.** Changing it later
   requires creating a genuinely fresh Nutshell mint.
2. **Install and start that node on the same StartOS system.**
   - For **Core Lightning**, enable CLNRest in Core Lightning's settings and
     restart it. CLNRest is not enabled by default.
   - For **LND**, initialize and unlock its wallet so its REST interface is
     available.
3. **Install Nutshell and open its critical _Select Lightning Backend_ task.**
   Choose the node you prepared. Nutshell authenticates to that exact node and
   stores the choice only after validation succeeds.
4. **Start Nutshell.** It generates its mint seed on first install and uses the
   selected node. If that node becomes unavailable, Nutshell fails closed and
   never tries the other backend.
5. **Run _Mint Info_.** Give the mint a name and description, then add any
   contact and policy links you want wallets to display before you publish the
   mint address.
6. **Run _Advanced Settings_ if you want limits.** Per-deposit,
   per-redemption, and total-balance ceilings start unlimited.
7. **Take a backup.** Restore it somewhere safe once to prove the mint and its
   locked backend selection come back.

For LND, StartOS carries the masked admin macaroon through the internal
interface. Nutshell verifies the proxy-terminated HTTPS connection against the
StartOS root CA and writes the decoded credential only to an ephemeral file in
its own container. No LND volume is mounted and no credential is copied by the
operator. The admin macaroon is more privileged than the restricted CLNRest
rune, so protect access to both services and your StartOS system.

## Using Nutshell

### Connecting a wallet

Copy an address from the **Cashu Mint API** interface and add it as a mint in
any Cashu wallet, such as [cashu.me](https://cashu.me) or a mobile wallet that
supports custom mints.

Test with a small deposit and redemption before anyone else uses it. That round
trip is the only thing that proves the Lightning path works end to end; a green
health check only means the mint is answering.

### Actions

- **Mint Info** — name, descriptions, message of the day, contact details, and
  policy links wallets display for your mint.
- **Lightning Fees** — the reserve held back for outgoing Lightning routing.
  Unused reserve is not spent. Too little can make redemptions fail; too much
  makes redeeming look expensive.
- **Advanced Settings** — log level, input fee, deposit/redemption/balance
  ceilings, redemptions-only mode, and API rate limiting.

  > **A limit of 0 means unlimited**, not zero.
  >
  > **Redemptions Only** stops new issuance while leaving existing ecash
  > redeemable. Use it to wind a mint down without stranding users.

- **Mint Status** — confirms the seed is on disk and shows the locked Lightning
  backend, listener, database, and log level. It also works while stopped.

## Failure and recovery

The locked backend is authoritative. If it is stopped, unhealthy, uninstalled,
or rejects its credential, Nutshell remains stopped. Repair, start, initialize,
unlock, or reinstall that same node, then start Nutshell again. It will not
inspect or activate another installed Lightning node.

## Restoring from a backup

Restoring brings back the seed, database, settings, and locked backend choice.
Install and start the same backend on the restored StartOS system; its current
internal address and credential are discovered automatically. No credential
needs to be re-entered. Older CLN-only backups are migrated to locked CLN.

A restore cannot recover ecash issued after the backup. Those tokens exist in
wallets but not in the restored ledger, and the mint will refuse them. Back up
after real activity, not on a schedule intended for a stateless service.

## Limitations

- **The supported Lightning backends are CLNRest and LND REST.** Upstream's
  other backends are not exposed, and the selected backend cannot be switched.
- **Lightning must be local to this StartOS system.** Remote or LAN Lightning
  node configuration is not supported. This does not restrict the public Cashu
  Mint API, which can still use LAN, Tor, domains, or Start Tunnel.
- **SQLite is the only database.** PostgreSQL, Redis caching, management RPC,
  and OIDC login are not exposed.
- **This is the mint only.** Use a separate Cashu wallet to hold and spend the
  ecash it issues.
