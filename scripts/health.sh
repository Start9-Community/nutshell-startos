#!/bin/bash
set -e

# Ping the Nutshell /v1/info endpoint
STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3338/v1/info)

if [ "$STATUS_CODE" -eq 200 ]; then
    echo "The mint is active and healthy."
    exit 0
else
    echo "Mint health check failed with status code: $STATUS_CODE"
    exit 1
fi
