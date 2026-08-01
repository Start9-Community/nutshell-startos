import { VersionGraph } from '@start9labs/start-sdk'
import { v0_19_2_0 } from './versions/v0.19.2.0'
import { v0_19_2_1 } from './versions/v0.19.2.1'
import { v0_19_2_2 } from './versions/v0.19.2.2'
import { v0_19_2_3 } from './versions/v0.19.2.3'
import { v0_19_2_4 } from './versions/v0.19.2.4'

export const versionGraph = VersionGraph.of({
  current: v0_19_2_4,
  other: [v0_19_2_0, v0_19_2_1, v0_19_2_2, v0_19_2_3],
})
