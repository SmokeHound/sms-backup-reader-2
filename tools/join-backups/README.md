# join-backups

Simple CLI and GUI tools to join multiple SMS Backup XML files into one merged backup.

## Install

```bash
cd tools/join-backups
npm install
```

## Usage

### CLI

Merge a few backups into `merged.xml`:

```bash
node index.js merged.xml backup1.xml backup2.xml backup3.xml
```

Or install globally and use `join-backups` if you prefer:

```bash
npm install -g .
join-backups merged.xml backup1.xml backup2.xml
```

### GUI (Web)

Open `tools/join-backups/gui/index.html` in your browser, or serve it with a static server:

```bash
npx http-server tools/join-backups/gui -p 8081
```

Then open `http://localhost:8081` and choose files in the UI to merge and download the combined XML.

### Tauri Desktop App

1. Install prerequisites: Rust toolchain (rustup), and the usual Tauri build requirements for your platform.
2. From the `tools/join-backups` folder, install dev dependencies: `npm install` (this will install `@tauri-apps/cli`).
3. Run the GUI dev server and Tauri dev together with the convenience script:
   ```bash
   npm run tauri:dev
   ```
   This will run the configured `beforeDevCommand` to serve the GUI at `http://localhost:8081` and open a Tauri window.
4. Build a distributable:
   ```bash
   npm run tauri:build
   ```

**Note:** The Tauri app is configured to serve the files from `tools/join-backups/gui` in production and will use `http://localhost:8081` during `tauri dev`.

## Notes

- The tool looks for the top-level root element (commonly `<smses>`) and merges all `<sms>` entries.
- It preserves/combines attributes found on the first file and sets the `count` attribute to the actual message count.
- The GUI runs entirely in the browser; files are not uploaded anywhere.
- This is a minimal tool; validate the resulting XML with your usual workflow.
