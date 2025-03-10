import browser from "webextension-polyfill";

// Wait for the DOM to finish loading
// This is to ensure that the content script can find the <umb-app> element in the DOM
// before we check if it is there or not

const checkDOMReadyAndFindUmbApp = `
    (function() {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            return document.getElementsByTagName('umb-app').length;
        } else {
            document.addEventListener('DOMContentLoaded', function() {
                return document.getElementsByTagName('umb-app').length;
            });
        }
    })();
`;


// Check if we can find the <umb-app> element in the page
// We check the length rather than getting the DOM element itself as it can NOT be serialized
// as JSON over the DevTools protocol. So hence a simple check for the length of the array
browser.devtools.inspectedWindow.eval(checkDOMReadyAndFindUmbApp).then((result) => {
    
    console.log('result of get elment by tag name.length', result);

    // We only expect the result of the JS call above to be 0 or 1
    // The result is an array of values that contains the result of the JS call and the other is any errors
    const valueOfEval = result[0];

    // As the value is 0 or 1 lets be lazy and use this like a boolean
    if(valueOfEval) {
        browser.devtools.panels.elements.createSidebarPane("Umbraco").then((sidebar) => {
            sidebar.setPage("devtools-panel.html");
        });
    } else {
        console.warn("Did not find the <umb-app> element in the page, so the Umbraco DevTools panel will not be shown.");
    }

}).catch((err) => {
    console.error('err', err);
});