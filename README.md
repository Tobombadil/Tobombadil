# Personal Operating Model

A personal website in the shape of a financial model. Six sheets, a formula bar, editable
assumption cells, and a sensitivity table — built as one static HTML file with no dependencies,
no build step, and no server.

Open `index.html` in a browser. That's the whole toolchain.

## What's inside

`index.html` contains a small spreadsheet engine (~400 lines of vanilla JS) and the content that
fills it. Formulas are parsed by a recursive-descent parser — no `eval` anywhere — and evaluated
lazily with memoisation and circular-reference detection.

| Sheet | What it holds |
| --- | --- |
| Summary | Cover page: key metrics, capability build, executive summary, font-convention legend |
| Experience | Employment schedule with live tenure (the current role ends at `=TODAY()`, so it accrues) |
| Projects | Portfolio of work as an investment schedule, with hours in and users out |
| Education | Degrees and continuing education |
| Assumptions | Every editable input, the outputs derived from them, and a 5×5 sensitivity table |
| Contact | How to reach you, and availability |

### Font convention

The colours are the standard modelling convention, and they are load-bearing:

- **Blue** — a hardcoded input. Cells with a light blue fill are editable: click one, type a
  number, press Enter, and the model recalculates.
- **Black** — a calculation.
- **Green** — a link to another sheet.

### Keyboard

Arrow keys move the selection, Ctrl/Cmd+Arrow jumps to the next cell with content, Tab and
Shift+Tab move sideways, Enter or F2 edits a blue cell, typing a digit over one starts an edit,
Escape cancels, Home returns to the top of the sheet.

## Editing the content

All content lives in the `SHEETS` array at the top of the `<script>` block — one object per
sheet, keyed by cell reference. Nothing else needs touching.

```js
{
  name:'Summary', rows:42,
  cols:[26, 330, 104, 104, 24, 128, 210, 96],   // pixel width of columns A, B, C, …
  cells:{
    B2:{v:'ANDREW [LAST NAME] — PERSONAL OPERATING MODEL', c:'title', span:3},
    C12:{v:'=YEARFRAC(Experience!D7,TODAY())', f:'num1'},
    C22:{v:5, f:'num0', input:true},
  }
}
```

Cell properties:

| Key | Meaning |
| --- | --- |
| `v` | Value: a number, a string, or a formula beginning with `=` |
| `f` | Number format: `num0` `num1` `num2` `pct0` `pct1` `usd` `yr` `yr2` `date` `mmmyy` |
| `c` | Space-separated CSS classes: `title` `sub` `sec` `hdr` `ind` `hard` `link` `subtot` `tot` `note` `memo` `ctr` `rt` `bar` `shade` |
| `span` | Column span, for prose that runs across the grid |
| `input` | `true` makes the cell an editable blue input |
| `href` | Renders the cell as a link |
| `action` | `'reset'` wires the cell to the reset-assumptions handler |

Placeholders are written in `[square brackets]` and the sample schedule rows are marked
`SAMPLE` in comments — search for either to find everything that still needs replacing.

### Supported functions

`SUM` `AVERAGE` `COUNT` `COUNTIF` `MIN` `MAX` `ABS` `ROUND` `IF` `REPT` `SUMPRODUCT`
`TODAY` `DATE` `YEAR` `MONTH` `YEARFRAC`

Plus `+ - * / ^ &`, comparisons, parentheses, ranges (`C7:C13`), and cross-sheet references
(`Assumptions!C22`). Dates are Excel serial numbers with the 1899-12-30 epoch, so date
arithmetic behaves the way it does in a real workbook.

## Deployment

`.github/workflows/deploy.yml` publishes the repo root to GitHub Pages on every push.

One manual step is needed first: **Settings → Pages → Source → GitHub Actions**. After that the
site serves at `https://tobombadil.github.io`.
