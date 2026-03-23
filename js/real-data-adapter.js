/* ════════════════════════════════════════════════════════════
   real-data-adapter.js — Real Market Data Integration
   OmniVest AI / ZEN ASSETS
   
   ALL asset classes: Crypto, Stocks, Forex, Commodities, Indices
   Sources: Binance WS/REST, CoinGecko, Yahoo Finance
   
   Every asset gets its own independent live feed — no sharing.
════════════════════════════════════════════════════════════ */

const RealDataAdapter = (() => {
  'use strict';

  // ── Configuration ────────────────────────────────────────
  const CONFIG = {
    enableRealData: true,
    apis: {
      // Use CORS proxy for development (https://cors-anywhere.herokuapp.com or similar)
      // For production, deploy a backend proxy at your-domain.com/api/binance
      binance:    'https://data-api.binance.vision/api/v3',
      binanceWs:  'wss://data-stream.binance.vision/ws',
      binanceWsFallback: 'wss://stream.binance.com:9443/ws',
      coingecko:  'https://api.coingecko.com/api/v3',
      // Yahoo Finance v8 chart API (public, no key)
      yahoo:      'https://query1.finance.yahoo.com/v8/finance/chart',
    },
    updateInterval: 5000,

    // ── Asset mappings per data source ──────────────────────
    cryptoIds: {
      BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana',
      BNB: 'binancecoin', XRP: 'ripple', ADA: 'cardano',
      AVAX: 'avalanche-2', LINK: 'chainlink', MATIC: 'matic-network',
      UNI: 'uniswap', AAVE: 'aave',
    },
    binancePairs: [
      'btcusdt','ethusdt','solusdt','bnbusdt','xrpusdt',
      'adausdt','avaxusdt','linkusdt','maticusdt','uniusdt','aaveusdt',
    ],
    // Yahoo Finance symbols
    yahooSymbols: {
      // Stocks
      AAPL: 'AAPL', TSLA: 'TSLA', NVDA: 'NVDA', MSFT: 'MSFT',
      AMZN: 'AMZN', META: 'META', GOOGL: 'GOOGL',
      // Indices
      SPX: '^GSPC', NDX: '^NDQ', DJI: '^DJI',
      // Forex
      EURUSD: 'EURUSD=X', GBPUSD: 'GBPUSD=X', USDJPY: 'JPY=X',
      // Commodities
      GOLD: 'GC=F', SILVER: 'SI=F', OIL: 'CL=F',
      // ETFs
      SPY: 'SPY', QQQ: 'QQQ', IWM: 'IWM', DIA: 'DIA',
      GLD: 'GLD', VTI: 'VTI', EEM: 'EEM', ARKK: 'ARKK',
    },
  };

  let wsConnections = {};
  let restTimers = {};
  let cache = {};
  const subscribers = {};
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth < 768;

  // ── Initialize ───────────────────────────────────────────
  function init() {
    if (!CONFIG.enableRealData) {
      console.log('📊 RealDataAdapter: Simulated mode');
      return;
    }

    console.log('🚀 RealDataAdapter: Real data streams — ALL asset classes');

    // 1. Crypto — Binance WebSocket (real-time)
    initBinanceWebSocket();

    // 2. Non-crypto uses high-quality simulated data (no free CORS-enabled stock/forex API)

    // 3. Initial crypto snapshot
    fetchInitialCryptoData();
  }

  // ═══════════════════════════════════════════════════════════
  //  CRYPTO — Binance WebSocket
  // ═══════════════════════════════════════════════════════════

  function initBinanceWebSocket() {
    // On mobile, only connect top 3 pairs to save battery/CPU
    const pairs = isMobile
      ? CONFIG.binancePairs.slice(0, 3)   // BTC, ETH, SOL only
      : CONFIG.binancePairs;

    console.log(`🔌 Initializing Binance WebSocket for ${pairs.length} pairs:`, pairs);

    pairs.forEach(pair => {
      try {
        const primaryUrl = `${CONFIG.apis.binanceWs}/${pair}@ticker`;
        const ws = new WebSocket(primaryUrl);
        ws.onopen  = () => {
          console.log(`✅ WS OPENED: ${pair.toUpperCase()} — Ready for ticks`);
        };
        ws.onmessage = (e) => { try { processBinanceTicker(pair, JSON.parse(e.data)); } catch {} };
        ws.onerror = (err) => {
          console.error(`❌ WS ERROR on ${pair.toUpperCase()}: ${err.message}`);
          // Try fallback WS host
          try {
            const fbWs = new WebSocket(`${CONFIG.apis.binanceWsFallback}/${pair}@ticker`);
            fbWs.onopen = () => console.log(`✅ WS FALLBACK: ${pair.toUpperCase()}`);
            fbWs.onmessage = (e) => { try { processBinanceTicker(pair, JSON.parse(e.data)); } catch {} };
            fbWs.onclose = () => setTimeout(() => reconnectWS(pair), 5000);
            wsConnections[pair] = fbWs;
          } catch {}
          if (typeof ResilienceEngine !== 'undefined') ResilienceEngine.recordFailure('websocket', err);
        };
          startCryptoPollFallback(pair);
        };
        ws.onclose = () => {
          console.warn(`🔌 WS CLOSED: ${pair.toUpperCase()} — Reconnecting in 5s`);
          setTimeout(() => reconnectWS(pair), 5000);
        };
        wsConnections[pair] = ws;
      } catch (err) {
        console.error(`❌ WS CREATION FAILED for ${pair}: ${err.message}`);
        startCryptoPollFallback(pair);
      }
    });
  }

  function reconnectWS(pair) {
    try { wsConnections[pair]?.close(); } catch {}
    const ws = new WebSocket(`${CONFIG.apis.binanceWs}/${pair}@ticker`);
    ws.onopen  = () => console.log(`♻️ Reconnected: ${pair.toUpperCase()}`);
    ws.onmessage = (e) => { try { processBinanceTicker(pair, JSON.parse(e.data)); } catch {} };
    ws.onclose = () => setTimeout(() => reconnectWS(pair), 5000);
    wsConnections[pair] = ws;
  }

  function processBinanceTicker(pair, data) {
    const symbol = pair.toUpperCase().replace('USDT', '');
    const normalized = {
      symbol, price: parseFloat(data.c),
      priceChange: parseFloat(data.p), priceChangePct: parseFloat(data.P),
      high24h: parseFloat(data.h), low24h: parseFloat(data.l),
      volume24h: parseFloat(data.v), quoteVolume: parseFloat(data.q),
      trades: parseInt(data.n), timestamp: data.E,
      bid: parseFloat(data.b), ask: parseFloat(data.a),
      open: parseFloat(data.o), source: 'binance-ws',
    };
    cache[symbol] = normalized;
    
    // Log tick for debugging
    console.log(`📥 TICK RECEIVED: ${symbol} @ ${normalized.price} (Timestamp: ${data.E}, Gap: ${Date.now() - data.E}ms)`);
    
    emit('price_update', normalized);
    injectIntoMarketData(normalized);
  }

  function startCryptoPollFallback(pair) {
    const interval = isMobile ? 15000 : CONFIG.updateInterval; // 15s on mobile
    setInterval(async () => {
      try {
        const endpoint = `/ticker/24hr?symbol=${pair.toUpperCase()}`;
        
        // Use CORS-enabled proxy
        const r = await APIProxy.fetchBinance(endpoint);
        if (!r.ok) return;
        
        const d = await r.json();
        processBinanceTicker(pair, {
          c: d.lastPrice, p: d.priceChange, P: d.priceChangePercent,
          h: d.highPrice, l: d.lowPrice, v: d.volume, q: d.quoteVolume,
          n: d.count, E: Date.now(), b: d.bidPrice, a: d.askPrice, o: d.openPrice,
        });
      } catch {}
    }, interval);
  }

  async function fetchInitialCryptoData() {
    console.log('📥 Fetching initial crypto snapshot...');
    try {
      const ids = Object.values(CONFIG.cryptoIds).join(',');
      const url = `${CONFIG.apis.coingecko}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true`;
      const r = await fetch(url); if (!r.ok) return;
      const data = await r.json();
      Object.entries(CONFIG.cryptoIds).forEach(([sym, id]) => {
        if (data[id]) {
          const n = { symbol: sym, price: data[id].usd, priceChangePct: data[id].usd_24h_change || 0, volume24h: data[id].usd_24h_vol || 0, source: 'coingecko' };
          cache[sym] = { ...cache[sym], ...n };
          emit('price_update', n);
          injectIntoMarketData(n);
        }
      });
      console.log('✅ Crypto snapshot loaded');
    } catch (e) { console.warn('CoinGecko fetch failed:', e.message); }

    for (const pair of CONFIG.binancePairs.slice(0, 5)) {
      try {
        const endpoint = `/ticker/24hr?symbol=${pair.toUpperCase()}`;
        
        // Use CORS-enabled proxy
        const r = await APIProxy.fetchBinance(endpoint);
        if (r.ok) { 
          const d = await r.json(); 
          processBinanceTicker(pair, { c: d.lastPrice, p: d.priceChange, P: d.priceChangePercent, h: d.highPrice, l: d.lowPrice, v: d.volume, q: d.quoteVolume, n: d.count, E: Date.now(), b: d.bidPrice, a: d.askPrice, o: d.openPrice }); 
        }
        await delay(200);
      } catch {}
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  STOCKS / FOREX / COMMODITIES / INDICES — Yahoo Finance
  // ═══════════════════════════════════════════════════════════

  // Priority assets — polled faster for the main chart display
  const PRIORITY_SYMBOLS = new Set(['AAPL','TSLA','GOLD','SILVER','OIL','EURUSD','GBPUSD','USDJPY','SPY','QQQ','SPX','NDX']);

  function startNonCryptoPolling() {
    fetchAllNonCryptoData();
    const pollRate     = isMobile ? 30000 : 8000;
    const fastPollRate = isMobile ? 10000 : 3000; // 3s fast lane for key assets
    restTimers.nonCrypto = setInterval(fetchAllNonCryptoData, pollRate);
    // Fast lane: poll priority assets every 3s
    restTimers.priority = setInterval(() => {
      for (const [assetId, yfSymbol] of Object.entries(CONFIG.yahooSymbols)) {
        if (PRIORITY_SYMBOLS.has(assetId)) {
          fetchYahooQuote(assetId, yfSymbol).catch(() => {});
        }
      }
    }, fastPollRate);
  }

  async function fetchAllNonCryptoData() {
    for (const [assetId, yfSymbol] of Object.entries(CONFIG.yahooSymbols)) {
      try { await fetchYahooQuote(assetId, yfSymbol); } catch {}
      await delay(300);
    }
  }

  async function fetchYahooQuote(assetId, yfSymbol) {
    try {
      const endpoint = `/${yfSymbol}?range=1d&interval=5m&includePrePost=false`;
      
      // Use CORS-enabled proxy
      const r = await APIProxy.fetchYahoo(endpoint);
      if (!r.ok) return;
      
      const data = await r.json();
      const result = data?.chart?.result?.[0];
      if (!result) return;
      const meta = result.meta;
      const price = meta.regularMarketPrice;
      const prevClose = meta.chartPreviousClose || meta.previousClose;
      const change = price - prevClose;
      const pct = prevClose ? (change / prevClose) * 100 : 0;
      const normalized = {
        symbol: assetId, price,
        priceChange: change, priceChangePct: pct,
        high24h: meta.regularMarketDayHigh || price * 1.005,
        low24h: meta.regularMarketDayLow || price * 0.995,
        volume24h: meta.regularMarketVolume || 0,
        open: meta.regularMarketOpen || prevClose,
        source: 'yahoo',
      };
      cache[assetId] = { ...cache[assetId], ...normalized };
      emit('price_update', normalized);
      injectIntoMarketData(normalized);
    } catch {
      // Yahoo blocked (CORS) — MarketData tick engine already handles this asset
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  HISTORICAL OHLCV — Real Candle Data Per Asset
  // ═══════════════════════════════════════════════════════════

  async function fetchHistoricalCandles(symbol, interval = '1h', limit = 120) {
    // Non-crypto uses simulated — no free CORS-enabled source for stocks/forex
    if (!CONFIG.cryptoIds[symbol]) return null;

    // Crypto: Binance → CryptoCompare → CoinGecko (multi-source cascade)
    const binance = await fetchBinanceCandles(symbol, interval, limit);
    if (binance && binance.length >= 5) return binance;

    const cc = await fetchCryptoCompareCandles(symbol, interval, limit);
    if (cc && cc.length >= 5) return cc;

    const cg = await fetchCoinGeckoCandles(symbol, interval, limit);
    if (cg && cg.length >= 5) return cg;

    console.warn(`⚠️ All live sources failed for ${symbol} — falling back to simulated`);
    return null;
  }

  async function fetchBinanceCandles(symbol, interval, limit) {
    try {
      const valid = ['1m','3m','5m','15m','30m','1h','2h','4h','6h','8h','12h','1d','3d','1w','1M'];
      if (!valid.includes(interval)) interval = '1h';
      const pair = `${symbol}USDT`;
      const endpoint = `/klines?symbol=${pair}&interval=${interval}&limit=${limit}`;
      console.log(`📡 Binance candles: ${pair} ${interval}`);
      
      // Use CORS-enabled proxy
      const r = await APIProxy.fetchBinance(endpoint);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      
      const data = await r.json();
      if (!Array.isArray(data) || !data.length) throw new Error('Empty');
      const candles = data.map(k => ({ t: k[0], o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5] }));
      console.log(`✅ ${candles.length} candles for ${symbol}`);
      return candles;
    } catch (e) {
      console.warn(`❌ Binance candles failed for ${symbol}:`, e.message);
      return null;
    }
  }

  // ── CryptoCompare candles (backup #1) ──────────────────────
  async function fetchCryptoCompareCandles(symbol, interval, limit) {
    try {
      const ccMap = {
        '1m':  { ep: '/data/v2/histominute', agg: 1  },
        '3m':  { ep: '/data/v2/histominute', agg: 3  },
        '5m':  { ep: '/data/v2/histominute', agg: 5  },
        '15m': { ep: '/data/v2/histominute', agg: 15 },
        '30m': { ep: '/data/v2/histominute', agg: 30 },
        '1h':  { ep: '/data/v2/histohour',   agg: 1  },
        '2h':  { ep: '/data/v2/histohour',   agg: 2  },
        '4h':  { ep: '/data/v2/histohour',   agg: 4  },
        '6h':  { ep: '/data/v2/histohour',   agg: 6  },
        '12h': { ep: '/data/v2/histohour',   agg: 12 },
        '1d':  { ep: '/data/v2/histoday',    agg: 1  },
        '3d':  { ep: '/data/v2/histoday',    agg: 3  },
        '1w':  { ep: '/data/v2/histoday',    agg: 7  },
      };
      const cfg = ccMap[interval] || ccMap['1h'];
      const endpoint = `${cfg.ep}?fsym=${symbol}&tsym=USD&limit=${limit}&aggregate=${cfg.agg}`;
      console.log(`📡 CryptoCompare: ${symbol} ${interval}`);
      const r = await APIProxy.fetchCryptoCompare(endpoint);
      const data = await r.json();
      const raw = data?.Data?.Data;
      if (!Array.isArray(raw) || raw.length < 5) throw new Error('Empty');

      const candles = raw
        .filter(k => k.open > 0 && k.high > 0 && k.close > 0)
        .map(k => ({ t: k.time * 1000, o: k.open, h: k.high, l: k.low, c: k.close, v: k.volumefrom || 0 }));

      if (candles.length < 5) throw new Error('Too few valid candles');
      console.log(`✅ ${candles.length} CryptoCompare candles for ${symbol}`);
      return candles;
    } catch (e) {
      console.warn(`❌ CryptoCompare candles failed for ${symbol}:`, e.message);
      return null;
    }
  }

  // ── CoinGecko OHLC candles (backup #2) ─────────────────────
  async function fetchCoinGeckoCandles(symbol, interval, limit) {
    try {
      const cgId = CONFIG.cryptoIds[symbol];
      if (!cgId) return null;
      // CoinGecko auto-granularity: 1-2d→30m, 3-30d→4h, 31+→4d
      const daysMap = { '1m':1, '5m':1, '15m':1, '30m':1, '1h':7, '2h':14, '4h':30, '1d':90, '1w':365 };
      const days = daysMap[interval] || 7;
      console.log(`📡 CoinGecko OHLC: ${cgId} days=${days}`);
      const r = await APIProxy.fetchCoinGecko(`/coins/${cgId}/ohlc?vs_currency=usd&days=${days}`);
      const data = await r.json();
      if (!Array.isArray(data) || data.length < 5) throw new Error('Empty');

      const candles = data.map(k => ({ t: k[0], o: k[1], h: k[2], l: k[3], c: k[4], v: 0 }));
      if (candles.length > limit) return candles.slice(-limit);
      console.log(`✅ ${candles.length} CoinGecko candles for ${symbol}`);
      return candles;
    } catch (e) {
      console.warn(`❌ CoinGecko candles failed for ${symbol}:`, e.message);
      return null;
    }
  }

  async function fetchYahooCandles(symbol, interval, limit) {
    try {
      const yfSymbol = CONFIG.yahooSymbols[symbol];
      if (!yfSymbol) return null;
      const yfMap = {
        '1m': { interval: '1m', range: '1d' }, '5m': { interval: '5m', range: '5d' },
        '15m': { interval: '15m', range: '5d' }, '1h': { interval: '1h', range: '1mo' },
        '4h': { interval: '1h', range: '3mo' }, '1d': { interval: '1d', range: '1y' },
      };
      const cfg = yfMap[interval] || yfMap['1h'];
      const endpoint = `/${yfSymbol}?range=${cfg.range}&interval=${cfg.interval}&includePrePost=false`;
      console.log(`📡 Yahoo candles: ${yfSymbol} ${cfg.interval}`);
      
      // Use CORS-enabled proxy
      const r = await APIProxy.fetchYahoo(endpoint);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      
      const data = await r.json();
      const result = data?.chart?.result?.[0];
      if (!result) throw new Error('No result');
      const ts = result.timestamp; const q = result.indicators.quote[0];
      if (!ts || !q) throw new Error('No OHLCV');
      let candles = [];
      for (let i = 0; i < ts.length; i++) {
        if (q.open[i] == null) continue;
        candles.push({ t: ts[i] * 1000, o: q.open[i], h: q.high[i], l: q.low[i], c: q.close[i], v: q.volume[i] || 0 });
      }
      if (interval === '4h' && cfg.interval === '1h') candles = aggregateCandles(candles, 4);
      if (candles.length > limit) candles = candles.slice(-limit);
      console.log(`✅ ${candles.length} candles from Yahoo for ${symbol}`);
      return candles.length > 0 ? candles : null;
    } catch (e) {
      console.warn(`❌ Yahoo candles failed for ${symbol}:`, e.message);
      return null;
    }
  }

  function aggregateCandles(candles, factor) {
    const out = [];
    for (let i = 0; i < candles.length; i += factor) {
      const g = candles.slice(i, i + factor); if (!g.length) continue;
      out.push({ t: g[0].t, o: g[0].o, h: Math.max(...g.map(c => c.h)), l: Math.min(...g.map(c => c.l)), c: g[g.length-1].c, v: g.reduce((s,c) => s + c.v, 0) });
    }
    return out;
  }

  // ═══════════════════════════════════════════════════════════
  //  INJECT INTO MARKETDATA
  // ═══════════════════════════════════════════════════════════

  function injectIntoMarketData(n) {
    if (typeof MarketData === 'undefined') return;
    MarketData._injectRealPrice?.(n.symbol, {
      price: n.price, high24h: n.high24h, low24h: n.low24h,
      vol24h: n.volume24h, chg24h: n.priceChange, pct24h: n.priceChangePct,
      bid: n.bid, ask: n.ask,
    });
  }

  function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ═══════════════════════════════════════════════════════════
  //  MULTI-SOURCE CONSENSUS ENGINE
  //  Aggregates prices from Binance WS, CoinGecko REST, Yahoo
  //  to produce a confidence-weighted "true price" per asset.
  // ═══════════════════════════════════════════════════════════

  const _priceSources = {};   // symbol → { binance:{price,ts}, coingecko:{price,ts}, yahoo:{price,ts} }
  const _confidence   = {};   // symbol → { score:0-100, sources:N, spread:% }

  function _recordSource(symbol, source, price) {
    if (!price || isNaN(price) || price <= 0) return;
    if (!_priceSources[symbol]) _priceSources[symbol] = {};
    _priceSources[symbol][source] = { price, ts: Date.now() };
    _computeConsensus(symbol);
  }

  function _computeConsensus(symbol) {
    const feeds = _priceSources[symbol];
    if (!feeds) return;
    const now = Date.now();
    const STALE_MS = 30000; // 30s stale threshold
    const live = [];
    for (const [src, data] of Object.entries(feeds)) {
      if (now - data.ts < STALE_MS) live.push({ src, price: data.price, age: now - data.ts });
    }
    if (live.length === 0) { _confidence[symbol] = { score: 0, sources: 0, spread: 0 }; return; }

    // Weighted average: fresher data gets more weight
    let wSum = 0, wTotal = 0;
    for (const f of live) {
      const freshness = 1 - (f.age / STALE_MS);           // 1.0 = brand new, 0.0 = almost stale
      const srcWeight = f.src === 'binance-ws' ? 3 : f.src === 'binance-rest' ? 2 : 1;
      const w = freshness * srcWeight;
      wSum += f.price * w;
      wTotal += w;
    }
    const consensusPrice = wSum / wTotal;

    // Spread: max deviation between sources
    const prices = live.map(f => f.price);
    const maxP = Math.max(...prices), minP = Math.min(...prices);
    const spread = maxP > 0 ? ((maxP - minP) / maxP * 100) : 0;

    // Confidence: more sources + tighter spread = higher confidence
    const srcScore = Math.min(live.length / 3, 1) * 50;    // 0-50 points from source count
    const spreadScore = Math.max(0, 50 - spread * 100);     // 0-50 points from spread
    const score = Math.round(srcScore + spreadScore);

    _confidence[symbol] = { score, sources: live.length, spread: parseFloat(spread.toFixed(4)), consensusPrice };
  }

  function getConfidence(symbol) { return _confidence[symbol] || { score: 0, sources: 0, spread: 0 }; }
  function getConsensusPrice(symbol) { return _confidence[symbol]?.consensusPrice || cache[symbol]?.price || null; }

  // ═══════════════════════════════════════════════════════════
  //  ADAPTIVE FETCH RATE ENGINE
  //  When volatility spikes (big % moves), poll faster.
  //  When markets are calm, slow down to save bandwidth.
  // ═══════════════════════════════════════════════════════════

  const _volatility = {};  // symbol → { recentMoves:[], avgVol, lastCheck }

  function _trackVolatility(symbol, pricePct) {
    if (!_volatility[symbol]) _volatility[symbol] = { recentMoves: [], avgVol: 0, lastCheck: Date.now() };
    const v = _volatility[symbol];
    v.recentMoves.push(Math.abs(pricePct));
    if (v.recentMoves.length > 20) v.recentMoves.shift();
    v.avgVol = v.recentMoves.reduce((a, b) => a + b, 0) / v.recentMoves.length;
  }

  function _getAdaptiveInterval(symbol, basePollMs) {
    const v = _volatility[symbol];
    if (!v || v.avgVol === 0) return basePollMs;
    // High vol (>2% avg move): poll 2x faster.  Low vol (<0.3%): 1.5x slower
    if (v.avgVol > 2)   return Math.max(1000, Math.floor(basePollMs * 0.5));
    if (v.avgVol > 0.8) return Math.max(2000, Math.floor(basePollMs * 0.7));
    if (v.avgVol < 0.3) return Math.floor(basePollMs * 1.5);
    return basePollMs;
  }

  function getVolatilityProfile(symbol) { return _volatility[symbol] || null; }

  // ═══════════════════════════════════════════════════════════
  //  COINGECKO REDUNDANT FEED (backup for when Binance WS drops)
  // ═══════════════════════════════════════════════════════════

  let _cgTimer = null;

  function startCoinGeckoFeed() {
    _cgTimer = setInterval(async () => {
      try {
        const ids = Object.values(CONFIG.cryptoIds).join(',');
        const url = `${CONFIG.apis.coingecko}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true`;
        const r = await fetch(url);
        if (!r.ok) return;
        const data = await r.json();
        Object.entries(CONFIG.cryptoIds).forEach(([sym, cgId]) => {
          if (!data[cgId]) return;
          const price = data[cgId].usd;
          const pct   = data[cgId].usd_24h_change || 0;
          _recordSource(sym, 'coingecko', price);
          _trackVolatility(sym, pct);
          // Only inject if Binance WS is stale (>10s old)
          const binFeed = _priceSources[sym]?.['binance-ws'];
          if (!binFeed || Date.now() - binFeed.ts > 10000) {
            const n = { symbol: sym, price, priceChangePct: pct, volume24h: data[cgId].usd_24h_vol || 0, source: 'coingecko' };
            cache[sym] = { ...cache[sym], ...n };
            emit('price_update', n);
            injectIntoMarketData(n);
          }
        });
      } catch {}
    }, isMobile ? 30000 : 12000); // 12s desktop, 30s mobile
  }

  // Hook into existing processBinanceTicker to track sources
  const _origProcessBinanceTicker = processBinanceTicker;

  // ── Enhanced injection wrapper ────────────────────────────
  // Wraps every price_update to track multi-source + volatility
  function _enhancedInject(normalized) {
    _recordSource(normalized.symbol, normalized.source || 'unknown', normalized.price);
    if (normalized.priceChangePct) _trackVolatility(normalized.symbol, normalized.priceChangePct);
  }

  // Patch: tap into every price update for consensus tracking
  const _origEmit = emit;
  emit = function(event, data) {
    if (event === 'price_update' && data) _enhancedInject(data);
    _origEmit(event, data);
  };

  // ── Public API ───────────────────────────────────────────
  function getPrice(symbol) { return cache[symbol]?.price || null; }
  function getTickerData(symbol) { return cache[symbol] || null; }
  function getAllCachedData() { return { ...cache }; }
  function isRealDataEnabled() { return CONFIG.enableRealData; }

  function on(event, fn) { if (!subscribers[event]) subscribers[event] = []; subscribers[event].push(fn); }

  function destroy() {
    Object.values(wsConnections).forEach(ws => { try { ws.close(); } catch {} });
    Object.values(restTimers).forEach(t => clearInterval(t));
    if (_cgTimer) clearInterval(_cgTimer);
    wsConnections = {}; restTimers = {}; cache = {};
  }

  // Start CoinGecko redundant feed after main init
  const _origInit = init;
  init = function() {
    _origInit();
    startCoinGeckoFeed();
  };

  return {
    init, destroy,
    getPrice, getTickerData, getAllCachedData,
    fetchHistoricalCandles, isRealDataEnabled,
    on,
    // New advanced APIs
    getConfidence,
    getConsensusPrice,
    getVolatilityProfile,
  };
})();
