# UI Studio style for 구름 제작소

References: Motion mobile screenshots F62699F6 and 83CA66D5 supplied in ChatGPT.

- Warm white canvas (#fafaf8), near-black text, quiet gray secondary text. Preserve photographic sky scenes and realistic clouds.
- Thin neutral outlines and 12–20px corners. Remove blue card backgrounds and stacked decorative borders. Sky blue (#69b9ec) appears only on active controls, small markers and counts.
- Keep centered two-tab navigation compact. Five experiment stages use text labels, readable active state and at least 44px touch height.
- Story hierarchy: step marker → action/title → instructions → current result → explanation. Use spacing and divider lines instead of nested colored cards.
- Primary save/publish buttons are dark; secondary controls are outlined. Cloud previews remain large and maker/type text has uncropped line-height.
- Desktop: wide sky beside explanation, weather/sun/time in one neutral toolbar. Mobile: stage navigation, compact sky, explanation; sky settings outside the scene.
- Same sky and Story frame across all five stages. Settings must never resize the gesture frame. Keep rendered canvas fallback on WebGL failure.

Verification: 320, 390, 430, 1440px; initial, lifted air, formed cloud, result, library/detail, sky editing and selected-cloud resize. Local Chromium is not real iPhone Safari.

## Comparison and revisions

- Baseline: blue nested cards and raised active buttons. Final: white panels, neutral dividers, pale blue active state; realistic backgrounds unchanged.
- First screenshot: water emoji rendered as a missing glyph. Replaced readout symbols with explicit Korean labels (물, 높이, 씨앗, 비).
- Small viewport: step labels needed more prominence. Increased font at widths >=360px while retaining 44px hit areas.
- Detail screenshot: tall art compressed the metadata row. Switched detail dialog to an uncompressed column with scrolling.
- Verified five identical sky/Story heights at each viewport, picker only on stage 2, no horizontal document overflow. Ten gesture samples had unchanged sky height.
- Mobile touch: cloud tap placement, corner resize from 240px to 290px, tray scroll to 326px, sky pan from -405px to -639px; no JavaScript errors.

- Follow-up: removed the sky badge; water/height/seeds occupy the upper-left corner on every viewport. Switched the accent family from green to sky blue.

## Open airflow visualization

Reference: Earth Nullschool wind streamlines (https://earth.nullschool.net/ko/) for continuous flow paths; NASA Up, Up And Away (https://svs.gsfc.nasa.gov/10975/) for rising air leading into cloud growth. The approved second concept image removes the old oval, glitter and central label.

- Render open, soft blue-white streaks over the realistic sky, with transparent feathered ends. No boundary, circle, central text or sparkling vapor particles. Independent strands begin across a diffuse band rather than one luminous point.
- Weak force makes a broad low lateral fan; middle force bends upward with some widening; strong force creates a narrower tall current. Speed, width and path height blend continuously as strength changes, without re-seeding animation phases. Height moves the flow anchor separately.
- Keep water/height/seed readings upper left, strength value alongside those readings. The lift guide matches the time guide: a translucent vertical double arrow with endpoint labels, retained after touch. The transparent right-third touch zone stays full height. Existing captions and Story explain gestures outside the central visual; update old air-bubble wording to sky swipes. Mobile right third retains full-height strength gesture ownership.
- Keep airflow across lift and seed steps. The existing model determines cooling and condensation; droplets appear only with cooling and seeds and their intensity follows cloud visibility. Existing Three.js/fallback clouds remain intact.
- Reduced motion freezes time. Use an explicit non-interactive canvas, max 2× pixel density, and clean up rAF plus ResizeObserver.
- Visual comparison: initial open currents were too wide at maximum force and too faint at weak force. Narrowed the strong-flow source/span and increased strand contrast while keeping soft transparent edges. The final current has no enclosed silhouette or central label.
- Touch verification: 50 → 100 → 6 updated numeric state and animated pixels, with altitude 0m and panel height 357.7px unchanged. Height swipe independently changed altitude to 2500m. At humidity 90%, height 2500m and 40 seeds, cloud and condensation connection appeared. Widths 320/390/430/1440 had no horizontal overflow, no browser JavaScript errors, and reduced-motion pixels stayed static. Additional final captures inspected 750px and 1440px.

- Add one short, translucent upward arrow beneath the airflow source band. It follows the altitude anchor, remains non-interactive and dims as the cloud forms.
