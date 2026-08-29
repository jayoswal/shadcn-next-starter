# Handoff: deWork Labs — AI Voice Calling Agents Hero

## Quick start (easiest path)
`DeworkHero.jsx` is a single, dependency-free, ready-to-drop-in React component that reproduces the entire hero section pixel-for-pixel — layout, tokens, icons, and the animated waveform/word widget all included, inline-styled (no CSS setup needed). This is the fastest way to implement:

1. Copy `DeworkHero.jsx` into your components folder.
2. Add the "Outfit" Google Font in your app's `<head>` (or swap `FONT` at the top of the file for your own).
3. Render it: `<DeworkHero onBookCall={() => ...} onCall={(phone) => ...} />` — both handlers are optional.

Everything below documents the design in full detail for anyone adapting it further (e.g. porting to non-React stacks, or matching an existing design system instead of using the file's inline styles).

## Overview
Mobile-width hero section for a landing page promoting an AI voice calling agent product. Centerpiece is an animated "waveform → language name → waveform" widget showing the agent speaking in multiple Indian languages, plus a phone-number capture form.

## About the Design Files
The files in this bundle (`deWork Labs Landing.dc.html`, `Voice Command Widget.dc.html`, `Voice Command Widget - Words to Waveform.dc.html`, `VoiceCommandWidget.jsx`, `WordsToWaveformWidget.jsx`) are **design references**, built as standalone HTML/React prototypes to show exact look, motion, and timing. They are not production code to import as-is — recreate this UI in your app's actual stack (React assumed here) using your existing component/styling conventions. The two `.jsx` files are already plain, dependency-free React components and can be used as a closer starting point than the `.dc.html` files.

## Fidelity
**High-fidelity.** Exact colors, spacing, typography, and animation timing are final — implement pixel-for-pixel.

## Screens / Views

### Hero section (`deWork Labs Landing.dc.html`)
- **Purpose**: Landing page hero — headline, live multi-language voice demo, phone-number capture, curved divider into the next section.
- **Container**: 382px wide (mobile-first card), white background `oklch(99% 0.003 240)`, font family "Outfit" (400/500/600/700 weights, Google Fonts).
- **Layout** (top to bottom, single column):
  1. **Header row** — flex, `justify-content: space-between`, padding `22px 22px 0 22px`.
     - Logo text "deWork Labs": 16px, weight 600, color `oklch(18% 0.01 240)`.
     - "Book a call" button: pill (border-radius 999px), transparent bg, 1.5px solid border `oklch(18% 0.01 240)`, 14px/500 text, padding `8px 18px`.
  2. **Heading block** — padding `34px 24px 0 24px`, centered text.
     - H1 "AI Voice Calling Agents": 26px, weight 600, letter-spacing -0.01em, color `oklch(18% 0.01 240)`.
     - Subhead "Talk to our agents in:": 15px, weight 400, color `oklch(45% 0.01 240)`, margin-top 12px.
  3. **Waveform-to-word widget** — see Components below. Margin-top 22px, vertical padding 16px, full width, height 40px animation area.
  4. **Phone input row** — padding `22px 24px 34px 24px`.
     - Pill container: flex, gap 10px, 1.5px solid border `oklch(18% 0.01 240)`, border-radius 999px, padding `8px 10px 8px 14px`.
     - Country flag (India SVG, 20×14) + chevron-down icon, separated from input by a 1px right border `oklch(85% 0.01 240)`.
     - `<input type="tel">`, placeholder "9876543210", borderless/transparent, 15px text, flex:1.
     - Circular call button: 36×36px, background `oklch(58% 0.1 220)` (cyan), white "phone-outgoing" icon (17×17), no border.
  5. **Curved divider** — full-width SVG, viewBox `0 0 382 30`, a single quadratic-curve stroke (`M0,30 Q191,0 382,30`), stroke `oklch(18% 0.01 240)` at 1.5px, no fill. A `drop-shadow` filter (`0 -8px 10px oklch(18% 0.01 240 / 0.15)`) creates a soft shadow above the line, giving the hero a "card edge" feel without an actual card background/border. Nothing renders below this divider — it is the end of the hero section.

## Components

### Waveform ↔ word pill (the core animated widget)
Purpose: demonstrates the AI agent "listening/speaking" by morphing a scrolling waveform into a language name and back, on a continuous loop, for 10 Indian languages: اردو, हिन्दी, বাংলা, தமிழ், తెలుగు, मराठी, ਪੰਜਾਬੀ, ગુજરાતી, ಕನ್ನಡ, മലയാളം. (The full 22-language variant with the same mechanics lives in `Voice Command Widget.dc.html`.)

Structure (left to right): scrolling waveform bars → center pill with the current language name → scrolling waveform bars (mirrored).

- **Waveform bars**: thin lime bars (`#7CCF00`), 4px wide, spaced 9px apart, heights varying algorithmically (`22 + |sin(i*0.9)|*55 + |sin(i*2.1)|*23`, clamped to 100%) for an organic look. Bars scroll continuously left→right at 20px/second via a `requestAnimationFrame` loop (not CSS animation — needed for the squeeze math below).
- **Squeeze effect**: as each bar approaches the center pill (within a 20px zone), its vertical scale is smoothly reduced via `scale(1, s)` using a smoothstep easing (`s = 0.1 + 0.9 * smoothstep(0, 20, distanceToPill)`), and a mask-image gradient fades bar opacity near the pill edge. This makes the waveform look like it's being "squeezed into" the pill and "unsqueezed" as it emerges the other side.
- **Center pill**: 40px tall, min-width 104px, border-radius 20px, `box-shadow: inset 0 0 0 1.5px oklch(55% 0.1 220)` (an inset shadow, not a `border` — this keeps the stroke width visually even around the curved ends, unlike a CSS `border` on a small pill radius), white background.
- **Word text inside pill**: cycles through the language list every 1100ms. Each word animates in/out via `scaleX` + `opacity` on a 0→1→0 envelope (smoothstep ease-in over first 18% of the cycle, hold, smoothstep ease-out over last 18%) — giving the same "squeeze" language as the waveform.
- **Positioning**: the two waveform tracks and the pill are all absolutely centered/positioned so the pill sits exactly at the horizontal center, with the bar tracks' inner edges reaching to ±30px from center (slightly underlapping the pill, no visible gap).

Variant: `Voice Command Widget - Words to Waveform.dc.html` reverses the direction (scrolling text on the outside, an idle/active canvas-rendered equalizer in the pill) — reference only if that direction is also needed.

## Interactions & Behavior
- Entirely ambient/looping — no user-triggered interaction on the widget itself.
- Animation loop: single `requestAnimationFrame` loop recalculating bar positions/scales and word envelope every frame from elapsed time (not CSS keyframes), so bar-scroll and word-cycle stay in sync.
- Phone input: standard `<input type="tel">`; no validation logic specified — implement per your app's existing form patterns.
- "Book a call" button and call button: no destination specified in this design; wire up per product requirements.

## State Management
- Widget needs: elapsed-time-driven state (`startTime` captured on mount, recomputed every rAF tick) to derive bar positions and word-cycle index/envelope. No persisted state.
- Phone form: local input value state; no state shown for submission/loading.

## Design Tokens
- **Colors**:
  - Ink/text/borders: `oklch(18% 0.01 240)` (near-black, slightly cool)
  - Secondary text: `oklch(45% 0.01 240)`
  - Muted border: `oklch(85% 0.01 240)`
  - Page/card background: `oklch(99% 0.003 240)` (near-white, "mist")
  - Cyan accent (call button, pill outline, word text): `oklch(58% 0.1 220)` / `oklch(55% 0.1 220)` / `oklch(35% 0.09 220)`
  - Lime chart/waveform accent: `#7CCF00`
- **Font**: Outfit (400, 500, 600, 700) — heading and body both use it.
- **Radius**: pills/buttons fully round (999px); pill widget 20px; small controls follow a "small radius" system scale.
- **Icon set**: Tabler Icons (chevron-down, phone-outgoing) — inlined as SVG path data in this build since the webfont CDN was unreliable in the prototyping sandbox; source proper Tabler Icon SVGs/React components in the real codebase instead of copying the inline paths verbatim.

## Assets
- India flag: hand-built inline SVG (white/saffron/green bands + navy Ashoka Chakra placeholder circle) — replace with your app's real flag icon set/library.
- Icons: Tabler Icons — chevron-down, phone-outgoing.
- Font: Google Fonts "Outfit".

## Files
- `DeworkHero.jsx` — **start here.** Complete, ready-to-use React component for the whole hero section.
- `deWork Labs Landing.dc.html` — full hero section, source of truth for layout/tokens above.
- `Voice Command Widget.dc.html` — standalone waveform↔22-language-word widget (larger size, same mechanics).
- `Voice Command Widget - Words to Waveform.dc.html` — reversed-direction variant (text outside, canvas equalizer in pill).
- `VoiceCommandWidget.jsx` — plain React port of the waveform↔word widget (waveform outside, word in pill).
- `WordsToWaveformWidget.jsx` — plain React port of the reversed variant.
