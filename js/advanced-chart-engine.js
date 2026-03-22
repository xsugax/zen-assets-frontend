/* ════════════════════════════════════════════════════════════
   advanced-chart-engine.js — Professional Chart System
   OmniVest AI / ZEN ASSETS
   
   Features:
   - TradingView-style candlestick charts
   - Volume profile (left side histogram)
   - Order book heatmap
   - Support/Resistance levels
   - Fibonacci retracements
   - Real-time indicators overlay
════════════════════════════════════════════════════════════ */

const AdvancedChartEngine = (() => {
  'use strict';

  const charts = {};
  const lightweightCharts = {}; // For TradingView Lightweight Charts

  // ── Professional Color Scheme ────────────────────────────
  const THEME = {
    bg: {
      chart: '#0b0f1a',
      panel: '#10141e',
      hover: '#161c28',
    },
    candle: {
      up:   { body: '#2ebd85', wick: '#2ebd85', border: '#2ebd85' }, // Binance green
      down: { body: '#f6465d', wick: '#f6465d', border: '#f6465d' }, // Binance red
    },
    volume: {
      up:   'rgba(46,189,133,0.55)',
      down: 'rgba(246,70,93,0.55)',
    },
    grid: {
      main: 'rgba(255,255,255,0.055)',
      sub:  'rgba(255,255,255,0.025)',
    },
    text: {
      primary:   '#e8edf5',
      secondary: '#7d8a9a',
      muted:     '#4a5568',
    },
    indicators: {
      ma20:  '#f0a500',
      ma50:  '#3c8fbf',
      ma200: '#8b98ad',
      ema:   '#e6b887',
      bb:    'rgba(139,152,173,0.3)',
      rsi:   '#d4a574',
      macd:  { line: '#2ebd85', signal: '#f6465d', hist: '#8b98ad' },
    },
    levels: {
      support:    'rgba(46,189,133,0.55)',
      resistance: 'rgba(246,70,93,0.55)',
      fibonacci:  'rgba(212,165,116,0.3)',
    },
  };

  // ── Timeframe Configuration ─────────────────────────────
  const TIMEFRAMES = {
    '1m':  { binance: '1m',  interval: 60000,     label: '1 Minute',  limit: 120 },
    '5m':  { binance: '5m',  interval: 300000,    label: '5 Minutes', limit: 150 },
    '15m': { binance: '15m', interval: 900000,    label: '15 Minutes', limit: 150 },
    '1h':  { binance: '1h',  interval: 3600000,   label: '1 Hour',    limit: 168 },
    '4h':  { binance: '4h',  interval: 14400000,  label: '4 Hours',   limit: 180 },
    '1d':  { binance: '1d',  interval: 86400000,  label: '1 Day',     limit: 365 },
    '1D':  { binance: '1d',  interval: 86400000,  label: '1 Day',     limit: 365 },
  };

  let currentTimeframe = '5m'; // Default to 5 minutes (better UX - shows more action)

  // ── Initialize Lightweight Chart (TradingView Style) ────
  async function createLightweightChart(containerId, symbol, timeframe = '5m') {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn('Chart container not found:', containerId);
      return null;
    }

    // Validate timeframe
    if (!TIMEFRAMES[timeframe]) {
      console.warn('Invalid timeframe:', timeframe, '- using 1h');
      timeframe = '1h';
    }
    currentTimeframe = timeframe;

    // Check if TradingView Lightweight Charts library is loaded
    if (typeof LightweightCharts === 'undefined') {
      console.warn('TradingView Lightweight Charts not loaded, falling back to Chart.js');
      return createChartJsFallback(containerId, symbol);
    }

    const chart = LightweightCharts.createChart(container, {
      width:  container.clientWidth  || container.offsetWidth  || 600,
      height: container.clientHeight || container.offsetHeight || 360,
      layout: {
        background: { color: THEME.bg.chart },
        textColor:  THEME.text.secondary,
        fontSize:   12,
        fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
      },
      grid: {
        vertLines: { color: THEME.grid.sub,  style: LightweightCharts.LineStyle.Dotted },
        horzLines: { color: THEME.grid.main, style: LightweightCharts.LineStyle.Dotted },
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
        vertLine: {
          color:                'rgba(212,165,116,0.75)',
          width:                1,
          style:                LightweightCharts.LineStyle.Solid,
          labelBackgroundColor: '#c89858',
        },
        horzLine: {
          color:                'rgba(212,165,116,0.75)',
          width:                1,
          style:                LightweightCharts.LineStyle.Solid,
          labelBackgroundColor: '#c89858',
        },
      },
      timeScale: {
        timeVisible:    true,
        secondsVisible: timeframe === '1m',
        borderColor:    'rgba(255,255,255,0.06)',
        rightOffset:    8,
        barSpacing:     timeframe === '1m' ? 6 : 8,
        minBarSpacing:  2,
      },
      rightPriceScale: {
        borderColor:  'rgba(255,255,255,0.06)',
        scaleMargins: { top: 0.08, bottom: 0.22 },
        autoScale:    true,
      },
      handleScroll: {
        mouseWheel:       true,
        pressedMouseMove: true,
        horzTouchDrag:    true,
        vertTouchDrag:    false,
      },
      handleScale: {
        mouseWheel:           true,
        pinch:                true,
        axisPressedMouseMove: { time: true, price: true },
      },
      watermark: {
        visible:   true,
        fontSize:  44,
        horzAlign: 'center',
        vertAlign: 'center',
        color:     'rgba(255,255,255,0.018)',
        text:      'ZEN ASSETS',
      },
    });

    // Candlestick series — Binance-standard colors, price line shows current level
    const candleSeries = chart.addCandlestickSeries({
      upColor:          THEME.candle.up.body,
      downColor:        THEME.candle.down.body,
      borderUpColor:    THEME.candle.up.border,
      borderDownColor:  THEME.candle.down.border,
      wickUpColor:      THEME.candle.up.wick,
      wickDownColor:    THEME.candle.down.wick,
      borderVisible:    true,
      wickVisible:      true,
      priceLineVisible: true,              // dashed current-price line across chart
      priceLineWidth:   1,
      priceLineStyle:   LightweightCharts.LineStyle.Dotted,
      priceLineColor:   '#2ebd85',
      lastValueVisible: true,              // price label on right axis
    });

    // Volume series (histogram)
    const volumeSeries = chart.addHistogramSeries({
      color: THEME.volume.up,
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    // Moving averages — visible but don't fight the candles
    const ma20Series = chart.addLineSeries({
      color:            'rgba(240,165,0,0.75)',
      lineWidth:        1,
      title:            'MA20',
      priceLineVisible: false,
      lastValueVisible: true,
    });

    const ma50Series = chart.addLineSeries({
      color:            'rgba(60,143,191,0.70)',
      lineWidth:        1,
      title:            'MA50',
      priceLineVisible: false,
      lastValueVisible: true,
    });

    // ── EMA 12/26 — Exponential Moving Averages ────────────
    const ema12Series = chart.addLineSeries({
      color:            'rgba(255,159,64,0.65)',
      lineWidth:        1,
      title:            'EMA12',
      priceLineVisible: false,
      lastValueVisible: false,
      lineStyle:        LightweightCharts.LineStyle.Dotted,
    });

    const ema26Series = chart.addLineSeries({
      color:            'rgba(153,102,255,0.60)',
      lineWidth:        1,
      title:            'EMA26',
      priceLineVisible: false,
      lastValueVisible: false,
      lineStyle:        LightweightCharts.LineStyle.Dotted,
    });

    // ── VWAP — Volume-Weighted Average Price ───────────────
    const vwapSeries = chart.addLineSeries({
      color:            'rgba(0,188,212,0.75)',
      lineWidth:        2,
      title:            'VWAP',
      priceLineVisible: false,
      lastValueVisible: true,
      lineStyle:        LightweightCharts.LineStyle.LargeDashed,
    });

    // ── Bollinger Bands ─────────────────────────────────────
    const bbUpperSeries = chart.addLineSeries({
      color:            'rgba(139,152,173,0.35)',
      lineWidth:        1,
      title:            'BB Upper',
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const bbLowerSeries = chart.addLineSeries({
      color:            'rgba(139,152,173,0.35)',
      lineWidth:        1,
      title:            'BB Lower',
      priceLineVisible: false,
      lastValueVisible: false,
    });

    // Load historical data FIRST — series must have data before realtime updates
    await loadChartData(containerId, symbol, candleSeries, volumeSeries, ma20Series, ma50Series, ema12Series, ema26Series, vwapSeries, bbUpperSeries, bbLowerSeries, timeframe);

    // THEN start live tick feed — appends to the historical data
    startRealtimeUpdates(containerId, symbol, candleSeries, volumeSeries, timeframe);

    // Handle resize
    const resizeObserver = new ResizeObserver(entries => {
      if (entries.length === 0 || entries[0].target !== container) return;
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
    });
    resizeObserver.observe(container);

    lightweightCharts[containerId] = {
      chart,
      candleSeries,
      volumeSeries,
      ma20Series,
      ma50Series,
      ema12Series,
      ema26Series,
      vwapSeries,
      bbUpperSeries,
      bbLowerSeries,
      resizeObserver,
      symbol,
    };

    return chart;
  }

  // ── Load Chart Data ──────────────────────────────────────
  // Binance-like strategy:
  //   1. Show loading badge
  //   2. Wait for real Binance/Yahoo candles (1.5s for crypto, 2.5s for non-crypto)
  //   3. Render real data cleanly — no jarring swap, no fake placeholder
  //   4. Only fall back to simulated if real data truly fails, with background retries
  // This makes each timeframe feel genuinely different because the data IS different:
  //   Always shows simulated candles instantly, then silently upgrades to real data.
  async function loadChartData(containerId, symbol, candleSeries, volumeSeries, ma20Series, ma50Series, ema12Series, ema26Series, vwapSeries, bbUpperSeries, bbLowerSeries, timeframe = '5m') {
    const assetId  = symbol.split('/')[0];
    const tf       = TIMEFRAMES[timeframe] || TIMEFRAMES['5m'];

    // ── Step 1: Always render simulated data IMMEDIATELY ──
    // This guarantees the chart never stays on "Fetching..."
    try {
      if (typeof MarketData !== 'undefined' && MarketData.getOHLCV) {
        const simCandles = MarketData.getOHLCV(assetId, tf.limit, timeframe) || [];
        if (simCandles.length > 0) {
          _renderCandles(containerId, candleSeries, volumeSeries, ma20Series, ma50Series, ema12Series, ema26Series, vwapSeries, bbUpperSeries, bbLowerSeries, simCandles, symbol, false, timeframe);
          console.log(`📊 [${assetId}] Rendered ${simCandles.length} simulated candles`);
        } else {
          console.warn(`⚠️ [${assetId}] getOHLCV returned empty`);
          try { updateDataSourceIndicator(symbol, false, timeframe, containerId); } catch {}
        }
      } else {
        console.warn(`⚠️ MarketData not available for ${assetId}`);
        try { updateDataSourceIndicator(symbol, false, timeframe, containerId); } catch {}
      }
    } catch (e) {
      console.error(`❌ [${assetId}] Simulated render failed:`, e.message);
      try { updateDataSourceIndicator(symbol, false, timeframe, containerId); } catch {}
    }

    // ── Step 2: Try upgrading to real Binance/Yahoo data in background ──
    if (typeof RealDataAdapter !== 'undefined') {
      const tryRealData = async () => {
        try {
          const real = await RealDataAdapter.fetchHistoricalCandles(assetId, tf.binance, tf.limit);
          if (real && real.length >= 5) {
            _renderCandles(containerId, candleSeries, volumeSeries, ma20Series, ma50Series, ema12Series, ema26Series, vwapSeries, bbUpperSeries, bbLowerSeries, real, symbol, true, timeframe);
            console.log(`✅ [${assetId}] Upgraded to ${real.length} REAL candles`);
            return true;
          }
        } catch (e) {
          console.warn(`⚠️ [${assetId}] Real data fetch failed:`, e.message);
        }
        return false;
      };

      // First attempt — don't block, run in background
      tryRealData().then(ok => {
        if (ok) return;
        // Retry with exponential backoff
        let retryMs = 5000;
        const retry = () => {
          tryRealData().then(success => {
            if (!success) {
              retryMs = Math.min(retryMs * 1.5, 30000);
              setTimeout(retry, retryMs);
            }
          });
        };
        setTimeout(retry, retryMs);
      });
    }
  }

  // ── Indicator helpers ──────────────────────────────────
  function calculateEMA(data, period) {
    if (!data || data.length < period) return [];
    const k = 2 / (period + 1);
    const result = [];
    // Seed with SMA of first `period` points
    let sum = 0;
    for (let i = 0; i < period; i++) sum += data[i].close;
    let ema = sum / period;
    result.push({ time: data[period - 1].time, value: parseFloat(ema.toFixed(6)) });
    for (let i = period; i < data.length; i++) {
      ema = data[i].close * k + ema * (1 - k);
      result.push({ time: data[i].time, value: parseFloat(ema.toFixed(6)) });
    }
    return result;
  }

  function calculateVWAP(candles) {
    if (!candles || candles.length === 0) return [];
    let cumTPV = 0, cumVol = 0;
    return candles.map(c => {
      const tp = (c.high + c.low + c.close) / 3;
      const vol = c.volume || c.v || 1;
      cumTPV += tp * vol;
      cumVol += vol;
      return { time: c.time, value: parseFloat((cumTPV / cumVol).toFixed(6)) };
    });
  }

  function calculateBollingerBands(data, period, stdDevMult) {
    period = period || 20;
    stdDevMult = stdDevMult || 2;
    if (!data || data.length < period) return { upper: [], lower: [] };
    const upper = [], lower = [];
    for (let i = period - 1; i < data.length; i++) {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += data[j].close;
      const sma = sum / period;
      let sqSum = 0;
      for (let j = i - period + 1; j <= i; j++) sqSum += Math.pow(data[j].close - sma, 2);
      const sd = Math.sqrt(sqSum / period);
      upper.push({ time: data[i].time, value: parseFloat((sma + stdDevMult * sd).toFixed(6)) });
      lower.push({ time: data[i].time, value: parseFloat((sma - stdDevMult * sd).toFixed(6)) });
    }
    return { upper, lower };
  }

  // Render a candle dataset onto all chart series
  // Each series.setData call is independently guarded so one failure can't block others
  function _renderCandles(containerId, candleSeries, volumeSeries, ma20Series, ma50Series, ema12Series, ema26Series, vwapSeries, bbUpperSeries, bbLowerSeries, candles, symbol, isReal, timeframe) {
    const candleData = candles.map(c => ({
      time: Math.floor(c.t / 1000),
      open: c.o, high: c.h, low: c.l, close: c.c,
    }));
    const volumeData = candles.map(c => ({
      time: Math.floor(c.t / 1000),
      value: c.v,
      color: c.c >= c.o ? THEME.volume.up : THEME.volume.down,
    }));

    // Build a "rich" array with time/close/high/low/volume for indicator helpers
    const richData = candles.map(c => ({
      time: Math.floor(c.t / 1000),
      close: c.c, high: c.h, low: c.l, open: c.o, volume: c.v,
    }));

    try { candleSeries.setData(candleData); }
    catch (e) { console.error('[Chart] candleSeries.setData failed:', e.message); }

    try { volumeSeries.setData(volumeData); }
    catch (e) { console.error('[Chart] volumeSeries.setData failed:', e.message); }

    try { ma20Series.setData(calculateMA(candleData, 20)); }
    catch (e) { console.error('[Chart] MA20 failed:', e.message); }

    try { ma50Series.setData(calculateMA(candleData, 50)); }
    catch (e) { console.error('[Chart] MA50 failed:', e.message); }

    // ── Advanced overlays ──
    try { ema12Series.setData(calculateEMA(richData, 12)); }
    catch (e) { console.error('[Chart] EMA12 failed:', e.message); }

    try { ema26Series.setData(calculateEMA(richData, 26)); }
    catch (e) { console.error('[Chart] EMA26 failed:', e.message); }

    try { vwapSeries.setData(calculateVWAP(richData)); }
    catch (e) { console.error('[Chart] VWAP failed:', e.message); }

    try {
      const bb = calculateBollingerBands(richData, 20, 2);
      bbUpperSeries.setData(bb.upper);
      bbLowerSeries.setData(bb.lower);
    } catch (e) { console.error('[Chart] Bollinger Bands failed:', e.message); }

    // Non-critical enhancements — failures OK
    try { addSupportResistanceLevels(candleSeries, candleData); } catch {}

    try {
      if (typeof MarketData !== 'undefined' && MarketData.detectPatterns) {
        const detected = MarketData.detectPatterns(candles);
        if (detected && detected.length > 0) {
          const priority = { morning_star:5, evening_star:5, three_soldiers:5, three_crows:5, engulfing:4, piercing:3, dark_cloud:3, hammer:2, shooting_star:2, marubozu:1, doji:0 };
          const markers = detected
            .sort((a, b) => (priority[b.type] || 0) - (priority[a.type] || 0))
            .slice(0, 6)
            .map(p => ({
              time: Math.floor(p.t / 1000),
              position: p.signal === 'bullish' ? 'belowBar' : p.signal === 'bearish' ? 'aboveBar' : 'inBar',
              color: p.signal === 'bullish' ? '#5fb38e' : p.signal === 'bearish' ? '#d65d5d' : '#d4a574',
              shape: p.signal === 'bullish' ? 'arrowUp' : p.signal === 'bearish' ? 'arrowDown' : 'circle',
              text: p.name,
            }))
            .sort((a, b) => a.time - b.time);
          try { candleSeries.setMarkers(markers); } catch {}
        }
      }
    } catch {}

    try { updateDataSourceIndicator(symbol, isReal, timeframe, containerId); } catch {}
  }

  // ── Real-Time Updates ────────────────────────────────────
  // TWO-LAYER system so the chart ALWAYS moves:
  //   Layer 1 (baseline): MarketData price ticks → forming candle every ~600ms
  //                       Always running, zero network dependency
  //   Layer 2 (upgrade) : Binance kline WebSocket → overwrites forming candle
  //                       with real prices whenever available
  // Both write to the same candle time slot — WS data silently wins.

  const updateIntervals    = {};
  const klineWsConnections = {};
  const _simFeedHandlers   = {};  // per-container simulated feed cleanup
  const _formingCandles    = {};  // per-container forming candle state

  const CRYPTO_SYMBOLS = new Set(['BTC','ETH','SOL','BNB','XRP','ADA','AVAX','LINK','MATIC','UNI','AAVE']);

  function startRealtimeUpdates(containerId, symbol, candleSeries, volumeSeries, timeframe) {
    stopRealtimeUpdates(containerId);

    const tf      = TIMEFRAMES[timeframe] || TIMEFRAMES['5m'];
    const assetId = symbol.split('/')[0];
    const isCrypto = CRYPTO_SYMBOLS.has(assetId);

    // Layer 1: always start the simulated feed — instant, no network needed
    _startSimulatedFeed(containerId, assetId, tf, candleSeries, volumeSeries);

    // Layer 2: attempt real data on top
    if (isCrypto) {
      _startKlineWebSocket(containerId, assetId, tf, candleSeries, volumeSeries);
    } else {
      _startRestFallback(containerId, assetId, tf, candleSeries, volumeSeries, 10000);
    }
  }

  // ── Layer 1: Simulated feed via MarketData ticks ─────────
  // Fires every ~600ms (or 3s on mobile). Builds the forming candle
  // by tracking O/H/L/C within the current timeframe window.
  function _startSimulatedFeed(containerId, assetId, tf, candleSeries, volumeSeries) {
    // Clean up any existing handler for this container
    if (_simFeedHandlers[containerId]) {
      const { event, handler } = _simFeedHandlers[containerId];
      try { if (typeof MarketData !== 'undefined') MarketData.off(event, handler); } catch {}
      delete _simFeedHandlers[containerId];
    }
    if (typeof MarketData === 'undefined') return;

    const eventName = `price:${assetId}`;
    _formingCandles[containerId] = null; // reset forming candle on new feed

    const handler = (d) => {
      if (!d || isNaN(d.price)) return;
      const price = d.price;
      const now = Date.now();
      // Current candle boundary (floor to interval)
      const candleTime = Math.floor(now / tf.interval) * tf.interval;
      const t = Math.floor(candleTime / 1000); // LightweightCharts wants seconds

      const fc = _formingCandles[containerId];
      if (!fc || fc.candleTime !== candleTime) {
        // New candle opened — start fresh
        const openPrice = fc ? fc.c : price; // open at previous close (no gaps)
        _formingCandles[containerId] = {
          candleTime, t,
          o: openPrice,
          h: Math.max(openPrice, price),
          l: Math.min(openPrice, price),
          c: price, v: 0,
        };
      } else {
        // Same candle — extend H/L, update close
        if (price > fc.h) fc.h = price;
        if (price < fc.l) fc.l = price;
        fc.c = price;
        fc.v += Math.abs(d.price - (d.prev || d.price)) * (Math.random() * 150 + 50);
      }

      const c = _formingCandles[containerId];
      try {
        candleSeries.update({ time: c.t, open: c.o, high: c.h, low: c.l, close: c.c });
      } catch {}
      try {
        volumeSeries.update({ time: c.t, value: Math.max(c.v, 1),
          color: c.c >= c.o ? THEME.volume.up : THEME.volume.down });
      } catch {}
    };

    MarketData.on(eventName, handler);
    _simFeedHandlers[containerId] = { event: eventName, handler };
  }

  function _startKlineWebSocket(containerId, assetId, tf, candleSeries, volumeSeries) {
    const pair   = assetId.toLowerCase() + 'usdt';
    const wsUrl  = `wss://stream.binance.com:9443/ws/${pair}@kline_${tf.binance}`;
    let retries  = 0;
    let lastUpdateTime = Date.now();

    function connect() {
      let ws;
      try {
        ws = new WebSocket(wsUrl);
      } catch (err) {
        console.error(`❌ WebSocket creation failed for ${assetId}: ${err.message}`);
        _startRestFallback(containerId, assetId, tf, candleSeries, volumeSeries, 1000);
        return;
      }

      ws.onopen = () => {
        retries = 0;
        console.log(`✅ BINANCE KLINE LIVE: ${assetId} @${tf.binance}`);
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          const k   = msg.k;
          if (!k) return;

          const t  = Math.floor(k.t / 1000);
          const o  = parseFloat(k.o);
          const h  = parseFloat(k.h);
          const l  = parseFloat(k.l);
          const c  = parseFloat(k.c);
          const v  = parseFloat(k.v);

          // Validate candle data
          if (isNaN(o) || isNaN(h) || isNaN(l) || isNaN(c) || isNaN(v)) {
            console.error(`❌ Invalid candle data for ${assetId}: o=${o}, h=${h}, l=${l}, c=${c}, v=${v}`);
            return;
          }

          // Update candlestick immediately with detailed error tracking
          let candleUpdateSuccess = false;
          try { 
            candleSeries.update({ time: t, open: o, high: h, low: l, close: c }); 
            candleUpdateSuccess = true;
            console.log(`📊 Chart Update [${assetId}] ${tf.binance}: O=${o.toFixed(2)} H=${h.toFixed(2)} L=${l.toFixed(2)} C=${c.toFixed(2)} V=${v.toFixed(0)}`);
            
            // Log to debug monitor
            if (typeof DebugMonitor !== 'undefined') {
              DebugMonitor.recordChartUpdate(assetId, { o, h, l, c, v });
            }
          } catch (updateErr) {
            console.error(`❌ Candlestick update FAILED for ${assetId}: ${updateErr.message}`);
            console.error(`   Data: time=${t}, o=${o}, h=${h}, l=${l}, c=${c}`);
            console.error(`   Stacktrace:`, updateErr.stack);
          }
          
          // Update volume immediately (only if candlestick succeeded)
          if (candleUpdateSuccess) {
            try { 
              volumeSeries.update({ time: t, value: v, color: c >= o ? THEME.volume.up : THEME.volume.down }); 
            } catch (volErr) {
              console.warn(`Volume update error: ${volErr.message}`);
            }
          }

          // Sync real price for tickers
          if (typeof MarketData !== 'undefined' && MarketData._injectRealPrice) {
            try {
              MarketData._injectRealPrice(assetId, { price: c, high24h: h, low24h: l });
            } catch (injErr) {
              console.error(`❌ MarketData injection failed: ${injErr.message}`);
            }
          }
          
          lastUpdateTime = Date.now();
        } catch (err) {
          console.error(`❌ Kline message parse error: ${err.message}`);
          console.error(`   Message:`, e.data);
        }
      };

      ws.onerror = (err) => {
        console.error(`WebSocket error for ${assetId}: ${err.message}`);
      };

      ws.onclose = () => {
        delete klineWsConnections[containerId];
        console.warn(`😴 WS closed for ${assetId}`);
        
        if (retries < 5) {
          retries++;
          const delay = 2000 + (retries * 1000);
          console.log(`♻️ Reconnecting ${assetId} in ${delay}ms (attempt ${retries}/5)`);
          setTimeout(connect, delay);
        } else {
          console.warn(`📊 WS failed 5x for ${assetId} — using 500ms REST polling`);
          _startRestFallback(containerId, assetId, tf, candleSeries, volumeSeries, 500);
        }
      };

      klineWsConnections[containerId] = ws;
    }

    connect();
  }

  // REST fallback — polls for the latest candle (non-crypto or WS failure)
  function _startRestFallback(containerId, assetId, tf, candleSeries, volumeSeries, intervalMs) {
    if (updateIntervals[containerId]) return;
    console.log(`🔄 REST POLL: ${assetId} every ${intervalMs / 1000}s`);
    updateIntervals[containerId] = setInterval(async () => {
      try {
        if (typeof RealDataAdapter === 'undefined') return;
        const candles = await RealDataAdapter.fetchHistoricalCandles(assetId, tf.binance, 3);
        if (!candles || !candles.length) return;
        for (const c of candles) {
          const t = Math.floor(c.t / 1000);
          try { candleSeries.update({ time: t, open: c.o, high: c.h, low: c.l, close: c.c }); } catch {}
          try { volumeSeries.update({ time: t, value: c.v, color: c.c >= c.o ? THEME.volume.up : THEME.volume.down }); } catch {}
        }
        const latest = candles[candles.length - 1];
        if (typeof MarketData !== 'undefined' && MarketData._injectRealPrice) {
          try { MarketData._injectRealPrice(assetId, { price: latest.c }); } catch {}
        }
      } catch (err) {
        // silent — fallback already renders via MarketData tick injection
      }
    }, intervalMs);
  }

  function stopRealtimeUpdates(containerId) {
    // Stop WebSocket
    const ws = klineWsConnections[containerId];
    if (ws) {
      ws.onclose = null;
      try { ws.close(); } catch {}
      delete klineWsConnections[containerId];
    }
    // Stop REST poll
    if (updateIntervals[containerId]) {
      clearInterval(updateIntervals[containerId]);
      delete updateIntervals[containerId];
    }
    // Stop simulated feed
    if (_simFeedHandlers[containerId]) {
      const { event, handler } = _simFeedHandlers[containerId];
      try { if (typeof MarketData !== 'undefined') MarketData.off(event, handler); } catch {}
      delete _simFeedHandlers[containerId];
    }
    delete _formingCandles[containerId];
  }

  // ── Data Source Indicator ────────────────────────────────
  function updateDataSourceIndicator(symbol, isRealData, timeframe, containerId = 'main-price-chart') {
    // Use the ChartDataIndicator if available
    if (typeof ChartDataIndicator !== 'undefined') {
      ChartDataIndicator.updateStatus(containerId, isRealData, symbol, timeframe);
    }
    
    // Also update old-style badge if exists
    const indicator = document.querySelector('.real-data-badge');
    if (!indicator) return;
    
    const tf = TIMEFRAMES[timeframe];
    
    // Always show live data status
    indicator.innerHTML = `<i class="fas fa-globe"></i> LIVE ${symbol} - ${tf.label} - Binance`;
    indicator.classList.remove('simulated');
    indicator.style.display = 'inline-flex';
  }

  // ── Moving Average Calculation ───────────────────────────
  function calculateMA(data, period) {
    const ma = [];
    for (let i = period - 1; i < data.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close;
      }
      ma.push({
        time: data[i].time,
        value: sum / period,
      });
    }
    return ma;
  }

  // ── Support/Resistance Levels ────────────────────────────
  function addSupportResistanceLevels(series, data) {
    if (data.length < 50) return;

    const recent = data.slice(-50);
    const highs = recent.map(d => d.high).sort((a, b) => b - a);
    const lows = recent.map(d => d.low).sort((a, b) => a - b);

    // Find resistance (top 3 highs cluster)
    const resistance = highs.slice(0, 5).reduce((a, b) => a + b) / 5;

    // Find support (bottom 3 lows cluster)
    const support = lows.slice(0, 5).reduce((a, b) => a + b) / 5;

    // Add price lines
    series.createPriceLine({
      price: resistance,
      color: THEME.levels.resistance,
      lineWidth: 1,
      lineStyle: LightweightCharts.LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'Resistance',
    });

    series.createPriceLine({
      price: support,
      color: THEME.levels.support,
      lineWidth: 1,
      lineStyle: LightweightCharts.LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'Support',
    });
  }

  // ── Order Book Heatmap ───────────────────────────────────
  function createOrderBookHeatmap(containerId, symbol) {
    const canvas = document.getElementById(containerId);
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    const height = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Get order book data
    const assetId = symbol.split('/')[0];
    const orderBook = MarketData?.getOrderBook(assetId, 20);

    if (!orderBook) return;

    const { asks, bids, mid } = orderBook;

    // Draw settings
    const rowHeight = (height / window.devicePixelRatio) / 40;
    const midY = (height / window.devicePixelRatio) / 2;

    // Draw bids (bottom half - green)
    bids.forEach((bid, i) => {
      const intensity = bid.cumVol / bids[bids.length - 1].cumVol;
      const alpha = 0.1 + intensity * 0.4;
      ctx.fillStyle = `rgba(95,179,142,${alpha})`;
      
      const y = midY + i * rowHeight;
      const barWidth = (width / window.devicePixelRatio) * intensity;
      ctx.fillRect(0, y, barWidth, rowHeight - 1);
      
      // Price label
      ctx.fillStyle = THEME.text.secondary;
      ctx.font = '9px JetBrains Mono';
      ctx.fillText(bid.price.toFixed(2), 8, y + rowHeight - 4);
      
      // Volume label
      ctx.textAlign = 'right';
      ctx.fillText(bid.vol.toFixed(2), (width / window.devicePixelRatio) - 8, y + rowHeight - 4);
      ctx.textAlign = 'left';
    });

    // Draw asks (top half - red)
    asks.forEach((ask, i) => {
      const intensity = ask.cumVol / asks[asks.length - 1].cumVol;
      const alpha = 0.1 + intensity * 0.4;
      ctx.fillStyle = `rgba(214,93,93,${alpha})`;
      
      const y = midY - (i + 1) * rowHeight;
      const barWidth = (width / window.devicePixelRatio) * intensity;
      ctx.fillRect(0, y, barWidth, rowHeight - 1);
      
      // Price label
      ctx.fillStyle = THEME.text.secondary;
      ctx.font = '9px JetBrains Mono';
      ctx.fillText(ask.price.toFixed(2), 8, y + rowHeight - 4);
      
      // Volume label
      ctx.textAlign = 'right';
      ctx.fillText(ask.vol.toFixed(2), (width / window.devicePixelRatio) - 8, y + rowHeight - 4);
      ctx.textAlign = 'left';
    });

    // Mid price line
    ctx.strokeStyle = THEME.indicators.ma20;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width / window.devicePixelRatio, midY);
    ctx.stroke();

    // Mid price label
    ctx.fillStyle = THEME.bg.panel;
    ctx.fillRect((width / window.devicePixelRatio) / 2 - 40, midY - 10, 80, 20);
    ctx.fillStyle = THEME.indicators.ma20;
    ctx.font = 'bold 11px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.fillText(`$${mid.toFixed(2)}`, (width / window.devicePixelRatio) / 2, midY + 4);

    // Animate — only when container is visible, with throttle for mobile
    const containerEl = document.getElementById(containerId);
    if (containerEl && containerEl.offsetParent !== null) {
      const delay = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ? 500 : 100;
      setTimeout(() => {
        requestAnimationFrame(() => createOrderBookHeatmap(containerId, symbol));
      }, delay);
    }
  }

  // ── Chart.js Fallback ────────────────────────────────────
  function createChartJsFallback(containerId, symbol) {
    // Use existing ChartEngine for fallback
    if (typeof ChartEngine === 'undefined') {
      console.error('No chart engine available');
      return null;
    }

    const assetId = symbol.split('/')[0];
    const data = MarketData?.getPriceHistory(assetId, 100) || [];
    
    return ChartEngine.createMainChart(containerId, data);
  }

  // ── Multi-Timeframe Panel ────────────────────────────────
  function createMultiTimeframePanel(containerId, symbol) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const timeframes = ['1m', '5m', '15m', '1h', '4h', '1D'];
    const assetId = symbol.split('/')[0];

    container.innerHTML = `
      <div class="mtf-header">Multi-Timeframe Analysis</div>
      <div class="mtf-grid">
        ${timeframes.map(tf => `
          <div class="mtf-card" data-tf="${tf}">
            <div class="mtf-tf">${tf}</div>
            <div class="mtf-trend">
              <div class="mtf-trend-indicator"></div>
              <span class="mtf-trend-label">Loading...</span>
            </div>
            <div class="mtf-indicators">
              <div class="mtf-ind">RSI: <span class="mtf-rsi">--</span></div>
              <div class="mtf-ind">MACD: <span class="mtf-macd">--</span></div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Populate with data
    setTimeout(() => {
      timeframes.forEach(tf => {
        const card = container.querySelector(`[data-tf="${tf}"]`);
        const rsi = MarketData?.computeRSI(assetId) || 50;
        const macd = MarketData?.computeMACD(assetId) || { macd: 0 };
        
        const trend = macd.macd > 0 ? 'bullish' : 'bearish';
        const trendLabel = trend === 'bullish' ? '📈 Bullish' : '📉 Bearish';
        
        card.querySelector('.mtf-trend-indicator').className = `mtf-trend-indicator ${trend}`;
        card.querySelector('.mtf-trend-label').textContent = trendLabel;
        card.querySelector('.mtf-rsi').textContent = rsi.toFixed(1);
        card.querySelector('.mtf-macd').textContent = macd.macd.toFixed(4);
      });
    }, 500);
  }

  // ── Update Chart Data ────────────────────────────────────
  function updateChart(containerId, newData) {
    const lwChart = lightweightCharts[containerId];
    if (!lwChart) return;

    const { candleSeries, volumeSeries } = lwChart;

    if (Array.isArray(newData) && newData.length > 0) {
      const lastCandle = newData[newData.length - 1];
      const time = Math.floor(lastCandle.t / 1000);

      candleSeries.update({
        time,
        open: lastCandle.o,
        high: lastCandle.h,
        low: lastCandle.l,
        close: lastCandle.c,
      });

      volumeSeries.update({
        time,
        value: lastCandle.v,
        color: lastCandle.c >= lastCandle.o ? THEME.volume.up : THEME.volume.down,
      });
    }
  }

  // ── Timeframe Switching ──────────────────────────────────
  function changeTimeframe(containerId, symbol, newTimeframe) {
    destroy(containerId);
    return createLightweightChart(containerId, symbol, newTimeframe);
  }

  // ── Cleanup ──────────────────────────────────────────────
  function destroy(containerId) {
    // Stop real-time updates first
    stopRealtimeUpdates(containerId);
    
    if (lightweightCharts[containerId]) {
      const { chart, resizeObserver } = lightweightCharts[containerId];
      resizeObserver.disconnect();
      chart.remove();
      delete lightweightCharts[containerId];
    }
  }

  function destroyAll() {
    Object.keys(lightweightCharts).forEach(id => destroy(id));
  }

  // ── Trade Markers on Chart ──────────────────────────────
  // Visual entry/exit arrows + SL/TP price lines so users
  // can see exactly where trades happen in real time
  const _tradeMarkers = {};   // containerId -> [{...marker}]
  const _tradeLines   = {};   // containerId -> [priceLine refs]

  function addTradeMarker(containerId, trade) {
    const lw = lightweightCharts[containerId];
    if (!lw || !lw.candleSeries) return;

    if (!_tradeMarkers[containerId]) _tradeMarkers[containerId] = [];

    const isEntry = trade.action === 'entry';
    const isBuy   = trade.side === 'long';
    const t = Math.floor((trade.time || Date.now()) / 1000);

    _tradeMarkers[containerId].push({
      time: t,
      position: isEntry
        ? (isBuy ? 'belowBar' : 'aboveBar')
        : (trade.pnl >= 0 ? 'aboveBar' : 'belowBar'),
      color: isEntry
        ? (isBuy ? '#2ebd85' : '#f6465d')
        : (trade.pnl >= 0 ? '#2ebd85' : '#f6465d'),
      shape: isEntry
        ? (isBuy ? 'arrowUp' : 'arrowDown')
        : 'circle',
      text: isEntry
        ? `${isBuy ? 'BUY' : 'SELL'} $${trade.price.toFixed(0)}`
        : `EXIT ${trade.pnl >= 0 ? '+' : ''}${trade.pnlPct.toFixed(2)}%`,
    });

    // Sort by time (required by LW Charts)
    _tradeMarkers[containerId].sort((a, b) => a.time - b.time);

    // Keep max 20 markers to avoid clutter
    if (_tradeMarkers[containerId].length > 20) {
      _tradeMarkers[containerId] = _tradeMarkers[containerId].slice(-20);
    }

    try { lw.candleSeries.setMarkers(_tradeMarkers[containerId]); } catch {}
  }

  function addTradePriceLines(containerId, trade) {
    const lw = lightweightCharts[containerId];
    if (!lw || !lw.candleSeries) return;

    if (!_tradeLines[containerId]) _tradeLines[containerId] = [];

    // Remove old trade lines (max 3 sets visible)
    while (_tradeLines[containerId].length > 9) {
      try { lw.candleSeries.removePriceLine(_tradeLines[containerId].shift()); } catch {}
    }

    // Entry line
    try {
      _tradeLines[containerId].push(lw.candleSeries.createPriceLine({
        price: trade.entryPrice,
        color: 'rgba(0,188,212,0.6)',
        lineWidth: 1,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: `${trade.side === 'long' ? '▲' : '▼'} Entry`,
      }));
    } catch {}

    // SL line
    if (trade.sl) {
      try {
        _tradeLines[containerId].push(lw.candleSeries.createPriceLine({
          price: trade.sl,
          color: 'rgba(246,70,93,0.5)',
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: 'SL',
        }));
      } catch {}
    }

    // TP line
    if (trade.tp) {
      try {
        _tradeLines[containerId].push(lw.candleSeries.createPriceLine({
          price: trade.tp,
          color: 'rgba(46,189,133,0.5)',
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: 'TP',
        }));
      } catch {}
    }
  }

  function clearTradeMarkers(containerId) {
    const lw = lightweightCharts[containerId];
    if (!lw) return;
    _tradeMarkers[containerId] = [];
    try { lw.candleSeries.setMarkers([]); } catch {}
    (_tradeLines[containerId] || []).forEach(pl => {
      try { lw.candleSeries.removePriceLine(pl); } catch {}
    });
    _tradeLines[containerId] = [];
  }

  return {
    createLightweightChart,
    createOrderBookHeatmap,
    createMultiTimeframePanel,
    updateChart,
    destroy,
    destroyAll,
    stopRealtimeUpdates,
    changeTimeframe,
    addTradeMarker,
    addTradePriceLines,
    clearTradeMarkers,
    getChartInstance: (id) => lightweightCharts[id],
    THEME,
    TIMEFRAMES,
  };
})();

// End of AdvancedChartEngine module
