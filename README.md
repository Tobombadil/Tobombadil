# Andrew T. Gibson — andrewtgibson.com

A personal website for an energy project finance professional, built in the visual language of a
financial model. One static HTML file: no framework, no build step, no server, no analytics.

Open `index.html` in a browser. That's the whole toolchain.

## The idea

It is a **website that wears a model as its design language** — not a spreadsheet you have to
operate. It scrolls, it has a hero, sections and anchor navigation, and it reads top to bottom
like a site should. What it borrows from the workbook is the *typography*: ruled section headers,
the blue/black/green font convention, tabular numerals, subtotal rules, a faint squared-paper
ground, and a formula bar that reveals the formula behind any calculated figure on hover.

An earlier version was a literal spreadsheet — a cell grid with sheet tabs. It was a good joke and
a bad website. This is the inversion.

## Architecture

Two layers, cleanly separated:

**The workbook** (`SHEETS`) is the data layer. Anything genuinely calculated lives there as a
formula, exactly as it would in a real model — five sheets: `Facts`, `Career`, `Research`,
`Assumptions`, `Model`. Formulas are parsed by a recursive-descent parser (no `eval`) and
evaluated lazily with memoisation and circular-reference detection. Dates are Excel serial
numbers on the 1899-12-30 epoch, so tenure accrues against `=TODAY()` on every visit.

**The site** (`SITE` plus the view functions) is the presentation layer — prose, structure and
layout. Every figure it renders carries a `data-cell` attribute naming its source cell, which is
what lets the formula bar work and what keeps the two layers honest: if a number is on the page,
it came from the model.

```js
cell('Model', 'C25', { f:'num1' })   // → a live <span data-cell="Model!C25">16.8</span>
```

### Supported functions

`SUM` `AVERAGE` `COUNT` `COUNTIF` `MIN` `MAX` `ABS` `ROUND` `IF` `REPT` `SUMPRODUCT`
`PMT` `NPV` `IRR` `TODAY` `DATE` `YEAR` `MONTH` `YEARFRAC`

Plus `+ - * / ^ &`, comparisons, parentheses, ranges (`D18:M18`) and cross-sheet references
(`Assumptions!C34`). `IRR` solves by bisection.

## The live deal model

The centrepiece is a working project finance model behind thirteen sliders: a generic 40 MW
biomass project, sized to be recognisable rather than accurate. **It describes no live
transaction and contains no confidential terms.**

Move any input and everything recalculates — a ten-year cash flow schedule, NPV, unlevered IRR,
minimum DSCR, simple payback, the cash-flow chart and the sensitivity heatmap.

It also ties out. The schedule builds ten explicit years plus a terminal value; the check values
the same cash flows as a single 25-year growing annuity. The difference is zero at every set of
assumptions, and the badge says so — or says `CHECK` if you break it.

### Charts

Two, both hand-drawn (inline SVG and a styled table; no chart library):

- **Cash flow cover** — grouped bars, EBITDA against debt service across ten years, with a
  legend, round axis steps, selective direct labels and a per-bar hover tooltip.
- **NPV sensitivity** — a 5×5 heatmap on a blue↔red diverging ramp with a neutral grey midpoint
  at NPV = 0, base case outlined, hover tooltip per cell.

Series colours `#2a78d6` / `#eb6834` were validated against the white surface: CVD ΔE 24.7,
normal-vision ΔE 33.6 — both clear of the floors.

## Editing the content

Prose, roles, deals, education and links live in the `SITE` object. Numbers live in `SHEETS`.
Slider ranges are declared on the input cells themselves:

```js
C17:{ v:95, f:'num0', input:true, min:40, max:180, step:1 },   // PPA price, $/MWh
```

## Design notes

The page commits to a single visual world on purpose: a banker's working paper is white paper,
and inverting it into a dark theme would break the conceit. Every colour is an explicit token and
`body` paints its own ground, so the page holds whatever theme the host is in.

Responsive throughout — the hero, the model and the two-column blocks collapse to one column, and
the transaction schedule restacks into records on a phone. Wide content (the cash-flow chart)
scrolls inside its own container so the page body never scrolls sideways.

## Still to decide

One placeholder remains, on the Contact section: **availability status**, currently
*"[Set availability]"*. The phone number from the CV is deliberately not published — a public web
page is a different exposure to a targeted PDF. Add it to `SITE` if you want it public.

## Deployment

`.github/workflows/deploy.yml` publishes the repo root to GitHub Pages on every push.

One manual step is needed first: **Settings → Pages → Source → GitHub Actions**. After that the
site serves at `https://tobombadil.github.io`. To serve it at `andrewtgibson.com`, add a `CNAME`
file containing the domain and point a DNS `ALIAS`/`A` record at GitHub Pages.
