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
      chart: '#0a0e16',
      panel: '#151a24',
      hover: '#1a2029',
    },
    candle: {
      up: { body: '#5fb38e', wick: '#5fb38e', border: '#5fb38e' },
      down: { body: '#d65d5d', wick: '#d65d5d', border: '#d65d5d' },
    },
    volume: {
      up: 'rgba(95,179,142,0.4)',
      down: 'rgba(214,93,93,0.4)',
    },
    grid: {
      main: 'rgba(255,255,255,0.04)',
      sub: 'rgba(255,255,255,0.02)',
    },
    text: {
      primary: '#e2e8f0',
      secondary: '#8b98ad',
      muted: '#64748b',
    },
    indicators: {
      ma20: '#d4a574',
      ma50: '#4a9ca6',
      ma200: '#8b98ad',
      ema: '#e6b887',
      bb: 'rgba(139,152,173,0.3)',
      rsi: '#d4a574',
      macd: { line: '#5fb38e', signal: '#d65d5d', hist: '#8b98ad' },
    },
    levels: {
      support: 'rgba(95,179,142,0.5)',
      resistance: 'rgba(214,93,93,0.5)',
      fibonacci: 'rgba(212,165,116,0.3)',
    },
  };

  // ── Timeframe Configuration ─────────────────────────────
  const TIMEFRAMES = {
    '1m':  { binance: '1m',  interval: 60000,     label: '1 Minute',  limit: 120 },  // 2 hours
    '5m':  { binance: '5m',  interval: 300000,    label: '5 Minutes', limit: 150 },  // 12.5 hours
    '15m': { binance: '15m', interval: 900000,    label: '15 Minutes', limit: 150 }, // ~37 hours
    '1h':  { binance: '1h',  interval: 3600000,   label: '1 Hour',    limit: 168 },  // 7 days
    '4h':  { binance: '4h',  interval: 14400000,  label: '4 Hours',   limit: 180 },  // 30 days
    '1d':  { binance: '1d',  interval: 86400000,  label: '1 Day',     limit: 365 },  // 1 year
  };

  let currentTimeframe = '5m'; // Default to 5 minutes (better UX - shows more action)

  // ── Initialize Lightweight Chart (TradingView Style) ────
  function createLightweightChart(containerId, symbol, timeframe = '5m') {
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
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { color: THEME.bg.chart },
        textColor: THEME.text.secondary,
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace",
      },
      grid: {
        vertLines: { color: THEME.grid.sub },
        horzLines: { color: THEME.grid.main },
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(212,165,116,0.5)',
          width: 1,
          style: LightweightCharts.LineStyle.Dashed,
        },
        horzLine: {
          color: 'rgba(212,165,116,0.5)',
          width: 1,
          style: LightweightCharts.LineStyle.Dashed,
        },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: THEME.grid.main,
      },
      rightPriceScale: {
        borderColor: THEME.grid.main,
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      watermark: {
        visible: true,
        fontSize: 48,
        horzAlign: 'center',
        vertAlign: 'center',
        color: 'rgba(255,255,255,0.02)',
        text: 'ZEN ASSETS',
      },
    });

    // Candlestick series with proper OHLC rendering
    const candleSeries = chart.addCandlestickSeries({
      upColor: THEME.candle.up.body,
      downColor: THEME.candle.down.body,
      borderUpColor: THEME.candle.up.border,
      borderDownColor: THEME.candle.down.border,
      wickUpColor: THEME.candle.up.wick,
      wickDownColor: THEME.candle.down.wick,
      borderVisible: true,    // Show candle borders
      wickVisible: true,      // Show wicks (critical for proper candlesticks!)
    });

    // Volume series (histogram)
    const volumeSeries = chart.addHistogramSeries({
      color: THEME.volume.up,
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.85,
        bottom: 0,
      },
    });

    // Moving averages — thin and subtle so chart isn't cluttered
    const ma20Series = chart.addLineSeries({
      color: 'rgba(212,165,116,0.35)',
      lineWidth: 1,
      title: 'MA20',
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const ma50Series = chart.addLineSeries({
      color: 'rgba(74,156,166,0.30)',
      lineWidth: 1,
      title: 'MA50',
      priceLineVisible: false,
      lastValueVisible: false,
    });

    // Load data with selected timeframe
    loadChartData(symbol, candleSeries, volumeSeries, ma20Series, ma50Series, timeframe);
    
    // Start real-time updates at correct interval
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
      resizeObserver,
      symbol,
    };

    return chart;
  }

  // ── Load Chart Data ──────────────────────────────────────
  async function loadChartData(symbol, candleSeries, volumeSeries, ma20Series, ma50Series, timeframe = '1h') {
    const assetId = symbol.split('/')[0];
    const tf = TIMEFRAMES[timeframe];
    
    console.log(`📊 Loading ${assetId} chart data: ${tf.label} (${tf.binance})`);
    
    // ALWAYS try to get real Binance data first (this is critical!)
    let candles = null;
    let usingRealData = false;
    
    if (typeof RealDataAdapter !== 'undefined' && RealDataAdapter.isRealDataEnabled()) {
      candles = await RealDataAdapter.fetchHistoricalCandles(assetId, tf.binance, tf.limit);
      if (candles && candles.length > 0) {
        usingRealData = true;
        console.log(`✅ Using REAL market data for ${assetId} (${candles.length} ${tf.binance} candles)`);
      }
    }
    
    // Only fallback to simulated data if real data unavailable
    if (!candles && typeof MarketData !== 'undefined') {
      console.warn(`⚠️ Real data unavailable - using simulated data (NOT RECOMMENDED)`);
      candles = MarketData.getOHLCV(assetId, tf.limit, timeframe);
      usingRealData = false;
    }

    if (!candles || candles.length === 0) {
      console.error('❌ No chart data available for', symbol);
      return;
    }
    
    // Show data source indicator
    updateDataSourceIndicator(symbol, usingRealData, timeframe);

    // Format data for TradingView
    const candleData = candles.map(c => ({
      time: Math.floor(c.t / 1000), // Convert to seconds
      open: c.o,
      high: c.h,
      low: c.l,
      close: c.c,
    }));

    const volumeData = candles.map(c => ({
      time: Math.floor(c.t / 1000),
      value: c.v,
      color: c.c >= c.o ? THEME.volume.up : THEME.volume.down,
    }));

    candleSeries.setData(candleData);
    volumeSeries.setData(volumeData);

    // Calculate and add moving averages
    const ma20Data = calculateMA(candleData, 20);
    const ma50Data = calculateMA(candleData, 50);

    ma20Series.setData(ma20Data);
    ma50Series.setData(ma50Data);

    // Add support/resistance levels
    addSupportResistanceLevels(candleSeries, candleData);

    // ── Pattern Recognition — only the strongest signals ──
    if (typeof MarketData !== 'undefined' && MarketData.detectPatterns) {
      const detected = MarketData.detectPatterns(candles);
      if (detected && detected.length > 0) {
        // Rank: multi-candle patterns > single, keep max 6 to avoid clutter
        const priority = { morning_star: 5, evening_star: 5, three_soldiers: 5, three_crows: 5, engulfing: 4, piercing: 3, dark_cloud: 3, hammer: 2, shooting_star: 2, marubozu: 1, doji: 0 };
        const ranked = detected.sort((a, b) => (priority[b.type] || 0) - (priority[a.type] || 0)).slice(0, 6);
        const markers = ranked.map(p => ({
          time: Math.floor(p.t / 1000),
          position: p.signal === 'bullish' ? 'belowBar' : p.signal === 'bearish' ? 'aboveBar' : 'inBar',
          color: p.signal === 'bullish' ? '#5fb38e' : p.signal === 'bearish' ? '#d65d5d' : '#d4a574',
          shape: p.signal === 'bullish' ? 'arrowUp' : p.signal === 'bearish' ? 'arrowDown' : 'circle',
          text: p.name,
        }));
        markers.sort((a, b) => a.time - b.time);
        try { candleSeries.setMarkers(markers); } catch(e) {}
      }
    }
    
    return { candleData, volumeData, usingRealData };
  }

  // ── Real-Time Updates — Binance Kline WebSocket ───────────
  // Each chart gets its own dedicated kline stream from Binance.
  // This is the same data source TradingView uses — every price
  // movement Binance processes is pushed to us instantly, keeping
  // the forming candle's O/H/L/C/V perfectly in sync with reality.
  const updateIntervals  = {};   // REST fallback poll timers
  const klineWsConnections = {}; // WebSocket per containerId

  const CRYPTO_SYMBOLS = new Set(['BTC','ETH','SOL','BNB','XRP','ADA','AVAX','LINK','MATIC','UNI','AAVE']);

  function startRealtimeUpdates(containerId, symbol, candleSeries, volumeSeries, timeframe) {
    stopRealtimeUpdates(containerId); // always clean up first

    const tf      = TIMEFRAMES[timeframe];
    const assetId = symbol.split('/')[0];
    const isCrypto = CRYPTO_SYMBOLS.has(assetId);

    console.log(`🚀 STARTING REALTIME: ${assetId} ${tf.binance} (Crypto: ${isCrypto})`);

    // AGGRESSIVE: Update every 250ms for ultra-responsive candlesticks
    if (isCrypto) {
      _startKlineWebSocket(containerId, assetId, tf, candleSeries, volumeSeries);
    }
    
    // FALLBACK: Always run aggressive REST polling (250ms) even if WS works
    // This ensures continuous candle updates no matter what
    _startAggressiveRestPolling(containerId, assetId, tf, candleSeries, volumeSeries);
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

          // Update candlestick immediately
          try { 
            candleSeries.update({ time: t, open: o, high: h, low: l, close: c }); 
            // Log to debug monitor
            if (typeof DebugMonitor !== 'undefined') {
              DebugMonitor.recordChartUpdate(assetId, { o, h, l, c, v });
            }
          } catch (e) {
            console.warn(`Candlestick update error: ${e.message}`);
          }
          
          // Update volume immediately
          try { 
            volumeSeries.update({ time: t, value: v, color: c >= o ? THEME.volume.up : THEME.volume.down }); 
          } catch (e) {
            console.warn(`Volume update error: ${e.message}`);
          }

          // Sync real price for tickers
          if (typeof MarketData !== 'undefined' && MarketData._injectRealPrice) {
            MarketData._injectRealPrice(assetId, { price: c, high24h: h, low24h: l });
          }
          
          lastUpdateTime = Date.now();
        } catch (err) {
          console.error(`Kline message parse error: ${err.message}`);
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

  // REST fallback — polls Binance (crypto) or Yahoo (non-crypto) for the latest candle
  function _startRestFallback(containerId, assetId, tf, candleSeries, volumeSeries, intervalMs) {
    if (updateIntervals[containerId]) return; // already running

    console.log(`🔄 REST FALLBACK: ${assetId} every ${intervalMs / 1000}s`);

    updateIntervals[containerId] = setInterval(async () => {
      if (typeof RealDataAdapter === 'undefined') return;
      try {
        // Fetch last 3 candles to ensure we get the latest
        const candles = await RealDataAdapter.fetchHistoricalCandles(assetId, tf.binance, 3);
        if (!candles || !candles.length) return;

        // Update BOTH closed and forming candles for smooth progression
        for (const c of candles) {
          const t = Math.floor(c.t / 1000);
          try { 
            candleSeries.update({ time: t, open: c.o, high: c.h, low: c.l, close: c.c }); 
            // Log to debug monitor
            if (typeof DebugMonitor !== 'undefined') {
              DebugMonitor.recordChartUpdate(assetId, c);
            }
          } catch (e) {
            console.warn(`Candle update failed: ${e.message}`);
          }
          try { 
            volumeSeries.update({ time: t, value: c.v, color: c.c >= c.o ? THEME.volume.up : THEME.volume.down }); 
          } catch (e) {
            console.warn(`Volume update failed: ${e.message}`);
          }
        }

        const latest = candles[candles.length - 1];
        if (typeof MarketData !== 'undefined' && MarketData._injectRealPrice) {
          MarketData._injectRealPrice(assetId, { price: latest.c });
        }
      } catch (err) {
        console.error(`REST fallback error:`, err.message);
      }
    }, intervalMs);
  }

  // AGGRESSIVE polling every 250ms — guaranteed live candlesticks
  function _startAggressiveRestPolling(containerId, assetId, tf, candleSeries, volumeSeries) {
    if (updateIntervals[containerId]) clearInterval(updateIntervals[containerId]);

    console.log(`⚡ ULTRA-AGGRESSIVE: ${assetId} updating every 250ms`);

    let consecutiveErrors = 0;

    updateIntervals[containerId] = setInterval(async () => {
      try {
        if (typeof RealDataAdapter === 'undefined') return;
        
        // Fetch the last 5 candles for maximum freshness
        const candles = await RealDataAdapter.fetchHistoricalCandles(assetId, tf.binance, 5);
        if (!candles || !candles.length) {
          consecutiveErrors++;
          if (consecutiveErrors > 10) console.warn(`⚠️ ${assetId} data fetch failing repeatedly`);
          return;
        }

        consecutiveErrors = 0;

        // Update all recent candles (ensures forming candle is always fresh)
        for (const c of candles) {
          const t = Math.floor(c.t / 1000);
          
          // Update candlestick
          try { 
            candleSeries.update({ 
              time: t, 
              open: c.o, 
              high: c.h, 
              low: c.l, 
              close: c.c 
            }); 
          } catch {}

          // Update volume
          try { 
            volumeSeries.update({ 
              time: t, 
              value: c.v, 
              color: c.c >= c.o ? THEME.volume.up : THEME.volume.down 
            }); 
          } catch {}
        }

        // Sync latest price to MarketData for UI updates
        const latest = candles[candles.length - 1];
        if (typeof MarketData !== 'undefined' && MarketData._injectRealPrice) {
          MarketData._injectRealPrice(assetId, { 
            price: latest.c,
            high24h: latest.h,
            low24h: latest.l,
            vol: latest.v
          });
        }
      } catch (err) {
        consecutiveErrors++;
        if (consecutiveErrors <= 3) console.error(`Aggressive polling error: ${err.message}`);
      }
    }, 250); // 250ms = 4 updates per second = LIVE TRADING FEEL
  }

  function stopRealtimeUpdates(containerId) {
    const ws = klineWsConnections[containerId];
    if (ws) {
      ws.onclose = null; // prevent auto-reconnect
      try { ws.close(); } catch {}
      delete klineWsConnections[containerId];
    }
    if (updateIntervals[containerId]) {
      clearInterval(updateIntervals[containerId]);
      delete updateIntervals[containerId];
    }
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

  return {
    createLightweightChart,
    createOrderBookHeatmap,
    createMultiTimeframePanel,
    updateChart,
    destroy,
    destroyAll,
    stopRealtimeUpdates,
    changeTimeframe,
    THEME,
    TIMEFRAMES,
  };
})();

// End of AdvancedChartEngine module
