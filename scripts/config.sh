#!/bin/bash
set -e

CONFIG_PATH="/data/startos/config.yaml"

# "get" command: return the config schema and current values
get() {
  # If config.yaml doesn't exist, return empty config with the spec
  if [ ! -f "$CONFIG_PATH" ]; then
    yq e '{"spec": .}' scripts/config_spec.yaml
  else
    # Merge existing config into the spec for the UI
    yq e '{"spec": .} * {"config": load("'$CONFIG_PATH'")}' scripts/config_spec.yaml
  fi
}

# "set" command: write the new config to the persistent volume
set() {
  # Save the config passed from the OS via stdin
  mkdir -p "$(dirname "$CONFIG_PATH")"
  cat > "$CONFIG_PATH"
  echo "Config saved successfully."
}

# Dispatch based on the first argument
case "$1" in
  get)
    get
    ;;
  set)
    set
    ;;
  *)
    echo "Unknown command: $1"
    exit 1
    ;;
esac
