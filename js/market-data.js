/* ════════════════════════════════════════════════════════════
   market-data.js — Real-time Market Data Engine
   OmniVest AI / ZEN ASSETS
════════════════════════════════════════════════════════════ */

const MarketData = (() => {
  'use strict';

  // ── Asset Registry ──────────────────────────────────────
  const ASSETS = [
    // Crypto
    { id: 'BTC',  sym: 'BTC/USD',  name: 'Bitcoin',    price: 67420.00, cat: 'crypto',    vol: 28.4e9,  mc: 1.32e12 },
    { id: 'ETH',  sym: 'ETH/USD',  name: 'Ethereum',   price: 3524.50,  cat: 'crypto',    vol: 12.1e9,  mc: 424e9 },
    { id: 'SOL',  sym: 'SOL/USD',  name: 'Solana',     price: 172.80,   cat: 'crypto',    vol: 2.8e9,   mc: 79e9 },
    { id: 'BNB',  sym: 'BNB/USD',  name: 'BNB',        price: 608.40,   cat: 'crypto',    vol: 1.9e9,   mc: 88e9 },
    { id: 'XRP',  sym: 'XRP/USD',  name: 'XRP',        price: 0.6210,   cat: 'crypto',    vol: 1.4e9,   mc: 35e9 },
    { id: 'ADA',  sym: 'ADA/USD',  name: 'Cardano',    price: 0.4825,   cat: 'crypto',    vol: 480e6,   mc: 17e9 },
    { id: 'AVAX', sym: 'AVAX/USD', name: 'Avalanche',  price: 37.60,    cat: 'crypto',    vol: 620e6,   mc: 15e9 },
    { id: 'LINK', sym: 'LINK/USD', name: 'Chainlink',  price: 17.40,    cat: 'crypto',    vol: 540e6,   mc: 10e9 },
    // Stocks
    { id: 'AAPL', sym: 'AAPL',     name: 'Apple Inc',  price: 229.87,   cat: 'stocks',    vol: 54e6,    mc: 3.52e12 },
    { id: 'TSLA', sym: 'TSLA',     name: 'Tesla',      price: 248.50,   cat: 'stocks',    vol: 82e6,    mc: 791e9 },
    { id: 'NVDA', sym: 'NVDA',     name: 'NVIDIA',     price: 875.40,   cat: 'stocks',    vol: 41e6,    mc: 2.15e12 },
    { id: 'MSFT', sym: 'MSFT',     name: 'Microsoft',  price: 415.30,   cat: 'stocks',    vol: 23e6,    mc: 3.08e12 },
    { id: 'AMZN', sym: 'AMZN',     name: 'Amazon',     price: 183.40,   cat: 'stocks',    vol: 35e6,    mc: 1.91e12 },
    { id: 'META', sym: 'META',     name: 'Meta',       price: 521.60,   cat: 'stocks',    vol: 18e6,    mc: 1.33e12 },
    { id: 'GOOGL',sym: 'GOOGL',    name: 'Alphabet',   price: 172.10,   cat: 'stocks',    vol: 27e6,    mc: 2.14e12 },
    // Forex
    { id: 'EURUSD',sym:'EUR/USD',  name: 'Euro/Dollar',price: 1.0842,   cat: 'forex',     vol: 32e9,    mc: null },
    { id: 'GBPUSD',sym:'GBP/USD',  name: 'Pound/Dollar',price:1.2650,   cat: 'forex',     vol: 18e9,    mc: null },
    { id: 'USDJPY',sym:'USD/JPY',  name: 'Dollar/Yen', price: 149.40,   cat: 'forex',     vol: 25e9,    mc: null },
    // Commodities
    { id: 'GOLD',  sym: 'XAU/USD', name: 'Gold',       price: 2385.20,  cat: 'commodities',vol:14e9,    mc: null },
    { id: 'SILVER',sym: 'XAG/USD', name: 'Silver',     price: 28.74,    cat: 'commodities',vol:4.2e9,   mc: null },
    { id: 'OIL',   sym: 'WTI/USD', name: 'Crude Oil',  price: 81.60,    cat: 'commodities',vol:9.8e9,   mc: null },
    // Indices
    { id: 'SPX',   sym: 'S&P 500', name: 'S&P 500',    price: 5487.20,  cat: 'indices',   vol: 2.8e9,   mc: null },
    { id: 'NDX',   sym: 'NASDAQ',  name: 'Nasdaq 100', price: 19322.40, cat: 'indices',   vol: 1.9e9,   mc: null },
    { id: 'DJI',   sym: 'DOW',     name: 'Dow Jones',  price: 39127.80, cat: 'indices',   vol: 1.1e9,   mc: null },
    // ETFs
    { id: 'SPY',   sym: 'SPY',     name: 'SPDR S&P 500',    price: 548.20,  cat: 'etf',  vol: 78e6,  mc: 515e9 },
    { id: 'QQQ',   sym: 'QQQ',     name: 'Invesco QQQ',     price: 478.60,  cat: 'etf',  vol: 52e6,  mc: 262e9 },
    { id: 'IWM',   sym: 'IWM',     name: 'iShares Russell 2000', price: 210.30, cat: 'etf', vol: 28e6, mc: 68e9 },
    { id: 'DIA',   sym: 'DIA',     name: 'SPDR Dow Jones',  price: 391.50,  cat: 'etf',  vol: 4.2e6, mc: 33e9 },
    { id: 'GLD',   sym: 'GLD',     name: 'SPDR Gold Trust', price: 221.80,  cat: 'etf',  vol: 8.5e6, mc: 62e9 },
    { id: 'VTI',   sym: 'VTI',     name: 'Vanguard Total Mkt', price: 272.40, cat: 'etf', vol: 3.8e6, mc: 412e9 },
    { id: 'EEM',   sym: 'EEM',     name: 'iShares Emerging Mkts', price: 43.20, cat: 'etf', vol: 32e6, mc: 22e9 },
    { id: 'ARKK',  sym: 'ARKK',    name: 'ARK Innovation',  price: 48.60,   cat: 'etf',  vol: 12e6,  mc: 7.2e9 },
    // DeFi / Alt
    { id: 'MATIC', sym:'MATIC/USD',name: 'Polygon',    price: 0.7240,   cat: 'defi',      vol: 320e6,   mc: 6.7e9 },
    { id: 'UNI',   sym: 'UNI/USD', name: 'Uniswap',    price: 9.18,     cat: 'defi',      vol: 280e6,   mc: 5.5e9 },
    { id: 'AAVE',  sym: 'AAVE/USD',name: 'Aave',       price: 98.40,    cat: 'defi',      vol: 210e6,   mc: 1.4e9 },
  ];

  // ── State ────────────────────────────────────────────────
  const state = {};         // { id : { price, open, high24h, low24h, vol24h, chg24h, pct24h, history[] } }
  const subscribers = {};   // event → [fn, ...]
  const priceHistory = {};  // id → deque of last 200 prices
  let   tickTimer = null;
  let   whaleTimer = null;
  const HISTORY_SIZE = 200;

  // Volatility config per asset type
  const VOLS = { crypto: 0.0025, stocks: 0.0008, forex: 0.0003, commodities: 0.0012, indices: 0.0005, defi: 0.004, etf: 0.0007 };

  // ── Init ─────────────────────────────────────────────────
  function init() {
    ASSETS.forEach(a => {
      const px = a.price;
      state[a.id] = {
        ...a, price: px,
        open: px, prevClose: px * (1 - (Math.random()-.5)*.015),
        high24h: px * 1.012, low24h: px * 0.985,
        vol24h: a.vol, chg24h: 0, pct24h: 0,
        ask: px * 1.0002, bid: px * 0.9998,
        spread: px * 0.0003,
        lastUpdate: Date.now(),
      };
      priceHistory[a.id] = buildSeed(px, a.cat);
    });
    startTicker();
    startWhaleEngine();
  }

  function buildSeed(basePrice, cat) {
    const hist = []; let p = basePrice;
    const vol = VOLS[cat] || 0.001;
    for (let i = 0; i < HISTORY_SIZE; i++) {
      p *= 1 + (Math.random() - 0.5) * vol * 2;
      hist.push(parseFloat(p.toFixed(8)));
    }
    return hist;
  }

  // ── Mobile Detection ──────────────────────────────────────
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth < 768;

  // ── Market Regime Engine ──────────────────────────────────
  // Each asset gets an independent regime:
  //   bull  (+1) : trending up   — drift positive
  //   bear  (-1) : trending down — drift negative
  //   range ( 0) : sideways      — mean-reverting, tight range
  // Regimes change naturally after a variable number of ticks.
  // This produces real-looking charts: rallies, corrections, consolidations.
  const _regime = {};

  function _initRegime(id) {
    const roll = Math.random();
    _regime[id] = {
      dir:       roll < 0.45 ? 1 : roll < 0.80 ? -1 : 0,  // 45% bull, 35% bear, 20% range
      strength:  0.25 + Math.random() * 0.75,   // regime intensity 0.25–1.0
      remaining: 25  + Math.floor(Math.random() * 90), // ticks before next regime
      volMult:   0.7 + Math.random() * 0.6,     // 0.7×–1.3× base volatility
      momentum:  0,                              // price momentum carry
    };
  }

  function _advanceRegime(id, vol) {
    const reg = _regime[id];
    reg.remaining--;
    if (reg.remaining > 0) return;

    // Regime expired — pick a new one with realistic transitions
    const prev = reg.dir;
    const r    = Math.random();
    if (prev === 1)  reg.dir = r < 0.40 ? -1 : r < 0.65 ? 0 : 1;   // bull → often correct or range
    else if (prev === -1) reg.dir = r < 0.35 ? 1 : r < 0.60 ? 0 : -1; // bear → often bounce or range
    else            reg.dir = r < 0.45 ? 1 : r < 0.80 ? -1 : 0;    // range → break either way

    reg.strength  = 0.20 + Math.random() * 0.80;
    reg.remaining = 20   + Math.floor(Math.random() * 100);
    // Volatility often expands on regime change (breakout) then settles
    reg.volMult   = 0.8  + Math.random() * 1.2;
    reg.momentum  = 0;  // reset momentum on regime switch
  }

  // ── Tick Engine ──────────────────────────────────────────
  function startTicker() {
    const TICK_RATE = isMobile ? 2500 : 600;
    tickTimer = setInterval(() => {
      ASSETS.forEach(a => tick(a.id));
      emit('tick', getTickerSnapshot());
    }, TICK_RATE);
  }

  function tick(id) {
    const s   = state[id];
    const vol = VOLS[s.cat] || 0.001;

    // Boot regime on first tick
    if (!_regime[id]) _initRegime(id);
    const reg = _regime[id];
    _advanceRegime(id, vol);

    // ── Price move = regime drift + volatility noise + momentum carry ──
    // Regime drift: direction * strength governs the trend component
    const drift       = reg.dir * reg.strength * vol * 0.45;
    // Noise: fat-tailed — occasionally a bigger move (± 3× normal)
    const u = Math.random();
    const noiseScale  = u < 0.05 ? 3.0 : u < 0.15 ? 1.8 : 1.0; // 5% spike, 10% elevated
    const noise       = (Math.random() - 0.5) * vol * 1.8 * noiseScale * reg.volMult;
    // Momentum carry: 18% of previous move continues (short-term autocorrelation)
    const carry       = reg.momentum * 0.18;

    const totalMove   = drift + noise + carry;
    reg.momentum      = totalMove;  // store for next tick

    const raw   = s.price * (1 + totalMove);
    // Clamp: prevent runaway price (soft mean-reversion toward seed price at extreme ±40%)
    const seed  = ASSETS.find(a => a.id === id)?.price || s.price;
    const ratio = raw / seed;
    const clamped = ratio > 1.4 ? raw * 0.9992 : ratio < 0.6 ? raw * 1.0008 : raw;
    const price = parseFloat(clamped.toFixed(s.price > 10000 ? 1 : s.price > 100 ? 2 : s.price > 1 ? 4 : 6));

    const prev  = s.price;
    s.price     = price;
    s.ask       = parseFloat((price * 1.0002).toFixed(8));
    s.bid       = parseFloat((price * 0.9998).toFixed(8));
    s.spread    = parseFloat((s.ask - s.bid).toFixed(8));
    s.lastUpdate = Date.now();

    if (price > s.high24h) s.high24h = price;
    if (price < s.low24h)  s.low24h  = price;

    s.chg24h = parseFloat((price - s.prevClose).toFixed(8));
    s.pct24h = parseFloat(((s.chg24h / s.prevClose) * 100).toFixed(3));

    // Volume spikes on bigger moves (realistic market microstructure)
    const movePct = Math.abs(totalMove);
    s.vol24h = s.vol24h * (1 + (Math.random() - 0.5) * 0.003 + movePct * 2);

    const hist = priceHistory[id];
    hist.push(price);
    if (hist.length > HISTORY_SIZE) hist.shift();

    emit(`price:${id}`, { id, price, prev, chg: s.chg24h, pct: s.pct24h, ask: s.ask, bid: s.bid });
  }

  // ── Order Book ───────────────────────────────────────────
  function getOrderBook(id, depth = 12) {
    const s = state[id];
    if (!s) return { asks: [], bids: [], mid: 0, spread: 0 };
    const px = s.price;
    const step = s.price > 1000 ? 5 : s.price > 100 ? 0.5 : s.price > 1 ? 0.02 : 0.0002;
    const asks = [], bids = [];

    let askCumVol = 0, bidCumVol = 0;
    for (let i = 0; i < depth; i++) {
      const askPx = parseFloat((px * (1 + 0.0002 + i * 0.00018) + (Math.random()*.3-0.15)*step).toFixed(8));
      const bidPx = parseFloat((px * (1 - 0.0002 - i * 0.00018) - (Math.random()*.3-0.15)*step).toFixed(8));
      const askVol = parseFloat((Math.random() * 8 + 0.5).toFixed(3));
      const bidVol = parseFloat((Math.random() * 8 + 0.5).toFixed(3));
      askCumVol += askVol; bidCumVol += bidVol;
      asks.push({ price: askPx, vol: askVol, cumVol: parseFloat(askCumVol.toFixed(3)) });
      bids.push({ price: bidPx, vol: bidVol, cumVol: parseFloat(bidCumVol.toFixed(3)) });
    }
    return { asks, bids, mid: px, spread: s.spread, spreadPct: ((s.spread / px) * 100).toFixed(4) };
  }

  // ── Whale Engine ─────────────────────────────────────────
  function startWhaleEngine() {
    whaleTimer = setInterval(() => {
      if (Math.random() < 0.35) {
        const asset = ASSETS[Math.floor(Math.random() * ASSETS.length)];
        const s     = state[asset.id];
        if (!s) return;
        const side  = Math.random() > 0.5 ? 'buy' : 'sell';
        const sizeUSD = (Math.random() * 90 + 10) * 1e6;
        const qty   = parseFloat((sizeUSD / s.price).toFixed(4));
        emit('whale', {
          symbol: asset.sym, side, qty,
          sizeUSD: sizeUSD.toFixed(0),
          price: s.price, ts: Date.now(),
          exchange: ['Binance','Coinbase','Kraken','OKX','Bybit'][Math.floor(Math.random()*5)],
        });
      }
    }, 3200);
  }

  // ── Public Data Accessors ────────────────────────────────
  function getAllAssets() { return ASSETS.map(a => ({ ...state[a.id] })); }

  function getAsset(id) { return state[id] ? { ...state[id] } : null; }

  function getByCategory(cat) {
    return ASSETS.filter(a => a.cat === cat).map(a => ({ ...state[a.id] }));
  }

  function getTickerSnapshot() {
    return ASSETS.slice(0, 12).map(a => {
      const s = state[a.id];
      return { sym: a.sym, price: s.price, pct: s.pct24h };
    });
  }

  function getPriceHistory(id, len = 100) {
    const hist = priceHistory[id];
    if (!hist) return [];
    return hist.slice(-len);
  }

  // ═══════════════════════════════════════════════════════════
  // 1. TIME SERIES MATHEMATICS — Core Foundation
  //    Geometric Brownian Motion: dS = μ·S·dt + σ·S·dW
  //    S(t+dt) = S(t) · exp((μ - σ²/2)·dt + σ·√dt·Z)
  // ═══════════════════════════════════════════════════════════

  // Seeded PRNG (Mulberry32) — deterministic candle generation
  // Same seed → same candle every time (no flickering on re-render)
  function _mulberry32(seed) {
    return function() {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // Deterministic hash from (assetId, candleTimestamp, interval)
  function _hashSeed(assetId, timestamp, interval) {
    let hash = 5381;
    const str = `${assetId}|${Math.floor(timestamp)}|${interval}`;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }

  // Box-Muller Transform — generates Z ~ N(0,1) from U(0,1)
  function _boxMuller(rng) {
    const u1 = Math.max(rng(), 1e-10); // avoid log(0)
    const u2 = rng();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  // ── 5. Probability & Stochastic Processes — Parameters ──
  // Annualized volatility σ by asset class
  const _SIGMA = {
    crypto: 0.65, stocks: 0.25, forex: 0.08,
    commodities: 0.20, indices: 0.15, defi: 0.85, etf: 0.22,
  };
  // Annualized drift μ by asset class
  const _MU = {
    crypto: 0.10, stocks: 0.08, forex: 0.00,
    commodities: 0.03, indices: 0.07, defi: 0.12, etf: 0.07,
  };
  const _SECS_PER_YEAR = 365.25 * 24 * 3600;

  // Price rounding by magnitude
  function _roundPrice(val, refPrice) {
    if (refPrice > 10000) return parseFloat(val.toFixed(1));
    if (refPrice > 100)   return parseFloat(val.toFixed(2));
    if (refPrice > 1)     return parseFloat(val.toFixed(4));
    return parseFloat(val.toFixed(6));
  }

  // ═══════════════════════════════════════════════════════════
  // 2. OHLC AGGREGATION LOGIC — How One Candle Is Built
  //    Each candle = Brownian bridge sub-ticks within a
  //    time-aligned window, aggregated into O/H/L/C
  // ═══════════════════════════════════════════════════════════

  function getOHLCV(id, bars = 60, period = '5m') {
    const intervalMap = {
      'M1': 60000,    '1m': 60000,
      'M5': 300000,   '5m': 300000,
      'M15': 900000,  '15m': 900000,
      'H1': 3600000,  '1h': 3600000,
      'H4': 14400000, '4h': 14400000,
      'D1': 86400000, '1d': 86400000,
    };
    const intervalMs = intervalMap[period] || 300000;

    // ── Look up asset ──────────────────────────────────────
    const asset = ASSETS.find(a => a.id === id);
    if (!asset) return [];
    const currentPrice = state[id]?.price || asset.price;
    const refPrice     = asset.price;
    const cat          = asset.cat || 'crypto';

    // ── Stochastic parameters (per-asset unique) ────────────
    // Hash asset ID into a small modifier so each asset has
    // a distinct volatility & drift signature, not just per-class
    let _assetHash = 0;
    for (let c = 0; c < id.length; c++) _assetHash = ((_assetHash << 5) - _assetHash + id.charCodeAt(c)) | 0;
    const assetMod = ((_assetHash & 0xFFFF) / 65536) * 0.5 - 0.25; // -0.25 to +0.25
    const sigma    = (_SIGMA[cat] || 0.60) * (1 + assetMod * 0.4);  // +/-10% vol variation
    const mu       = (_MU[cat]    || 0.05) + assetMod * 0.04;       // +/-1% drift variation
    const candleSec = intervalMs / 1000;
    const dt       = candleSec / _SECS_PER_YEAR;   // candle as year-fraction
    const TICKS    = 30;                            // sub-ticks per candle
    const dtTick   = dt / TICKS;
    const subSigma = sigma * Math.sqrt(dtTick);

    // ── Time alignment: snap to real clock boundary ────────
    // 5m candles open at :00 :05 :10 …
    // 1h candles open at the hour, 4h at 00:00/04:00, etc.
    const now            = Date.now();
    const latestBoundary = Math.floor(now / intervalMs) * intervalMs;

    // ── Step 1: Seeded candle-level log-returns ────────────
    const candleMeta = [];
    for (let i = 0; i < bars; i++) {
      const candleTime = latestBoundary - (bars - 1 - i) * intervalMs;
      const seed  = _hashSeed(id, candleTime, intervalMs);
      const rng   = _mulberry32(seed);
      const z     = _boxMuller(rng);
      const logRet = (mu - 0.5 * sigma * sigma) * dt + sigma * Math.sqrt(dt) * z;
      candleMeta.push({ logRet, rng, candleTime });
    }

    // ── Step 2: Anchor — last candle close ≈ live price ────
    let cumLogReturn = 0;
    for (const cm of candleMeta) cumLogReturn += cm.logRet;
    let price = currentPrice * Math.exp(-cumLogReturn);

    // ── Step 3: Forward pass — sub-tick aggregation ────────
    const ohlcv = [];
    for (let i = 0; i < bars; i++) {
      const { logRet, rng, candleTime } = candleMeta[i];
      const candleClose = price * Math.exp(logRet);

      // Brownian bridge: sub-ticks interpolate O→C with stochastic deviation
      const ticks = [price];
      for (let t = 1; t <= TICKS; t++) {
        const frac   = t / TICKS;
        const target = price + (candleClose - price) * frac;
        const z      = _boxMuller(rng);
        const dev    = Math.abs(target) * subSigma * z * Math.sqrt(1 - frac + 0.05);
        ticks.push(Math.max(target + dev, price * 0.85));
      }
      ticks[ticks.length - 1] = candleClose; // force exact close

      const o = ticks[0];
      const c = ticks[ticks.length - 1];
      const h = Math.max(...ticks);
      const l = Math.min(...ticks);

      // ── 3. Returns & Volume — correlated with |log-return| ──
      const absRet  = Math.abs(logRet);
      const baseVol = 200 + rng() * 800;
      const v = parseFloat((baseVol * (1 + absRet * 25) * (0.7 + rng() * 0.6)).toFixed(2));

      ohlcv.push({
        t: candleTime,
        o: _roundPrice(o, refPrice),
        h: _roundPrice(h, refPrice),
        l: _roundPrice(l, refPrice),
        c: _roundPrice(c, refPrice),
        v,
      });

      price = candleClose; // next candle opens at this close
    }

    return ohlcv;
  }

  // ═══════════════════════════════════════════════════════════
  // 6. PATTERN RECOGNITION — AI-Level Candlestick Analysis
  //    Detects: Doji, Hammer, Shooting Star, Marubozu,
  //    Engulfing, Piercing, Dark Cloud, Morning/Evening Star,
  //    Three White Soldiers, Three Black Crows
  // ═══════════════════════════════════════════════════════════

  function detectPatterns(ohlcv) {
    if (!ohlcv || ohlcv.length < 3) return [];
    const patterns = [];

    for (let i = 0; i < ohlcv.length; i++) {
      const candle = ohlcv[i];
      const body   = Math.abs(candle.c - candle.o);
      const range  = candle.h - candle.l;
      const upperW = candle.h - Math.max(candle.o, candle.c);
      const lowerW = Math.min(candle.o, candle.c) - candle.l;
      const bull   = candle.c >= candle.o;

      if (range === 0) continue;

      // ── Single-candle patterns ───────────────────────────

      // Doji: body < 10% of range
      if (body / range < 0.10) {
        patterns.push({ i, t: candle.t, type: 'doji', signal: 'neutral', name: 'Doji' });
      }

      // Hammer: long lower wick, tiny upper wick (bullish reversal)
      if (lowerW > body * 2 && upperW < body * 0.5 && body > 0) {
        patterns.push({ i, t: candle.t, type: 'hammer', signal: 'bullish', name: 'Hammer' });
      }

      // Shooting Star / Inverted Hammer
      if (upperW > body * 2 && lowerW < body * 0.5 && body > 0) {
        patterns.push({ i, t: candle.t, type: 'shooting_star', signal: bull ? 'bullish' : 'bearish',
          name: bull ? 'Inverted Hammer' : 'Shooting Star' });
      }

      // Marubozu: negligible wicks, strong conviction
      if (body > 0 && upperW < body * 0.05 && lowerW < body * 0.05) {
        patterns.push({ i, t: candle.t, type: 'marubozu', signal: bull ? 'bullish' : 'bearish',
          name: bull ? 'Bullish Marubozu' : 'Bearish Marubozu' });
      }

      // ── Two-candle patterns ──────────────────────────────
      if (i > 0) {
        const p = ohlcv[i - 1];
        const pBody = Math.abs(p.c - p.o);
        const pBull = p.c >= p.o;

        // Bullish Engulfing
        if (!pBull && bull && candle.o <= p.c && candle.c >= p.o && body > pBody) {
          patterns.push({ i, t: candle.t, type: 'engulfing', signal: 'bullish', name: 'Bullish Engulfing' });
        }
        // Bearish Engulfing
        if (pBull && !bull && candle.o >= p.c && candle.c <= p.o && body > pBody) {
          patterns.push({ i, t: candle.t, type: 'engulfing', signal: 'bearish', name: 'Bearish Engulfing' });
        }
        // Piercing Line
        if (!pBull && bull && candle.o < p.c && candle.c > (p.o + p.c) / 2) {
          patterns.push({ i, t: candle.t, type: 'piercing', signal: 'bullish', name: 'Piercing Line' });
        }
        // Dark Cloud Cover
        if (pBull && !bull && candle.o > p.c && candle.c < (p.o + p.c) / 2) {
          patterns.push({ i, t: candle.t, type: 'dark_cloud', signal: 'bearish', name: 'Dark Cloud Cover' });
        }
      }

      // ── Three-candle patterns ────────────────────────────
      if (i > 1) {
        const p1 = ohlcv[i - 1], p2 = ohlcv[i - 2];
        const p1Body = Math.abs(p1.c - p1.o), p2Body = Math.abs(p2.c - p2.o);
        const p1Bull = p1.c >= p1.o, p2Bull = p2.c >= p2.o;

        // Morning Star: bearish → tiny body → bullish
        if (!p2Bull && p1Body < p2Body * 0.3 && bull && candle.c > (p2.o + p2.c) / 2) {
          patterns.push({ i, t: candle.t, type: 'morning_star', signal: 'bullish', name: 'Morning Star' });
        }
        // Evening Star: bullish → tiny body → bearish
        if (p2Bull && p1Body < p2Body * 0.3 && !bull && candle.c < (p2.o + p2.c) / 2) {
          patterns.push({ i, t: candle.t, type: 'evening_star', signal: 'bearish', name: 'Evening Star' });
        }
        // Three White Soldiers
        if (p2Bull && p1Bull && bull && p1.c > p2.c && candle.c > p1.c) {
          patterns.push({ i, t: candle.t, type: 'three_soldiers', signal: 'bullish', name: 'Three White Soldiers' });
        }
        // Three Black Crows
        if (!p2Bull && !p1Bull && !bull && p1.c < p2.c && candle.c < p1.c) {
          patterns.push({ i, t: candle.t, type: 'three_crows', signal: 'bearish', name: 'Three Black Crows' });
        }
      }
    }

    return patterns;
  }

  function getFearGreed() {
    const btc = state['BTC'];
    if (!btc) return { value: 55, label: 'Neutral' };
    const pct = btc.pct24h;
    let val = 50 + pct * 8;
    val = Math.min(100, Math.max(0, val + (Math.random() - 0.5) * 6));
    val = Math.round(val);
    const label = val < 20 ? 'Extreme Fear' : val < 40 ? 'Fear' : val < 60 ? 'Neutral' : val < 80 ? 'Greed' : 'Extreme Greed';
    return { value: val, label };
  }

  function getMarketDominance() {
    const btc = state['BTC'], eth = state['ETH'];
    return {
      BTC: 52.3 + (Math.random() - 0.5) * 2,
      ETH: 17.8 + (Math.random() - 0.5),
      others: 29.9,
    };
  }

  // ── Indicators Computed From History ────────────────────
  function computeRSI(id, period = 14) {
    const hist = getPriceHistory(id, period * 3);
    if (hist.length < period + 1) return 50;
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
      const d = hist[hist.length - period - 1 + i] - hist[hist.length - period - 2 + i];
      if (d >= 0) gains += d; else losses -= d;
    }
    const avgG = gains / period, avgL = losses / period;
    if (avgL === 0) return 100;
    const rs = avgG / avgL;
    return parseFloat((100 - 100 / (1 + rs)).toFixed(1));
  }

  function computeMACD(id) {
    const hist = getPriceHistory(id, 60);
    const ema = (arr, n) => {
      const k = 2 / (n + 1);
      let e = arr[0];
      for (let i = 1; i < arr.length; i++) e = arr[i] * k + e * (1 - k);
      return e;
    };
    const ema12 = ema(hist, 12), ema26 = ema(hist, 26);
    const macd  = parseFloat((ema12 - ema26).toFixed(6));
    const h = getPriceHistory(id, 100);
    const signal = parseFloat((ema(h.map((_, i, a) => i < 26 ? a[26] : ema(a.slice(i-26, i+1), 12) - ema(a.slice(i-26, i+1), 26)), 9)).toFixed(6));
    return { macd, signal, hist: parseFloat((macd - signal).toFixed(6)) };
  }

  function computeBB(id, period = 20) {
    const hist = getPriceHistory(id, period + 5);
    const slice = hist.slice(-period);
    const mean  = slice.reduce((a, b) => a + b, 0) / period;
    const std   = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period);
    return {
      upper: parseFloat((mean + 2 * std).toFixed(6)),
      middle: parseFloat(mean.toFixed(6)),
      lower: parseFloat((mean - 2 * std).toFixed(6)),
    };
  }

  // ── Event Bus ────────────────────────────────────────────
  function on(event, fn) {
    if (!subscribers[event]) subscribers[event] = [];
    subscribers[event].push(fn);
  }
  function off(event, fn) {
    if (!subscribers[event]) return;
    subscribers[event] = subscribers[event].filter(f => f !== fn);
  }
  function emit(event, data) {
    (subscribers[event] || []).forEach(fn => { try { fn(data); } catch(e) {} });
  }

  // ── Real-Price Injection (called by RealDataAdapter) ────
  // Overwrites the simulated state with live exchange prices
  // so every downstream consumer (charts, tickers, order book) sees real data.
  function _injectRealPrice(symbol, data) {
    const s = state[symbol];
    if (!s) return;                          // asset not in our list — ignore
    if (!data.price || isNaN(data.price)) return;

    const prev  = s.price;
    s.price     = data.price;
    s.ask       = data.ask  || parseFloat((data.price * 1.0002).toFixed(8));
    s.bid       = data.bid  || parseFloat((data.price * 0.9998).toFixed(8));
    s.spread    = parseFloat((s.ask - s.bid).toFixed(8));
    s.lastUpdate = Date.now();

    if (data.high24h && data.high24h > 0) s.high24h = data.high24h;
    if (data.low24h  && data.low24h  > 0) s.low24h  = data.low24h;
    if (data.vol24h  && data.vol24h  > 0) s.vol24h  = data.vol24h;
    if (data.chg24h  != null)             s.chg24h  = data.chg24h;
    if (data.pct24h  != null)             s.pct24h  = data.pct24h;

    // Keep price history in sync
    const hist = priceHistory[symbol];
    if (hist) {
      hist.push(data.price);
      if (hist.length > HISTORY_SIZE) hist.shift();
    }

    // Fire the per-asset event so any listeners see the real price immediately
    emit(`price:${symbol}`, { id: symbol, price: data.price, prev, chg: s.chg24h, pct: s.pct24h, ask: s.ask, bid: s.bid });
  }

  // ── Cleanup ──────────────────────────────────────────────
  function destroy() {
    clearInterval(tickTimer); clearInterval(whaleTimer);
  }

  return {
    init, destroy,
    getAllAssets, getAsset, getByCategory,
    getTickerSnapshot, getPriceHistory, getOHLCV,
    getOrderBook, getFearGreed, getMarketDominance,
    computeRSI, computeMACD, computeBB,
    detectPatterns,
    on, off,
    _injectRealPrice, // For real data integration
  };
})();
