# Changelog

## [0.7.1](https://github.com/SmokeHound/sms-backup-viewer/compare/sms-backup-viewer-v0.7.0...sms-backup-viewer-v0.7.1) (2026-01-17)


### Bug Fixes

* add foldline and camelcase as allowed CommonJS dependencies in angular.json ([384b012](https://github.com/SmokeHound/sms-backup-viewer/commit/384b012537636a7012b9e654598b0d96dd351096))
* add Tauri API integration and improve detection logic in SmsLoaderComponent ([6c6cf8a](https://github.com/SmokeHound/sms-backup-viewer/commit/6c6cf8aedf68a318bd9b63401c61e62cc34d56dd))
* add Tauri development configuration and update start script ([17071e7](https://github.com/SmokeHound/sms-backup-viewer/commit/17071e7d033c1976f7b509dca517323db48084e6))
* adjust min-height for settings container to ensure proper layout ([c449a77](https://github.com/SmokeHound/sms-backup-viewer/commit/c449a77bb19eac431d0f4fd397166b97f684a32d))
* defer loading vCard library until contacts are loaded in VcfStoreService ([a3a1818](https://github.com/SmokeHound/sms-backup-viewer/commit/a3a1818938ee466443a732b46755302f15f8e78f))
* optimize ngFor performance with trackBy for contacts and messages ([30c6a89](https://github.com/SmokeHound/sms-backup-viewer/commit/30c6a89ade03c6da7842d22fabb53ac7043d54e7))
* remove obsolete app package and add sms-backup-viewer package with dependencies ([ced2a47](https://github.com/SmokeHound/sms-backup-viewer/commit/ced2a4760bdcf4dcb5324df8903b1d574adceb2d))
* update build configuration for Tauri integration and adjust index file settings ([b0db603](https://github.com/SmokeHound/sms-backup-viewer/commit/b0db603ee7b25c57a8bc7d9d20ea745f3ccc73e0))
* update package name, version, and description in Cargo.toml ([fc42259](https://github.com/SmokeHound/sms-backup-viewer/commit/fc42259d6d8af952f70b785b67deceeec9733638))

## [0.7.0](https://github.com/SmokeHound/sms-backup-viewer/compare/sms-backup-viewer-v0.6.0...sms-backup-viewer-v0.7.0) (2026-01-17)


### Features

* add help text for clearing stored SMS messages and integrate VcfStoreService for contact management ([43ae0cc](https://github.com/SmokeHound/sms-backup-viewer/commit/43ae0cc5f4b2cdf2c21120645263ba32d8d25dcd))


### Bug Fixes

* align text in mdl-layout-title for improved readability ([bdf6bf9](https://github.com/SmokeHound/sms-backup-viewer/commit/bdf6bf99283f74ec23dff4aa6ebc2a8f7267345a))
* improve error messages for large file uploads in SmsLoaderComponent ([d3d2447](https://github.com/SmokeHound/sms-backup-viewer/commit/d3d244773095e80a079370a65844b053c50c6dcb))

## [0.6.0](https://github.com/SmokeHound/sms-backup-viewer/compare/sms-backup-viewer-v0.5.0...sms-backup-viewer-v0.6.0) (2026-01-17)


### Features

* add IndexedDB support for message persistence and enhance settings UI ([28e4394](https://github.com/SmokeHound/sms-backup-viewer/commit/28e439447ec4589a142b34a45e4c107e075dd117))
* integrate Dexie for IndexedDB support and refactor message handling ([d1f7855](https://github.com/SmokeHound/sms-backup-viewer/commit/d1f78553c2c3dd1b616d5ae1c4899a2f9b189c3e))


### Bug Fixes

* update handling of large XML files and improve user guidance for Tauri mode ([4b73f94](https://github.com/SmokeHound/sms-backup-viewer/commit/4b73f94935a99dbeafa132135c2fd4625ef1d3b8))

## [0.5.0](https://github.com/SmokeHound/sms-backup-viewer/compare/sms-backup-viewer-v0.4.0...sms-backup-viewer-v0.5.0) (2026-01-16)


### Features

* add documentation for exporting MMS media as separate files ([dd21848](https://github.com/SmokeHound/sms-backup-viewer/commit/dd2184809b07767a293fe2e6aaebd9a2460ec022))
* add features array to Tauri dependencies for improved configuration ([56cb47b](https://github.com/SmokeHound/sms-backup-viewer/commit/56cb47b7a7aac00d456bb27ced7822066003314f))
* add Material Design Lite dependencies and update configurations ([d2143f2](https://github.com/SmokeHound/sms-backup-viewer/commit/d2143f2a82f7322578baa56ea600869665a2f385))
* add release workflows and update project name to SMS Backup Viewer ([640fd14](https://github.com/SmokeHound/sms-backup-viewer/commit/640fd143ec6f10c871cd4e7ced85981bcacc9751))
* add support for exporting MMS media as separate files and implement related functionality ([2a5e02c](https://github.com/SmokeHound/sms-backup-viewer/commit/2a5e02cfb647a707f156f7d6e6ae7429f24ec309))
* add support for loading multiple SMS backup files and handle large file warnings ([5a27d60](https://github.com/SmokeHound/sms-backup-viewer/commit/5a27d6041988c9a4745011798983d5c64f832ff6))
* add Tauri build configuration to angular.json ([1768259](https://github.com/SmokeHound/sms-backup-viewer/commit/176825928fd0bf7c87164c8d227ef385cdcb27b9))
* add Tauri preflight check script and update documentation for setup ([5928283](https://github.com/SmokeHound/sms-backup-viewer/commit/592828344aaaa96f905c9b421a370c026fc3a106))
* add Tauri support for desktop app packaging and configuration ([a534ce6](https://github.com/SmokeHound/sms-backup-viewer/commit/a534ce60524cffb992b87128803601f706d98fe6))
* enhance file upload UI with improved layout and spacing ([c8cfce7](https://github.com/SmokeHound/sms-backup-viewer/commit/c8cfce7738cf97f841c15069d782752ee1c561b7))
* enhance production build process and improve documentation ([055f20f](https://github.com/SmokeHound/sms-backup-viewer/commit/055f20fbe373228a10d970b3debe81f9558a2961))
* enhance styling and layout across components with improved variables and structure ([fc493b1](https://github.com/SmokeHound/sms-backup-viewer/commit/fc493b118654de8417128cd0ed647ad6f4bcea06))
* enhance XML and VCF file loading with error handling and improved user feedback ([9ca570a](https://github.com/SmokeHound/sms-backup-viewer/commit/9ca570a8f296f957b3e53e84d89889083252b318))
* implement CSV export functionality for messages and contacts ([5eb7876](https://github.com/SmokeHound/sms-backup-viewer/commit/5eb7876a6da8bf9ca2be64c7e1ddd0151c5f6574))
* implement loader status updates for SMS and VCF components with new status bar ([dfe15b4](https://github.com/SmokeHound/sms-backup-viewer/commit/dfe15b4ca56f5694a24c83bbc3b4794e203736c8))
* implement Tauri support for SMS backup parsing and enhance UI for file loading ([3201572](https://github.com/SmokeHound/sms-backup-viewer/commit/3201572025fbcda5bd329c6ba44a2bb84395a4b1))
* improve header and footer styles with enhanced loader controls and visibility adjustments ([9e24eeb](https://github.com/SmokeHound/sms-backup-viewer/commit/9e24eebdaa2462a596a6cf20f973f39ff2a37739))
* refactor XML element retrieval for improved robustness and error handling ([9ef829a](https://github.com/SmokeHound/sms-backup-viewer/commit/9ef829ab273129daf1152262c950bb8d143180b6))
* update country default to AU and enhance country handling in SMS and VCF loaders ([5aea81b](https://github.com/SmokeHound/sms-backup-viewer/commit/5aea81be506de9713c8458d30d18566972c162d7))
* update styles for improved UI consistency and responsiveness ([21b019d](https://github.com/SmokeHound/sms-backup-viewer/commit/21b019d0f79bd16544f6f2cf36156b905f165427))


### Bug Fixes

* correct action reference in release workflow ([ff3ea2f](https://github.com/SmokeHound/sms-backup-viewer/commit/ff3ea2fa5eadd493563c53c2af76f06a28150d11))
* update @angular-devkit/architect version and remove duplicate entries ([be7fc32](https://github.com/SmokeHound/sms-backup-viewer/commit/be7fc325f3ca8c6014f0c629d1ccba79a74767d6))
* update copyright year to 2026 in footer ([73b97aa](https://github.com/SmokeHound/sms-backup-viewer/commit/73b97aa23f2d2ce457e711a99097455e4dc7d7d5))
* update package name and paths to reflect new branding as sms-backup-viewer ([12a926e](https://github.com/SmokeHound/sms-backup-viewer/commit/12a926eb586600f741c108be1ce1f6dd706af9a9))

## [0.4.0](https://github.com/SmokeHound/sms-backup-viewer/compare/sms-back-reader-2-v0.3.0...sms-back-reader-2-v0.4.0) (2026-01-16)


### Features

* enhance styling and layout across components with improved variables and structure ([fc493b1](https://github.com/SmokeHound/sms-backup-viewer/commit/fc493b118654de8417128cd0ed647ad6f4bcea06))
* update styles for improved UI consistency and responsiveness ([21b019d](https://github.com/SmokeHound/sms-backup-viewer/commit/21b019d0f79bd16544f6f2cf36156b905f165427))

## [0.3.0](https://github.com/SmokeHound/sms-backup-viewer/compare/sms-back-reader-2-v0.2.0...sms-back-reader-2-v0.3.0) (2026-01-16)


### Features

* add documentation for exporting MMS media as separate files ([dd21848](https://github.com/SmokeHound/sms-backup-viewer/commit/dd2184809b07767a293fe2e6aaebd9a2460ec022))
* add features array to Tauri dependencies for improved configuration ([56cb47b](https://github.com/SmokeHound/sms-backup-viewer/commit/56cb47b7a7aac00d456bb27ced7822066003314f))
* add Material Design Lite dependencies and update configurations ([d2143f2](https://github.com/SmokeHound/sms-backup-viewer/commit/d2143f2a82f7322578baa56ea600869665a2f385))
* add release workflows and update project name to SMS Backup Viewer ([640fd14](https://github.com/SmokeHound/sms-backup-viewer/commit/640fd143ec6f10c871cd4e7ced85981bcacc9751))
* add support for exporting MMS media as separate files and implement related functionality ([2a5e02c](https://github.com/SmokeHound/sms-backup-viewer/commit/2a5e02cfb647a707f156f7d6e6ae7429f24ec309))
* add support for loading multiple SMS backup files and handle large file warnings ([5a27d60](https://github.com/SmokeHound/sms-backup-viewer/commit/5a27d6041988c9a4745011798983d5c64f832ff6))
* add Tauri build configuration to angular.json ([1768259](https://github.com/SmokeHound/sms-backup-viewer/commit/176825928fd0bf7c87164c8d227ef385cdcb27b9))
* add Tauri preflight check script and update documentation for setup ([5928283](https://github.com/SmokeHound/sms-backup-viewer/commit/592828344aaaa96f905c9b421a370c026fc3a106))
* add Tauri support for desktop app packaging and configuration ([a534ce6](https://github.com/SmokeHound/sms-backup-viewer/commit/a534ce60524cffb992b87128803601f706d98fe6))
* enhance file upload UI with improved layout and spacing ([c8cfce7](https://github.com/SmokeHound/sms-backup-viewer/commit/c8cfce7738cf97f841c15069d782752ee1c561b7))
* enhance production build process and improve documentation ([055f20f](https://github.com/SmokeHound/sms-backup-viewer/commit/055f20fbe373228a10d970b3debe81f9558a2961))
* enhance XML and VCF file loading with error handling and improved user feedback ([9ca570a](https://github.com/SmokeHound/sms-backup-viewer/commit/9ca570a8f296f957b3e53e84d89889083252b318))
* implement CSV export functionality for messages and contacts ([5eb7876](https://github.com/SmokeHound/sms-backup-viewer/commit/5eb7876a6da8bf9ca2be64c7e1ddd0151c5f6574))
* implement loader status updates for SMS and VCF components with new status bar ([dfe15b4](https://github.com/SmokeHound/sms-backup-viewer/commit/dfe15b4ca56f5694a24c83bbc3b4794e203736c8))
* implement Tauri support for SMS backup parsing and enhance UI for file loading ([3201572](https://github.com/SmokeHound/sms-backup-viewer/commit/3201572025fbcda5bd329c6ba44a2bb84395a4b1))
* improve header and footer styles with enhanced loader controls and visibility adjustments ([9e24eeb](https://github.com/SmokeHound/sms-backup-viewer/commit/9e24eebdaa2462a596a6cf20f973f39ff2a37739))
* refactor XML element retrieval for improved robustness and error handling ([9ef829a](https://github.com/SmokeHound/sms-backup-viewer/commit/9ef829ab273129daf1152262c950bb8d143180b6))
* update country default to AU and enhance country handling in SMS and VCF loaders ([5aea81b](https://github.com/SmokeHound/sms-backup-viewer/commit/5aea81be506de9713c8458d30d18566972c162d7))


### Bug Fixes

* update @angular-devkit/architect version and remove duplicate entries ([be7fc32](https://github.com/SmokeHound/sms-backup-viewer/commit/be7fc325f3ca8c6014f0c629d1ccba79a74767d6))
* update copyright year to 2026 in footer ([73b97aa](https://github.com/SmokeHound/sms-backup-viewer/commit/73b97aa23f2d2ce457e711a99097455e4dc7d7d5))
