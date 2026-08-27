import type { manifest as lndManifest } from 'lnd-startos/startos/manifest'
import { configYaml } from './fileModels/config.yaml'
import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { assertLightningBackend } from './lightningBackend'
import { resolveLightningConnection } from './lightningConnection'
import { selectStartOsRootCa } from './lightningProbe'
import {
  mountPolicyForBackend,
  prepareRuntimeCredentials,
  prepareSubcontainerOrDestroy,
  resolveSelectedRuntime,
} from './lightningRuntime'
import { buildMintEnvironment, MINT_PORT } from './mintEnvironment'
import { sdk } from './sdk'
import { mintSeedFile } from './utils'

type MintMountPolicy = ReturnType<typeof mountPolicyForBackend>

function buildMintMounts(policy: MintMountPolicy) {
  let mounts = sdk.Mounts.of().mountVolume(policy.main)
  for (const dependency of policy.dependencies) {
    mounts = mounts.mountDependency<typeof lndManifest>(dependency)
  }
  return mounts
}

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting Nutshell'))

  const backendState = await storeJson
    .read((store) => store.lightningBackend)
    .const(effects)
  assertLightningBackend(backendState)

  const runtime = await resolveSelectedRuntime(backendState, (backend) =>
    resolveLightningConnection(effects, backend, 'reactive'),
  )
  const config = await configYaml.read().const(effects)
  const seed = await sdk.volumes.main
    .readFile(mintSeedFile, 'utf-8')
    .catch(() => '')

  const rootCa = runtime.requiresRootCa
    ? selectStartOsRootCa(await sdk.getSslCertificate(effects, []).const())
    : null
  const subcontainer = sdk.SubContainer.of(
    effects,
    { imageId: 'main' },
    buildMintMounts(runtime.mounts),
    'nutshell-sub',
  )

  await prepareSubcontainerOrDestroy(
    () =>
      prepareRuntimeCredentials(runtime, rootCa, {
        writeFile: (path, contents) => subcontainer.writeFile(path, contents),
        requireNonemptyFile: async (path) => {
          try {
            await subcontainer.execFail(['test', '-s', path])
          } catch {
            throw new Error('Selected LND REST macaroon is unavailable')
          }
        },
      }),
    () => subcontainer.destroy(),
  )

  return sdk.Daemons.of(effects).addDaemon('primary', {
    subcontainer,
    exec: {
      command: ['poetry', 'run', 'mint'],
      env: buildMintEnvironment(config, String(seed), runtime.connection),
    },
    ready: {
      display: i18n('Cashu Mint'),
      fn: () =>
        sdk.healthCheck.checkPortListening(effects, MINT_PORT, {
          successMessage: i18n('The mint is responsive'),
          errorMessage: i18n('The mint is not ready'),
        }),
    },
    requires: [],
  })
})
