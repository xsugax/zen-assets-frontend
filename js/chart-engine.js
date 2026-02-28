/* ════════════════════════════════════════════════════════════
   chart-engine.js — Chart Rendering Engine (Chart.js)
   OmniVest AI / ZEN ASSETS
════════════════════════════════════════════════════════════ */

const ChartEngine = (() => {
  'use strict';

  const charts = {};

  // ── Theme Tokens ─────────────────────────────────────────
  const C = {
    gold:   '#d4a574', amber: '#c89858', slate: '#64748b',
    green:  '#5fb38e', red:   '#d65d5d',  teal:  '#4a9ca6',
    bg:     '#151a24', grid:  'rgba(255,255,255,0.03)',
    text:   'rgba(139,152,173,0.6)',
  };

  // ── Global Chart Defaults ────────────────────────────────
  if (typeof Chart !== 'undefined') {
    Chart.defaults.color            = C.text;
    Chart.defaults.borderColor      = C.grid;
    Chart.defaults.font.family      = "'JetBrains Mono', monospace";
    Chart.defaults.font.size        = 11;
    Chart.defaults.plugins.legend.display = false;
  }

  // ── Helpers ──────────────────────────────────────────────
  function destroy(id) {
    if (charts[id]) { try { charts[id].destroy(); } catch(e) {} delete charts[id]; }
  }
  function getCtx(canvasId) {
    const el = document.getElementById(canvasId);
    if (!el) { console.warn('ChartEngine: canvas not found:', canvasId); return null; }
    return el.getContext('2d');
  }
  function goldGrad(ctx, h = 200) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(212,165,116,0.18)');
    g.addColorStop(1, 'rgba(212,165,116,0.01)');
    return g;
  }
  function greenGrad(ctx, h = 200) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(95,179,142,0.18)');
    g.addColorStop(1, 'rgba(95,179,142,0.01)');
    return g;
  }
  function tealGrad(ctx, h = 200) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(74,156,166,0.2)');
    g.addColorStop(1, 'rgba(74,156,166,0.01)');
    return g;
  }

  const baseOpts = () => ({
    responsive: true, maintainAspectRatio: false, animation: { duration: 0 },
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(21,26,36,0.96)', borderColor: 'rgba(212,165,116,0.2)', borderWidth: 1, padding: 10, titleColor: '#c8d6ef', bodyColor: '#8b98ad', titleFont: { size: 12 }, bodyFont: { size: 11 } } },
    scales: {
      x: { grid: { color: C.grid, drawBorder: false }, ticks: { maxRotation: 0, maxTicksLimit: 7 } },
      y: { grid: { color: C.grid, drawBorder: false }, ticks: { maxTicksLimit: 6 }, position: 'right' },
    },
  });

  // ── Main Price Chart ─────────────────────────────────────
  function createMainChart(canvasId, data) {
    destroy(canvasId);
    const ctx = getCtx(canvasId); if (!ctx) return;
    const labels = data.map((_, i) => '');
    const prices = data.map(d => typeof d === 'number' ? d : d.c);

    const grad = goldGrad(ctx, 320);
    const opt  = baseOpts();
    opt.plugins.tooltip.callbacks = {
      title: items => new Date(data[items[0].dataIndex]?.t || Date.now()).toLocaleTimeString(),
      label: items => ` $${items.raw.toLocaleString()}`,
    };

    charts[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{ data: prices, borderColor: C.gold, borderWidth: 1.5, backgroundColor: grad, fill: true, tension: 0.3, pointRadius: 0, pointHoverRadius: 4, pointHoverBackgroundColor: C.gold }],
      },
      options: opt,
    });
    return charts[canvasId];
  }

  // ── Sentiment Gauge (Doughnut) ───────────────────────────
  function createSentimentGauge(canvasId, bullPct) {
    destroy(canvasId);
    const ctx = getCtx(canvasId); if (!ctx) return;
    const bear = 100 - bullPct;
    charts[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [bullPct, bear],
          backgroundColor: [`rgba(0,255,136,0.75)`, `rgba(255,71,87,0.5)`],
          borderColor: [`rgba(0,255,136,0.4)`, `rgba(255,71,87,0.25)`],
          borderWidth: 1,
          hoverOffset: 4,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 600 },
        cutout: '78%',
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: i => ` ${i.raw.toFixed(1)}%` } } },
      },
    });
    return charts[canvasId];
  }

  // ── Allocation Donut ─────────────────────────────────────
  function createAllocationChart(canvasId, allocData) {
    destroy(canvasId);
    const ctx = getCtx(canvasId); if (!ctx) return;
    const COLORS = ['rgba(0,212,255,0.8)', 'rgba(0,255,136,0.75)', 'rgba(139,92,246,0.8)', 'rgba(245,158,11,0.8)', 'rgba(255,71,87,0.7)', 'rgba(236,72,153,0.7)', 'rgba(255,215,0,0.7)'];
    charts[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: allocData.map(a => a.label),
        datasets: [{ data: allocData.map(a => a.pct), backgroundColor: COLORS, borderColor: COLORS.map(c => c.replace('0.8','0.2')), borderWidth: 1, hoverOffset: 6 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 800 },
        cutout: '72%',
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: i => ` ${i.label}: ${i.raw.toFixed(1)}%` } } },
      },
    });
    return charts[canvasId];
  }

  // ── Equity Curve ─────────────────────────────────────────
  function createEquityCurve(canvasId, histData) {
    destroy(canvasId);
    const ctx = getCtx(canvasId); if (!ctx) return;
    const labels = histData.map((_, i) => i % 10 === 0 ? `D${i}` : '');
    const grad = greenGrad(ctx, 180);
    const opt = baseOpts(); opt.scales.y.position = 'right';
    charts[canvasId] = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [{ data: histData, borderColor: C.green, borderWidth: 1.8, backgroundColor: grad, fill: true, tension: 0.35, pointRadius: 0, pointHoverRadius: 4, pointHoverBackgroundColor: C.green }] },
      options: opt,
    });
    return charts[canvasId];
  }

  // ── RSI Chart ────────────────────────────────────────────
  function createRSIChart(canvasId, rsiData) {
    destroy(canvasId);
    const ctx = getCtx(canvasId); if (!ctx) return;
    const labels = rsiData.map((_, i) => '');
    const opt = baseOpts();
    opt.scales.y.min = 0; opt.scales.y.max = 100;
    opt.scales.y.grid.color = (ctx => ctx.tick.value === 70 || ctx.tick.value === 30 ? 'rgba(255,255,255,0.1)' : C.grid);
    charts[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { data: rsiData, borderColor: C.purple, borderWidth: 1.5, fill: false, tension: 0.3, pointRadius: 0 },
          { data: rsiData.map(() => 70), borderColor: 'rgba(255,71,87,0.3)', borderWidth: 1, fill: false, pointRadius: 0, borderDash: [4,4] },
          { data: rsiData.map(() => 30), borderColor: 'rgba(0,255,136,0.3)', borderWidth: 1, fill: false, pointRadius: 0, borderDash: [4,4] },
        ],
      },
      options: opt,
    });
    return charts[canvasId];
  }

  // ── MACD Chart ───────────────────────────────────────────
  function createMACDChart(canvasId, macdLine, signalLine, histData) {
    destroy(canvasId);
    const ctx = getCtx(canvasId); if (!ctx) return;
    const labels = macdLine.map((_, i) => '');
    const BAR_COLORS = histData.map(v => v >= 0 ? 'rgba(0,255,136,0.6)' : 'rgba(255,71,87,0.6)');
    const opt = baseOpts();
    charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { type: 'line', data: macdLine, borderColor: C.cyan,   borderWidth: 1.5, fill: false, tension: 0.2, pointRadius: 0, yAxisID: 'y' },
          { type: 'line', data: signalLine, borderColor: C.orange, borderWidth: 1.2, fill: false, tension: 0.2, pointRadius: 0, yAxisID: 'y' },
          { type: 'bar',  data: histData, backgroundColor: BAR_COLORS, borderWidth: 0, yAxisID: 'y' },
        ],
      },
      options: opt,
    });
    return charts[canvasId];
  }

  // ── Portfolio Risk Radar ─────────────────────────────────
  function createRiskRadar(canvasId, radarData) {
    destroy(canvasId);
    const ctx = getCtx(canvasId); if (!ctx) return;
    charts[canvasId] = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['Volatility', 'Beta', 'Drawdown', 'Liquidity', 'Diversification', 'AI Score'],
        datasets: [{
          data: radarData,
          borderColor: 'rgba(0,212,255,0.8)', borderWidth: 1.5,
          backgroundColor: 'rgba(0,212,255,0.08)',
          pointBackgroundColor: C.cyan, pointRadius: 3,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 800 },
        scales: { r: { min: 0, max: 100, grid: { color: C.grid }, angleLines: { color: C.grid }, pointLabels: { color: C.text, font: { size: 10 } }, ticks: { display: false } } },
        plugins: { legend: { display: false } },
      },
    });
    return charts[canvasId];
  }

  // ── Volume Bar Chart ─────────────────────────────────────
  function createVolumeChart(canvasId, volData) {
    destroy(canvasId);
    const ctx = getCtx(canvasId); if (!ctx) return;
    const COLORS = volData.map(v => v.up ? 'rgba(0,255,136,0.6)' : 'rgba(255,71,87,0.6)');
    const opt = baseOpts();
    charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: volData.map((_, i) => ''),
        datasets: [{ data: volData.map(v => v.vol), backgroundColor: COLORS, borderWidth: 0 }],
      },
      options: opt,
    });
    return charts[canvasId];
  }

  // ── Small Sparkline ──────────────────────────────────────
  function createSparkline(canvasId, data, color = C.cyan, fill = false) {
    destroy(canvasId);
    const ctx = getCtx(canvasId); if (!ctx) return;
    charts[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(() => ''),
        datasets: [{ data, borderColor: color, borderWidth: 1.4, fill, tension: 0.4, pointRadius: 0 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 0 },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false },
          y: { display: false },
        },
      },
    });
    return charts[canvasId];
  }

  // ── Push new data point ──────────────────────────────────
  function pushDataPoint(chartId, point, maxLen = 80) {
    const c = charts[chartId];
    if (!c) return;
    c.data.labels.push('');
    c.data.datasets[0].data.push(point);
    if (c.data.datasets[0].data.length > maxLen) {
      c.data.labels.shift();
      c.data.datasets[0].data.shift();
    }
    c.update('none');
  }

  // ── Correlation Heatmap (Canvas drawn manually) ──────────
  function createCorrelationHeatmap(canvasId, matrix, labels) {
    const canvas = document.getElementById(canvasId); if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const sz  = Math.min(canvas.width, canvas.height) / labels.length;
    labels.forEach((rLbl, r) => {
      labels.forEach((cLbl, c) => {
        const v = matrix[r][c];
        const alpha = Math.abs(v);
        ctx.fillStyle = v > 0 ? `rgba(0,255,136,${alpha*.8})` : `rgba(255,71,87,${alpha*.8})`;
        ctx.fillRect(c * sz, r * sz, sz - 1, sz - 1);
        ctx.fillStyle = '#c8d6ef';
        ctx.font = `bold ${sz * 0.25}px JetBrains Mono`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(v.toFixed(2), c * sz + sz/2, r * sz + sz/2);
      });
    });
  }

  // ── Update existing chart dataset ───────────────────────
  function updateChart(chartId, newData, dsIdx = 0) {
    const c = charts[chartId];
    if (!c) return;
    c.data.datasets[dsIdx].data = newData;
    c.update('none');
  }

  // ── TradingView Candlestick Chart ────────────────────────
  const tvCharts = {};
  const tvSeries = {}; // Store series references for real-time updates
  let tvUpdateIntervals = {}; // Real-time update intervals

  // Timeframe interval mapping (milliseconds)
  const TF_INTERVALS = {
    '1m': 60000, '5m': 300000, '15m': 900000,
    '1h': 3600000, '4h': 14400000, '1d': 86400000,
  };

  // Real-time update frequencies per timeframe (milliseconds)
  const UPDATE_FREQ = {
    '1m': 2000, '5m': 5000, '15m': 10000,
    '1h': 15000, '4h': 30000, '1d': 60000,
  };

  async function createCandlestickChart(containerId, ohlcData, symbol = 'BTC', timeframe = '5m') {
    // Stop existing real-time updates
    if (tvUpdateIntervals[containerId]) {
      clearInterval(tvUpdateIntervals[containerId]);
      delete tvUpdateIntervals[containerId];
    }

    // Remove existing chart
    if (tvCharts[containerId]) {
      try { tvCharts[containerId].remove(); } catch(e) {}
      delete tvCharts[containerId];
      delete tvSeries[containerId];
    }

    const container = document.getElementById(containerId);
    if (!container) { console.warn('Container not found:', containerId); return null; }

    // Always try to get REAL Binance data first
    let realData = null;
    if (typeof RealDataAdapter !== 'undefined' && RealDataAdapter.isRealDataEnabled()) {
      const interval = timeframe || '5m';
      realData = await RealDataAdapter.fetchHistoricalCandles(symbol, interval, 200);
      
      if (realData && realData.length > 0) {
        console.log(`✅ Using REAL Binance data for ${symbol} chart (${realData.length} ${interval} candles)`);
        ohlcData = realData;
      } else {
        console.warn(`⚠️ Could not fetch real data for ${symbol}, using simulated data`);
      }
    }

    // Determine correct interval for timestamp calculation
    const intervalMs = TF_INTERVALS[timeframe] || 300000;

    // Create chart with professional styling
    const chart = LightweightCharts.createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight || 320,
      layout: {
        background: { color: 'transparent' },
        textColor: '#64748b',
        fontSize: 11,
        fontFamily: 'JetBrains Mono, monospace',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(212,165,116,0.15)',
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: 'rgba(212,165,116,0.15)',
        timeVisible: true,
        secondsVisible: timeframe === '1m',
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(212,165,116,0.3)',
          width: 1,
          style: LightweightCharts.LineStyle.Dashed,
        },
        horzLine: {
          color: 'rgba(212,165,116,0.3)',
          width: 1,
          style: LightweightCharts.LineStyle.Dashed,
        },
      },
    });

    // Add candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#5fb38e',
      downColor: '#d65d5d',
      borderUpColor: '#5fb38e',
      borderDownColor: '#d65d5d',
      wickUpColor: '#5fb38e',
      wickDownColor: '#d65d5d',
      borderVisible: true,
      wickVisible: true,
    });

    // Transform data — use real timestamps, fallback uses correct timeframe interval
    const tvData = ohlcData.map((bar, i) => {
      const time = bar.t
        ? Math.floor(bar.t / 1000)
        : Math.floor((Date.now() - (ohlcData.length - 1 - i) * intervalMs) / 1000);
      
      const open = bar.o || bar.open;
      const high = bar.h || bar.high;
      const low = bar.l || bar.low;
      const close = bar.c || bar.close;
      
      const realHigh = Math.max(high || close, open || close, close);
      const realLow = Math.min(low || close, open || close, close);
      
      return { time, open: open || close, high: realHigh, low: realLow, close };
    });

    candleSeries.setData(tvData);

    // Add volume series with real data
    const volumeSeries = chart.addHistogramSeries({
      color: 'rgba(212,165,116,0.15)',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    const volData = ohlcData.map((bar, i) => {
      const time = bar.t
        ? Math.floor(bar.t / 1000)
        : Math.floor((Date.now() - (ohlcData.length - 1 - i) * intervalMs) / 1000);
      const volume = bar.v || bar.volume || 200;
      const isUp = (bar.c || bar.close) >= (bar.o || bar.open);
      return { time, value: volume, color: isUp ? 'rgba(95,179,142,0.3)' : 'rgba(214,93,93,0.3)' };
    });

    volumeSeries.setData(volData);

    // Auto-fit content
    chart.timeScale().fitContent();

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      chart.applyOptions({
        width: container.clientWidth,
        height: container.clientHeight || 320,
      });
    });
    resizeObserver.observe(container);

    // Store references for real-time updates
    tvCharts[containerId] = chart;
    tvSeries[containerId] = { candleSeries, volumeSeries, symbol, timeframe, resizeObserver };

    // Start real-time updates (fetch latest candle periodically)
    startCandlestickUpdates(containerId, symbol, timeframe);

    return chart;
  }

  // ── Real-Time Candlestick Updates (no chart recreation!) ──
  function startCandlestickUpdates(containerId, symbol, timeframe) {
    if (tvUpdateIntervals[containerId]) {
      clearInterval(tvUpdateIntervals[containerId]);
    }

    const freq = UPDATE_FREQ[timeframe] || 5000;
    console.log(`🔄 Chart ${containerId}: real-time updates every ${freq / 1000}s (${timeframe})`);

    tvUpdateIntervals[containerId] = setInterval(async () => {
      const series = tvSeries[containerId];
      if (!series) return;

      // Fetch latest candle from Binance
      if (typeof RealDataAdapter !== 'undefined' && RealDataAdapter.isRealDataEnabled()) {
        const lastCandle = await RealDataAdapter.fetchHistoricalCandles(symbol, timeframe, 2);
        if (lastCandle && lastCandle.length > 0) {
          const bar = lastCandle[lastCandle.length - 1];
          const time = Math.floor(bar.t / 1000);

          series.candleSeries.update({
            time, open: bar.o, high: bar.h, low: bar.l, close: bar.c,
          });
          series.volumeSeries.update({
            time, value: bar.v,
            color: bar.c >= bar.o ? 'rgba(95,179,142,0.3)' : 'rgba(214,93,93,0.3)',
          });
        }
      }
    }, freq);
  }

  // ── Update existing candlestick chart without recreating ──
  function updateCandlestickChart(containerId, bar) {
    const series = tvSeries[containerId];
    if (!series || !bar) return;

    const time = bar.t ? Math.floor(bar.t / 1000) : Math.floor(Date.now() / 1000);
    series.candleSeries.update({
      time,
      open: bar.o || bar.open,
      high: bar.h || bar.high,
      low: bar.l || bar.low,
      close: bar.c || bar.close,
    });
    if (bar.v || bar.volume) {
      const isUp = (bar.c || bar.close) >= (bar.o || bar.open);
      series.volumeSeries.update({
        time, value: bar.v || bar.volume,
        color: isUp ? 'rgba(95,179,142,0.3)' : 'rgba(214,93,93,0.3)',
      });
    }
  }

  return {
    createMainChart, createSentimentGauge, createAllocationChart,
    createEquityCurve, createRSIChart, createMACDChart,
    createRiskRadar, createVolumeChart, createSparkline,
    createCorrelationHeatmap, createCandlestickChart,
    updateCandlestickChart,
    pushDataPoint, updateChart,
    get: id => charts[id],
    destroy,
    destroyAll: () => Object.keys(charts).forEach(k => destroy(k)),
  };
})();
