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

## Navigation and interaction (Nov 2026 UX pass)
These additions came from the design audit in `.ui-design/reviews/app_20261115.md`.

- **Header:** brand (links home), a global search box (`/` focuses it) with suggestions for people and companies, then the tabs (Timeline / Calendar / Records / About). The header stays sticky on phones, where the search collapses to an icon button. A "Back to top" button appears after 1.5 screens of scroll.
- **URL is the state.** `#view[/id]?type=&scope=&ev=&lost=&p=0&co=&q=` holds the shared filters. View-only settings are added in their own view: `sort` (Records), `end`, `zero`, `all`, `find` (Timeline) and `m` (Calendar). Default values are left out of the URL. Filter changes replace the history entry; switching views and opening a case push a new one, so Back closes the drawer.
- **One shared filter bar** (case type, company list, evidence, outcome, prominent employees) sits under the intro in Timeline, Calendar and Records. When anything is off its default, a summary line reads "Showing N of M cases" with removable chips (company, search) and "Reset filters". Empty states name the active filters and offer Clear search / Reset filters.
- **Timeline:** stats are Cases, Companies, Lost their role. A "Latest cases" strip (4 cards; a swipeable row on phones) sits above the filters. The per-year and year-label rows stick under the header. The legend sits in the timeline toolbar with "Find a company" and "Companies with no cases". Rows are sorted by cases inside the year window. Companies with cases only outside it are counted in a note with "Show earlier years". Only the top 25 rows show until "Show all N companies". `‹+n` / `+n›` chips in the total column move the window to a company's earlier or later cases. Company names wrap to two lines and open Records filtered to that company. Dots keep their 9px look with a ~23px hit area.
- **Calendar:** selecting a month scrolls its case list into view, with a Close button.
- **Records:** Disclosed, Company, Person and Evidence headers sort (with `aria-sort`); on phones the header becomes a "Sort by" bar. Company names are links to the company filter.
- **Drawer:** a modal. The rest of the page is `inert` and body scroll is locked. Top bar: ‹ Prev · n of N · Next › (also ←/→) through the current view's list, then ×. The evidence pill links to About › Evidence, and a one-line definition parsed from `METHODOLOGY.md` sits under the pills. Facts include "Last verified". "Other records about this person", an archived-copy link when `archive_url` exists, and "Copy link to this case" follow.
- **About:** an "On this page" table of contents; sections are addressable as `#about/<section>`.
- **Footer:** published-case count, data last verified date (latest `verified_on`), and a Methodology link. There is deliberately no public corrections link and no data download.
- **Dark mode:** all colours are tokens on `:root`, redefined under `prefers-color-scheme: dark` (and `:root[data-theme="dark"]`). Dark accent `#e2604a`, surface `#1c1b19`, bg `#141312`.

## Landing and motion (Nov 2026, round 2)
- **Hero:** the H1 spans up to 760px (two lines on desktop). The lede says what the tracker is and why to trust it ("A sourced record … since <first year>. Every case links to its sources and is labelled by how well it is confirmed.") and links to the methodology. How to read the chart moved to the chart's own caption.
- **Latest cases:** one card per person (newest first; if several records share a month, the strongest evidence wins), with "+n more records" when a person has more than one. "All N records →" links to Records.
- **Filters:** one row: case type, a **Filters** button that opens a pop-over (Company list, Evidence, Outcome, Include prominent employees, and on the timeline Show companies with no cases), then on the timeline "Find a company" and the year range. The button shows a count badge for active pop-over filters, and every active filter except case type also appears as a removable chip under the row.
- **Chart caption:** "Cases by company and year" with a one-line hint, and the legend on the right.
- **Misconduct colour:** its own token `--misc` (`#4b51b5` light, `#a3a7f7` dark), instead of `--ink-2`.
- **Motion** (all off under `prefers-reduced-motion: reduce`):
  - First load: per-year bars rise (staggered 18ms), counts fade in, dots pop in, and the headline stats count up from zero (700ms, ease-out).
  - Timeline filter or range changes use FLIP: rows slide to new positions, dots travel with them, new dots scale in, and bars resize, over 260ms `cubic-bezier(.2,.7,.2,1)`.
  - Hover card on dots (mouse, or keyboard focus-visible): company · month, name, role, the summary's first sentence, and the tier. It fades and rises 4px in 120ms, flips below the dot near the header, and replaces the native title tooltip.
  - The header becomes translucent with a blur and a soft shadow once the page scrolls. The timeline's pinned year row gets the same shadow while stuck.
  - The filter pop-over and search suggestions drop in over 140ms.

## Home page (Nov 2026, round 3)
The default route (`#home`, or no hash) is a home page; the company-by-year grid lives under **Timeline**. Navigation: Home · All cases (the Records table) · Timeline · Calendar · About.
- **Search first:** a centred H1, a one-line sub ("Search 147 sourced cases since 1993, each labelled by how well it is confirmed") and a large search box. The header's search element is moved into the hero on Home and back into the header on every other view, so there is only ever one. Under it, "Try" chips list the five companies with the most cases.
- **Cards:** two **Latest** (one per person, newest first; within a month the strongest evidence wins) and two **Notable**: the newest cases where the role is CEO, chief executive, chair, president, founder or managing director, the company is Fortune 500 or Global 500, and the evidence is confirmed, adjudicated, admitted or settled. Each card shows the company list as a kicker.
- **Cases by year:** stacked bars per year (relationship in accent, misconduct in `--misc`). By default it shows the **last 10 years** (`YC_W`), with a count on every bar; ‹ › step back and forward 10 years at a time, and **All years** shows every year from the first case, labelling only the peak. The current year is hatched and marked "so far". Notes in `YC_NOTES` (currently none) are drawn over their year when it is in view. The Cases / Companies / Lost their role totals sit in a column to the left of the chart (in a row on phones) and count up on first load. Switching windows replays the grow-in animation. Selecting a bar opens All cases filtered to that year (`yr` URL parameter, shown as a "Year: 2018 ×" chip).
- **Share image** (`app/og.png`, 1200×630, source `design/share-card.html`): brand and URL, the headline, then a white panel with the total case count large on the left and the last 10 years as labelled bars on the right. Regenerate it after data changes.
- **Browse** tiles link to All cases, Timeline and Calendar.
