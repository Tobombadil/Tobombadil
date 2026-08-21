# Andrew T. Gibson — andrewtgibson.com

A personal website for an energy commercial professional, built as an **origination proposal**. One static
HTML file: no framework, no build step, no server, no analytics.

Open `index.html` in a browser. That's the whole toolchain.

## The idea

It is a **proposal, laid out the way a power-sector filing is laid out**, because the proposal is
the deliverable in an origination seat and you may as well see one. A full-bleed cover, a contents
page with decimal numbering and dot leaders, eight numbered sections each opening on a divider
band, a mandate map, a risk register, and an appendix of supporting analysis.

The idiom comes from the real documents: co-op long-term RFPs and integrated resource plans, which
number sections `1.0 / 2.1 / 3.3.1`, lead with a contents page, and carry a section called
*Demonstration of Need*. What the page borrows from the workbook underneath is the *discipline*:
the blue/black/green font convention, tabular numerals, and a source bar that reveals where any
figure on the page came from.

The direction has moved three times, which is worth recording. First a literal spreadsheet with a
cell grid and sheet tabs: a good joke and a bad website. Then a website wearing a model as its
design language, which was better but aimed at the wrong target, because it proved model
*construction* and origination roles explicitly do not build models. Now a proposal, with the
machinery kept and pointed at interrogation instead.

### Design

- **Color.** Slate navy `#16324f` carries the structure (cover, dividers, numerals); copper
  `#a8571c` is the single accent and is spent only on the cover rule, section numerals and the
  primary action. Neutrals are biased toward the navy (`#f5f7f9`, `#10151c`) so they read as
  chosen rather than inherited. Chart series keep the separately validated `#2a78d6` / `#eb6834`.
- **Type.** Newsreader for display, IBM Plex Sans for body, UI and the provenance bar, IBM Plex
  Mono for the document reference and the contents leaders. Institutional-technical, with real
  fallback stacks behind each, which the test suite asserts.
- **The cover.** A 24-hour summer load shape with the charge and discharge windows tinted under
  the curve. It is the one graphic everyone in this industry reads without a legend, and it points
  at the storage simulator in 5.0 rather than decorating. It is captioned as illustrative and
  nothing on the page depends on it.
- **One theme, deliberately.** A proposal is printed on white paper, so the document body commits
  to light and does not invert. Every color is a token and `body` paints its own ground, so the
  page holds whatever theme the host is in.

## Architecture

Two layers, cleanly separated:

**The workbook** (`SHEETS`) is the data layer. Anything genuinely calculated lives there as a
formula, exactly as it would in a real model — five sheets: `Facts`, `Career`, `Research`,
`Assumptions`, `Model`. Formulas are parsed by a recursive-descent parser (no `eval`) and
evaluated lazily with memoisation and circular-reference detection. Dates are Excel serial
numbers on the 1899-12-30 epoch, so tenure accrues against `=TODAY()` on every visit.

**The site** (`SITE` plus the `cover`, `contents` and `sec*` view functions) is the presentation layer — prose,
structure and layout. Every figure it renders carries a `data-cell` attribute naming its source
cell, which is what lets the source bar work and what keeps the two layers honest: if a number
is on the page, it came from the model.

```js
cell('Model', 'C49', { f:'num1' })   // → a live <span data-cell="Model!C49">16.6</span>
```

Section order is explicit rather than implied by where a function happens to sit in the file:

```js
[cover, contents, secSummary, secMandate, secExperience, secPrecedent,
 secMarket, secAnalysis, secRisk, secTerms].forEach(f => f());
```

`SECTIONS` is the single source for each section's id, number, name and thesis line. The contents
page, the divider bands and the nav all read it, so they cannot drift apart; a test asserts they
agree.

### The provenance bar

Hovering any figure names it and says, in a sentence, where the number came from, with live
operands substituted:

> **Equity NPV**  ·  **$11.0M**  Discounted equity cash flow plus the terminal value, less the
> equity drawn across the two-year build.

This replaced a bar that printed the raw formula. `=C5+C6` was legible when the page was a
spreadsheet with a visible grid; on a proposal it names two cells the reader cannot see. The
hardcode message was worse: *"stated, not derived. Nothing behind it but a source"* read as an
admission that the figure was unsupported, when those are the disclosed and statutory numbers.

Sources live in one `SRC` table keyed by cell, with `{C5}` and `{D7:date}` expanded at hover time
so a sentence cannot drift from the arithmetic it describes. Two tests hold the line: every
displayed figure must have an authored source, and no figure may print anything that looks like a
cell reference.

### The font convention is enforced, not decorative

`cellKind()` classifies every figure at paint time by what its cell actually holds — a literal is
blue, a formula is black, a formula reaching another sheet is green. Every figure is underlined
and keyboard-reachable, because every figure can now say where it came from; colour alone carries
the convention, and the value in the bar takes the same colour. This is checked in the test suite,
so the legend cannot drift from the truth: a figure that stops being calculated stops being black.

### Supported functions

`SUM` `AVERAGE` `COUNT` `COUNTIF` `MIN` `MAX` `ABS` `ROUND` `IF` `REPT` `SUMPRODUCT`
`PMT` `NPV` `IRR` `TODAY` `DATE` `YEAR` `MONTH` `YEARFRAC`

Plus `+ - * / ^ &`, comparisons, parentheses, ranges (`D18:M18`) and cross-sheet references
(`Assumptions!C34`). `IRR` solves by bisection.

## 6.0, the supporting analysis

The appendix is a working project finance model: a generic **25 MW single-unit biomass
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

Every stress row, every tornado bar and every step of the bisection is a **complete model run**
via `underScenario()`, not a simplified second formula that could drift.

The assumption panel opens on the three groups worth reaching for first and leaves Plant and Tax
collapsed. Eighteen dials open at once made the inputs column nearly twice the height of the
outputs column, which left a large empty rectangle inside the bordered box.

### The interrogation

The model is there to answer whether he can take one apart, not to show that he can build one,
so it is followed by the part that matters:

- **What moves the answer** — a live tornado. Each input taken ten percent either way *before
  close*, so the financing re-sizes around it, ranked by how far equity NPV travels. That is a
  deliberately different question from the stress table, which asks what happens *after* you have
  signed and the loan is already struck. Moves are clamped to each slider's own band, and a
  clamped driver says so, because a 10% move on 91% availability is not 100% availability.
- **What I'd validate, and who I'd ask** — each top driver mapped to the diligence that would
  actually settle it.

### What it deliberately leaves out

Stated on the page, because knowing the omissions is the point: a real construction drawdown
schedule, a cash sweep and covenant lockup, sculpting on post-tax cash flow (which needs an
iteration), a tax equity partnership flip, working capital, a merchant tail, and availability-linked
sculpting.

## Charts

- **Cash flow cover** — grouped bars, EBITDA against debt service across twenty years, with a
  legend, round axis steps, selective direct labels and a per-bar hover tooltip.
- **Ranked sensitivity** — a tornado laid out as a schedule rather than a chart, since the filing
  is the idiom and the ranking is the message.

A 5×5 NPV heatmap used to sit alongside the tornado. It answered the same question over two
drivers that the tornado answers over ten, so 6.0 carried three overlapping sensitivity displays.
It was cut.

Series colours `#2a78d6` / `#eb6834` were validated against the white surface: CVD ΔE 24.7,
normal-vision ΔE 33.6 — both clear of the floors.

## Verification

Three suites, run against a headless browser. 112 checks.

- **`site.js`** (94) — behavior, content and style: values against hand calculations, the stress,
  tornado and breakeven logic, the memo furniture, the font convention, the confidentiality
  sweep, the cover and contents furniture, the webfont link and its fallback stacks, and
  guards on em dashes, contractions and American spelling.
- **`crosscheck.js`** (8) — an **independent implementation** of the whole project model, written
  from the stated mechanics rather than from the workbook, compared against the page across 250
  random input vectors and 14 fields including IRR. It also asserts that the headline tiles agree
  with the stress table's base case, which are computed by different paths, and that structural
  invariants hold on every vector: no negative debt or equity, leverage inside its cap, sources
  equal uses, debt amortized.
- **`mobile.js`** (10) — responsive layout at 390px and 768px.

The tile-versus-table check exists because it caught a real defect: after the model's cells were
renumbered, the three headline tiles still pointed at the old addresses, so the equity IRR tile
was reading equity in millions and formatting it as a percentage. It displayed 3,768%. Every
other test passed, because they each read the model directly and never checked what the page had
actually bound to. The tornado is verified the same way, by recomputing every bar from the stated
mechanic and comparing against what the renderer actually drew.

## Length

The document runs about 2,800 words. It ran 3,900 before an edit pass that removed duplication
rather than detail: the thesis line for each section was printed twice, once on the contents page
and again on the divider a screen later; the technical-skills block restated 2.0 as a list of
nouns; the market cards carried definition lists repeating the paragraph above them; and the
mandate and risk cells ran four sentences where two land harder. 2.0 and 7.0 each fit on one
screen now, which is the actual test.

## Editing the content

Prose, roles, deals, the mandate map, the risk register, the diligence list, education and links
all live in the `SITE` object. Numbers live in `SHEETS`. Slider ranges are declared on the input
cells themselves:

```js
C13:{ v:88, f:'num0', input:true, min:40, max:160, step:1,
      lbl:'PPA price, year 1', u:'$/MWh', grp:'Offtake & fuel' },
```

Anything with `input:true` becomes a slider automatically, filed under its `grp`, and is a
candidate for the tornado if it is named in `DRIVERS`. Two attributes are deliberately distinct:
**`data-cell`** marks a displayed figure, and `paintCells()` rewrites its `textContent` on every
recalc; **`data-bind`** marks a control. Putting a `<select>` on `data-cell` wipes its options.

### A note for anyone editing this file with a script

`/* ── hero ─` and `/* ── the live model ─` each match **twice**: once as a CSS comment padded to
74 columns and once as a JS banner padded to 72. Anchoring on the prefix once deleted about a
thousand lines. Match whole lines, and assert the match count before you write.

One call site carries a literal `\u00a76` escape rather than the character, so a script that
normalises section signs will miss it. And `svgEl` is declared in the charts section, which sits
*after* the point where the sections are built — the cover draws an SVG, so that declaration has
to stay hoisted above the view layer or the cover dies in the temporal dead zone.

## Design notes

The page commits to a single visual world on purpose: a banker's working paper is white paper,
and inverting it into a dark theme would break the conceit. Every colour is an explicit token and
`body` paints its own ground, so the page holds whatever theme the host is in.

Responsive throughout — the hero, the model and the two-column blocks collapse to one column, and
the transaction schedule, the mandate map and the risk register restack into records on a phone.
Wide content (the cash-flow chart) scrolls inside its own container so the page body never
scrolls sideways.

## Still to decide

- **Availability status**, on the terms block, currently *"[Set availability]"*. The phone number
  from the CV is deliberately not published — a public web page is a different exposure to a
  targeted PDF.
- **The SmartBidder link.** 5.0 describes the ERCOT storage dispatch simulator but does not link
  it, because the current host (`ascendthecrowd.andrew-generalemail.workers.dev`) puts an
  email-derived handle in the URL. Move it to a subdomain and add an `href`.

## Deployment

`.github/workflows/deploy.yml` publishes the repo root to GitHub Pages on every push.

One manual step is needed first: **Settings → Pages → Source → GitHub Actions**. After that the
site serves at `https://tobombadil.github.io`. To serve it at `andrewtgibson.com`, add a `CNAME`
file containing the domain and point a DNS `ALIAS`/`A` record at GitHub Pages.
