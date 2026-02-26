import { test, expect } from './fixtures';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local test pages that simulate Umbraco backoffice behavior
const DELAYED_UMB_APP_PAGE = `file://${path.resolve(__dirname, 'test-pages/umbraco-sim.html')}`;
const IMMEDIATE_UMB_APP_PAGE = `file://${path.resolve(__dirname, 'test-pages/umbraco-sim-immediate.html')}`;

test.describe('Extension loading', () => {
	test('service worker starts successfully', async ({ extensionId }) => {
		expect(extensionId).toBeTruthy();
		console.log(`Extension loaded with ID: ${extensionId}`);
	});

	test('popup pages render correctly', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup-not-found.html`);
		await expect(page.locator('h4')).toHaveText('Not Found Umbraco App');
		await page.goto(`chrome-extension://${extensionId}/popup-found.html`);
		await expect(page.locator('h4')).toHaveText('Found Umbraco App');
	});
});

test.describe('Content script umb-app detection', () => {
	test('detects umb-app when it exists in static HTML', async ({ context }) => {
		// Baseline: <umb-app> is in the static HTML, content script should find it
		const page = await context.newPage();
		await page.goto(IMMEDIATE_UMB_APP_PAGE, { waitUntil: 'load' });
		await page.waitForTimeout(2000);

		const result = await page.evaluate(() => {
			return {
				umbAppExists: document.getElementsByTagName('umb-app').length > 0,
				timings: (window as any).__timings,
			};
		});

		console.log('Static <umb-app> test:', JSON.stringify(result, null, 2));
		expect(result.umbAppExists).toBe(true);
		expect(result.timings.umbAppExistsAtDCL).toBe(true);
	});

	test('detects umb-app when added dynamically after page load (SPA behavior)', async ({ context }) => {
		// This simulates how Umbraco Bellissima actually works:
		// <umb-app> is created dynamically by JavaScript AFTER DOMContentLoaded.
		// The MutationObserver in the fixed content script should catch this.
		const page = await context.newPage();
		await page.goto(DELAYED_UMB_APP_PAGE, { waitUntil: 'load' });
		await page.waitForTimeout(3000);

		const result = await page.evaluate(() => {
			return {
				umbAppExistsNow: document.getElementsByTagName('umb-app').length > 0,
				timings: (window as any).__timings,
			};
		});

		console.log('\n=== DYNAMIC SPA DETECTION TEST ===');
		console.log(`<umb-app> exists at DOMContentLoaded: ${result.timings.umbAppExistsAtDCL}`);
		console.log(`<umb-app> exists now (after SPA bootstrap): ${result.umbAppExistsNow}`);

		if (result.timings.umbAppCreatedAt && result.timings.domContentLoadedAt) {
			const delta = result.timings.umbAppCreatedAt - result.timings.domContentLoadedAt;
			console.log(`<umb-app> created ${delta.toFixed(0)}ms AFTER DOMContentLoaded`);
		}

		// <umb-app> was NOT present at DOMContentLoaded (proves it's a dynamic SPA)
		expect(result.timings.umbAppExistsAtDCL).toBe(false);

		// But it exists now - the SPA added it dynamically
		expect(result.umbAppExistsNow).toBe(true);

		// The MutationObserver in the content script should have detected it
		console.log('Content script MutationObserver should have detected the dynamic <umb-app>');
	});

	// Run the delayed scenario multiple times to confirm reliable detection
	for (let i = 0; i < 3; i++) {
		test(`delayed umb-app detection attempt ${i + 1}/3 (reliability check)`, async ({ context }) => {
			const page = await context.newPage();
			await page.goto(DELAYED_UMB_APP_PAGE, { waitUntil: 'load' });
			await page.waitForTimeout(3000);

			const result = await page.evaluate(() => ({
				umbAppExistsNow: document.getElementsByTagName('umb-app').length > 0,
				umbAppExistsAtDCL: (window as any).__timings?.umbAppExistsAtDCL,
			}));

			console.log(`Attempt ${i + 1}: DOM has <umb-app>=${result.umbAppExistsNow}, at DCL=${result.umbAppExistsAtDCL}`);

			// Element was NOT present at DOMContentLoaded (dynamic SPA page)
			expect(result.umbAppExistsAtDCL).toBe(false);
			// But it IS present now (SPA rendered it)
			expect(result.umbAppExistsNow).toBe(true);
		});
	}
});
