import browser from "webextension-polyfill";
import { BackgroundPageMessage } from "../background/background.messages.interface";

// Create a connection to the background page
const backgroundPageConnection = browser.runtime.connect({ name: "devtools" });

// Find <umb-app> in the DOM
const umbAppRoots = document.getElementsByTagName("umb-app");

if (umbAppRoots.length) {
  const umbAppRoot = umbAppRoots[0];

   // Send a message to the background page
   // Saying we found an <umb-app> element in the DOM
   // Then background can change the action icon to colour & change the HTML page popup to say found it
  const detectedUmbAppMessage: BackgroundPageMessage = {
    name: "detectedUmbApp"
  };
  backgroundPageConnection.postMessage(detectedUmbAppMessage);

  // Listen for the custom event from the <umb-debug> element 
  // when it has collected all contexts up the DOM
  umbAppRoot.addEventListener("umb:debug-contexts:data", (e) => {

    let customEvent = (<CustomEvent>e);

    const contextDataMessage: BackgroundPageMessage = {
      name: "contextData",
      data: {
        contexts: customEvent.detail
      }
    };

     // Send a message to the background page - which it can forward to the devtools panel
     backgroundPageConnection.postMessage(contextDataMessage);
  });
}