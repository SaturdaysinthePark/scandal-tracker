# Design spec

**The reference prototype is `design/Scandal Tracker.dc.html`.** Open it in a browser and keep `support.js` next to it. It's an HTML design reference, not production code. Recreate it in the app's framework, reading data from `data/*.json`.

Fidelity is **high**. Match the colors, type and layout below.

## Tokens
| token | value |
|---|---|
| bg | `#f5f4f1` |
| surface | `#ffffff` |
| ink | `#151515` |
| ink-2 | `#3d3b38` |
| muted | `#6e6b66` |
| faint | `#8a8680` |
| rule | `rgba(21,21,21,0.08)` (rows `0.06`, gridlines `0.05`) |
| hover row | `#faf9f7` |
| accent | `#c8412b` |
| selection | `#f3cfc6` |
| radius | 6px for pills and buttons, 8px for inputs, 12px for cards |
| shadow | active pill `0 1px 2px rgba(21,21,21,.12)`; drawer `-12px 0 40px rgba(21,21,21,.12)` |

Type: **Instrument Sans** (400/500/600) for the UI, and **IBM Plex Mono** (400/500) for figures, years and dates.
- H1: 28–40px (clamp), weight 600, tracking -0.025em, line-height 1.05
- Body: 14px with line-height 1.55. Meta text: 11–12px.
- Stat values: Plex Mono 32px, weight 500

## Layout
- Sticky header: a 10px accent dot, the "Scandal Tracker" wordmark (16px, weight 600), and a segmented tab control on the right (Timeline / Records / About).
- Main: max-width 1320px, padding `32px clamp(16px,3vw,40px)`.

### Timeline (landing)
1. **Intro row:** the H1 "Executives brought down by workplace relationships", a one-line explainer, and three stats on the right (Disclosures, Companies, Ended in exit).
2. **Controls:** a scope segmented control (All / Fortune 500 / Global 500 / Other notable), checkboxes for "Unconfirmed reports" and "Companies with none", and on the right a range navigator `‹ 2007 – 2026 ›` that steps 5 years at a time. The default window is 20 years and the earliest year is 1990.
3. **Card** (white, 1px rule, radius 12, overflow-x auto, min-width 760). The grid columns are `168px | 1fr | 64px`.
   - Row 1: the "Per year" label, then an accent bar chart with one bar per year (height scaled to the max, 44px max, count label above), then an empty totals column.
   - Row 2: "Company", then year labels (`'07`… in Plex Mono 10px), then "Total".
   - Company rows are 40px tall. The name (14px, weight 500, ellipsis) is sticky on the left. Each year cell is centered and wraps **9px dots** with a 3px gap, ordered by month. The total is on the right in Plex Mono 14px, with a faint "+n‹" when there are records before the current window.
   - Dots: solid accent means confirmed, acknowledged or reported. A 1.5px accent ring with no fill means unconfirmed. On hover a dot scales to 1.4. Clicking opens the drawer. The tooltip reads "Executive · Mon YYYY · tier".
   - Rows are sorted by count (descending), then latest disclosure, then name. Companies with zero records are hidden by default.
4. **Legend** below the card, plus the coverage note "Coverage is incomplete. Research is ongoing."

### Records
An H1 and a search input (filters on company, executive, category and summary). A white card holds a table with columns Disclosed (mono), Company, Executive (with the role beneath), Category, Outcome and Evidence (dot plus label). Clicking a row opens the drawer.

### About
Sections rendered from `docs/METHODOLOGY.md` content.

### Detail drawer
The drawer slides in from the right at `min(460px,100%)` over a backdrop of `rgba(21,21,21,.25)`. From top to bottom:
- Company · date
- Executive name (26px, weight 600)
- Role
- Pills: evidence, category, outcome
- Summary
- **Primary source card**, an outlined link: the label ("SEC filing" or "Primary report") with the hostname beneath it and an ↗ icon. Hide it when there's no URL.
- Sources list

Clicking the backdrop or × closes it.
