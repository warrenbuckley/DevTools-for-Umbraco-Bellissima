import browser from "webextension-polyfill";

// Track DevTools panel connections by tab ID
let _devToolsConnections: { [tabId: number]: browser.Runtime.Port } = {};

browser.runtime.onConnect.addListener((port) => {

    if (port.name === "devtools") {
        // Connection from the DevTools panel
        const devToolsListener = (message: any) => {
            switch (message.name) {
                case "init":
                    // Store this DevTools connection mapped to its inspected tab ID
                    _devToolsConnections[message.tabId] = port;

                    // Send a message back to DevTools
                    port.postMessage({
                        name: "init",
                        message: "This message has come from init in the background script"
                    });
                    break;
            }
        };

        port.onMessage.addListener(devToolsListener);

        port.onDisconnect.addListener(() => {
            port.onMessage.removeListener(devToolsListener);

            // Clean up the connection from the map
            for (const [tabId, conn] of Object.entries(_devToolsConnections)) {
                if (conn === port) {
                    delete _devToolsConnections[Number(tabId)];
                    break;
                }
            }
        });
    } else if (port.name === "content-script") {
        // Connection from the content script
        const contentScriptListener = (message: any, senderPort: browser.Runtime.Port) => {
            const tabId = senderPort.sender?.tab?.id;
            if (!tabId) return;

            switch (message.name) {
                case "contextData":
                    // Relay context data to the DevTools panel for this tab
                    if (_devToolsConnections[tabId]) {
                        _devToolsConnections[tabId].postMessage({
                            name: message.name,
                            data: message.data,
                        });
                    }
                    break;

                case "detectedUmbApp":
                    // Content script has found <umb-app> in DOM
                    // Change the browser action to show enabled state
                    browser.action.setPopup({
                        popup: "popup-found.html",
                        tabId: tabId,
                    });
                    browser.action.setIcon({
                        path: {
                            16: "icons/icon-16.png",
                            48: "icons/icon-48.png",
                            128: "icons/icon-128.png",
                            256: "icons/icon-256.png",
                        },
                        tabId: tabId,
                    });
                    break;
            }
        };

        port.onMessage.addListener(contentScriptListener);

        port.onDisconnect.addListener(() => {
            port.onMessage.removeListener(contentScriptListener);
        });
    }
});
