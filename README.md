# hiking-biji-tracker

Tampermonkey userscript for [健行筆記 (hiking.biji.co)](https://hiking.biji.co).

On minisite "尋寶任務" pages (e.g. 臺北大縱走、淡蘭古道), the route list shows a
`去過此路線` button per segment. This script:

- Tags each route card with a clear ✅ 已去過 / ⬜ 未去過 chip and colored border
  (the native icon-only indicator is easy to miss).
- Builds a personal cross-page database (via Tampermonkey storage) of every
  route you've seen while browsing these pages, with search/filter and JSON export.
- Lets you manually check off a route as a local-only note (does not touch the
  site's own data or click any button on your behalf).

It never auto-clicks the site's `去過此路線` button for you — you still mark
routes visited yourself on hiking.biji.co, so your account's real record stays
accurate and untouched by automation.

## Install

1. Install the [Tampermonkey](https://www.tampermonkey.net/) browser extension.
2. Open [`hiking-biji-tracker.user.js`](hiking-biji-tracker.user.js) → Tampermonkey
   will offer to install it (raw GitHub URL is recognized automatically).
3. Log into hiking.biji.co and browse a minisite page, e.g.
   https://hiking.biji.co/index.php?q=minisite&id=318

Updates: the script has `@updateURL`/`@downloadURL` pointing at this repo's
`main` branch, so Tampermonkey will pick up new versions automatically.

## Notes

The done/not-done detection heuristic (icon/text change) hasn't been verified
against a real logged-in "已去過" card yet — if it misclassifies, open an issue
or a screenshot of a visited route card and it can be tuned.
