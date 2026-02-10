import { test, expect } from './fixtures';

const UMBRACO_BACKOFFICE_URL = 'https://backofficepreview.umbraco.com';

test.describe('Real Umbraco backoffice', () => {

	test('detects <umb-app> on backofficepreview.umbraco.com', async ({ context }) => {
		const page = await context.newPage();
		await page.goto(UMBRACO_BACKOFFICE_URL, { waitUntil: 'load' });

		// Umbraco Bellissima is a SPA — <umb-app> is added dynamically by JavaScript
		await page.waitForSelector('umb-app', { timeout: 30000 });

		const umbAppExists = await page.evaluate(() => {
			return document.getElementsByTagName('umb-app').length > 0;
		});

		expect(umbAppExists).toBe(true);
	});

	test('extension service worker remains healthy after navigating to Umbraco', async ({ context, extensionId }) => {
		const page = await context.newPage();
		await page.goto(UMBRACO_BACKOFFICE_URL, { waitUntil: 'load' });
		await page.waitForSelector('umb-app', { timeout: 30000 });

		// Give the content script time to detect <umb-app> and message the background
		await page.waitForTimeout(2000);

		// Verify service worker is still running (didn't crash)
		const serviceWorkers = context.serviceWorkers();
		const extensionWorker = serviceWorkers.find(sw => sw.url().includes(extensionId));
		expect(extensionWorker).toBeTruthy();
	});

	test('popup-found page renders correctly for detected Umbraco site', async ({ context, extensionId }) => {
		// First navigate to Umbraco so the extension detects it
		const page = await context.newPage();
		await page.goto(UMBRACO_BACKOFFICE_URL, { waitUntil: 'load' });
		await page.waitForSelector('umb-app', { timeout: 30000 });

		// Verify the "found" popup page exists and renders
		const popupPage = await context.newPage();
		await popupPage.goto(`chrome-extension://${extensionId}/popup-found.html`);
		await expect(popupPage.locator('h4')).toHaveText('Found Umbraco App');
	});

	test('devtools panel HTML loads and renders initial state', async ({ context, extensionId }) => {
		// Load the devtools panel page directly in a tab
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/devtools-panel.html`);

		// The <umb-devtools> component should be present in the DOM
		const umbDevtools = page.locator('umb-devtools');
		await expect(umbDevtools).toBeAttached();

		// Without a real DevTools context, it should show the "no selection" message
		// (the component renders this when contextData is empty)
		await expect(page.getByText('Please select a DOM element from the elements pane')).toBeVisible();
	});
});
