join-backups
===============

Simple CLI to join multiple SMS Backup XML files into one merged backup.

Install
-------

cd tools/join-backups
npm install

Usage
-----

CLI:
# merge a few backups into merged.xml
node index.js merged.xml backup1.xml backup2.xml backup3.xml

Or install globally and use `join-backups` if you prefer:

npm install -g .
join-backups merged.xml backup1.xml backup2.xml

GUI:
Open `tools/join-backups/gui/index.html` in your browser (or serve it with a static server: `npx http-server tools/join-backups/gui -p 8081`) and choose files in the UI to merge and download the combined XML.

Tauri desktop app:
1. Install prerequisites: Rust toolchain (rustup), and the usual Tauri build requirements for your platform.
2. From the `tools/join-backups` folder install dev deps: `npm install` (this will install `@tauri-apps/cli`).
3. Run the GUI dev server and Tauri dev together with the convenience script:
   - `npm run tauri:dev` (this will run the configured `beforeDevCommand` to serve the GUI at http://localhost:8081 and open a Tauri window)
4. Build a distributable with `npm run tauri:build`.

Notes:
- The Tauri app is configured to serve the files from `tools/join-backups/gui` in production and will use `http://localhost:8081` during `tauri dev`.

Notes
-----
- The tool looks for the top-level root (commonly `smses`) and merges the `<sms>` entries.
- It preserves/combines attributes found on the first file and sets `count` to the actual message count.
- The GUI runs entirely in the browser; files are not uploaded anywhere.
- This is a minimal tool; validate the resulting XML with your usual workflow.
