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

The centerpiece is a working project finance model: a generic **25 MW single-unit biomass
relocation**, invented end to end. **It describes no client, counterparty or live transaction and
contains no confidential terms.** Statutory tax parameters are public law (IRC §45Y, §48E, §172,
§6418); every project figure is made up.

Twenty operating years behind a two-year construction period:

- **Sculpted amortization.** Debt service holds the cover ratio at a constant target, and the loan
  is sized as the present value of that stream at the debt rate. Coverage therefore holds at the
  target in every year of the tenor and the balance amortizes to exactly zero.
- **Construction interest and a reserve.** The funding requirement is capex plus IDC plus a
  six-month debt service reserve, which releases to equity when the loan is repaid. Leverage is
  measured on funded cost, not on capex.
- **No iteration switch.** IDC and the reserve are both linear in the debt amount, so the leverage
  cap solves in closed form as `D = L·capex / (1 − L·k)` rather than needing a circular reference.
- **Equity drawn across the build.** Draws sit at t=0 and t=1, so operating year *n* discounts at
  *n+1* and the IRR carries the construction drag.
- **A tax layer.** Bonus depreciation or straight line, loss carryforwards under the §172 cap, a
  blended rate with state deductible federally, and an election between the production credit
  (ten years, energy-community adder, monetized under §6418) and the investment credit (once at
  COD, halving the depreciable basis by half the credit).
- **Stress tests that respect timing.** A rate move happens before you sign, so it re-sizes the
  loan. Operating stresses land on a facility already struck and are absorbed by equity and the
  cover ratio. The table says which is which, and the stacked case sizes under the pre-close move
  before taking the operating hits.
- **Both returns.** A project IRR on the unlevered stream, where tax carries no interest shield
  and the whole build is funded up front, alongside the levered equity IRR. The spread between
  them is what the financing is actually contributing.
- **A breakeven solve.** Bisection on the PPA price at which equity NPV is zero, stated above the
  stress table at base and with every stress stacked.
- **Three checks.** Sources equal uses, debt amortizes to zero, loss carryforwards never go
  negative. A fourth gate sits in front of them: a stream whose EBITDA turns negative inside the
  tenor is not financeable at all, so debt is zero and the badge says so rather than reporting a
  structure no lender would fund.
- **Outputs that decline to mislead.** An equity return computed on a sliver of equity is
  arithmetic, not information, so below a 12% equity share it reads `n.m.`; above 100% it reads
  `over 100%` rather than three digits of false precision; and with no debt the cover ratio reads
  `no debt` rather than leaking a sentinel.

Input ranges are set to bands a lender would recognize. A model that can be driven to a
$1,200/kW relocation at 90% leverage will be, and the number it produces is worthless.

Every stress row, every heatmap cell and every step of the bisection is a **complete model run**
via `underScenario()`, not a simplified second formula that could drift.

### What it deliberately leaves out

Stated on the page, because knowing the omissions is the point: a real construction drawdown
schedule, a cash sweep and covenant lockup, sculpting on post-tax cash flow (which needs an
iteration), a tax equity partnership flip, working capital, a merchant tail, and availability-linked
sculpting.

### Charts

- **Cash flow cover** — grouped bars, EBITDA against debt service across twenty years, with a
  legend, round axis steps, selective direct labels and a per-bar hover tooltip.
- **NPV sensitivity** — a 5×5 heatmap on a blue↔red diverging ramp with a neutral grey midpoint
  at NPV = 0, base case outlined, hover tooltip per cell. The capex axis is labelled in **total
  build cost ($M)** rather than per kW, since that is the number a reader holds in their head;
  the dial behind it is still $/kW and the tooltip gives both.

Series colours `#2a78d6` / `#eb6834` were validated against the white surface: CVD ΔE 24.7,
normal-vision ΔE 33.6 — both clear of the floors.

## Verification

Three suites, run against a headless browser:

- **`site.js`** — behavior, content and style: values against hand calculations, the stress and
  breakeven logic, the font convention, the confidentiality sweep, and guards on em dashes,
  contractions and American spelling.
- **`crosscheck.js`** — an **independent implementation** of the whole project model, written
  from the stated mechanics rather than from the workbook, compared against the page across 250
  random input vectors and 14 fields including IRR. It also asserts that the headline tiles agree
  with the stress table's base case, which are computed by different paths, and that structural
  invariants hold on every vector: no negative debt or equity, leverage inside its cap, sources
  equal uses, debt amortized.
- **`mobile.js`** — responsive layout at 390px and 768px.

The tile-versus-table check exists because it caught a real defect: after the model's cells were
renumbered, the three headline tiles still pointed at the old addresses, so the equity IRR tile
was reading equity in millions and formatting it as a percentage. It displayed 3,768%. Every
other test passed, because they each read the model directly and never checked what the page had
actually bound to.

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
