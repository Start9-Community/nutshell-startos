# Nutshell Cashu Mint

Nutshell is an open-source Cashu ecash mint for Bitcoin. This StartOS package
connects it to Core Lightning through CLNRest, stores its SQLite database and
mint seed on a backed-up StartOS volume, and publishes its Cashu API through
StartOS-managed network addresses.

Operators can configure public mint metadata, Lightning routing-fee reserves,
input fees, balance and transaction limits, rate limiting, and logging from the
StartOS service actions.

Cashu mint operators custody Bitcoin for ecash holders. Secure backups and
careful upgrade testing are essential.
