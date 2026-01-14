# Developing SMS Backup Reader 2

This repo uses Angular (via the locally-installed Angular CLI) and Vitest.

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

## Desktop app (Tauri)

This repo can be packaged as a native desktop app using Tauri.

### Windows prerequisites

- Rust toolchain (MSVC): install via `https://rustup.rs/`
- Microsoft C++ Build Tools (Visual Studio Build Tools)
- WebView2 Runtime (usually already installed on Windows 10/11)

### Run the desktop app in dev mode

This starts the Angular dev server and launches the Tauri window.

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

## Further help

To get more help on the Angular CLI use `npx ng help`.
