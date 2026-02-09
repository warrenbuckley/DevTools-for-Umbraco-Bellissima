import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Playwright fixtures for testing the browser extension.
 * Loads the extension from the extension/ directory using a persistent Chromium context.
 */
export const test = base.extend<{
	context: BrowserContext;
	extensionId: string;
}>({
	// eslint-disable-next-line no-empty-pattern
	context: async ({}, use) => {
		const pathToExtension = path.resolve(__dirname, '../extension');
		const context = await chromium.launchPersistentContext('', {
			headless: false,
			args: [
				`--disable-extensions-except=${pathToExtension}`,
				`--load-extension=${pathToExtension}`,
				// Needed for headless environments
				'--no-sandbox',
			],
		});
		await use(context);
		await context.close();
	},
	extensionId: async ({ context }, use) => {
		// For Manifest V3: get extension ID from the service worker
		let [background] = context.serviceWorkers();
		if (!background) {
			background = await context.waitForEvent('serviceworker');
		}
		const extensionId = background.url().split('/')[2];
		await use(extensionId);
	},
});

export const expect = test.expect;
