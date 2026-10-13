# Nelmavriq — Everything in its place.

Private, device-local belongings library and leaving routines. TypeScript, native IndexedDB and Web Crypto; zero runtime dependencies, server accounts, analytics or personal-data upload. Replacement SVG artwork is original, not a reproduction of an unavailable brand sheet.

## Run
Node24, `npm ci`, `npm test`, `npm run preview`. Open http://127.0.0.1:4173. Production uses `npm run build`, serving dist over HTTPS. All paths are relative for static subdirectory hosting. No secrets, user records or backup files belong in Git. IndexedDB data is local to each origin/browser; localhost data does not transfer to deployed hosting.

## Storage and recovery
Database keeplume-vault schema1, vault store/state key: versioned bounded snapshot. Creation/upgrade from an empty database creates only the required store. All mutations compare a revision inside one readwrite transaction; concurrent tabs cannot silently overwrite. Future unsupported schema/backup versions stop without modifying data. Item locations retain20 previous entries; photos are normalized JPEG <=500KB, max1400px, input<=20MB/24MP. Up to5000 items/500 locations/100 routines/100 entries per routine and48MB JSON snapshot. Limits keep import/memory bounded; device quota can be smaller. Quota failures retain prior state. Sessions are separate from templates.

Encrypted .keeplume format1 uses AES-256-GCM, 128-bit authentication tag, random96-bit nonce, random128-bit salt and PBKDF2-HMAC-SHA256/600000 iterations. Canonical metadata is authenticated additional data; unsupported parameters are rejected. Browser Web Crypto only; no custom crypto. Photos are included. Passphrases never go to URLs/storage/network/logs. Lost passphrases cannot be recovered. Encryption protects exported files, not unlocked device storage.

Import decrypts/authenticates/validates the complete bounded structure before confirmation. Merge keeps existing matching IDs; replace overwrites the snapshot atomically. Both use revision checks and reject invalid cross-references/duplicate IDs. Export existing records first; no automatic cloud sync. Keep passphrases separately in a password manager. Test recovery before relying on an export. Interrupted transactions cannot partially replace a library; a download indicator cannot prove you saved a file.

## Installation and offline
iPhone Safari → Share → Add to Home Screen. No App Store listing. Complete one online load before relying on offline items/routines. Service worker precaches only static app assets; never intercepts foreign origins or uploads personal data. New workers wait; users explicitly activate after saving/discarding edits. Shell updates never delete IndexedDB. Browser eviction/site-data deletion can remove records and cache. Persistent-storage requests are optional and not guaranteed.

## Hosting/security
Designed for personal free static hosting. Default CSP is restrictive, bundled scripts/styles/assets only; user content uses textContent. No external fonts/CDNs/AI/analytics. Photos allow only resized JPEG, never SVG/HTML. Github Pages cannot set custom response headers; CSP is provided in HTML, and the app refuses framed execution. Local preview additionally sends CSP/frame-ancestors and nosniff headers. No sensitive information is supplied to a server. Normal hosting access logs still exist. GitHub Pages free public-repository eligibility and quotas must be verified at deployment; no domain purchase/Railway service/plan upgrade.

Reference decisions: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt ; https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB ; https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html ; https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits .

## Device limits
Emulation does not verify physical iPhone camera permissions, Home Screen installation, offline relaunch or iOS eviction behavior. Those require owner device checks. Native file capture handles selection/cancellation; unavailable camera can be bypassed with photo selection or no photo. Reminders are in-app dates only, never promised background alarms.

## Hosted app

Personal HTTPS address: https://brettlawrence-de.github.io/keeplume/ . Repository: https://github.com/brettlawrence-de/keeplume . Install/recovery/device checklist: docs/IPHONE-GUIDE.md . Latest local deployment receipt and resumable status: .local/RELEASE.md (ignored, never contains personal records or credentials).


## Name and compatibility

Previously Keeplume; the existing `/keeplume/` address and repository, IndexedDB `keeplume-vault`, channel/cache identifiers and encrypted `format: Keeplume` version1 remain intentionally unchanged. Old `.keeplume` backups import normally; new exports use the Nelmavriq display name with the same compatible extension/encryption. No records are migrated or cleared. iPhone installed names/icons may not refresh automatically; do not uninstall or clear website data before a verified backup.
