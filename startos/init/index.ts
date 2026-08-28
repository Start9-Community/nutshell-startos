import { actions } from '../actions'
import { restoreInit } from '../backups'
import { setDependencies } from '../dependencies'
import { setInterfaces } from '../interfaces'
import { sdk } from '../sdk'
import { versionGraph } from '../versions'
import { generateMintSeed } from './generateMintSeed'
import { seedFiles } from './seedFiles'
import { taskSelectLightningBackend } from './taskSelectLightningBackend'

export const init = sdk.setupInit(
  restoreInit,
  versionGraph,
  seedFiles,
  setInterfaces,
  setDependencies,
  actions,
  taskSelectLightningBackend,
  generateMintSeed,
)

export const uninit = sdk.setupUninit(versionGraph)
