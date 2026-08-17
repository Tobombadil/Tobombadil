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
cell('Model', 'C49', { f:'num1' })   // → a live <span data-cell="Model!C49">16.6</span>
```

### The font convention is enforced, not decorative

`cellKind()` classifies every figure at paint time by what its cell actually holds — a literal is
blue, a formula is black, a formula reaching another sheet is green. Only formulas get the dotted
underline and keyboard focus, because only a formula has something to reveal; hovering a hardcode
says so in as many words. This is checked in the test suite, so the legend cannot drift from the
truth: a figure that stops being calculated stops being black.

### Supported functions

`SUM` `AVERAGE` `COUNT` `COUNTIF` `MIN` `MAX` `ABS` `ROUND` `IF` `REPT` `SUMPRODUCT`
`PMT` `NPV` `IRR` `TODAY` `DATE` `YEAR` `MONTH` `YEARFRAC`

Plus `+ - * / ^ &`, comparisons, parentheses, ranges (`D18:M18`) and cross-sheet references
(`Assumptions!C34`). `IRR` solves by bisection.

## The live deal model

The centrepiece is a working project finance model behind eighteen sliders and two
elections: a generic **25 MW single-unit biomass relocation**, invented end to end. **It
describes no client, counterparty or live transaction and contains no confidential terms.**
Statutory tax parameters are public law (IRC §45Y, §48E, §172, §6418); every project figure is
made up.

What it actually does, over a twenty-year schedule:

- **Debt sized to a covenant, not a ratio.** Senior debt is sized to a target minimum DSCR on
  the lowest EBITDA inside the tenor, capped by a leverage limit. Sizing runs pre-tax, which
  keeps it non-circular. At base case the covenant binds at 51% leverage, well inside the 75% cap.
- **A tax layer.** Bonus depreciation or 20-year straight line, loss carryforwards with the §172
  80% usage cap, a blended federal-and-state rate with state deductible federally, and an
  election between the production credit (§45Y, ten years, energy-community adder, monetised
  under §6418) and the investment credit (§48E, once at COD, halving the depreciable basis by
  50% of the credit).
- **Fuel that ramps.** Delivered cost climbs in a straight line to a contract ceiling over a set
  number of years, which is often what moves the binding year for the debt sizing off
  commissioning and out into the schedule.
- **Stress tests.** Seven risks each moved to the worst realistic end of their own range, one at
  a time, then stacked. Debt is sized once at base case and pinned through the stresses, because
  at financial close the loan is already struck — a stress hits equity and the cover ratio, not
  the lender. At base case a price or fuel stress breaks the covenant while a capex stress does
  not, which is the whole point of running them separately.
- **A breakeven solve.** Bisection on the PPA price at which equity NPV is zero, reported at
  base and again with every stress stacked.
- **Checks that fail loudly.** Sources equal uses, debt amortises to zero by the end of its
  tenor, loss carryforwards never go negative. If one breaks, the badge says CHECK.

Each stress row, each heatmap cell and every step of the breakeven bisection is a **complete
model run** — `underScenario()` applies a temporary set of inputs, evaluates, and restores — not
a second, simplified formula that could drift from the first.

### Charts

- **Cash flow cover** — grouped bars, EBITDA against debt service across twenty years, with a
  legend, round axis steps, selective direct labels and a per-bar hover tooltip.
- **NPV sensitivity** — a 5×5 heatmap on a blue↔red diverging ramp with a neutral grey midpoint
  at NPV = 0, base case outlined, hover tooltip per cell.

Series colours `#2a78d6` / `#eb6834` were validated against the white surface: CVD ΔE 24.7,
normal-vision ΔE 33.6 — both clear of the floors.

## Editing the content

Prose, roles, deals, education and links live in the `SITE` object. Numbers live in `SHEETS`.
Slider ranges are declared on the input cells themselves:

```js
C13:{ v:88, f:'num0', input:true, min:40, max:160, step:1,
      lbl:'PPA price, year 1', u:'$/MWh', grp:'Offtake & fuel' },
```

Anything with `input:true` becomes a slider automatically, filed under its `grp`. Two attributes
are deliberately distinct: **`data-cell`** marks a displayed figure, and `paintCells()` rewrites
its `textContent` on every recalc; **`data-bind`** marks a control. Putting a `<select>` on
`data-cell` wipes its options.

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
