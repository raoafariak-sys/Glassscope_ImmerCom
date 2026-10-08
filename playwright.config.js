// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const PORT = 4173;

module.exports = defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}/Glassscope_ImmerCom/`,
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: `node tests/serve.js`,
    env: { PORT: String(PORT) },
    url: `http://127.0.0.1:${PORT}/Glassscope_ImmerCom/`,
    reuseExistingServer: !process.env.CI,
  },
});
