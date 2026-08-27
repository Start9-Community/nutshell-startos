import type { LightningBackend } from './lightningBackend'
import { lndDependencyMount, lndRestRuntime } from './lndRestRuntime.mjs'

export { lndRestRuntime } from './lndRestRuntime.mjs'

export const probeHttpTimeoutSeconds = 5
export const probeExecTimeoutMs = 15_000

const clnProbeScript = `
import os
import sys
import urllib.request

credential = sys.stdin.read()
request = urllib.request.Request(
    os.environ["PROBE_URL"] + "/v1/listfunds",
    data=b"{}",
    headers={
        "Content-Type": "application/json",
        "rune": credential,
    },
    method="POST",
)
with urllib.request.urlopen(request, timeout=${probeHttpTimeoutSeconds}) as response:
    response.read()
`.trim()

const lndProbeScript = `
import os
import ssl
import urllib.request

if os.environ["PROBE_CERT_VERIFY"] != "true":
    raise RuntimeError("certificate verification must remain enabled")
with open(os.environ["PROBE_CREDENTIAL"], "rb") as macaroon_file:
    macaroon = macaroon_file.read().hex()
context = ssl.create_default_context(cafile=os.environ["PROBE_CERT"])
request = urllib.request.Request(
    os.environ["PROBE_URL"] + "/v1/getinfo",
    headers={"Grpc-Metadata-macaroon": macaroon},
    method="GET",
)
with urllib.request.urlopen(request, timeout=${probeHttpTimeoutSeconds}, context=context) as response:
    response.read()
`.trim()

type ClnProbeOptions = {
  endpoint: string
  credential: string
}

type LndProbeOptions = {
  endpoint: string
}

export type ProbeSpec = {
  command: string[]
  env: Record<string, string>
  input?: string
}

export function buildProbeSpec(
  backend: 'clnrest',
  options: ClnProbeOptions,
): ProbeSpec
export function buildProbeSpec(
  backend: 'lndrest',
  options: LndProbeOptions,
): ProbeSpec
export function buildProbeSpec(
  backend: LightningBackend,
  options: ClnProbeOptions | LndProbeOptions,
): ProbeSpec {
  if (backend === 'clnrest') {
    if (!('credential' in options)) {
      throw new Error('CLNRest probe credential is missing')
    }
    return {
      command: ['poetry', 'run', 'python', '-c', clnProbeScript],
      env: {
        PROBE_URL: options.endpoint,
      },
      input: options.credential,
    }
  }

  return {
    command: ['poetry', 'run', 'python', '-c', lndProbeScript],
    env: {
      PROBE_URL: options.endpoint,
      PROBE_CERT_VERIFY: 'true',
      PROBE_CERT: lndRestRuntime.rootCaPath,
      PROBE_CREDENTIAL: lndRestRuntime.macaroon,
    },
  }
}

export function probeRuntimeForBackend(backend: LightningBackend) {
  return backend === 'clnrest'
    ? ({ mounts: [] } as const)
    : ({
        mounts: [lndDependencyMount],
        tls: {
          source: 'startos-root-ca',
          rootCaPath: lndRestRuntime.rootCaPath,
          verify: true,
        },
      } as const)
}

export function selectStartOsRootCa(chain: readonly string[]) {
  const rootCa = chain.at(-1)?.trim()
  if (!rootCa) {
    throw new Error('StartOS root CA is unavailable')
  }
  return rootCa
}
