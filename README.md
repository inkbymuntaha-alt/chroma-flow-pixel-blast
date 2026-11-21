# Chroma Flow: Pixel Blast

A self-contained, mobile-friendly colour-connection puzzle game built with HTML, CSS and vanilla JavaScript.

## Play locally
Open `index.html` in a modern browser. No build step, dependencies, external fonts, images, APIs or network access are required.

## Publish with GitHub Pages
1. Open **Settings → Pages** in this repository.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select branch **main** and folder **/(root)**, then Save.
4. Wait for GitHub Pages to finish publishing, then open the URL shown on the Pages settings screen.

## Game features
- 20 progressive levels with boards from 5×5 to 9×9
- Guaranteed connected route layouts generated locally in the browser
- Mouse, stylus and touch drag controls
- Start a colour path from either matching endpoint
- Undo, restart, hints, move counter and elapsed timer
- Best-time records and level progress saved on the current device
- Responsive layout for phones, tablets and desktop screens
- No external libraries, images, fonts, APIs or network dependencies

## Controls
Drag from a glowing endpoint to its matching endpoint, moving one neighbouring tile at a time. Paths cannot overlap. Fill every tile and connect every colour pair to clear the level. Use **Undo** to restore the previous path, **Restart** to reset the level, or **Hint** for a nudge.

Progress is stored in your browser's local storage and stays on that device.
