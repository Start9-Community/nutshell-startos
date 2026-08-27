import type { LightningBackend } from './lightningBackend'

export const probeHttpTimeoutSeconds = 5
export const probeExecTimeoutMs = 15_000

export const lndCredentialPaths = {
  certificate: '/mnt/lnd/tls.cert',
  macaroon: '/mnt/lnd/data/chain/bitcoin/mainnet/admin.macaroon',
} as const

const clnProbeScript = `
import os
import urllib.request

request = urllib.request.Request(
    os.environ["PROBE_URL"] + "/v1/listfunds",
    data=b"{}",
    headers={
        "Content-Type": "application/json",
        "rune": os.environ["PROBE_CREDENTIAL"],
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
        PROBE_CREDENTIAL: options.credential,
      },
    }
  }

  return {
    command: ['poetry', 'run', 'python', '-c', lndProbeScript],
    env: {
      PROBE_URL: options.endpoint,
      PROBE_CERT_VERIFY: 'true',
      PROBE_CERT: lndCredentialPaths.certificate,
      PROBE_CREDENTIAL: lndCredentialPaths.macaroon,
    },
  }
}

const lndProbeMount = {
  dependencyId: 'lnd',
  volumeId: 'main',
  subpath: null,
  mountpoint: '/mnt/lnd',
  readonly: true,
} as const

export function probeRuntimeForBackend(backend: LightningBackend) {
  return backend === 'clnrest'
    ? ({ mounts: [] } as const)
    : ({ mounts: [lndProbeMount] } as const)
}
