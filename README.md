# IPL Finals — Closeness Ranking

Interactive visualisation ranking all IPL finals (2008–2025) by how close and dramatic they were, using ESPNcricinfo win probability data.

**Live site:** *(add your GitHub Pages URL here)*

## Repo structure

```
ipl-finals-viz/
├── index.html          ← HTML shell, loads everything
├── data/
│   └── ipl_finals_wp.csv   ← source data (one row per over per match)
├── js/
│   ├── compute.js      ← CSV parsing + metric calculations
│   └── viz.js          ← Chart.js rendering + interactions
└── css/
    └── style.css       ← dark/light theme, layout, components
```

## Data format

`data/ipl_finals_wp.csv` has one row per over per match:

| Column | Description |
|---|---|
| `year` | IPL season year |
| `bat_first` | Team abbreviation batting first |
| `bat_second` | Team abbreviation batting second |
| `result` | Match result string |
| `innings` | 1 or 2 |
| `over` | Over number (1-indexed) |
| `bat_first_wp` | Win probability % for team batting first |
| `bat_second_wp` | Win probability % for team batting second |

`bat_first_wp + bat_second_wp = 100` for every row.

Win probability values manually extracted from ESPNcricinfo win probability charts at over-level granularity.

## Metrics

**Late swing score (50% weight)**

$$\text{LateSwing} = \sum_{i=1}^{N-1} |\Delta WP_i| \times \frac{i}{N-1}$$

Weights each swing by how late it occurs. A 20pp swing in the last over counts far more than the same swing in over 1.

**Volatility score (50% weight)**

$$\text{Volatility} = \sigma(WP_1, WP_2, \ldots, WP_N)$$

Standard deviation of the full WP series. Captures whether the match was contested throughout.

Both scores normalised 0–100 across all 18 finals, then averaged equally.

## To update with new data

1. Open `data/ipl_finals_wp.csv`
2. Add rows for the new final (one row per over, both innings)
3. Commit — the viz recomputes automatically from the CSV on load

No build step required. Pure HTML/CSS/JS.

## To run locally

Because the viz fetches the CSV via `fetch()`, you need a local server (browsers block file:// fetches by default):

```bash
# Python
python -m http.server 8000

# Node
npx serve .
```

Then open `http://localhost:8000`.

## To deploy on GitHub Pages

1. Push this repo to GitHub (public)
2. Settings → Pages → Source: Deploy from branch → main → / (root)
3. Your site will be live at `https://yourusername.github.io/ipl-finals-viz`
