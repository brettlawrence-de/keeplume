# Nelmavriq on iPhone

1. Open the deployed HTTPS address in **Safari**. Complete the first online load; choose Start remembering. Samples are optional, clearly fictional and removable in Settings.
2. Safari → **Share → Add to Home Screen**. Keep Open as Web App enabled when offered. Nelmavriq is a web app, not an App Store product.
3. Open its icon. Save a belonging: name, Take a photo/Choose a photo (optional), written location, optional notes/tags/date. Choose a reusable location if useful.
4. Search everything in Items. View details to edit, move, review previous locations or confirm deletion. Locations let you reuse descriptions; removing a location never deletes item records.
5. Routines includes editable Work, School and Travel templates. Link entries to belongings, mark essentials and start a checklist. Reset session resets its checks, not the template. To take shows dates inside the app; it does not schedule background alarms.

## Back up first, and often

Settings → Export encrypted backup. Choose and confirm a long, unique passphrase in the local fields. Save it separately in your password manager. Save the .keeplume file in a location outside this browser, such as your existing iCloud Drive/Files or an external drive. This download does not automatically upload/sync, and Nelmavriq cannot know that you saved it successfully. Keep an older verified copy as well. Make backups after important additions, before imports/device/browser changes, and periodically.

To recover: Settings → Import backup → select .keeplume → enter passphrase locally → Verify backup first. Wrong passphrases/corrupt/unsupported files change nothing. After verification, choose Merge (existing matching IDs remain) or Replace (current library overwritten atomically). Export current records first. Photos, locations, routines, sessions and settings are included. A lost passphrase cannot be recovered. Local records themselves are not encrypted; use your device passcode.

## Check on your actual iPhone

- Deny camera permission once: existing records/photo must remain; choose a library photo or save without one. Try a real camera photo and confirm orientation/readability. JPEG/PNG/WebP are accepted; unsupported HEIC should be converted to JPEG. Native picker behavior differs by iOS version.
- Install, reopen from Home Screen and verify you are using the expected library. Safari and standalone apps can have differing storage contexts; never assume records transferred.
- After a successful online load, enable airplane mode. Reopen, view/search/edit an item and check/reset a routine. Return online. Confirm saved changes remain. No cloud sync is implied.
- Export, save through Files, import a copy and verify a photo plus a location. Keep the passphrase separately. Do not delete your only good backup or browser data during the test.
- Test keyboard scrolling, VoiceOver labels/focus and dark mode. Browser-emulated viewport checks do not establish physical-device behavior.
- iOS/browser storage may be cleared or evicted even when persistent storage is requested. External backups remain essential.

## Updates and privacy

Updates wait for your action. Finish or explicitly discard unsaved edits before Update safely. Updates do not delete IndexedDB. No personal information, photo or passphrase is sent to a server/AI/analytics; hosting still sees normal app-file access logs. GitHub Pages uses the account's github.io origin: other code on that same origin could technically access local storage. Host only trusted projects there. Moving to a different origin requires export/import; free hosting is subject to provider terms/quotas.


## Name and compatibility

Previously Keeplume; the existing `/keeplume/` address and repository, IndexedDB `keeplume-vault`, channel/cache identifiers and encrypted `format: Keeplume` version1 remain intentionally unchanged. Old `.keeplume` backups import normally; new exports use the Nelmavriq display name with the same compatible extension/encryption. No records are migrated or cleared. iPhone installed names/icons may not refresh automatically; do not uninstall or clear website data before a verified backup.
