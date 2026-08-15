# Andrew T. Gibson — Personal Operating Model

A personal website in the shape of a financial model, for someone who builds them for a living.
Eight sheets, a formula bar, editable assumption cells, and a working illustrative project-finance
model with a sensitivity table and a tie-out check — built as one static HTML file with no
dependencies, no build step, and no server.

Open `index.html` in a browser. That's the whole toolchain.

## What's inside

`index.html` contains a small spreadsheet engine (~500 lines of vanilla JS) and the content that
fills it. Formulas are parsed by a recursive-descent parser — no `eval` anywhere — and evaluated
lazily with memoisation and circular-reference detection.

| Sheet | What it holds |
| --- | --- |
| Summary | Cover page: key metrics, capability build, executive summary, font-convention legend |
| Experience | Employment schedule with live tenure, plus deliverables by period |
| Experience II | Continuation of deliverables, and community leadership |
| Transactions | Selected mandates as a transaction schedule, with portfolio metrics |
| Education | Degree, graduate coursework, awards, technical skills |
| Assumptions | The illustrative project's inputs — every one of them editable |
| Model | Ten-year cash flow, valuation, returns, checks, and an NPV sensitivity table |
| Contact | How to reach you, and coverage |

### The illustrative model

The Assumptions and Model sheets hold a generic 40 MW biomass project, sized to be recognisable
rather than accurate. **It describes no live transaction and contains no confidential terms.**

It is a real model, not a picture of one. Change the PPA price and NPV, IRR, DSCR and the
sensitivity table all move. The Model sheet builds ten explicit years plus a terminal value; the
Checks block values the same cash flows in a single closed-form line and shows the difference,
which is zero at every set of assumptions. If you break that, the tie-out cell says `CHECK`
instead of `OK`.

### Font convention

The colours are the standard modelling convention, and they are load-bearing:

- **Blue** — a hardcoded input. Cells with a light blue fill are editable: click one, type a
  number, press Enter, and the model recalculates.
- **Black** — a calculation.
- **Green** — a link to another sheet.

### On a phone

The grid keeps its real column widths and scrolls horizontally rather than compressing.
The label column is frozen against the row gutter, so row labels stay on screen while the
numbers scroll past — the one thing that makes a wide schedule readable on a small screen.
Prose that spans the grid scrolls away normally rather than freezing. Rows are taller for
touch, and cell inputs are 16px so iOS does not zoom the page when you edit an assumption.

### Keyboard

Arrow keys move the selection, Ctrl/Cmd+Arrow jumps to the next cell with content, Tab and
Shift+Tab move sideways, Enter or F2 edits a blue cell, typing a digit over one starts an edit,
Escape cancels, Home returns to the top of the sheet.

## Editing the content

All content lives in the `SHEETS` array at the top of the `<script>` block — one object per
sheet, keyed by cell reference. Nothing else needs touching.

```js
{
  name:'Summary', rows:44,
  cols:[26, 336, 100, 104, 24, 120, 220, 96],   // pixel width of columns A, B, C, …
  cells:{
    B2:{v:'ANDREW T. GIBSON — ENERGY PROJECT FINANCE', c:'title', span:3},
    C12:{v:'=Experience!F13', f:'num1', c:'link'},
    C23:{v:5, f:'num0', input:true},
  }
}
```

Cell properties:

| Key | Meaning |
| --- | --- |
| `v` | Value: a number, a string, or a formula beginning with `=` |
| `f` | Number format: `num0` `num1` `num2` `num3` `pct0` `pct1` `x2` `usd` `yr` `yr2` `date` `mmmyy` |
| `c` | Space-separated CSS classes: `title` `sub` `sec` `hdr` `ind` `hard` `link` `subtot` `tot` `note` `memo` `ctr` `rt` `bar` `shade` `ok` |
| `span` | Column span, for prose that runs across the grid |
| `input` | `true` makes the cell an editable blue input |
| `href` | Renders the cell as a link |
| `action` | `'reset'` wires the cell to the reset-assumptions handler |

The Model sheet's year columns and both data tables are generated in loops immediately after the
`SHEETS` array, rather than written out cell by cell.

### Supported functions

`SUM` `AVERAGE` `COUNT` `COUNTIF` `MIN` `MAX` `ABS` `ROUND` `IF` `REPT` `SUMPRODUCT`
`PMT` `NPV` `IRR` `TODAY` `DATE` `YEAR` `MONTH` `YEARFRAC`

Plus `+ - * / ^ &`, comparisons, parentheses, ranges (`D18:M18`), and cross-sheet references
(`Assumptions!C34`). `IRR` solves by bisection. Dates are Excel serial numbers with the
1899-12-30 epoch, so date arithmetic behaves the way it does in a real workbook — which is why
the current role's tenure accrues against `=TODAY()` on every visit.

## Still to decide

Two cells are placeholders, both on the Contact sheet:

- `C11` — phone number, currently *"[on request]"*. The CV carries it; a public web page is a
  different exposure. Add it if you want it public.
- `C18` — availability status, currently *"[Set availability]"*.

## Deployment

`.github/workflows/deploy.yml` publishes the repo root to GitHub Pages on every push.

One manual step is needed first: **Settings → Pages → Source → GitHub Actions**. After that the
site serves at `https://tobombadil.github.io`. To serve it at `andrewtgibson.com` instead, add a
`CNAME` file containing the domain and point a DNS `ALIAS`/`A` record at GitHub Pages.
