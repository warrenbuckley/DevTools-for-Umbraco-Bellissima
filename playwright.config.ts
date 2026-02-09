import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './tests',
	timeout: 60000,
	retries: 0, // No retries - we want to see failures
	workers: 1, // Extensions need sequential execution (persistent contexts)
	reporter: 'list',
	use: {
		// Extension tests only work in Chromium
		browserName: 'chromium',
	},
});
