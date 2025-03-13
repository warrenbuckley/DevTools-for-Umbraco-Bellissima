import browser from "webextension-polyfill";
import { BackgroundPageMessage } from "./background.messages.interface";

let id:number | undefined;
let connections: { [id: number]: browser.Runtime.Port } = {};

browser.runtime.onConnect.addListener((devToolsConnection) => {
    
    const devToolsListener = (message: unknown, port:browser.Runtime.Port) => {
        const typedMessage = message as BackgroundPageMessage;

        switch (typedMessage.name) {
            case "init":
                // Assign message.tabId to the id
                id = typedMessage.tabId;

                if(id !== undefined){
                    // Store the connection against the tab id
                    connections[id] = devToolsConnection;

                    // Send a message back to DevTools
                    const initMessage: BackgroundPageMessage = {
                        name: "init",
                        message: "This message has come from init in the background script"
                    };
    
                    connections[id].postMessage(initMessage); 
                }
                break;

            case "contextData":
                if(id !== undefined){
                    // Send/relay the message back to DevTools code to deal with it
                    const contextDataMessage: BackgroundPageMessage = {
                        name: "contextData",
                        data: typedMessage.data
                    };
                    
                    connections[id].postMessage(contextDataMessage);
                }
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