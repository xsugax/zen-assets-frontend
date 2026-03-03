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
      binance:    'https://api.binance.com/api/v3',
      binanceWs:  'wss://stream.binance.com:9443/ws',
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

    // 2. Stocks / Forex / Commodities / Indices — REST polling
    startNonCryptoPolling();

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

    pairs.forEach(pair => {
      try {
        const ws = new WebSocket(`${CONFIG.apis.binanceWs}/${pair}@ticker`);
        ws.onopen  = () => console.log(`✅ WS: ${pair.toUpperCase()}`);
        ws.onmessage = (e) => { try { processBinanceTicker(pair, JSON.parse(e.data)); } catch {} };
        ws.onerror = () => startCryptoPollFallback(pair);
        ws.onclose = () => setTimeout(() => reconnectWS(pair), 5000);
        wsConnections[pair] = ws;
      } catch {
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

  function startNonCryptoPolling() {
    fetchAllNonCryptoData();
    const pollRate = isMobile ? 30000 : 8000; // 30s on mobile vs 8s desktop
    restTimers.nonCrypto = setInterval(fetchAllNonCryptoData, pollRate);
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

  async function fetchHistoricalCandles(symbol, interval = '1h', limit = 100) {
    // Crypto → Binance
    if (CONFIG.cryptoIds[symbol]) {
      return await fetchBinanceCandles(symbol, interval, limit);
    }
    // Stocks / Forex / Commodities / Indices → Yahoo
    if (CONFIG.yahooSymbols[symbol]) {
      return await fetchYahooCandles(symbol, interval, limit);
    }
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

  // ── Public API ───────────────────────────────────────────
  function getPrice(symbol) { return cache[symbol]?.price || null; }
  function getTickerData(symbol) { return cache[symbol] || null; }
  function getAllCachedData() { return { ...cache }; }
  function isRealDataEnabled() { return CONFIG.enableRealData && Object.keys(cache).length > 0; }

  function on(event, fn) { if (!subscribers[event]) subscribers[event] = []; subscribers[event].push(fn); }
  function emit(event, data) { (subscribers[event] || []).forEach(fn => { try { fn(data); } catch {} }); }

  function destroy() {
    Object.values(wsConnections).forEach(ws => { try { ws.close(); } catch {} });
    Object.values(restTimers).forEach(t => clearInterval(t));
    wsConnections = {}; restTimers = {}; cache = {};
  }

  return {
    init, destroy,
    getPrice, getTickerData, getAllCachedData,
    fetchHistoricalCandles, isRealDataEnabled,
    on,
  };
})();
