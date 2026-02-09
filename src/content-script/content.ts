import browser from "webextension-polyfill";

/**
 * Detects <umb-app> in the DOM and sets up the context data relay.
 * Uses a MutationObserver to handle SPA pages where <umb-app> is
 * added dynamically after the initial page load.
 */
function _onUmbAppDetected(umbAppRoot: Element) {
  // Create a connection to the background page only when we actually find <umb-app>
  const backgroundPageConnection = browser.runtime.connect({ name: "content-script" });

  // Send a message to the background page
  // Saying we found an <umb-app> element in the DOM
  // Then background can change the action icon to colour & change the HTML page popup to say found it
  backgroundPageConnection.postMessage({
    name: "detectedUmbApp"
  });

  // Listen for the custom event from the <umb-debug> element
  // when it has collected all contexts up the DOM
  umbAppRoot.addEventListener("umb:debug-contexts:data", (e) => {
    const customEvent = (<CustomEvent>e);

    // Send a message to the background page - which it can forward to the devtools panel
    backgroundPageConnection.postMessage({
      name: "contextData",
      data: customEvent.detail,
    });
  });
}

// First, check if <umb-app> already exists in the DOM
const umbAppRoots = document.getElementsByTagName("umb-app");

if (umbAppRoots.length) {
  _onUmbAppDetected(umbAppRoots[0]);
} else {
  // <umb-app> not found yet - watch for it with a MutationObserver.
  // This handles SPA pages where <umb-app> is created dynamically by JavaScript
  // after the content script has already run.
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          if (node.tagName === 'UMB-APP') {
            observer.disconnect();
            _onUmbAppDetected(node);
            return;
          }

          // Also check descendants in case <umb-app> was added inside a wrapper
          const nested = node.querySelector('umb-app');
          if (nested) {
            observer.disconnect();
            _onUmbAppDetected(nested);
            return;
          }
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}
