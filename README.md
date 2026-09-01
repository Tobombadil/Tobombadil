# Andrew T. Gibson — andrewtgibson.com

A personal website for an energy commercial professional, built as an **origination proposal**. One static
HTML file: no framework, no build step, no server, no analytics.

Open `index.html` in a browser. That's the whole toolchain.

## The idea

It is a **proposal, laid out the way a power-sector filing is laid out**, because the proposal is
the deliverable in an origination seat and you may as well see one. A full-bleed cover, a contents
page with decimal numbering and dot leaders, seven numbered sections each opening on a divider
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
[cover, contents, secSummary, secMandate, secExperience,
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

### The editorial pass

A read of the whole document against the role spec, rather than of one section at a time.

**4.0 Selected Transactions was deleted.** Nine rows, and every one of them was already a bullet in
3.0 — a reader met the same career twice. Four of the nine were not transactions at all: a
trading-systems rollout and a portfolio-analytics build are work, not deals sourced, structured and
signed. What survives is the five that really are deals, as a table at the foot of 3.0 where the
career that produced them already is. Eight sections became seven.

**The tenure-reconciliation footnote went.** It explained, at length, why recorded tenure ran 0.2
years ahead of career span. Honest, and a leftover from when this page was a spreadsheet: on a
proposal it draws a reader's attention to a rounding difference nobody asked about. Its cell went
with it, which the dead-cell audit caught immediately.

**The risk register went from six rows to four**, because it closed by admitting three of the six
were one risk in different clothes. They are now one row that says the thing once: never sold
full-requirements supply, never sat inside a cooperative's procurement, all of it at one firm.

**5.0 lost a third of its words.** It had grown to ten blocks of prose before a single number — five
thesis cards, five precondition paragraphs, and a counterweight paragraph restating four of the
preconditions in different words. Now four thesis cards, a one-line screen, and the counterweight
carried by the screen itself. This matters beyond length: at 37% of the page's words, the section
was making an argument the prose denies. The role says plainly that modelling is somebody else's
chair, and a reader counts pages.

**Aimed at the actual role.** The terms card led with "ERCOT and SPP today; WECC on a curve" — one
market with no evidence behind it, and the gap in the first card a reader sees. It now reads WECC
and the Southeast, with data-centre load national, and carries a Customers row, because the spec's
customers are cooperatives, municipals and the large loads inside their territories. The thesis in
5.0 names that buyer explicitly instead of leaving the connection to be made. And nine years on a
governed, member-accountable board through four mergers moved from a stat tile to the second
paragraph of the summary and to the head of the credentials block: for a seat selling into public
power, where buying happens through governance rather than through a pitch, it is the closest
analogue anyone outside a cooperative can offer.

### The tenure claims were overstated

The page led with eleven years and a career total running from May 2015. Two problems with that.
The earliest of those years ran alongside the finance degree, and **the energy work is two and a
half years old** — the rest was a trading desk, a startup and a bank. "Eleven years sourcing,
structuring and negotiating energy and commodity contracts" was not true of energy.

It also argued the wrong way. The spec asks for **3+ years**, says explicitly that this is *not a
senior appointment*, and wants somebody "expected to learn by watching, not to arrive with a fixed
playbook." Overstating seniority was working against the application, not for it.

So the clock the page leads with is the one that counts for the seat:

| | |
|---|---|
| **In energy origination** | 2.5 yrs — since March 2024 |
| **Commercial, full time** | 9.5 yrs — since 2017, after the degree |

`Career!F14` is the new full-time span, starting at the first post-degree role; `F13`, which
counted the study years, is deleted. The Morgan Stanley entry says on its face that it ran
alongside the degree.

The first risk row used to read *"I have already had Manager on my card"* — a complaint about being
too senior. It now says the opposite, because the opposite is true: the title outruns the tenure
behind it, and that is the argument for the second chair rather than against it.

One consequence worth recording: dropping the two old tiles orphaned `Facts!C16` and `Career!F13`,
and the dead-cell audit caught both immediately. `C16` turned out to be alive — read by `say()`
into a resume bullet without ever becoming a `data-cell` — so it is now an explicit root in the
walk. And tile captions can carry live cells now, so the $500M and $800M behind "rights negotiated"
are hoverable figures rather than text baked in at build time.

### Compass is named for what it is

The roast landed hardest here: nobody in power has heard of Compass International and the page
never said what it was, which made the title and the $1.3B impossible to calibrate. compassitg.com
turns out to corroborate most of 5.0 — Compass turns biomass residuals into woodchips, pellets,
biochar and SAF, and sells them to **utilities, data centres and industrial buyers**.

That is the whole thesis of 5.0 stated as somebody's actual business, so the job note now says it
and the company name links. It changes how 5.0 reads: not a developer's daydream about biomass and
AI load, but a description of the market he works in.

### Pakira is linked on the job, not on the cover

pakira.com is live and substantive: a wood-industry trading platform with 155,000 companies in it
and real testimonials. It is worth linking, because "Pakira, Inc." on a CV line means nothing to a
reader and 5.6 years is the longest job on the page.

It is linked on the employer name in 3.0 and deliberately not on the cover. On the cover it would
sit beside three energy and finance tools and send a reader, on the first screen, to a lumber
marketplace — which is the same impression the risk register already owns up to, that the longest
job is not an energy job. In 3.0 it answers a question the reader is already asking. Jobs take an
optional `url` now, so any employer worth showing can carry one.

### The cover opens the work

A reader who stopped at the cover never learned that the model, the simulator or Bankable existed:
the model sits five sections down and the two applications were only reachable from 4.0.

The cover now carries a second row under the primary actions, labelled **Open**: *The model* (jumps
to 5.0), *Battery simulator* and *Bankable*. It is deliberately quieter than the first row — the top
row is what to do about him, this one is what he has made — and the two that leave the page carry a
↗ and open in a new tab.

`SITE.tools` is built after the `SITE` literal rather than inside it, so the URLs are written once
and a rehost is a single-line change. A test asserts all three resolve, that the external pair open
in a new tab with `noopener`, and that no external URL appears twice on the page.

### The work is linked

4.0 described three projects and linked none of them. Two are live and both are now hyperlinks in
the heading, opening in a new tab: the **BESS schedule optimization simulator**, which had been
"live demo available on request" because the URL was being withheld, and **Bankable**, which is the
"patent-pending document processor" as a shipped product. Both URLs sit in `SITE` beside the other
links rather than inline in the view, so moving a host is a one-line change.

Two things the tests caught while doing it. The heading variable collided with the basis table's
header row, which `node --check` found before it shipped. And renaming the simulator card back to
"SmartBidder" tripped a check written when that rename was explicitly asked for in the other
direction — the suite remembered an instruction I had forgotten.

The section header said "two things I built on my own time" over three items, and Bankable came out
of client work rather than a weekend. Both fixed.

### He sponsors a project, and the page did not say so

Two later resumes carried the strongest fact in the file and the site was missing all of it. He is
the **sponsor of a 33 MW behind-the-meter generation and CHP project**, holding exclusive rights to
two 18 MW units, 320,000 tons of biomass and 230 acres of permitted land, on a **$46M structure**
that relocates two small plants at roughly half the capital cost and half the time to first power
of a new build. Every role he is aiming at is developer or sponsor side. That belonged at the top.

It also fixes the worst credibility problem on the page. "$1.3B of rights" with no qualifier read
as puffery. It now reads **$500M of intake and $800M of offtake across twelve projects**, next to a
sponsored deal with physical rights attached, and the tile is called Contracts originated rather
than Rights negotiated.

Other gaps the resumes closed:

- **Why he is looking.** The Compass role runs to August 2026. The page never said, and it is the
  first question anyone asks.
- **Low carbon.** Section 5 models §45Y, §48E and a §6418 transfer, and the skills list never
  claimed any of it. There is a Low carbon row now covering §45Q, §45Z, voluntary credits and the
  life cycle analysis that qualifies them, plus a Development row for the sponsorship work.
- **Bankable.** The "patent-pending document processor" is a live product at bankablehq.com. It is
  linked rather than described, and it is honest about where it came from.
- **Scale of the pipeline.** 100+ prospects developed, twelve projects, the EPC and advisor
  assembly, the investor data room and diligence with institutional investors.

The risk register was retargeted with it. "I have never sold wholesale power to a utility" was the
right gap for a wholesale marketing seat; for a developer it is **"I have not closed a utility-scale
PPA"**, and the mitigant now leans on having sat on the sponsor side, which is what lets him read an
offtaker's approval chain from the other end.

### A factual correction, and why it is phrased by ISO

The risk register claimed "my market work is all ERCOT". That was wrong. The *published research*
is ERCOT, because that is where the clean data was, but the deal work has run across MISO and the
West too, on power offtake, fuel supply and plant acquisition.

The correction is stated by **ISO rather than by state**, deliberately. The origin and destination
states of a live relocation, named next to a model of a cross-country plant move, point at a real
transaction even though the model itself names no site. MISO and the West say the same thing
professionally, without drawing that line. The confidentiality sweep still passes.

The residual risk is real and stays on the page: depth of view on price formation is one market
deep, whatever the deal work has touched.

### Written to a kind of desk, not to one employer

The page had been aimed at a single job spec, and it showed: "you asked for three years", "you told
me this is not that job", "the second chair", "seventy-thirty". Two problems with that. A director
or VP reading it is told, in the candidate's own words, that he wants a junior seat. And a project
finance desk at a bank is told that modelling is somebody else's job, which is the opposite of true
on that side of the market.

So the second person aimed at an employer is gone, and so is any claim about seniority in either
direction. The terms card reads **Looking for: origination, commercial structuring, or project
finance** and **Level: open, I care more about the desk than the title**. Markets and counterparties
are stated broadly rather than shaped to one company's footprint. Products now include project debt.

Section 5 stopped apologising for itself. It used to open with "modelling is not this job"; it now
opens with what is actually true whoever is reading — the useful skill with a model is knowing which
assumption is carrying the answer.

The risk register was rewritten around the same problem. It used to answer a spec point by point.
The four risks now stand on their own: energy experience shorter than the career, never having sold
full-requirements supply, market work all in one ISO, and never having run a deal team. That last
one is new and matters most for the roles above manager, where leading people is the job.

Two checks hold it: no second person addressed to an employer and no employer named, and no phrase
claiming or disclaiming a level.

### Rewritten in his voice

The prose had a tic. Set up a wrong answer, then correct it: "Not a title." "never on bad math."
"not through a pitch." "It closes on a desk, not on paper." Eight instances of the same move in one
document reads as a house style rather than as a person. The card labels had the same problem —
THE DEMAND, THE ASSET, THE STORY are headings for a slide, not words anyone says out loud. They are
"Why now", "Why these plants", "Why the fuel is cheap" now.

Everything a reader sees was rewritten as plain speech: say the thing, then stop. Contractions went
from 6 to 51, which the suite already had a floor for and which is the clearest single measure of
the change. Writing it out longhand had made it stiffer, not more human.

**One near-miss worth recording.** Typing an apostrophe into a single-quoted JavaScript string ends
the string. Four of the rewritten lines were single-quoted, so the page script stopped parsing and
the page went blank. The only symptom was every later check failing at once with `rawOf is not
defined`, which points nowhere near the actual fault. `node --check` on the extracted script found
each one in seconds, and there is now a check for the failure as itself: the engine and the view
must both have loaded before anything else is asserted.

### Grids size themselves

Two bugs shipped from one cause: a fixed column count plus `nth-child` rules that assume a specific
number of items.

- The outcomes grid was `repeat(3,1fr)` with breakpoint overrides at 900px and 560px. Because
  `.whyc:last-child:nth-child(2n+1)` (specificity 0,3,0) outranks `.whyc:last-child` (0,2,0), the
  900px "span 2" beat the 560px "one column" on a phone. Computed columns came back
  `91.125px 263.875px` — a 91px card setting **one word per line**.
- `.tile:nth-child(1){border-bottom}` drew a rule under the first tile at narrow widths. The market
  section's tile block holds exactly one tile, so it drew a **half-width rule under a tile with
  nothing beneath it**.

Both are now `repeat(auto-fit,minmax(Npx,1fr))` with rules drawn as 1px gaps over a ruled
background. No breakpoints, no `nth-child`, no item-count assumptions: a track is never narrower
than its content needs, and a cell that is alone in its row has no rule to draw. The card grid
walks 1 → 2 → 3 → 4 columns as the room appears, at any container width — which matters because
the artifact viewer renders in an iframe whose width does not match the device.

The transposed basis table in 4.0 had a related fault. It is one header row of crowding levels over
one body row of figures, and `.sched thead{display:none}` hides headers when the table restacks —
so a phone got seven bare numbers with nothing naming them. Each figure now carries its own
`data-l`, so it reads "2 GW 6.34" stacked.

A sweep across fourteen widths now asserts both invariants, on one page resized rather than fourteen
loaded. Both original bugs were invisible at the widths anyone had tested.

### The career is continuous

Forest City was full time and followed Morgan Stanley directly, so the handover is May 2017 and the
two roles no longer overlap. That single date is what the old reconciliation footnote existed to
explain — recorded tenure ran 0.2 years ahead of the career span because two months were counted
twice. With the date right there is nothing to reconcile, and four invariants now hold it that way:

- the roles run end to end, with no overlap and no gap;
- they add up to exactly the span they cover (11.32 years across 11.32 years);
- the full-time clock starts at the first full-time role rather than the first job, so it is
  strictly shorter than the total;
- and the energy clock is shorter still.

Deleting a footnote and adding a test that makes it impossible to need again is the better trade.

### Answering the role's own outcomes

The spec sets outcomes at ninety days, six months and a year. A proposal that does not answer them
leaves the reader to guess what the first year buys, so 2.0 now closes with three commitments
against those marks, sitting under the table that maps the seat's five duties. That makes 2.0 the
complete answer to "can you do this job" and keeps it to a single screen on a desktop.

Two other corrections from the same read:

- **"Ten years" was claimed twice while the model computed 11.3.** On a page whose entire discipline
  is that figures come from cells, a hardcoded word disagreeing with a live one is the first thing a
  careful reader finds. It reads eleven now.
- **The spec calls a genuine appetite for people a must-have**, and the page had no evidence of it:
  competent throughout, warm nowhere. The summary now says outright that no book of customers is
  arriving and would not be believed if it were, names what is actually liked about the work, and
  points at nine years of unpaid board service as the evidence. Stated with a fact behind it rather
  than as an adjective.

### The financing dials explain themselves

Three questions in a row about this model turned out to be missing *explanations* rather than
missing numbers, and all three were in the financing block — which is where the mechanics live and
where a label cannot carry them. Every dial in that group now has a provenance sentence saying what
it does to the answer, with live operands substituted, and a test fails if one is added without one.

**Target minimum DSCR** is the clearest case. It is the covenant the loan is sized to: in any year
the plant may owe its cash available for debt service divided by that figure, and the loan is the
present value of that stream at the debt rate. But it only reaches the answer when it is the limit
that *binds* — and in the base case it is not. Sculpting supports $98.5M; the leverage cap allows
$62.3M; the smaller is drawn.

The consequence is worth stating plainly, because a slider that does nothing is worse than no
slider at all if the page does not say so:

| target | sculpt supports | cap allows | drawn | actual DSCR | equity NPV |
|---|---|---|---|---|---|
| 1.20x | $114.9M | $62.3M | $62.3M | 2.21x | $100.2M |
| 1.40x | $98.5M | $62.3M | $62.3M | 2.21x | $100.2M |
| 1.80x | $76.6M | $62.3M | $62.3M | 2.21x | $100.2M |
| 2.00x | $68.9M | $62.3M | $62.3M | 2.21x | $100.2M |

**Across its entire slider range the dial changes nothing.** It first bites at 2.21x — which is
exactly the actual minimum DSCR the model already reports, and that is an identity rather than a
coincidence: the realised cover is the target divided by how far the loan was cut below the sculpt,
so the covenant takes over precisely when the target reaches the realised figure. Move the same
dial in the greenfield column, where the covenant *is* binding, and debt runs $114.9M down to
$68.9M with cover tracking the target exactly.

That is also why the Stress pane reports it as surviving its whole range. It is not that the shock
is too small; it is that on this structure the covenant is not the constraint.

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
  back: `1.0  2.0  3.0  4.0  5.0 Analysis  6.0  7.0`. `SECTIONS` carries that short label as
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

`.github/workflows/deploy.yml` publishes to GitHub Pages on every push to the default branch.

**It stages `_site` and copies only `index.html` and `CNAME` into it.** It used to upload the repo
root, which would have served this README at `andrewtgibson.com/README.md` — 1,100 lines of build
log, including candid notes on what was cut and the reasoning behind what is deliberately held back
from the model. That was caught before a domain was pointed at it, and the staging step exists so it
cannot come back. Anything added to the repo is private unless the workflow copies it explicitly.

### Live

**https://andrewtgibson.com** — verified 2026-09-01. The apex and `www` both serve, over HTTP and
HTTPS, and `tobombadil.github.io/Tobombadil/` redirects to the domain. The bytes served are identical
to `index.html` in this repo, and `README.md`, `README.html` and `.github/` all return 404, which is
the staging step doing its job.

The one box still worth ticking is **Settings -> Pages -> Enforce HTTPS**. Plain HTTP currently
serves the site rather than redirecting to HTTPS, and there is no `Strict-Transport-Security` header.
Nothing on the page is sensitive and there is no form on it, so this is hygiene rather than a
vulnerability — but it is a checkbox, and a proposal sent to people who will look closely should not
be reachable unencrypted.

`/CNAME` is served as a file at `andrewtgibson.com/CNAME`. It contains only the domain name, which is
not a secret. It could be dropped from the staging step, since GitHub ignores it under an Actions
source anyway.

The path to get here, for anyone repeating it:

1. Settings -> Pages -> Source: **GitHub Actions**. Nothing builds until this is set; 62 runs failed
   on it.
2. Push, and confirm the build at `tobombadil.github.io/Tobombadil/` — the subpath, not the root.
3. GoDaddy -> Nameservers -> **GoDaddy nameservers (default)**, then immediately author the zone,
   carrying the `MX` and `TXT` records across.
4. Settings -> Pages -> **Custom domain** -> save the domain by hand. The `CNAME` file does not do
   this.
5. Settings -> Pages -> **Enforce HTTPS**, once the certificate has issued.

### The CNAME file does not attach the domain

Worth knowing, because it cost a confused half hour. With **Source: GitHub Actions**, a `CNAME` file
in the deployed artifact does *not* set the repository's custom domain. That behaviour belongs to
branch-based publishing, where GitHub reads the file out of the branch. Under Actions the domain has
to be typed into **Settings -> Pages -> Custom domain** and saved, by hand, once.

The symptom is quiet and easy to misread: the deploy goes green, the artifact plainly contains the
`CNAME`, `tobombadil.github.io/Tobombadil/` keeps serving normally with no redirect, and the apex
returns GitHub's own 404 page — DNS is arriving at GitHub, GitHub just has no mapping from the domain
to this repository. It looks like DNS propagation and is not.

The `CNAME` file is kept anyway. It costs nothing, it documents the intended domain next to the code,
and it is what GitHub itself writes into the repo when the domain is saved through the UI.

### Do not use the Jekyll starter workflow

The Settings -> Pages screen offers two starter cards, *GitHub Pages Jekyll* and *Static HTML*, each
with a Configure button that commits a workflow to the repo. The Jekyll one was added by mistake and
removed again; if the screen is ever revisited, neither button is wanted, because `deploy.yml`
already does this job.

Jekyll is actively wrong here. Its workflow builds with `source: ./`, the repository root, and Jekyll
renders every Markdown file it finds into a published HTML page — so this README would have gone up
as `README.html` on the public domain. That is the same leak the `_site` staging step exists to
prevent, arriving by a different route. It also declares the same `pages` concurrency group and the
same branch trigger as `deploy.yml`, so the two would race on every push and the later finisher would
decide what the domain served.

### Step one: switch Pages on

**Every workflow run in this repo has failed**, 58 of them, all with the same error:

> Get Pages site failed. Please verify that the repository has Pages enabled and configured to
> build using GitHub Actions.

Pages has never been enabled. `enablement: true` on `configure-pages` was tried and the token
cannot do it either — *"Create Pages site failed. Resource not accessible by integration"* — because
creating a Pages site needs admin rights the workflow token does not carry.

So it is one genuine manual step, once: **Settings → Pages → Build and deployment → Source: GitHub
Actions.** Re-run the workflow after that and it goes green.

It serves at **`https://tobombadil.github.io/Tobombadil/`**, under a subpath. A *user site* — one
that answers at the root — requires the repo to be named `tobombadil.github.io` exactly; owner and
repo matching is not what GitHub keys on, and `Tobombadil/Tobombadil` is an ordinary project repo.
So `https://tobombadil.github.io/` returns 404 whether or not Pages is on, and is not a useful
check.

The subpath does not survive into production and does not need to: a project site attached to a
custom domain answers at the apex root, so `andrewtgibson.com/` is right. Nothing in the page uses
an absolute path, so it renders correctly under either. Renaming the repo to `tobombadil.github.io`
would make it a user site at the root, but there is no reason to once the domain is attached.

### Step two: the domain, which is currently on Wix

The route chosen is A below: andrewtgibson.com itself, served from GitHub, with the DNS moved back
to GoDaddy.

**Done, 2026-09-01.** The nameservers now read `ns49/ns50.domaincontrol.com`, the apex answers with
GitHub's four addresses, and the Microsoft 365 `MX` survived the move. The `CNAME` file was parked as
`CNAME.pending` for the first deploy — GitHub reads a `CNAME` in the artifact, sets the repository's
custom domain from it, and then 301-redirects `tobombadil.github.io/Tobombadil/` to that domain,
which would have pointed the only available smoke test at the Wix site still answering for the
domain. It is back in place now that DNS resolves.

**GoDaddy is the registrar, but it is not currently the host.** Looked up on 2026-09-01, the
authoritative nameservers are Wix's:

```
NS   andrewtgibson.com        ns10.wixdns.net, ns11.wixdns.net
SOA  andrewtgibson.com        ns10.wixdns.net support.wix.com
```

That matters because it means **records typed into GoDaddy's DNS panel do nothing.** Wix took over
the zone when the site was connected, and Wix answers every query for the domain. The GoDaddy panel
will accept the edits and show them saved; the internet will keep resolving to Wix.

The full zone as it stands, which is the thing that has to survive the move:

| Type | Name | Value | What it does |
|---|---|---|---|
| A | `@` | `185.230.63.186`, `185.230.63.107`, `185.230.63.171` | Wix serves the site — replace these |
| CNAME | `www` | `cdn3.wixdns.net` | Wix CDN — replace this |
| MX | `@` | `0 andrewtgibson-com.mail.protection.outlook.com` | **Microsoft 365 email — must be recreated** |
| TXT | `@` | `google-site-verification=b8fD7DMnYnXKg2AgqlguzHjR8-JPiGz7vTdooP8avoM` | Google verification — recreate |

There is no SPF, no DKIM selector, no DMARC, no autodiscover and no CAA record, so those four rows
are everything.

**The MX record is the hazard.** Moving the nameservers hands the whole zone to a fresh GoDaddy
zone file, and anything not in it stops existing. Email to @andrewtgibson.com would bounce from that
moment, silently, and nobody tells you — the sender gets the rejection, not the owner.

The obvious defence, building the GoDaddy zone before switching, **is not available.** With the
nameservers pointed at Wix, GoDaddy's DNS screen is read-only and says so:

> Your domain is registered at GoDaddy, but its DNS is currently managed elsewhere.

So the records cannot be pre-staged. The switch has to come first, and the zone gets authored in the
window right after it, before resolvers have picked the change up. That window is real but forgiving:
nameserver changes take tens of minutes to hours to propagate, so a zone finished within a few
minutes of the switch is corrected long before most of the internet has looked.

**Route A — GoDaddy holds the DNS, GitHub serves the site.** Do steps 1 and 2 back to back, in one
sitting. Do not switch the nameservers and come back to it tomorrow.

1. GoDaddy → *Nameservers → Change → GoDaddy nameservers (default)*. The DNS screen becomes
   editable, populated with a default parked zone — usually an `A` record on `@` pointing at a
   GoDaddy parking address and a `CNAME` on `www`. Both get replaced.

2. GoDaddy → *DNS → Manage Zones*, and make the zone read exactly:

   | Type | Name | Value | Priority |
   |---|---|---|---|
   | A | `@` | `185.199.108.153` | |
   | A | `@` | `185.199.109.153` | |
   | A | `@` | `185.199.110.153` | |
   | A | `@` | `185.199.111.153` | |
   | CNAME | `www` | `tobombadil.github.io` | |
   | MX | `@` | `andrewtgibson-com.mail.protection.outlook.com` | `0` |
   | TXT | `@` | `google-site-verification=b8fD7DMnYnXKg2AgqlguzHjR8-JPiGz7vTdooP8avoM` | |

   The four A records are GitHub's Pages anycast addresses; all four go in, as four separate rows
   with the same name. Delete the parked `A` and any `CNAME www` GoDaddy created. `AAAA` records
   (`2606:50c0:8000::153` through `8003::153`) are optional IPv6.

3. In Wix, disconnect the domain from the site, so Wix stops claiming it.

Verify from outside rather than from the GoDaddy panel, which shows intent rather than reality:

```
dig +short NS  andrewtgibson.com     # want ns__.domaincontrol.com
dig +short A   andrewtgibson.com     # want the four 185.199.10x.153
dig +short MX  andrewtgibson.com     # want ...mail.protection.outlook.com — check this one
```

Send a test email to the domain once MX resolves. That is the check that matters.

**Route B — leave Wix alone and use a subdomain.** Not chosen, kept because it is the safe fallback:
one `CNAME`, `proposal` → `tobombadil.github.io`, added wherever the DNS currently lives (Wix), and
the repo's `CNAME` file changed to `proposal.andrewtgibson.com`. No nameserver move, no email risk,
nothing to undo.

Either way, finish in **Settings → Pages → Custom domain**: enter the domain, save, wait for the DNS
check to pass, then tick **Enforce HTTPS**. That box stays greyed out until the certificate is
issued, which happens after DNS validates.
