# UI Studio style for 구름 제작소

References: Motion mobile screenshots F62699F6 and 83CA66D5 supplied in ChatGPT.

- Warm white canvas (#fafaf8), near-black text, quiet gray secondary text. Preserve photographic sky scenes and realistic clouds.
- Thin neutral outlines and 12–20px corners. Remove blue card backgrounds and stacked decorative borders. Lime (#c5ec54) appears only on active controls, small markers and counts.
- Keep centered two-tab navigation compact. Five experiment stages use text labels, readable active state and at least 44px touch height.
- Story hierarchy: step marker → action/title → instructions → current result → explanation. Use spacing and divider lines instead of nested colored cards.
- Primary save/publish buttons are dark; secondary controls are outlined. Cloud previews remain large and maker/type text has uncropped line-height.
- Desktop: wide sky beside explanation, weather/sun/time in one neutral toolbar. Mobile: stage navigation, compact sky, explanation; sky settings outside the scene.
- Same sky and Story frame across all five stages. Settings must never resize the gesture frame. Keep rendered canvas fallback on WebGL failure.

Verification: 320, 390, 430, 1440px; initial, lifted air, formed cloud, result, library/detail, sky editing and selected-cloud resize. Local Chromium is not real iPhone Safari.

## Comparison and revisions

- Baseline: blue nested cards and raised active buttons. Final: white panels, neutral dividers, pale lime active state; realistic backgrounds unchanged.
- First screenshot: water emoji rendered as a missing glyph. Replaced readout symbols with explicit Korean labels (물, 높이, 씨앗, 비).
- Small viewport: step labels needed more prominence. Increased font at widths >=360px while retaining 44px hit areas.
- Detail screenshot: tall art compressed the metadata row. Switched detail dialog to an uncompressed column with scrolling.
- Verified five identical sky/Story heights at each viewport, picker only on stage 2, no horizontal document overflow. Ten gesture samples had unchanged sky height.
- Mobile touch: cloud tap placement, corner resize from 240px to 290px, tray scroll to 326px, sky pan from -405px to -639px; no JavaScript errors.
