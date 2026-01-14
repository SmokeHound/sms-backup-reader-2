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

## Running unit tests

Run `npm test` (or `npm run test:watch`) to execute the unit tests via Vitest.

## Further help

To get more help on the Angular CLI use `npx ng help`.
