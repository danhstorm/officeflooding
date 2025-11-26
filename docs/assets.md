# Asset Reference

Quick notes on every external bitmap we now load so you can edit artwork outside this project without touching code.

## Static imagery

| File | Purpose | Notes |
| --- | --- | --- |
| `img/OFFICE_FLOODING_console.png` | Photographed console face (all logos, labels, paint) | Export at 3427×2262. Replacing this updates the entire console body. Keep the same aspect ratio so `--console-aspect` stays accurate. |
| `img/LCD.png` | LCD texture sheet used for every animated segment | Should remain aligned with `flooding_LCD_sheet_mask.svg`. When you swap this, no code changes are required because `loadSvg.js` always clips against the SVG mask. |
| `img/console_buttons.png` | Highlight texture for every physical button | Must share the same dimensions as the console PNG. Individual highlights are revealed via SVG clips (see below). |

## Mask files

- `img/flooding_LCD_sheet_mask.svg` — master SVG that holds every LCD segment path **plus** the button paths (`left`, `right`, `game`, `time`, `alarm`). Both `loadSvg.js` and `buttonLights.js` fetch this file so keep the IDs intact when editing.

## Button overlay pipeline

1. `buttonLights.js` fetches `flooding_LCD_sheet_mask.svg`, clones the five button shapes, and builds clip-paths.
2. An inline `<svg>` is injected into `#button-lights`. For each button we drop an `<image>` pointing at `console_buttons.png` and apply the corresponding clip-path.
3. Input handlers call `setButtonLight()` / `pulseButtonLight()` so those `<image>` nodes simply toggle the `is-active` class (opacity animation lives in CSS).

If you need to tweak the highlight art, just edit `img/console_buttons.png`. If you move a button inside the artwork, update the path in the SVG (the IDs stay the same) so the mask continues to line up.

## Layout offsets

- `#console` stretches to the viewport but keeps the console PNG aspect ratio. The button overlay SVG, button hit areas, and LCD screen all assume a 3427×2262 canvas.
- LCD placement is still controlled with CSS variables (`--lcd-*`); adjust those if you ever crop the console imagery.
- Button hit areas live in CSS (`#btn-left`, `#btn-right`, `#btn-game`, `#btn-time`, `#btn-alarm`). Update their percentage-based `top/left/width/height` if the artwork shifts.

## Audio placeholders

Audio is still handled synthetically (Web Audio API). If you later add WAV/MP3 files, drop them in `sfx/` and wire them up in `main.js`.
