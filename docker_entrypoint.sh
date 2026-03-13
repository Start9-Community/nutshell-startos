#!/bin/bash
set -e

CONFIG_PATH="/data/startos/config.yaml"

# Load config from StartOS if it exists
if [ -f "$CONFIG_PATH" ]; then
    export MINT_INFO_NAME=$(yq e '.mint_info.name' "$CONFIG_PATH")
    export MINT_INFO_DESCRIPTION=$(yq e '.mint_info.description' "$CONFIG_PATH")
    export MINT_BACKEND_BOLT11_SAT=$(yq e '.lightning.type' "$CONFIG_PATH")
    export MINT_FEE_PERCENT=$(yq e '.fees.fee_percent' "$CONFIG_PATH")
    export MINT_FEE_RESERVE_MIN=$(yq e '.fees.fee_reserve_min' "$CONFIG_PATH")
else
    export MINT_INFO_NAME="My Sovereign Mint"
    export MINT_INFO_DESCRIPTION="A private Cashu ecash mint."
    export MINT_BACKEND_BOLT11_SAT="CLNRpc"
fi

# Persistence: Manage private key
if [ ! -f /data/mint_private_key ]; then
    echo "Generating new MINT_PRIVATE_KEY..."
    openssl rand -hex 32 > /data/mint_private_key
fi
export MINT_PRIVATE_KEY=$(cat /data/mint_private_key)

# Automated Backend Configuration
if [ "$MINT_BACKEND_BOLT11_SAT" == "CLNRpc" ]; then
    export MINT_LIGHTNING_CLIENT_RPC="/home/bitcoin/.lightning/bitcoin/lightning-rpc"
fi

# Database path (persistent)
export MINT_DATABASE_DIR="/data"

# Mint port and host
export MINT_LISTEN_HOST="0.0.0.0"
export MINT_LISTEN_PORT="3338"

echo "Starting Nutshell Cashu Mint..."
echo "Mint Name: $MINT_INFO_NAME"
echo "Lightning Backend: $MINT_BACKEND_BOLT11_SAT"

# Execute the mint
exec python3 -m cashu.mint.run
