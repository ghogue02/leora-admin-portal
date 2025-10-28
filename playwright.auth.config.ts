import baseConfig from './playwright.config';
import type { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  ...baseConfig,
  testMatch: '**/auth.setup.ts',
  reporter: [['list']],
  retries: 0,
};

export default config;
