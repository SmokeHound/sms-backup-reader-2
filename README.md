# SMS Backup Viewer

This is an Angular-based web app designed to read the XML backup files produced by the Android app SMS Backup & Restore by Ritesh. It is designed to work in modern browsers, including Chrome, Firefox, Edge, and Safari. This app works locally and your SMS data **does not** leave your machine.

## Quick start

```bash
npm install
npm start
```

Then open `http://localhost:4200/`.

Note: if `ng` is not found on your machine, that’s expected unless you installed Angular CLI globally. Use the project scripts (`npm start`, `npm run build`, etc.) or `npx ng ...`.

If you build the app (`npm run build`) and then open the generated `dist/.../index.html` via `file://`, your browser will likely block the JS bundles (CORS). To preview the built output, run `npm run preview:dist` and open `http://localhost:8080/`.

## Large backups / split files

Very large XML backups (especially with MMS media) may be too large for the browser to load/parse as a single file.

If you have a multi-GB backup (e.g. 2+ GB), use the desktop build (Tauri) and load the file by path. Browsers generally cannot handle parsing a multi-GB XML file as a single in-memory string.

- Prefer exporting **SMS only** / **no media** when possible.
- If you need to split your export, you can select **multiple** `.xml` files at once in the SMS loader — they will be merged into a single combined message list.

## Features

* Load SMS backup files produced by the Android app SMS Backup & Restore by Ritesh
* International support (non-latin character) and emoji support
* MMS support
* VCF support
* Export messages and contacts to CSV
* Export MMS media embedded in message HTML (via CSV export including `bodyHtml`)
* Export MMS media as separate files (ZIP export)

## Issues

If you encounter issues, please add them to the issues section.

## Roadmap (no timeline defined)

* Desktop app.(Work in progress)
* Request any features/improvements you would like to be added.

## Development

See [DEVELOPING.md](DEVELOPING.md) for development workflows.

Want a desktop app? This repo includes a Tauri wrapper; see the Desktop (Tauri) section in [DEVELOPING.md](DEVELOPING.md).

## Note about emoji and text handling in this app (mostly for devs)

SMS Backup & Restore saves emojis and other special characters in a very interesting way.

Likely, it goes back to how characters are encoded in SMS.

* If all characters in the SMS are English + a few extra, then it essentially stores them all as ASCII*
* If even one of the characters in the SMS is beyond the base character set, then the entire message is stored as UTF-16*

\*Not actually ASCII or UTF-16. There are GSM semi-equivalents. Of course it's not easy.

## License

SMS Backup Viewer is made available under the MIT license. See the LICENSE file for details.
