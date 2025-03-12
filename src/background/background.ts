import browser from "webextension-polyfill";

let id:number;
let connections: { [id: number]: browser.Runtime.Port } = {};


browser.runtime.onConnect.addListener((devToolsConnection) => {
    
    const devToolsListener = (message:any, port:browser.Runtime.Port) => {

        switch (message.name) {
            case "init":
                id = message.tabId;
                connections[id] = devToolsConnection;

                // Send a message back to DevTools
                connections[id].postMessage({
                    name: "init",
                    message: "This message has come from init in the background script"
                }); 
                break;

            case "contextData":
                // Send/relay the message back to DevTools code to deal with it
                connections[id].postMessage({ name: message.name, data: message.data });
                break;
            
            case "detectedUmbApp":
                // Content script has found <umb-app> in DOM
                // So make the browser action change to color to show like an enabled state
                // Also change the HTML url of the popup to be found.html

                browser.action.setPopup({
                    popup: "popup-found.html",
                    tabId: port.sender?.tab?.id
                });
                browser.action.setIcon({
                    path: {
                        16: "icons/icon-16.png",
                        48: "icons/icon-48.png",
                        128: "icons/icon-128.png",
                        256: "icons/icon-256.png"
                    },
                    tabId: port.sender?.tab?.id
                });
                break;
        }
    };

    devToolsConnection.onMessage.addListener(devToolsListener);

    // When the connection to this background script is disconnected
    // Ensure we remove our event listener waiting for messages
    devToolsConnection.onDisconnect.addListener(() => {
        devToolsConnection.onMessage.removeListener(devToolsListener);
    });

});