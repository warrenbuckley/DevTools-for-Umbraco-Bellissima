/**
 * Page-world bridge script for Chrome.
 *
 * In Chrome, content scripts run in an isolated world and cannot access
 * CustomEvent.detail from events dispatched in the page world.
 * This script runs in the MAIN world (via manifest "world": "MAIN") so it
 * can read event.detail, then relays the data to the isolated-world content
 * script via window.postMessage (which uses structured cloning across worlds).
 */

function _setupBridge(umbApp: Element) {
  umbApp.addEventListener("umb:debug-contexts:data", (e) => {
    const detail = (e as CustomEvent).detail;
    window.postMessage({
      type: "umb-devtools-context-data",
      detail: detail,
    }, "*");
  });
}

const umbAppRoots = document.getElementsByTagName("umb-app");

if (umbAppRoots.length) {
  _setupBridge(umbAppRoots[0]);
} else {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          if (node.tagName === "UMB-APP") {
            observer.disconnect();
            _setupBridge(node);
            return;
          }
          const nested = node.querySelector("umb-app");
          if (nested) {
            observer.disconnect();
            _setupBridge(nested);
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
