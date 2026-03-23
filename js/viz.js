// viz.js
// Consumes ranked data from compute.js and renders everything.
// No metric logic here — only DOM, Chart.js, and interactions.

let mainChartInst = null;
let wpChartInst   = null;
let selIdx        = null;
let isDark        = true;
let DATA          = [];

// ── Entry point ───────────────────────────────────────────────────
async function init() {
  DATA = await loadAndCompute();
  renderSummaryMetrics();
  renderMainChart();
  renderRankList();
  showWP(0);
}

// ── Theme ─────────────────────────────────────────────────────────
function toggleTheme() {
  isDark = !isDark;
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  document.getElementById('toggleIcon').textContent  = isDark ? '☀' : '☾';
  document.getElementById('toggleLabel').textContent = isDark ? 'Light mode' : 'Dark mode';
  // Rebuild charts with new palette
  renderMainChart();
  if (selIdx !== null) showWP(selIdx, false);
}

function chartColors() {
  return isDark
    ? { grid: 'rgba(255,255,255,0.05)', tick: '#6b6b72', tooltipBg: '#1e2026',
        tooltipTitle: '#e8e6e0', tooltipBody: '#6b6b72', wpLine: 'rgba(255,255,255,0.15)' }
    : { grid: 'rgba(0,0,0,0.06)',       tick: '#888780', tooltipBg: '#ffffff',
        tooltipTitle: '#1a1a1c',        tooltipBody: '#888780', wpLine: 'rgba(0,0,0,0.15)' };
}

// ── Summary metrics ───────────────────────────────────────────────
function renderSummaryMetrics() {
  const avg = (DATA.reduce((s, d) => s + d.comp, 0) / DATA.length).toFixed(1);
  document.getElementById('summaryMetrics').innerHTML = `
    <div class="metric">
      <div class="val">${DATA[0].year} &middot; ${DATA[0].batFirst} v ${DATA[0].batSecond}</div>
      <div class="lbl">Most dramatic final</div>
    </div>
    <div class="metric">
      <div class="val">${DATA[DATA.length - 1].year} &middot; ${DATA[DATA.length - 1].batFirst} v ${DATA[DATA.length - 1].batSecond}</div>
      <div class="lbl">Most one-sided final</div>
    </div>
    <div class="metric">
      <div class="val">${avg} / 100</div>
      <div class="lbl">Average closeness score</div>
    </div>`;
}

// ── Main horizontal bar chart ─────────────────────────────────────
function renderMainChart() {
  const c = chartColors();
  if (mainChartInst) mainChartInst.destroy();
  mainChartInst = new Chart(document.getElementById('mainChart'), {
    type: 'bar',
    data: {
      labels: DATA.map(d => `${d.year}  ${d.batFirst} v ${d.batSecond}`),
      datasets: [
        {
          label: 'Late swing',
          data: DATA.map(d => d.lsScore),
          backgroundColor: 'rgba(127,119,221,0.75)',
          borderRadius: { topRight: 3, bottomRight: 3, topLeft: 0, bottomLeft: 0 },
          borderSkipped: false,
        },
        {
          label: 'Volatility',
          data: DATA.map(d => d.vlScore),
          backgroundColor: 'rgba(29,158,117,0.75)',
          borderRadius: { topRight: 3, bottomRight: 3, topLeft: 0, bottomLeft: 0 },
          borderSkipped: false,
        },
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: c.tooltipBg,
          borderColor: 'rgba(127,119,221,0.3)',
          borderWidth: 1,
          titleColor: c.tooltipTitle,
          bodyColor: c.tooltipBody,
          titleFont: { family: "'Syne', sans-serif", weight: '700', size: 13 },
          bodyFont: { family: "'DM Mono', monospace", size: 12 },
          padding: 12,
          callbacks: {
            title: items => `${DATA[items[0].dataIndex].year} · ${DATA[items[0].dataIndex].batFirst} v ${DATA[items[0].dataIndex].batSecond}`,
            label: ctx => `  ${ctx.dataset.label}: ${ctx.raw.toFixed(1)}`,
            afterBody: items => [`  Composite: ${DATA[items[0].dataIndex].comp.toFixed(1)}`],
          }
        }
      },
      scales: {
        x: {
          max: 115,
          ticks: { color: c.tick, font: { family: "'DM Mono', monospace", size: 11 } },
          grid: { color: c.grid },
          border: { color: c.grid },
        },
        y: {
          ticks: { color: c.tick, font: { family: "'DM Mono', monospace", size: 11 } },
          grid: { display: false },
          border: { display: false },
        }
      },
      onClick: (evt, els) => { if (els.length) showWP(els[0].index); }
    }
  });
}

// ── Ranked list ───────────────────────────────────────────────────
function renderRankList() {
  const list = document.getElementById('rankList');
  list.innerHTML = '';
  DATA.forEach((d, i) => {
    const t = tier(d.comp);
    list.innerHTML += `
      <div class="rank-row" id="row-${i}" onclick="showWP(${i})">
        <div class="rk">${i + 1}</div>
        <div>
          <div class="match-name">
            ${d.year} &middot; ${d.batFirst} v ${d.batSecond}
            <span class="tier-badge tier-${t.cls}">${t.label}</span>
          </div>
          <div class="match-result">${d.result}</div>
        </div>
        <div class="bar-group">
          <div class="bar-row">
            <div class="bar-lbl" style="color:#7F77DD">LS</div>
            <div class="bar-track"><div class="bar-fill" style="width:${d.lsScore.toFixed(0)}%;background:#7F77DD"></div></div>
            <div class="bar-num" style="color:#7F77DD">${d.lsScore.toFixed(0)}</div>
          </div>
          <div class="bar-row">
            <div class="bar-lbl" style="color:#1D9E75">VL</div>
            <div class="bar-track"><div class="bar-fill" style="width:${d.vlScore.toFixed(0)}%;background:#1D9E75"></div></div>
            <div class="bar-num" style="color:#1D9E75">${d.vlScore.toFixed(0)}</div>
          </div>
        </div>
        <div class="comp-score">${d.comp.toFixed(1)}</div>
      </div>`;
  });
}

// ── WP curve ──────────────────────────────────────────────────────
function showWP(i, scroll = true) {
  if (selIdx !== null) {
    const prev = document.getElementById('row-' + selIdx);
    if (prev) prev.classList.remove('selected');
  }
  selIdx = i;
  const row = document.getElementById('row-' + i);
  if (row) {
    row.classList.add('selected');
    if (scroll) row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  const d = DATA[i];
  const N = d.wp.length;
  const c = chartColors();

  document.getElementById('wpTitle').textContent   = `${d.year} · ${d.batFirst} v ${d.batSecond}`;
  document.getElementById('wpSub').textContent     = d.result;
  document.getElementById('wpScoreRow').innerHTML  = `
    <div class="wp-score-chip">Late swing <span style="color:#7F77DD">${d.lsScore.toFixed(1)}</span></div>
    <div class="wp-score-chip">Volatility <span style="color:#1D9E75">${d.vlScore.toFixed(1)}</span></div>
    <div class="wp-score-chip">Composite  <span>${d.comp.toFixed(1)}</span></div>`;

  // Red dots on swings > 15pp
  const ptColors = d.wp.map((v, idx) =>
    (idx > 0 && Math.abs(d.wp[idx] - d.wp[idx - 1]) > 15) || idx === 0 || idx === N - 1
      ? '#E24B4A' : 'rgba(0,0,0,0)'
  );
  const ptSizes = ptColors.map(c => c === 'rgba(0,0,0,0)' ? 0 : 5);

  document.getElementById('wpPanel').style.display = 'block';
  if (wpChartInst) wpChartInst.destroy();

  wpChartInst = new Chart(document.getElementById('wpChart'), {
    type: 'line',
    data: {
      labels: d.labels,
      datasets: [
        {
          data: d.wp,
          borderColor: '#7F77DD',
          borderWidth: 2,
          pointBackgroundColor: ptColors,
          pointBorderColor: ptColors,
          pointRadius: ptSizes,
          pointHoverRadius: 5,
          tension: 0.3,
          fill: false,
        },
        {
          data: Array(N).fill(50),
          borderColor: c.wpLine,
          borderWidth: 1,
          borderDash: [4, 4],
          pointRadius: 0,
          fill: false,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: c.tooltipBg,
          borderColor: 'rgba(127,119,221,0.3)',
          borderWidth: 1,
          titleColor: c.tooltipBody,
          bodyColor: c.tooltipTitle,
          titleFont: { family: "'DM Mono', monospace", size: 11 },
          bodyFont: { family: "'Syne', sans-serif", weight: '700', size: 13 },
          padding: 10,
          filter: item => item.datasetIndex === 0,
          callbacks: {
            label: ctx => `${d.batFirst} WP: ${ctx.raw.toFixed(1)}%`
          }
        }
      },
      scales: {
        x: {
          ticks: { autoSkip: true, maxTicksLimit: 10, color: c.tick, font: { family: "'DM Mono', monospace", size: 10 } },
          grid: { color: c.grid },
          border: { color: c.grid },
        },
        y: {
          min: 0, max: 100,
          ticks: { callback: v => v + '%', color: c.tick, font: { family: "'DM Mono', monospace", size: 10 } },
          grid: { color: c.grid },
          border: { color: c.grid },
        }
      }
    }
  });
}
