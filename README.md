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

> **Equity NPV**  ·  **$51.7M**  Discounted equity cash flow plus the terminal value, less the
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

The appendix is a working project finance model: a **50 MW biomass relocation**, at the
parameters you would actually underwrite one on. **No client, counterparty, site or transaction
term appears anywhere in it.** Statutory tax parameters are public law (IRC §45Y, §48E, §172,
§6418); the rest are industry ranges and public benchmarks.

### Where the parameters come from

The figures were originally invented, which made the model internally consistent but not
defensible in a room. They now sit in line with a real biomass relocation study: derate,
availability, fuel rate per MWh and contract-ceiling ramp, operating cost per kW-year,
maintenance reserve, escalation, tenor and the Arizona-blended tax rate. The plant is 50 MW
rather than that study's 36, so it is plainly not that plant; non-fuel opex scales with it,
holding the researched cost per kW-year flat.

### Nothing in the prose asserts a number the model owns

A paragraph once claimed capex was "worth about 16 points of unlevered return" — a static
sentence describing a model that moves underneath it. The section intro said 36 MW while the
model ran 50, which is precisely the failure the page's `data-cell` discipline exists to prevent.

Both are gone. The intro reads its scale off the cell and computes the capex ratio live. The
attribution paragraph was deleted outright: the Trade readout says it as a comparison and the
Sensitivity readout ranks the rest, neither of which can go stale.

The CV figures had the same latent bug in the other direction — `Facts!C5`, `C6` and `C16` are
displayed live in the summary tiles, and the same three numbers were typed into five prose
strings, so editing a cell would move the tile and leave the sentences behind. Prose may now
template the workbook the way a source line already could:

```js
'Negotiated exclusive agreements for ${Facts!C5:num0}M of intake and ${Facts!C6:num0}M of offtake.'
```

Four tests hold the line: the intro's scale must equal its cell, the capex ratio must equal the
computed one, the CV figures in prose must equal the cells that hold them, and **no template may
be left unexpanded** — which immediately caught one string rendering through a path that had not
been routed through the expander.

### Every dial carries its benchmark

An assumption with no benchmark beside it is an assertion. Each input now prints the range a
reader would expect it to sit in and where that range comes from, so the question in the room
becomes *why this end of the range* rather than *where did that come from*:

> **PPA price, year 1** — 110 $/MWh
> `90–130` *Novo BioPower*

Sources are named honestly, which matters more than making them look impressive:

- **Statute** is cited by section: IRC §45Y (production credit rate and indexation), §48E
  (investment credit rate), §172 (NOL cap), and A.R.S. §43-1111 for the Arizona rate.
- **Two published references** are named because they publish these categories directly: the NREL
  Annual Technology Baseline for dedicated-biomass capital cost, and AACE International 18R-97 for
  what contingency a Class 5 estimate carries.
- **One public comparable**: Novo BioPower at Snowflake, Arizona contracts at a published
  $110/MWh. It is a market comparable, not a party to anything, and a test asserts it appears on
  the page only inside a benchmark line.
- **Everything else says "industry range"**, which is what it is — a range anyone in the sector
  would recognise — rather than borrowing an institution's authority for a number it never
  published. Hovering any source tag gives the sentence behind it.

The capex benchmark is deliberately the *new-build* figure: NREL ATB's 4,000–5,000 $/kW against a
relocation dialled at $53.3M before contingency, which is about $1,065/kW on the same net capacity.
The gap is not an error; it is the entire thesis, and the line says so.

The **outputs** carry benchmarks too, on the same convention, because they are the figures a
reader is least able to judge unaided. Project IRR sits against 8–12% for contracted new build,
minimum cover against a 1.30–1.45x lender requirement, and the levered equity return against a
12–18% sponsor target. That last one matters most: at 78.7% it reads as a broken model until the
target it is being measured against is visible beside it, at which point it reads as what it is —
a capex-light deal at 80% leverage where the cap binds before the covenant does.

Six tests hold the coverage: every dial and every held-constant figure carries a range or a
source, every source tag is one the page can expand, every range runs low to high, every tag
resolves to a sentence on hover, and the three judgeable outputs are benchmarked. A future dial
cannot ship bare.

Four figures are deliberately **not** the ones in that study, and each uses the public benchmark
the study itself cites:

| | Used here | Why not the source figure |
|---|---|---|
| PPA price | $110/MWh | The public Novo BioPower Arizona benchmark, not a named counterparty's indicative guarantee |
| Contingency | 35% | The outside engineer's Class-5 number, not the risk overlay carried on top of it |
| Debt rate | 6.5% | A market project-finance rate; the source uses a USDA guaranteed-loan programme rate, which is a financing route rather than a parameter and would read as an error without its context |
| Acquisition | absent | This is a relocation capex model and always was. No acquisition price, ask or bid appears |

### Where the return comes from

Aligning to the study produced a 26.5% unlevered return, which matched its 25.4% but invited
"your model is optimistic" as the first question in any room. A diagnostic took every assumption
to a conservative value one at a time and measured what it cost:

| | cost to unlevered IRR |
|---|---|
| capex 1,065 → 2,500 $/kW | **−15.6pp** |
| no tax credits at all | **−11.4pp** |
| PPA 110 → 95 $/MWh | −6.9pp |
| fuel at the ceiling from day one | −4.4pp |
| availability 95% → 88% | −2.7pp |
| straight-line rather than bonus depreciation | −1.4pp |
| no terminal value | −0.3pp |

The return was not spread across the model. It was two bets: buying the equipment at a fifth of
new-build cost, and monetizing ten years of §45Y. Financing terms — leverage, tenor, rate — move
the equity return but not the project return at all, which is the correct behavior and worth
seeing.

The credits are statute and stayed. The capex was carrying a **distressed acquisition**, which is
a deal-specific advantage rather than a market parameter, and on a public page that reads as an
optimistic model rather than as a good trade. It moved to a relocation cost anyone would
recognize — 2,000 $/kW before contingency, about 55% of new build all-in — and availability came
off best-in-class to merely good.

The base case is now **12.9% unlevered, 24.2% to equity, 1.40x cover**, and the **covenant binds
again instead of the leverage cap**, so the sculpt holds at its target the way the page describes.
Every headline figure sits inside or beside its benchmark band. The upside is still one drag of
the capex dial away, which is the better argument anyway: it shows where the value in a relocation
actually comes from rather than asserting it. A paragraph in the model footer says all of this in
four sentences.

Which constraint binds is written at recalc rather than fixed in the markup, because it moves with
the dials — a test asserts the page names whichever one is actually binding, and that when the
covenant binds, cover sits exactly on it. **The leverage cap now binds instead of the covenant**, because a relocated plant is
capex-light enough that the sculpt would support far more debt than 80% of funded cost. Minimum
cover therefore sits at 2.47x rather than at the 1.40x target — still flat in every year, which is
the property the sculpt actually guarantees, and the page says so rather than claiming the target.

Twenty operating years behind a two-year construction period:

- **Sculpted amortization.** Debt service holds the cover ratio flat, and the loan is sized as the
  lesser of the present value of that stream at the debt rate and the leverage cap. Coverage therefore holds at the
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
- **Margin of safety, not arbitrary shocks.** For each driver, the value at which equity NPV
  reaches zero, and the percentage move that takes it there. Every row re-underwrites the deal at
  the worse number, so the loan re-sizes with it and one basis holds across the table. Plus the
  summary figure: how far off every assumption has to be *at once* — each by the same fraction of
  its own value — before equity is worth nothing.
- **Both returns.** A project IRR on the unlevered stream, where tax carries no interest shield
  and the whole build is funded up front, alongside the levered equity IRR. The spread between
  them is what the financing is actually contributing.
- **A breakeven solver that stops on the answer.** Bisection, but the stopping test is on NPV
  rather than on the input. A tolerance in input units means a different thing for every driver —
  half a dollar on the PPA price is a million of NPV, half a dollar on capex is nothing — so each
  solve runs until NPV is inside `EPS` of zero and takes the steps it needs, typically a dozen.
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
  deliberately different question from the stress pane, which asks how far one thing can go before
  the equity is gone rather than which thing matters most. Moves are clamped to each slider's own band, and a
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

### Why the tornado did not read

It was the one display on the page that had to be explained before it could be used, which for a
sensitivity chart is a failing grade. Four things were wrong, in the order they defeat a reader:

- **No axis.** Bars sat on a bare track with an unlabelled centre tick. There was no scale, and
  nothing said the centre was the base case. It now carries a real axis in the header — round
  ticks in $M via the same `niceScale` the cash-flow chart uses, and the centre labelled with the
  live base NPV rather than a zero.
- **The bar's side and the columns' order disagreed.** Bars are placed by the sign of the *NPV*
  change, so left is always worse. The columns were headed `−10%` and `+10%`, which is the *input*
  moving. On capex, 10% low is the right-hand bar, because cheaper capex helps — so a reader who
  maps the left header to the left bar is wrong on half the rows. That was the actual defect. The
  columns now read **If 10% low** / **If 10% high**, and the axis says `← worse` / `better →`.
- **The colours were borrowed.** Blue and orange are the cash-flow chart's EBITDA and debt service.
  The same two colours meant two different things in one section, and neither meaning was stated.
  Bars are now red where NPV falls and green where it rises, matching the number in the same row —
  and the side of the base case they land on says it a second time, so colour never carries it
  alone.
- **The track was noise.** A grey band behind every bar rendered as a striped grid and carried no
  information. Removed; the bars sit on the paper against a single zero rule.

Then the axis made the two numeric columns redundant — they printed the figures the bar was
already showing to scale, and cost the bars two thirds of their width. They are gone. The exact
values did not go with them: each bar carries its endpoint and its delta as data, is focusable,
drives the page's own tooltip on hover, focus or tap, and names itself to a screen reader. A
tornado is now a name and a bar, and it finally looks like one.

Tests hold the parts a redesign would quietly break: that the axis is labelled and ordered, that
its centre is the base case rather than zero, that the direction words are present, that the table
is a name and a bar and nothing else, that every bar is drawn on the side and in the colour its
own value calls for, that each still carries its exact figure and is reachable, and that no bar
runs past the axis. The drift check — which recomputes every endpoint independently and compares —
now reads the figures off the bars rather than off a printed column, so it tests what is drawn.

A 5×5 NPV heatmap used to sit alongside the tornado. It answered the same question over two
drivers that the tornado answers over ten, so 6.0 carried three overlapping sensitivity displays.
It was cut.

### One instrument, four readouts

6.0 used to run 5,017px on a phone — 5.9 screens, nearly twice the next-largest section — and it
read as three separate things: a model box, a loose *held constant* list, then a second titled
essay with its own introduction. Four changes brought it to 1,491px:

- **The outputs column became a tab strip**: Trade, Returns, Sensitivity, Stress. All three panes stay in the
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

The readouts are **Trade, Returns, Sensitivity, Stress**. The trade leads because it is the
pitch; the rest describe the thing it is pitching.

### The case, before the arithmetic

A model with no thesis over it is a spreadsheet. 6.0 now opens on the argument
the numbers are evidence for, in four moves:

- **The demand.** AI load is the largest new-load event in a generation, and what it is short of
  is not capital but a delivery date. Turbine slots are ordered years out and large-load
  interconnection takes years more.
- **The asset.** Small biopower plants sit idle, stranded when qualifying-facility contracts
  expired or when the host mill that supplied both their steam load and their fuel shut down.
- **The fuel.** Mill residuals and restoration thinnings are a disposal cost to whoever holds
  them. Where the counterparty pays to have material taken away, delivered fuel prices at haulage.
- **The story.** Restoration thinning reduces the fuel load that drives catastrophic fire, which
  is a better answer to "where does your firm power come from" than a new gas peaker, and a real
  co-benefit rather than a label.

Followed immediately by what would kill it: interconnection at the destination, the air permit,
fuel security over twenty years, and condition risk in used equipment. A test asserts the
counterweight is there and names all four — a thesis with no case against it is a pitch deck.

### Time to power is a model output

Speed is the product, so it stops being prose. Four stage durations taken from a real relocation
schedule become cells, and the critical path sums to first power:

| | months |
|---|---|
| Development and financing | 11 |
| Dismantle, crate and haul | 7 |
| Foundations and re-erection | 4 |
| Commissioning to first power | 3 |
| **First power** | **25** |
| Full commercial operation | 27 |

Permitting runs alongside financing rather than after it, so it is not on the path; the long pole
inside it is the air permit. The Trade readout puts that 25 against what else a buyer short of
firm capacity could order — a new biomass plant at 42 months, new gas at 48–72 including the
turbine slot, new nuclear at 120–180 — because on that axis a relocated plant is not competing
with new biomass, it is competing with a queue position.

Durations and stage names only. No dates, no route, no site, no counterparty. Tests assert the
figure is the sum of its stages rather than a typed number, that relocation is the fastest row,
and that only the row this model computes is labelled as coming from this model.

### The trade is the thesis, and it is computed

The capex gap is not an awkward assumption to defend. It is the whole trade: the same plant, the
same offtake, the same fuel, at a quarter of the capital cost because the equipment already
exists. So the first readout states it as a counterfactual the model actually runs — every figure
in the *Build new* column is this model evaluated again with capex moved to a greenfield dial,
never a number typed into prose:

| | Relocate | Build new | Difference |
|---|---|---|---|
| Months to first power | 25 mo | 42 mo | −17 mo |
| Capital cost, all in | $71.9M | $303.8M | −$231.9M |
| Funding requirement | $77.9M | $313.2M | −$235.3M |
| DSCR | 2.21x | 1.40x | +0.81x |
| Project IRR | 24.5% | 3.4% | +21.1 pts |
| Equity NPV | $100.2M | $(109.2)M | +$209.4M |

Greenfield biomass does not clear its cost of capital at a market power price, which is exactly
why the asset is interesting: it is only worth having because it already exists and can be moved.
The same two capital costs are drawn as bars underneath, because a four-times gap read down a
column is a fact and seen side by side is an argument.

**Why the equity moves fourteen-fold when the leverage dial doesn't.** The table originally
showed capital cost, equity, IRR and NPV, and it invited the wrong inference: that someone had
changed the capital structure between the two columns. Nobody had. The leverage dial reads 80%
in both. What changes is *which constraint binds*. Debt is the lesser of what the sculpt supports
and what the leverage cap allows, and **the sculpt supports the same $98.5M in both columns**,
because it is the same plant selling the same power on the same fuel. Relocated, the cap ($62.3M)
binds first, so leverage lands exactly on the dial. Built new, the cap would allow $263.2M but the
covenant holds debt at $98.5M, leverage falls to 31.4%, and equity absorbs every dollar of the
difference. **The trade compares the asset; the capital structure lives on Returns.** Four financing rows were
tried here and all four were cut: senior debt, equity required, leverage, and which limit sized the
loan. Each was added to explain why greenfield equity is so much larger, and each instead invited
the misreading that somebody had *chosen* a lower gearing for the new build. Nobody did — and the
comparison never depended on it, because **Project IRR is unlevered**: the whole build funded up
front, no interest deduction. The headline return is financing-free already.

Holding both columns at 80% was the obvious alternative and is worse. The model prices it: forced
to the cap, a greenfield build takes $263.2M of debt at a **0.52x** cover ratio — roughly half the
cash it owes in year one, which is a default at closing rather than a tight structure. It would
also *flatter* greenfield, lifting NPV from −$109.2M to −$76.7M, because cheap leverage on a
value-destroying asset shrinks the equity cheque. A comparison is not made fair by writing a loan
no lender would sign.

So the one financing figure that stays is the one that is really about the asset: whether it can
service debt at all. It is called **DSCR** in both places rather than *Minimum DSCR* here and
something else there, with the worst-year detail moved into the row's definition where it belongs,
and the two columns tell the story on their own — 2.21x clear of
the floor when the cost cap binds first, 1.40x exactly on it when the cash flow binds.

**Every row explains itself.** The trade rows are drawn strings with no cell behind them, so the
provenance bar had nothing to hook into and a reader who did not know what "Minimum DSCR" meant
had nowhere to ask. Each label now carries a definition, shown through the same chrome as a source
line: the formula bar on a wide screen, the tooltip on a phone.

Ten tests hold the pane: the greenfield column is recomputed independently and must match, the
difference column must reconcile, the bar widths must be the ratio of the figures beside them, the
sculpt-supported debt must be identical across the two columns, the binding constraint must
actually differ between them, the relocation must lever to exactly the dialled cap and clear the
cover floor while greenfield sits on it, and a difference of two percentages must be quoted in points rather than
percent. The rows are addressed by label, not by index — inserting a row above Project IRR would
otherwise have re-pointed the IRR assertions at the row below and gone on passing. Senior debt is
drawn in neutral grey: more debt is not a win.

### What has to be true first

Above the model sits a five-item screen, and it is deliberately not the risk register. A risk is
something you price; these are things that either hold or there is no deal, and they are what an
originator actually checks before spending a week in a spreadsheet: **both ends on a heavy-haul
route** (a plant that cannot be got out is not for sale at any price), interconnection or load at
the destination, an air permit obtainable on the schedule, fuel inside an economic haul radius,
and equipment that inspects clean. Each says *why* rather than only *what* — a test enforces that,
because a checklist of nouns is decoration.

### Capex is built from its parts

Capex was one dial. It is now the sum of four, because "$53.25M" is not a figure anyone can argue
with, while its components are:

| | | share |
|---|---|---|
| Acquisition, plant as it stands | $8.00M | 15.0% |
| Development, financing and permitting | $3.10M | 5.8% |
| Dismantle, crate and load out | $6.85M | 12.9% |
| Haul — $0.60M fixed, plus 1,800 miles at $0.50k/mile | $1.50M | 2.8% |
| Foundations, re-erection and commissioning | $27.15M | 51.0% |
| Reaching the load (configured, see below) | $2.50M | 4.7% |
| Boiler refurbishment, if inspection calls for it | $4.15M | 7.8% |
| **Capex, before contingency** | **$53.25M** | |

`C22` is a formula over the four, so it cannot be quietly retyped, and a test asserts the parts
still sum to it. The rate is what scales with plant size, not the mileage, since a bigger plant is
more loads over the same road.

**Where the breakdown came from.** The *total* was always grounded: the source study's base budget
works out to $1,064/kW, which is where the page's $1,065/kW came from. The *split* of it was not.
The first version was back-solved — acquisition set from a used-equipment per-kW range, the rest
chosen to reconcile — which made the haul a residual before it was a rate, and it was then tagged
`IND` ("a range a developer, lender or IE would recognize"), a source it did not have.

It is now proportioned against the study's own bottom-up budget: roughly ninety line items across
financing, permitting, decommissioning, transport, re-erection and commissioning, each with crew
counts, hours, rates and a fixed-against-variable split. The proportions above match that budget's
to within rounding, and capex all-in is unchanged at $71.9M, so nothing downstream moved.

The correction was not small. **Haul is 2.9% of a relocation budget, not the 17% the back-solve
gave it** — a per-mile rate of roughly $500, not $20,000. The instructive proportion is the other
side of it: **re-erection is 56%**. Moving the plant is the cheap part; putting it back up is the
expensive part, and a relocation does not avoid that cost. Two tests pin both halves.

Two line items the model had missed entirely are now in it: **development, financing and
permitting** (the FEED package, the air permit, the interconnection study, closing costs), and
**boiler refurbishment** — a full retube, contingent on the ultrasonic inspection. The
preconditions list already called that inspection the genuine coin flip; the model now prices it.

These cells carry an `EST` tag saying what the figure is and is not: the budget's *shape* applied
to this plant, not its figures, and no line naming a party, a site or a price. Acquisition is
deliberately held slightly off the source-implied per-kW so the real transaction figure is not
recoverable, and its own tag says it is illustrative. The confidentiality sweep was widened to
every party, agency and place the budget names once it had been read in full.

### Two configurations, not two numbers

Interconnection and boiler condition are not really assumptions with a value — they are
*decisions with a cost*, so each is a picker rather than a slider, and each drives a formula over
component dials.

**Reaching the load.** The plan is behind the meter. But a relocated plant can be finished in
about two years and the data centre it serves will not be, so the plant also ties to the utility:
it sells firm power from commissioning instead of waiting on someone else's construction, and the
tie is the fallback if that load never arrives. That turns the worst schedule risk in the trade
from a stranding question into a revenue question, which is why it is a thesis card ("The bridge")
and not just a line item.

| | behind the meter only | **with a grid tie** | grid-tied standalone |
|---|---|---|---|
| | $0.60M | **$2.50M** | $1.90M |

Built from four dials: the behind-the-meter feeder, metering and protection; a switchyard and
step-up transformer; the **gen-tie** — the radial line the project owns from its switchyard to the
utility's point of interconnection, priced per mile at sub-transmission voltage; and **network
upgrades**, which are the utility's own reinforcements, come out of the system impact study, and
are the single line in the capital cost that can move by an order of magnitude. The counterweight
paragraph was rewritten to name that specifically, since "interconnection" as a risk is now
answered by the configuration.

**Boiler condition.** The source flags the ultrasonic inspection as a genuine coin flip and a
$2–5M finding. The base case provisions a full retube because the inspection has not been done;
clearing it is upside, not the plan.

| | inspection clears | partial, waterwall only | **full retube provisioned** |
|---|---|---|---|
| | $0.00M | $1.87M | **$4.15M** |

The base case is unchanged at $71.9M all-in. The crosscheck's reference model re-derives both
configured lines itself rather than reading the page's answer, so a wrong branch fails on the
sweep rather than agreeing with itself.

The `.whys` grid also stopped being hardcoded to four cards. Rules are drawn as 1px gaps over a
ruled background rather than per-cell borders, so any number of cards holds at any breakpoint, and
an odd last card spans its row instead of leaving a hole.

### Sanity-checking the source

Re-anchoring to a study is only worth doing if the study holds up, so it was audited rather than
trusted. **Its arithmetic is clean**: variable cost equals crew × hours × rate on all 73 costed
lines, cost equals variable + fixed on all 81, the six stage totals reconcile to the stated base
budget to the dollar, and the contingency and quarterly phasing both tie out. Its capacity
assumptions match the page's independently — 18 MW nameplate per unit against 16.5 MW net is the
0.9167 derate the page carries, arrived at from the other direction.

Four things it does **not** support, which is why an audit was worth the hour:

- **No interconnection construction anywhere.** The budget carries a $125k interconnection *study*
  and a $55k utilities-install line, and nothing for a gen-tie, substation, switchyard or network
  upgrade. Behind the meter at a host with existing capacity that can be close to right; grid-tied
  it is not, and it is the kind of omission that moves a number by eight figures. The page now
  carries **interconnection as its own dial**, defaulting to $2.5M inside the same total, with a
  range from zero to $12M. It is the one line in that group deliberately tagged `IND` rather than
  `EST`, because it is the page's addition and not the study's.
- **The retube contradicts itself.** The notes tab says "Retubing excluded" and flags it as a
  $2–5M unquantified risk; the schedule budgets $3.0M for it and the base budget total includes
  that $3.0M. Both cannot be true. Worse, **only one of the two units is retubed** — two identical
  same-vintage twins, one provisioned and one not.
- **The cross-reference is dangling.** The notes point to a section called "UNACCOUNTED RISKS" in
  the budget tab. There is no such section in the workbook.
- **The line-item precision is partly presentational.** Within the decommissioning stages the
  "fixed cost" column is exactly hours × $409.02 — a lump-sum allocation spread by labour hours,
  not ninety independent estimates. The construction stages vary properly, so those are genuinely
  built up. And the second crew's budget is a line-for-line duplicate of the first's.

**A correction to what this file said before.** The source model uses 50% contingency, and the
page's 35% was described here as the less conservative choice. That reads the provenance wrong:
the contractor's own Class 5 estimate used **35%**, and the study's owner then layered 50% on top
of it. The page's 35% is the estimator's number, not a softening of it. It is left at 35% for that
reason, and the AACE range beside it already runs to 50% so the more conservative case is one drag
away.

**One thing left alone deliberately:** the study moves two units in parallel where the page models
one plant, which is already documented above and is part of what keeps the page plainly not that
deal.

The acquisition benchmark is a **per-kW used-plant range**, resolved live against the capacity
dial, and the source tag says outright that the figure is illustrative and is not any actual
asking price. Nothing about a real transaction appears here — the confidentiality sweep still
runs on every build.

C22 keeps a `min`/`max` despite no longer being an input, because the sensitivity and stress panes
move capex as a single quantity and need a band to move it within. Losing that band is what the
suite caught first when the split landed.

### Capex is dialled in dollars

It used to be dialled in $/kW and multiplied by nameplate: `MW × 1000 × $/kW × (1+contingency)`.
That is an engineer's unit, and the page already conceded the point — a shim named `asTotal`
multiplied the dial back into millions for the sensitivity and stress panes, so the same figure
appeared in two different units depending which tab you were on. The cell now holds millions, the
shim is gone, and the label is just **Capex**.

The change is output-neutral by construction: $53.25M × 1.35 is the same $71.9M all-in that
50,000 kW × $1,065/kW × 1.35 produced, and a test asserts both readings of that number agree.

Two consequences had to be handled rather than accepted:

- **The benchmark is published per kW**, so freezing it into millions would pin it to one
  nameplate. A `mkt` entry may now be a *function*, resolved against the live net-capacity cell,
  and any benchmark line built from one is redrawn on each recalc. Drag capacity to 70 MW and the
  ATB range moves from $183–229M to $257–321M.
- **Capex no longer scales with capacity on its own.** A per-kW rate did that by construction; a
  dollar total does not, which would have made the capacity slider free revenue — the most
  inviting bug on the page. Moving nameplate now moves both capex dials with it, holding the
  implied unit rate, and the sponsor can overrule either afterwards. The slider snaps to its own
  step, so the override is read back off the control rather than kept independently, or the dial
  and the model would quietly hold different numbers.

### Why the stress pane was rewritten

It applied seven shocks of fixed size — capex +25%, price −15% — and printed the NPV that fell
out. Nothing on the page said whether 25% was a lot, so the figures had no reference and the pane
read as arbitrary. Worse, it invited the wrong comparison: the shocks were not calibrated against
each other, so their ranking meant nothing.

It now answers what those shocks were reaching for. For every driver: the planned value, the value
at which equity NPV reaches zero, and the move between them as a percentage — sorted least room
first, so the top row is the assumption to be most sure of. Two drivers survive their whole
declared range and say so, which is its own finding: raising the cover target or losing credit
monetization cannot wipe the equity on their own.

Above it sits the number the user actually asked for, and the most quotable thing in 6.0: **every
assumption 8.6% worse than planned, all at once**, takes equity NPV to zero — against 24.0% of room
on the tightest single one, the PPA price. That gap between one-at-a-time and all-at-once is the real lesson of
the pane, and it is now a sentence rather than an inference.

What was lost, deliberately: the before-close/after-close distinction, which had the loan re-sized
by a rate move but pinned against operating misses. Every row here re-underwrites the deal, which
is one basis rather than two and is the right one for "how wrong could my view be." The seven
named scenarios and the stacked case are gone with it.

Six tests hold the arithmetic, and they are the strongest in the suite because they can put the
answer back into the model: every printed breakeven is fed to the model and must return zero;
a step back toward plan must still be worth something and a step past it must not; the percentage
must be the move it claims; a driver that "survives its range" must actually survive it; and the
across-the-board figure must zero the deal, with half of it leaving value and half again past it
not.

Series colours `#2a78d6` / `#eb6834` were validated against the white surface: CVD ΔE 24.7,
normal-vision ΔE 33.6 — both clear of the floors.

## Verification

Three suites, run against a headless browser. 182 checks.

- **`site.js`** (155) — behavior, content and style: values against hand calculations, the stress,
  tornado and breakeven logic, the memo furniture, the font convention, the confidentiality
  sweep, the cover and contents furniture, the webfont link and its fallback stacks, and
  guards on em dashes, contractions and American spelling.
- **`crosscheck.js`** (7) — an **independent implementation** of the whole project model, written
  from the stated mechanics rather than from the workbook, compared against the page across 250
  random input vectors and 14 fields including IRR. It also asserts that the headline tiles agree
  with that independent model at base case, and that structural
  invariants hold on every vector: no negative debt or equity, leverage inside its cap, sources
  equal uses, debt amortized.
- **`mobile.js`** (20) — responsive layout at 390px and 768px, plus the phone audit: every
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
  records on a phone, which turned it into rows of unlabelled numbers. It stays a table below
  680px, on fixed layout so the names take the slack and the figure columns are pinned to what a
  figure needs. The unit moved from each value to the row label, which said it once instead of
  twice and gave the phone back the width.

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
