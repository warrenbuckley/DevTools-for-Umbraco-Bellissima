import {LitElement, TemplateResult, css, html} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import browser from "webextension-polyfill";
import { DebugContextData } from './DebugContextData.interface';
import './devtools.context.element';

@customElement('umb-devtools')
export class UmbDevToolsElement extends LitElement {

    @state()
    contextData: DebugContextData[] = [];

    private _backgroundPageConnection?: browser.Runtime.Port;

    connectedCallback(): void {
        super.connectedCallback();

        // Set the DevTools theme as a host attribute for CSS targeting
        this._applyTheme(browser.devtools.panels.themeName);

        // Firefox uses onThemeChanged event, Chrome uses setThemeChangeHandler
        if (browser.devtools.panels.onThemeChanged) {
            browser.devtools.panels.onThemeChanged.addListener(this._onThemeChanged);
        } else {
            // Chrome uses setThemeChangeHandler (Chrome 99+) instead of onThemeChanged
            chrome?.devtools.panels.setThemeChangeHandler(this._onThemeChanged);
        }

        // Connect to the background page with a given name to send/recieve messages on
        this._backgroundPageConnection = browser.runtime.connect({ name: "devtools" });
        
        // Initialize the background page connection
        // POST a message to the background...
        this._backgroundPageConnection.postMessage({
            name: "init",
            tabId: browser.devtools.inspectedWindow.tabId
        });


        // Listen to ANY messages recieved FROM the background page
        this._backgroundPageConnection.onMessage.addListener((message, _port) => {
            const msg = message as { name: string; data?: { contexts: DebugContextData[] } };
            switch(msg.name) {
                case "contextData":

                    // We HAVE data from the background page to put on the component
                    this.contextData = msg.data?.contexts ?? [];
                    break;
            }
        });

        // Listen for event fired when you select a different DOM element in the elements pane of DevTools
        browser.devtools.panels.elements.onSelectionChanged.addListener(this._onSelectionChanged);
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();

        // Ensure we disconnect from the background page when the element is removed from the DOM
        this._backgroundPageConnection?.disconnect();

        // Remove our listener for when the selection of the element is changed
        browser.devtools.panels.elements.onSelectionChanged.removeListener(this._onSelectionChanged);

        // Remove theme change listener
        if (browser.devtools.panels.onThemeChanged) {
            browser.devtools.panels.onThemeChanged.removeListener(this._onThemeChanged);
        } else {
            // Chrome: pass null to remove the handler
            chrome?.devtools.panels.setThemeChangeHandler(null);
        }
    }

    private _onThemeChanged = (themeName: string) => {
        this._applyTheme(themeName);
    }

    private _applyTheme(themeName: string) {
        document.documentElement.dataset.theme = themeName;
    }

    private _onSelectionChanged = () => {

        // Dispatch a custom event on the selected element
        // This event is the one that is emitted if you was to have an <umb-debug> element on the page

        // The content script will register a listener for a similar event on the outer most DOM element <umb-app> 
        // that is emitted once all the contexts from umb-debug have been collected by traversing up the DOM from the selected element
        // Once it has got all the data in the content script it will send a message back to the background page 
        // and then forward it back here in the devtools element

        browser.devtools.inspectedWindow.eval(`
            var selectedElement = $0;
            selectedElement.dispatchEvent(new CustomEvent("umb:debug-contexts", { bubbles: true, composed: true, cancelable: false }));
        `);
    }

    render() {
        if (!this.contextData || this.contextData.length == 0) {
            return html `
                <div class="no-selection">
                    <strong>Please select a DOM element from the elements pane</strong>
                </div>                
            `
        }
        else {
            return html `
                <div class="sticky-bar">
                    <strong>Contexts Count: ${this.contextData.length}</strong>
                </div>
                ${this._renderContextData()}
            `;
        }   
    }

    private _renderContextData() {
        const contextsTemplates: TemplateResult[] = [];

		this.contextData.forEach((contextData) => {
			contextsTemplates.push(
				html`
                    <umb-devtools-context class="context" .context=${contextData}></umb-devtools-context>
                `
			);
		});

		return contextsTemplates;
    }

    static styles = css`
        :host {
            font-family: monospace;
            font-size: 12px;

            display: block;
            height: 100%;
            background: var(--umb-devtools-bg);
            color: var(--umb-devtools-color);
        }

        .no-selection {
            text-align: center;
            height: 100vh;
            display: grid;
            align-items: center;
        }

        .sticky-bar {
            position: fixed;
            width: calc(100% - 16px);
            top:0;
            background: var(--umb-devtools-surface);
            padding: 10px 8px;
            border-bottom: 1px solid var(--umb-devtools-border);
            margin-bottom: 8px;
        }

        umb-devtools-context {
            display: block;
            margin: 0 8px 8px 8px;
        }

        umb-devtools-context:first-of-type {
            margin-top:45px;
        }
    `;
}

declare global {
	// Chrome-specific DevTools API not covered by webextension-polyfill.
	// Chrome uses setThemeChangeHandler (Chrome 99+) instead of the onThemeChanged event.
	const chrome: {
		devtools: {
			panels: {
				setThemeChangeHandler(callback: ((themeName: string) => void) | null): void;
			};
		};
	} | undefined;

	interface HTMLElementTagNameMap {
		'umb-devtools': UmbDevToolsElement;
	}
}