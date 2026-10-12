# Keeplume release verification — 12 October 2026

17 synthetic automated tests PASS. Covers atomic IndexedDB/revisions, concurrent changes, quota/interruption rollback, schema/version refusal, item history/deletion/location links/search/routine sessions, authenticated backup roundtrip/wrong passphrase/corrupt envelope/duplicates, CSP/safe rendering and PWA icons. Dependency audit reports zero vulnerabilities.

12 real Microsoft Edge browser scenarios PASS with fictional data: onboarding/empty/populated views; native-file photo cancellation and unsupported-format handling, real resized JPEG; names/notes/tags search; item editing/history/confirmed deletion; reusable location filter/rename/removal; linked and custom routines/session reset; dates; exact encrypted snapshot/photo/settings recovery; wrong passphrase and cancelled replacement; reload/offline reads and writes; quota errors preserving input; explicit worker update preserving saved data and unsaved draft until decision; dark mode and initial storage failure/retry. No JavaScript exceptions or external requests. Widths320/375/390/430/768/1440. Phone/library/checklist frames visually reviewed.

Physical iPhone13 camera permission/real HEIC/orientation, Home Screen installation/offline relaunch/iOS eviction, VoiceOver and keyboard scrolling remain UNVERIFIED. Emulated checks do not establish these. Native file-picker cancellation simulated; no physical camera permission prompt was operated. Persistent storage is requested only on user action and is not guaranteed. Backup download preparation is not proof of external file custody/cloud sync.

Replacement SVG wordmark/icon are original artwork as authorized, not a recreation of an unavailable image. Apple180/PWA192/512/maskable512 PNGs rasterized from the replacement SVG, dimensions verified. All application resources bundled; no fonts/CDNs/AI/analytics or personal-data APIs.

Hosting choice: separate public brettlawrence-de/keeplume repository on existing GitHub Free account, personal static GitHub Pages and standard Ubuntu Actions runner. Official free eligibility/quotas checked; no domain, credits, subscription or Railway resources purchased. Provider terms/limits apply. GitHub Pages custom response headers unavailable: restrictive CSP in HTML; local preview adds response headers; app refuses framing. Other projects on the same github.io origin are not origin-isolated; only host trusted code there. Photos/records/passphrases are device-local; host sees ordinary asset access logs.

References: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits ; https://docs.github.com/en/billing/concepts/product-billing/github-actions .

Source/QA receipts retained in C:/Users/USER/AppData/Local/Temp/keeplume-browser-result.json and keeplume-preview. The synthetic backup fixtures are not in Git. Brett PA/source/database/deployment/domain/settings untouched throughout this task.
