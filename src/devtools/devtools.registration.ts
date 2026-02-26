import browser from "webextension-polyfill";

// Check if we can find the <umb-app> element in the page.
// Since Umbraco Bellissima is a SPA, <umb-app> may not exist immediately.
// We poll a few times to handle the case where it's added dynamically by JavaScript.
const MAX_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 500;

function checkForUmbApp(attempt: number) {
    browser.devtools.inspectedWindow.eval(
        `document.getElementsByTagName('umb-app').length`
    ).then((result) => {
        const valueOfEval = result[0];

        if (valueOfEval) {
            // Found <umb-app>, create the sidebar pane
            browser.devtools.panels.elements.createSidebarPane("Umbraco").then((sidebar) => {
                sidebar.setPage("devtools-panel.html");
            });
        } else if (attempt < MAX_ATTEMPTS) {
            // Not found yet, try again after a short delay
            setTimeout(() => checkForUmbApp(attempt + 1), POLL_INTERVAL_MS);
        }
    }).catch((err) => {
        console.error("Error: Trying to see if the inspected window contains <umb-app>", err);
    });
}

checkForUmbApp(1);
