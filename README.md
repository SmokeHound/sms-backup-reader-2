# SMS Backup Reader 2

This is an Angular-based web app designed to read the XML backup files produced by the Android app SMS Backup & Restore by Ritesh. It is designed to work in modern browsers, including Chrome, Firefox, Edge, and Safari. This app works locally and your SMS data **does not** leave your machine.

## Quick start

```bash
npm install
npm start
```

Then open `http://localhost:4200/`.

Note: if `ng` is not found on your machine, that’s expected unless you installed Angular CLI globally. Use the project scripts (`npm start`, `npm run build`, etc.) or `npx ng ...`.

## Features

* Load SMS backup files produced by an Android app SMS Backup & Restore by Ritesh
* International support (non-latin character) and emoji support
* MMS support (thanks to JLTRY)
* VCF support (thanks to JLTRY)
* Export messages and contacts to CSV

## Issues

If you encounter issues, please add the issues here: [https://github.com/devadvance/sms-backup-reader-2/issues](https://github.com/devadvance/sms-backup-reader-2/issues).

## Roadmap (no timeline defined)

* Support for exporting media from MMS
* More?

## Development

See [DEVELOPING.md](DEVELOPING.md) for development workflows.

## Note about emoji and text handling in this app (mostly for devs)

SMS Backup & Restore saves emojis and other special characters in a very interesting way.

Likely, it goes back to how characters are encoded in SMS.

* If all characters in the SMS are English + a few extra, then it essentially stores them all as ASCII*
* If even one of the characters in the SMS is beyond the base character set, then the entire message is stored as UTF-16*

\*Not actually ASCII or UTF-16. There are GSM semi-equivalents. Of course it's not easy.

## License

SMS Backup Reader 2 is made available under the MIT license. See the LICENSE file for details.
