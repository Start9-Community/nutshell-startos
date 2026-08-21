# Nutshell Cashu Mint

> [!IMPORTANT]
> **Install Core Lightning first and turn CLNRest on in its config.** Nutshell settles every deposit and redemption through it, and will not start without it. CLNRest is not enabled by default — switch it on in Core Lightning's own settings and restart it before you start Nutshell.

> [!WARNING]
> **You are holding other people's money.** A Cashu mint issues bearer tokens against Bitcoin you custody. If you lose the mint's seed or its database, the ecash your users hold cannot be redeemed — by you or by anyone. Back up early, back up after real activity, and confirm at least once that a backup restores.

## Documentation

- [Nutshell README](https://github.com/cashubtc/nutshell/blob/main/README.md) — the upstream project, including what each mint setting does.
- [Cashu documentation](https://docs.cashu.space) — how Cashu itself works: mints, proofs, and the NUT specifications the settings refer to.

## What you get on StartOS

- A running Cashu mint, wired to your own Core Lightning node. No credentials to copy and no configuration file to write — the two services find each other.
- An address you hand to Cashu wallets. Your server manages every form of it, so the same mint is reachable on your LAN, over Tor, or on a domain, as you choose.
- The mint's seed and database on one backed-up volume, so a single restore brings the whole mint back.

## Getting set up

Nutshell starts with working defaults, so there is nothing you must configure to get a mint running. Do these in order:

1. **Install and start Core Lightning, with CLNRest enabled.** Nutshell will not start until it can reach it.
2. **Start Nutshell.** It generates its own mint seed on first install and comes up on the defaults.
3. **Run *Mint Info*.** Give the mint a name and a description — this is what wallets show people before they trust it with money — and add whatever contact and policy links you want published. Do this before you share the address.
4. **Run *Advanced Settings* if you want limits.** Per-deposit, per-redemption and total-balance ceilings all start unlimited. A new mint is a good place to be conservative.
5. **Take a backup.** Then restore it somewhere and check the mint comes back.

Nutshell restarts itself after each of these, which is when the change takes effect.

## Using Nutshell

### Connecting a wallet

Copy an address from the **Cashu Mint API** interface and add it as a mint in any Cashu wallet — for example [cashu.me](https://cashu.me), or a mobile wallet that supports adding a custom mint.

Test with a small deposit and redemption before anyone else uses it. That round trip is the only thing that proves the Lightning path works end to end; a green health check only means the mint is answering.

### Actions

- **Mint Info** — the name, descriptions, message of the day, contact details and policy links wallets display for your mint.
- **Lightning Fees** — how much of each outgoing Lightning payment is held back for routing. Both settings are a *reserve*, not a charge: what isn't needed isn't spent. Too low and redemptions fail to route; too high and redeeming looks expensive.
- **Advanced Settings** — log level, the fee you charge on inputs, ceilings on deposits, redemptions and total balance, a redemptions-only switch, and API rate limiting.

  > **A limit of 0 means unlimited**, not zero. Leave a limit at 0 to not have one.
  >
  > **Redemptions Only** stops the mint issuing new ecash while leaving what is already out there redeemable. That is how you wind a mint down without stranding your users — turn it on, let people cash out, and only then shut it off.
- **Mint Status** — confirms the mint seed is still on disk, and shows which Lightning backend, listener and database the mint is using. Run this first if something looks wrong; it works whether or not the service is running.

## Restoring from a backup

Restoring brings back the whole mint — seed, database, and your settings — and nothing needs re-entering. Core Lightning is found again automatically, even if its addresses changed.

The one thing a restore cannot do is recover ecash issued *after* the backup was taken. Those tokens exist in people's wallets but not in the restored ledger, and the mint will refuse them. Take a backup after any real activity, not on a schedule you would use for a service that holds nothing.

## Limitations

- **Core Lightning is the only supported Lightning backend**, and SQLite the only database. Upstream's other backends, PostgreSQL, Redis caching, management RPC and OIDC login are not available here.
- **This is the mint only.** Upstream also ships a Cashu wallet; that is not part of this package. Use any Cashu wallet to hold and spend the ecash your mint issues.
