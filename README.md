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
- **The ground.** The document is a sheet on a desk: a cool grey ground, a centred white sheet at
  1240px carrying the contents, the sections and the footer, and the running header sized to
  match. The cover bleeds past the sheet on purpose, so the document begins when the sheet does.
  This replaced a squared-paper background left over from the version of this page that was a
  worksheet — behind running prose a repeating grid has nothing to line up against, and reads as
  interference rather than texture. Below 1240px the ground never shows, so the phone simply gets
  clean white.
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

`SUM` `MIN` `MAX` `ABS` `IF` `IRR` `TODAY` `DATE` `YEARFRAC`

Plus `+ - * / ^ &`, comparisons, parentheses, ranges (`D18:M18`) and cross-sheet references
(`Assumptions!C34`). `IRR` solves by bisection.

Nine, and the model uses all nine. It supported nineteen until a sweep found that ten were there
only because the first version of this page was a spreadsheet — `REPT` drew in-cell bar charts,
`COUNTIF` counted shipped projects, `SUMPRODUCT` built a weighted capability index, and none of
those things exist any more. A test now fails if the engine grows a function no formula calls.

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

### One instrument, three readouts

6.0 used to run 5,017px on a phone — 5.9 screens, nearly twice the next-largest section — and it
read as three separate things: a model box, a loose *held constant* list, then a second titled
essay with its own introduction. Four changes brought it to 1,491px:

- **The outputs column became a tab strip**: Returns, Stress, Drivers. All three panes stay in the
  DOM, so every figure is still computed and every test can still read it, but only one is in flow.
  The charts are `viewBox`-based and measure no layout, so a pane drawn while hidden is correct
  when shown. Arrow keys move between tabs and only the open tab is in the tab order.
- **Held constant moved into the assumptions column** as a closed group. It is a list of inputs, so
  it belongs with the inputs, and that deleted a block.
- **What this leaves out and the integrity line merged** into one footer spanning both columns,
  which closes the box instead of trailing off it.
- **One assumption group opens by default, not three.** Three ran the column to 1,181px against a
  461px pane, leaving most of the box empty. One is 558px and lines up with the readouts — and it
  is the group holding the dial the tornado ranks first.

The assumptions column is `align-self:start` and sticky, so it stops where it stops rather than
stretching to whichever readout is open, and stays put while a long one scrolls past. The divider
moved to the outputs column, which always runs the full height of the row.

Series colours `#2a78d6` / `#eb6834` were validated against the white surface: CVD ΔE 24.7,
normal-vision ΔE 33.6 — both clear of the floors.

## Verification

Three suites, run against a headless browser. 123 checks.

- **`site.js`** (99) — behavior, content and style: values against hand calculations, the stress,
  tornado and breakeven logic, the memo furniture, the font convention, the confidentiality
  sweep, the cover and contents furniture, the webfont link and its fallback stacks, and
  guards on em dashes, contractions and American spelling.
- **`crosscheck.js`** (8) — an **independent implementation** of the whole project model, written
  from the stated mechanics rather than from the workbook, compared against the page across 250
  random input vectors and 14 fields including IRR. It also asserts that the headline tiles agree
  with the stress table's base case, which are computed by different paths, and that structural
  invariants hold on every vector: no negative debt or equity, leverage inside its cap, sources
  equal uses, debt amortized.
- **`mobile.js`** (16) — responsive layout at 390px and 768px, plus the phone audit: every
  section reachable in the nav whichever one is active, the source bar hidden where it would
  truncate, tapping a figure revealing its full source inside the viewport, the assumption
  panel starting closed, the model's outputs within one screen of its heading, and sticky
  chrome under 8% of the viewport.

The tile-versus-table check exists because it caught a real defect: after the model's cells were
renumbered, the three headline tiles still pointed at the old addresses, so the equity IRR tile
was reading equity in millions and formatting it as a percentage. It displayed 3,768%. Every
other test passed, because they each read the model directly and never checked what the page had
actually bound to. The tornado is verified the same way, by recomputing every bar from the stated
mechanic and comparing against what the renderer actually drew.

## What the spreadsheet left behind

Three redesigns in, the page still carried a lot that only made sense when it was a worksheet. A
runtime audit found it, and a test now guards each finding:

| Found | Why it was there |
|---|---|
| 18 workbook cells nothing reads | An underwriting range, per-role career shares, capex-reduction and revenue-uplift figures, all from tiles that no longer exist |
| 10 engine functions no formula calls | `REPT`, `COUNTIF`, `SUMPRODUCT` and friends, from the in-cell bar charts and the capability index |
| 4 number formats nothing asks for | `usd`, `yr`, `yr2`, `mmmyy` |
| 14 CSS classes absent from the DOM | The hero buttons, the memo letterhead, the contents thesis lines, the sub-tile row |
| 2 palette tokens never referenced | `--shade` was a warm cream from the original scheme |
| 3 `SITE` fields the cover duplicated inline | The cover wrote its own "To" and "Basis" strings while the fields sat unused |

Two colour decisions came out of the same pass. The blue/green font convention was still on
`#1a3fcf` and `#0a7040`, picked for the original warm palette, which put a royal blue and a
saturated green next to slate navy and copper. They are now `#1e5aa8` and `#0f6b4a`. And the body
prose colour, the negative red and the tooltip ground were literals rather than tokens; they are
`--prose`, `--bad` and `--deep-2` now, so the palette is the whole palette.

The `fx` glyph in the bar had been relabelled `src` but was still set in italic serif, which is
the spreadsheet signifier rather than the word. It is mono now, and `showFormula` is `showSource`.

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

A `SITE.terms` row is `[label, text, cellSpec, linkField]`. Give it a `cellSpec` and the value is
read live off the workbook; give it a `linkField` and the text becomes a link to `SITE[field]` —
the availability row points at `SITE.calendly` that way. It renders in copper rather than the
`a.mail` green, because green is a modeling convention the legend defines directly beneath it.

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
scrolls sideways, and says that it scrolls.

### The phone is a different document

Not fitting is the floor, not the goal. An audit at 390×844 found three things no overflow test
could catch, and each got a different treatment rather than a smaller font:

- **The nav could reach one section of eight.** The names need 849px in a 390px bar. Below 680px
  the links become their section numbers, and whichever section you are in gets a short label
  back: `1.0  2.0  3.0  4.0  5.0  6.0 Analysis  7.0  8.0`. `SECTIONS` carries that short label as
  a fifth field. A test drives every section active in turn and fails if the last link clips.
- **The provenance bar had 210px for a 297px sentence**, so it truncated every source it was
  given, on a device that cannot hover anyway. The bar is hidden below 680px and the same content
  goes to the tooltip, which wraps, positions itself in the viewport, and is dismissed by tapping
  elsewhere. That also gives back a third of the sticky chrome: 70px to 47px.
- **Eighteen open dials pushed the model's own outputs a screen and a half below its heading.**
  The assumption panel starts closed on a phone. The outputs now sit 646px from the divider.
- **The stress table exploded to 2,012px.** The generic `.sched` rule restacks any schedule into
  records on a phone, which turned 9 rows × 6 columns into 54 stacked lines — five of every six an
  unlabelled number. It stays a table below 680px and drops to the three columns that answer the
  question: what the case is, what equity gets, whether it still covers debt. `STRESSES` carries a
  short name as a fourth field, the way `SECTIONS` does, and a `min-width:430px` floor left over
  from when it had to scroll now applies only above 680px.

## Still to decide

- **The simulator link.** 5.0 describes the BESS schedule optimization simulator but does not link
  it, because the current host (`ascendthecrowd.andrew-generalemail.workers.dev`) puts an
  email-derived handle in the URL. Move it to a subdomain and add an `href`.
- **The phone number** is published in 8.0 because it is on the CV being sent with this page.
  A public web page is a different exposure to a targeted PDF; delete `SITE.phone` to drop it.

## Deployment

`.github/workflows/deploy.yml` publishes the repo root to GitHub Pages on every push.

One manual step is needed first: **Settings → Pages → Source → GitHub Actions**. After that the
site serves at `https://tobombadil.github.io`. To serve it at `andrewtgibson.com`, add a `CNAME`
file containing the domain and point a DNS `ALIAS`/`A` record at GitHub Pages.
