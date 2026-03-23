// compute.js
// Reads ipl_finals_wp.csv, computes metrics, returns ranked data.
// All metric logic lives here — swap formulas without touching the viz.

async function loadAndCompute() {
  const resp = await fetch('./data/ipl_finals_wp.csv');
  const text = await resp.text();
  const rows = parseCSV(text);
  const byYear = groupByYear(rows);
  const results = Object.entries(byYear).map(([year, yrows]) => compute(Number(year), yrows));
  return normaliseAndRank(results);
}

// ── CSV parser ────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const vals = line.split(',');
    return Object.fromEntries(headers.map((h, i) => [h.trim(), vals[i]?.trim() ?? '']));
  });
}

// ── Group rows by year ────────────────────────────────────────────
function groupByYear(rows) {
  const byYear = {};
  for (const r of rows) {
    const y = r.year;
    if (!byYear[y]) byYear[y] = [];
    byYear[y].push(r);
  }
  return byYear;
}

// ── Per-match computation ─────────────────────────────────────────
function compute(year, yrows) {
  // Sort by innings then over
  yrows.sort((a, b) => Number(a.innings) - Number(b.innings) || Number(a.over) - Number(b.over));

  const batFirst  = yrows[0].bat_first;
  const batSecond = yrows[0].bat_second;
  const result    = yrows[0].result;

  // Unified WP series: always bat_first perspective
  // Both columns are filled — bat_first_wp + bat_second_wp = 100
  const wp = yrows.map(r => Number(r.bat_first_wp));
  const N  = wp.length;

  // ── Measure 1: Late-weighted swing ───────────────────────────────
  // Each swing weighted by how late it occurs: weight = i / (N-1)
  // Last swing gets weight 1.0, first gets ~0
  let lateSwing = 0;
  for (let i = 1; i < N; i++) {
    lateSwing += Math.abs(wp[i] - wp[i - 1]) * (i / (N - 1));
  }

  // ── Measure 2: Volatility (std dev of WP series) ─────────────────
  const meanWP   = wp.reduce((s, v) => s + v, 0) / N;
  const variance = wp.reduce((s, v) => s + (v - meanWP) ** 2, 0) / N;
  const volatility = Math.sqrt(variance);

  // ── Bonus metrics (not used in composite but exported for analysis) ─
  const diffs     = wp.slice(1).map((v, i) => Math.abs(v - wp[i]));
  const mac       = diffs.reduce((s, v) => s + v, 0) / diffs.length;
  const areaFrom50 = wp.reduce((s, v) => s + Math.abs(v - 50), 0);
  const leadChanges = wp.slice(1).filter((v, i) =>
    (wp[i] < 50 && v > 50) || (wp[i] > 50 && v < 50)
  ).length;

  // ── Build over-level labels ───────────────────────────────────────
  const labels = yrows.map(r => `Inn${r.innings} Ov${r.over}`);

  return {
    year, batFirst, batSecond, result,
    nOvers: N,
    wp, labels,
    lateSwing, volatility,
    mac, areaFrom50, leadChanges,
    // scores filled in by normaliseAndRank()
    lsScore: 0, vlScore: 0, comp: 0, rank: 0,
  };
}

// ── Normalise both metrics 0–100 and compute composite ────────────
function normaliseAndRank(results) {
  const norm = (vals, higherBetter = true) => {
    const mn = Math.min(...vals), mx = Math.max(...vals);
    const normed = vals.map(v => mx === mn ? 50 : (v - mn) / (mx - mn) * 100);
    return higherBetter ? normed : normed.map(v => 100 - v);
  };

  const lsNorm = norm(results.map(r => r.lateSwing),  true);
  const vlNorm = norm(results.map(r => r.volatility),  true);

  results.forEach((r, i) => {
    r.lsScore = Math.round(lsNorm[i] * 10) / 10;
    r.vlScore = Math.round(vlNorm[i] * 10) / 10;
    r.comp    = Math.round((lsNorm[i] + vlNorm[i]) / 2 * 10) / 10;
  });

  results.sort((a, b) => b.comp - a.comp);
  results.forEach((r, i) => r.rank = i + 1);
  return results;
}

// ── Tier classification ───────────────────────────────────────────
function tier(comp) {
  if (comp >= 50) return { cls: 'classic', label: 'classic' };
  if (comp >= 25) return { cls: 'close',   label: 'close'   };
  return             { cls: 'onesided', label: 'one-sided' };
}
