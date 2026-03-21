import { VersionInfo } from '@start9labs/start-sdk';

export const v0_19_2_0 = VersionInfo.of({
  version: '0.19.2:0',
  releaseNotes: 'Initial release for StartOS v0.4.0 architecture.',
  migrations: {
    up: async ({ effects }) => {},
    down: async ({ effects }) => {},
  },
});
