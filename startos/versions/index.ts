import { VersionGraph } from '@start9labs/start-sdk'
import { current } from './current'
import { v_0_20_3_0 } from './v0_20_3_0'
import { v_0_20_3_1 } from './v0_20_3_1'

export const versionGraph = VersionGraph.of({
  current,
  other: [v_0_20_3_0, v_0_20_3_1],
})
