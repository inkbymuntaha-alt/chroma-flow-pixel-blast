# Nazeef Bazar Sort Stories

A mobile-first, portrait 2D sorting puzzle set in a growing neighbourhood bazaar. Built with vanilla HTML, CSS and JavaScript; no game engine, external runtime library, account or network connection is required to play the core game.

## Play
https://inkbymuntaha-alt.github.io/chroma-flow-pixel-blast/

For offline play, open the game once while online and allow the service worker to cache it. Then use the browser's **Install app / Add to Home screen** option where available.

## Gameplay
- Tap a shelf to select its top item, then tap an empty shelf or a shelf with the same top item.
- Each shelf holds four items. Complete shelves of matching products to finish a level.
- 100 progressive levels across ten market chapters.
- Ten products, with new varieties introduced as levels advance.
- Chapter-specific customers, market scenes, first-shelf rewards and boss challenges.
- Hints, undo, mix-up, three-star ratings, daily challenges and bonus baskets.
- Coins, profile, achievements, market upgrades, decorations, festivals and Fruit Dash.
- Local progress and JSON backup/restore.
- Optional Supabase cloud save requires the player to configure their own project and database policies.

## Development and quality checks
The project is dependency-free. Run automated regression checks with Node.js 22 or newer:

```sh
node qa.mjs
```

The GitHub Actions **Game QA** workflow runs these checks on pushes and pull requests. It checks JavaScript syntax, unique HTML IDs, direct UI element references, PWA assets, reward isolation and 300 deterministic puzzle layouts across all 100 levels.

## Android / Google Play
The current published build is a web PWA hosted on GitHub Pages, not a native Android App Bundle. Google Play release requires an Android package/AAB, signing and Play Console setup. Test on real Android devices before closed testing or public release.

See [TESTING.md](TESTING.md) for the manual device-test checklist.
