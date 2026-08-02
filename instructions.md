# Getting Started

Nutshell runs a Cashu ecash mint backed by your Core Lightning service. The mint
holds Bitcoin on behalf of ecash users, so protect its StartOS backup and treat
its operator settings as production financial infrastructure.

## Before You Start

Install and start Core Lightning with CLNRest enabled. Nutshell discovers its
internal address and restricted rune automatically; you do not need to copy
credentials between services.

Create a StartOS backup before upgrading an existing mint. Upstream database
migrations may prevent downgrading afterward.

## Configure the Mint

Use the service actions:

1. **Mint Info** — set a recognizable name, operator contacts, description,
   icon, terms URL, and message of the day.
2. **Lightning Fees** — set the percentage and minimum routing-fee reserve for
   outgoing payments.
3. **Advanced Settings** — review input fees, transaction limits, maximum
   balance, rate limiting, and log level.
4. Start the service and open **Mint Status** to confirm that the private key,
   CLNRest backend, listener, and database are present.

Restart Nutshell after changing configuration.

## Connect a Wallet

Copy an address from the **Cashu Mint API** interface and add it as a mint in a
compatible Cashu wallet or service such as cashu.me. StartOS manages LAN, Tor,
clearnet, tunnel, and TLS addresses; Nutshell itself speaks HTTP only on the
isolated internal bridge.

Test with a small mint and melt before accepting larger balances.

## Backups

The StartOS backup contains the SQLite database, mint seed, and configuration
together. Losing the seed or restoring it without its matching database can
make outstanding ecash unrecoverable. Keep multiple tested backups in secure
locations.

## Limitations

This package supports Core Lightning through CLNRest and embedded SQLite. Other
upstream Lightning backends, PostgreSQL, Redis caching, management RPC, and OIDC
authentication are not exposed through StartOS.

For Cashu protocol and Nutshell operational details, see the
[upstream project](https://github.com/cashubtc/nutshell).
