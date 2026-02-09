# CLAUDE.md

Guide for AI assistants working on **DevTools for Umbraco Bellissima** -- a cross-browser extension that provides a DevTools panel for inspecting Umbraco context data in the browser's developer tools.

## Project Overview

This is a **browser extension** targeting Umbraco v14+ (Bellissima) backoffice. It detects `<umb-app>` on a page, creates a DevTools sidebar pane ("Umbraco"), and displays context data when DOM elements are inspected. It supports Chrome, Chromium-based browsers, Firefox, and Edge.

**Version**: 0.0.1 (pre-release)
**License**: MIT

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript (strict mode, ESNext target) |
| UI Framework | Lit 3.x (Web Components) |
| Build Tool | Rollup |
| Browser APIs | webextension-polyfill |
| Dev Tool | web-ext |
| Package Manager | npm |
| Node | v22+ |

## Quick Reference Commands

```bash
npm run build              # Compile TypeScript via Rollup (one-time)
npm run watch              # Build in watch mode for development
npm run lint               # Run web-ext linter on extension/ directory
npm run start:firefox      # Launch Firefox with extension loaded + devtools open
npm run start:chromium     # Launch Chromium with extension loaded + devtools open
npm run package:firefox    # Package .zip for Firefox store
npm run package:chromium   # Package .zip for Chrome store
```

There are no automated tests configured. Manual testing is done by running the extension in a browser with `npm run start:firefox` or `npm run start:chromium`.

## Project Structure

```
src/
├── background/
│   └── background.ts              # Service worker: message relay between devtools and content script
├── content-script/
│   └── content.ts                 # Content script: detects <umb-app>, listens for context events
└── devtools/
    ├── DebugContextData.interface.ts  # TypeScript interfaces for context data
    ├── devtools.registration.ts       # Registers DevTools sidebar pane when Umbraco detected
    ├── devtools.element.ts            # <umb-devtools> main panel component
    └── devtools.context.element.ts    # <umb-devtools-context> context display component

extension/                  # Built output + static assets (served to browser)
├── manifest.json           # Active manifest (copied by build script)
├── manifest.chrome.json    # Chrome/Chromium Manifest V3
├── manifest.firefox.json   # Firefox Manifest V3 variant
├── icons/                  # Extension icons
├── devtools-registration.html
├── devtools-panel.html
├── popup-found.html
└── popup-not-found.html

scripts/
└── copy-manifest.js        # Copies browser-specific manifest to manifest.json
```

## Architecture

The extension follows the standard browser extension multi-process architecture:

```
DevTools Panel (umb-devtools component)
    ↕  browser.runtime.Port ("devtools")
Background Service Worker (background.ts)
    ↕  browser.runtime.Port ("content-script")
Content Script (content.ts)
    ↕  CustomEvent ("umb:debug-contexts" / "umb:debug-contexts:data")
Page DOM (<umb-app>, <umb-debug>)
```

**Background script** (`background.ts`): Message hub that relays data between DevTools panel and content script. Maintains connection mapping by tab ID. Updates extension icon/popup based on detection state.

**Content script** (`content.ts`): Injected into every page. Detects `<umb-app>` element, establishes connection to background, listens for `umb:debug-contexts:data` custom events, and relays context data.

**DevTools registration** (`devtools.registration.ts`): Runs in the DevTools context. Uses `browser.devtools.inspectedWindow.eval()` to check for `<umb-app>`, then creates a sidebar pane via `browser.devtools.panels.elements.createSidebarPane()`.

**DevTools panel** (`devtools.element.ts` + `devtools.context.element.ts`): Lit web components that render in the sidebar pane. Connect to background script, listen for element selection changes, trigger context collection, and display results.

## Build System

Rollup compiles 4 independent entry points from `src/` to `extension/`:

| Entry | Output |
|-------|--------|
| `src/devtools/devtools.registration.ts` | `extension/devtools.registration.js` |
| `src/devtools/devtools.element.ts` | `extension/devtools.element.js` |
| `src/background/background.ts` | `extension/background.js` |
| `src/content-script/content.ts` | `extension/content.js` |

Output format is ES modules with sourcemaps. The `extension/` directory is the final distributable -- static HTML/icons are committed, but `.js` and `.js.map` files are gitignored (build artifacts).

### Browser-Specific Manifests

Chrome and Firefox require slightly different manifest structures. The `scripts/copy-manifest.js` script copies the appropriate browser-specific manifest to `extension/manifest.json` before running or packaging. This happens automatically in the `start:*` and `package:*` npm scripts.

## Code Conventions

### File Naming
- `[name].element.ts` -- Lit web component files
- `[name].interface.ts` -- TypeScript interface definitions
- `[name].registration.ts` -- Registration/bootstrap scripts
- Kebab-case for all filenames

### Class & Element Naming
- **Prefix**: `Umb` on all component classes (Umbraco convention)
- **Suffix**: `Element` on all Lit element classes
- **Tag names**: kebab-case with `umb-` prefix (e.g., `umb-devtools`, `umb-devtools-context`)
- Classes: PascalCase (e.g., `UmbDevToolsElement`)

### Component Pattern
```typescript
@customElement('umb-devtools-example')
export class UmbDevToolsExampleElement extends LitElement {
    @state()
    private _localState = '';

    @property({ attribute: false })
    data?: SomeType;

    connectedCallback() { super.connectedCallback(); /* setup */ }
    disconnectedCallback() { super.disconnectedCallback(); /* teardown */ }

    render() {
        return html`<div>${this._localState}</div>`;
    }

    static styles = css`
        :host { display: block; }
    `;
}

declare global {
    interface HTMLElementTagNameMap {
        'umb-devtools-example': UmbDevToolsExampleElement;
    }
}
```

### Key Patterns
- **Private members**: Prefixed with `_` (e.g., `_backgroundPageConnection`, `_onSelectionChanged`)
- **State management**: Local `@state()` per component, no global store
- **Styles**: Scoped CSS via Lit's `static styles = css```, using Shadow DOM
- **Messaging**: Port-based messaging (`browser.runtime.connect()`) for extension communication
- **Custom events**: Namespaced with `umb:` prefix (e.g., `umb:debug-contexts`)
- **Type declarations**: Always register custom elements in `HTMLElementTagNameMap`

### TypeScript Configuration
- Strict mode enabled
- Experimental decorators enabled (for Lit)
- `useDefineForClassFields: false` (required for Lit decorator compatibility)
- ESNext module/target

## Umbraco-Specific Context

- The extension targets Umbraco's **Bellissima** backoffice (v14+), which is built on Web Components
- Detection is based on the presence of `<umb-app>` in the page DOM
- Context data comes from `<umb-debug>` elements via custom events
- The UUI (Umbraco UI) CSS library is used for popup styling consistency
- Context objects have `alias`, `type`, and `data` (containing `methods`, `properties`, `value`)

## Dependencies

**Production**: `lit` (only runtime dependency)
**Dev**: `typescript`, `rollup` (+ plugins), `webextension-polyfill`, `@types/webextension-polyfill`, `web-ext`, `tslib`

## Common Tasks

### Adding a new component
1. Create `src/devtools/[name].element.ts` following the Lit component pattern above
2. Import and use it in the parent component's `render()` method
3. Register the custom element tag in `HTMLElementTagNameMap`

### Adding a new message type
1. Define the message structure in the sending script
2. Add a `case` handler in `background.ts` for relay logic
3. Add a listener in the receiving script (devtools or content)

### Modifying manifest permissions
1. Update both `extension/manifest.chrome.json` and `extension/manifest.firefox.json`
2. Run the appropriate `copy:manifest:*` script or use `start:*`/`package:*` which do it automatically
