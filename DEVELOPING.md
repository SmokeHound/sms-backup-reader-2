# Developing SMS Backup Viewer

This repo uses Angular (via the locally-installed Angular CLI), Vitest for testing, and several key libraries for enhanced functionality:

- **Dexie** - IndexedDB wrapper for message persistence
- **Angular CDK** - Virtual scrolling for large message lists
- **Tauri** - Desktop application framework (optional)
- **fast-xml-parser** - XML parsing for backup files

## Prerequisites

- Node.js (a recent LTS release is recommended)
- npm

Install dependencies:

```bash
npm install
```

## Development server

Run `npm start` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

If you prefer calling Angular CLI directly without a global install, use `npx ng ...`.

## Code scaffolding

Run `npx ng generate component component-name` to generate a new component.

You can also use:

```bash
npx ng generate directive|pipe|service|class|guard|interface|enum|module ...
```

## Build

Run `npm run build` to build the project.

Build artifacts are written to `dist/`.

Useful variants:

```bash
npm run watch
npm run build -- --configuration production
```

## Preview the production build

Do **not** open the built `dist/.../browser/index.html` directly with your browser (a `file://` URL). Modern browsers will block loading the built JS bundles (e.g. `main.js`) due to CORS / origin restrictions.

Instead, serve the build output over HTTP:

```bash
npm run build -- --configuration production
npm run preview:dist
```

Then open `http://localhost:8080/`.

Alternative: if you just want the dev server with production settings (not the `dist/` output), run:

```bash
npm run start:prod
```

## Handling very large backups

This app loads backups in the browser and currently parses XML by reading the entire file as text.

- Multi-GB backups (common when exporting MMS media inline) are likely to fail in the browser.
- Recommended workaround: export **SMS only** / **no media**, or split the export.
- The SMS loader supports selecting **multiple** `.xml` files at once; it will merge them into a single message list.

If you need to load a single multi-GB XML file, use the desktop build (Tauri): the SMS loader includes a Tauri mode that parses by file path using a streaming XML parser.

### IndexedDB Persistence

Messages are automatically stored in IndexedDB using Dexie after parsing:
- Provides fast access to messages without re-parsing XML
- Messages are indexed by conversation for efficient querying
- Contacts are also stored for quick lookup
- You can enable/disable IndexedDB persistence in Settings
- Clear stored data using the "Clear stored SMS messages" button in Settings

### Virtual Scrolling

The message list uses Angular CDK's virtual scrolling for performance:
- Only renders visible messages in the viewport
- Dynamically adjusts item sizes based on content
- Supports loading older messages on scroll
- Handles large conversations (10,000+ messages) efficiently

## Exporting MMS media as separate files

When exporting from the message list, you can enable **Export MMS media as separate files (creates a .zip)**.

- Output is a ZIP that contains `messages.csv` plus extracted media files under `media/<conversation-id>/...`.
- `bodyHtml` in the CSV is rewritten so `<img src="data:...">` becomes `<img src="media/...">`.
- This is useful to avoid huge CSV files when a backup contains inline/base64 MMS images.

## Logging and Diagnostics

The app includes a built-in logging system for troubleshooting:
- Access logs from the Settings page via the "View Logs" button
- Logs capture import/export operations, errors, and performance metrics
- Useful for debugging issues with large files or complex operations
- Logs are stored locally and never transmitted

## Desktop app (Tauri)

This repo can be packaged as a native desktop app using Tauri.

### Windows prerequisites

- Rust toolchain (MSVC): install via `https://rustup.rs/`
- Microsoft C++ Build Tools (Visual Studio Build Tools)
- WebView2 Runtime (usually already installed on Windows 10/11)

### Run the desktop app in dev mode

This starts the Angular dev server and launches the Tauri window.

If you hit errors like `cargo metadata ... program not found`, run the preflight check first:

```bash
npm run tauri:check
```

```bash
npm run tauri:dev
```

Note: `tauri:dev` uses `npm run start:tauri` under the hood so the dev server uses the Tauri index file (no Google Tag Manager).

### Build an installable desktop bundle

```bash
npm run tauri:build
```

The build will run the Angular `tauri` configuration (see `angular.json`) and then package the app.

### Offline notes

- Material Icons are bundled locally (no Google Fonts dependency).
- The desktop build uses `src/index.tauri.html` (no Google Tag Manager).

## Running unit tests

Run `npm test` (or `npm run test:watch`) to execute the unit tests via Vitest.

## Join Backups Tool

The `tools/join-backups` directory contains a standalone utility for merging multiple SMS backup XML files:

**CLI usage:**
```bash
cd tools/join-backups
npm install
node index.js merged.xml backup1.xml backup2.xml backup3.xml
```

**Web GUI:**
```bash
# Serve the GUI with a static server
npx http-server tools/join-backups/gui -p 8081
```
Then open `http://localhost:8081` in your browser.

**Desktop GUI (Tauri):**
```bash
cd tools/join-backups
npm install
npm run tauri:dev    # Development mode
npm run tauri:build  # Create distributable
```

The merge tool:
- Combines multiple XML files into a single backup
- Preserves all message attributes
- Updates the `count` attribute to reflect the total
- Works entirely client-side (no server uploads)

## Further help

To get more help on the Angular CLI use `npx ng help`.
