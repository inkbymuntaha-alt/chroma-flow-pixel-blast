# Release testing checklist

Automated checks help catch regressions, but they do not prove that the game is bug-free. Complete this checklist on real devices before a Google Play closed test.

## Core puzzle
- [ ] Start a new level and complete the tutorial.
- [ ] Select shelves by tapping; confirm selection feedback is immediate.
- [ ] Move items to empty shelves and matching shelves.
- [ ] Confirm mismatched moves are rejected without losing an item.
- [ ] Fill a shelf with four matching products and confirm it sorts.
- [ ] Complete a level; verify reward, stars, customer order and next-level flow.
- [ ] Try hint, undo, mix-up and restart repeatedly.
- [ ] Confirm levels 1–100 load, especially 17, 21, 25, 29, 41, 61, 81 and 100.

## Progress and rewards
- [ ] Close and reopen the game; verify level, coins, stars and profile persist.
- [ ] Claim a daily login reward; verify it cannot be claimed twice that day.
- [ ] Complete a daily challenge; verify its reward does not consume the normal level's chapter perk.
- [ ] Test Golden Basket and Rainbow Basket levels.
- [ ] Test boss levels 10, 20, ... 100 and their badges.
- [ ] Buy a decoration and market upgrade; verify the scene updates.
- [ ] Export a backup, restore it on a test profile and verify progress.
- [ ] Try a damaged backup and confirm it is rejected safely.

## Touch, display and performance
- [ ] Test on a smaller Android phone and a larger phone.
- [ ] Test portrait layout with system font/display scaling increased.
- [ ] Tap quickly between shelves; test short and long drags.
- [ ] Test pointer cancellation by starting a drag and moving off the game.
- [ ] Confirm buttons remain reachable above the Android navigation area.
- [ ] Play for at least 15 minutes; watch for lag, audio buildup or stuck overlays.

## PWA and offline
- [ ] Open the game online and wait for the service worker to install.
- [ ] Install/add the game to the home screen where supported.
- [ ] Relaunch from the installed icon.
- [ ] Enable airplane mode and confirm the cached game opens.
- [ ] Reconnect and confirm a fresh version is picked up after deployment.

## Google Play closed test
The GitHub Pages PWA is not itself an Android App Bundle. Package the game as an Android app, generate and sign an AAB, test that AAB on real devices, complete Play Console declarations, then invite closed testers. Collect feedback and resolve crashes before requesting production access.

For every bug, record device model, Android version, browser/WebView version, reproduction steps, expected result and actual result.
