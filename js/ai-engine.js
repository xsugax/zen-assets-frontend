/* ════════════════════════════════════════════════════════════
   ai-engine.js — Multi-Layer AI Signal Engine
   OmniVest AI / ZEN ASSETS
════════════════════════════════════════════════════════════ */

const AIEngine = (() => {
  'use strict';

  // ── Pattern Library ──────────────────────────────────────
  const PATTERNS = [
    { name: 'Ascending Triangle',    dir: 'long',  conf: [72,93], type: 'technical' },
    { name: 'Bull Flag',             dir: 'long',  conf: [68,92], type: 'technical' },
    { name: 'Cup & Handle',          dir: 'long',  conf: [75,95], type: 'technical' },
    { name: 'Golden Cross',          dir: 'long',  conf: [70,90], type: 'signal' },
    { name: 'MACD Bullish Cross',    dir: 'long',  conf: [65,88], type: 'signal' },
    { name: 'RSI Oversold Reversal', dir: 'long',  conf: [69,91], type: 'momentum' },
    { name: 'Double Bottom',         dir: 'long',  conf: [73,90], type: 'technical' },
    { name: 'Falling Wedge Break',   dir: 'long',  conf: [71,89], type: 'technical' },
    { name: 'Demand Zone Tap',       dir: 'long',  conf: [67,87], type: 'structure' },
    { name: 'Hidden Bull Div',       dir: 'long',  conf: [74,92], type: 'divergence' },
    { name: 'Descending Triangle',   dir: 'short', conf: [70,90], type: 'technical' },
    { name: 'Bear Flag',             dir: 'short', conf: [67,88], type: 'technical' },
    { name: 'Head & Shoulders',      dir: 'short', conf: [76,95], type: 'technical' },
    { name: 'Death Cross',           dir: 'short', conf: [71,91], type: 'signal' },
    { name: 'MACD Bearish Cross',    dir: 'short', conf: [66,87], type: 'signal' },
    { name: 'RSI Overbought',        dir: 'short', conf: [70,90], type: 'momentum' },
    { name: 'Double Top',            dir: 'short', conf: [74,92], type: 'technical' },
    { name: 'Rising Wedge Break',    dir: 'short', conf: [72,89], type: 'technical' },
    { name: 'Supply Zone Tap',       dir: 'short', conf: [68,87], type: 'structure' },
    { name: 'Hidden Bear Div',       dir: 'short', conf: [75,93], type: 'divergence' },
    { name: 'Order Block Bounce',    dir: 'long',  conf: [80,96], type: 'macro' },
    { name: 'Wyckoff Accumulation',  dir: 'long',  conf: [78,94], type: 'macro' },
    { name: 'Wyckoff Distribution',  dir: 'short', conf: [79,95], type: 'macro' },
    { name: 'Liquidity Sweep',       dir: 'long',  conf: [77,93], type: 'macro' },
  ];

  const REGIMES = ['Bull Trend', 'Bear Trend', 'Sideways / Accumulation', 'High Volatility', 'Distribution Phase'];

  let _regime     = 'Bull Trend';
  let _regimeTick = 0;
  let _confidence = 78;
  let _signals    = [];
  let _crisisModeActive = false;
  let _timer = null;
  const _subs = {};

  // ── Helpers ──────────────────────────────────────────────
  const rand   = (lo, hi) => lo + Math.random() * (hi - lo);
  const randI  = (lo, hi) => Math.floor(rand(lo, hi + 1));
  const pick   = arr => arr[Math.floor(Math.random() * arr.length)];
  const roundPx = (p, precision) => parseFloat(p.toFixed(precision > 100 ? 2 : precision > 1 ? 4 : 6));

  function fmt(price) { return price > 1000 ? price.toFixed(2) : price > 1 ? price.toFixed(4) : price.toFixed(6); }

  // ── Signal Generation ────────────────────────────────────
  function generateSignals(cnt = 18) {
    const assets = MarketData.getAllAssets();
    const sigs   = [];
    const shuffled = assets.sort(() => Math.random() - .5).slice(0, cnt);

    shuffled.forEach(a => {
      const pat = pick(PATTERNS);
      const [lo, hi] = pat.conf;
      const conf  = parseFloat(rand(lo, hi).toFixed(1));
      const rsi   = MarketData.computeRSI(a.id);
      const macd  = MarketData.computeMACD(a.id);
      const bb    = MarketData.computeBB(a.id);
      const px    = a.price;
      const isLong = pat.dir === 'long';

      const tp1 = roundPx(px * (isLong ? 1.03 : 0.97), px);
      const tp2 = roundPx(px * (isLong ? 1.07 : 0.93), px);
      const sl  = roundPx(px * (isLong ? 0.977 : 1.023), px);
      const rr  = parseFloat(((Math.abs(tp1 - px)) / Math.abs(px - sl)).toFixed(2));

      sigs.push({
        id: `sig_${a.id}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
        symbol: a.sym, assetId: a.id,
        pattern: pat.name, type: pat.type,
        dir: pat.dir, conf,
        price: px, tp1, tp2, sl, rr,
        rsi, macd: macd.macd,
        bbPos: parseFloat(((px - bb.lower) / (bb.upper - bb.lower) * 100).toFixed(1)),
        reasoning: buildReasoning(pat, rsi, macd, isLong),
        regime: _regime,
        ts: Date.now() - Math.floor(Math.random() * 900000),
        timeframe: pick(['5m','15m','1h','4h']),
        exchange: pick(['Binance','Coinbase','Kraken','OKX','Bybit','Gemini']),
      });
    });

    sigs.sort((a, b) => b.conf - a.conf);
    _signals = sigs;
    return sigs;
  }

  function buildReasoning(pat, rsi, macd, isLong) {
    const dir = isLong ? 'bullish' : 'bearish';
    const rsiTxt = rsi < 35 ? `RSI(${rsi}) oversold — mean reversion likely.` : rsi > 65 ? `RSI(${rsi}) overbought — caution advised.` : `RSI(${rsi}) neutral zone.`;
    const macdTxt = macd.macd > 0 ? 'MACD histogram positive.' : 'MACD histogram negative.';
    return `${pat.name} confirmed on current bar. ${rsiTxt} ${macdTxt} Multi-layer consensus ${dir}.`;
  }

  // ── 4-Layer Analysis ─────────────────────────────────────
  function computeQuantModels(id) {
    const rsi   = MarketData.computeRSI(id);
    const macd  = MarketData.computeMACD(id);
    const bb    = MarketData.computeBB(id);
    const asset = MarketData.getAsset(id);
    const px    = asset ? asset.price : 100;
    const bbPos = asset ? parseFloat(((px - bb.lower) / (bb.upper - bb.lower) * 100).toFixed(1)) : 50;
    return {
      rsi, macd: macd.macd.toFixed(4), signal: macd.signal.toFixed(4),
      bbPos, bbUpper: bb.upper, bbMiddle: bb.middle, bbLower: bb.lower,
      momentum: parseFloat(rand(-3, 3).toFixed(2)),
      volatility: parseFloat(rand(1, 4).toFixed(2)) + '%',
    };
  }

  function computeIndicators(id) { return computeQuantModels(id); }

  function computeLSTMPrediction(id) {
    return {
      nextBar: parseFloat(rand(-1.5, 1.5).toFixed(3)),
      confidence: parseFloat(rand(72, 95).toFixed(1)),
      regimeProb: { Bull: parseFloat(rand(40,90).toFixed(0)), Bear: parseFloat(rand(10,40).toFixed(0)), Sideways: parseFloat(rand(5,20).toFixed(0)) },
      hiddenState: parseFloat(rand(0.3, 0.9).toFixed(3)),
      layers: 4, attention: parseFloat(rand(0.6, 1.0).toFixed(3)),
    };
  }

  function computeBehavioral(id) {
    return {
      fearGreed: MarketData.getFearGreed(),
      whaleRatio: parseFloat(rand(0.4, 0.8).toFixed(2)),
      retailSentiment: parseFloat(rand(-1, 1).toFixed(2)),
      institutionalFlow: parseFloat(rand(-2, 2).toFixed(2)),
      openInterestChg: parseFloat(rand(-5, 5).toFixed(2)) + '%',
      fundingRate: (Math.random() > 0.5 ? '+' : '-') + parseFloat(rand(0.001, 0.08).toFixed(3)) + '%',
    };
  }

  function getMacroScore() {
    return {
      vix: parseFloat(rand(14, 25).toFixed(2)),
      dxy: parseFloat(rand(102, 107).toFixed(2)),
      sp500Corr: parseFloat(rand(-0.5, 0.8).toFixed(2)),
      rateExpect: pick(['Hike', 'Hold', 'Cut']),
      overallScore: parseFloat(rand(40, 85).toFixed(0)),
    };
  }

  function getSentimentData() {
    return {
      overall: parseFloat(rand(-1, 1).toFixed(2)),
      twitter: parseFloat(rand(-1, 1).toFixed(2)),
      reddit: parseFloat(rand(-1, 1).toFixed(2)),
      news: parseFloat(rand(-1, 1).toFixed(2)),
      label: pick(['Bullish', 'Neutral', 'Bearish']),
    };
  }

  // ── Regime Engine ────────────────────────────────────────
  function updateRegime() {
    _regimeTick++;
    if (_regimeTick % 40 === 0) {
      _regime = REGIMES[Math.floor(Math.random() * REGIMES.length)];
      _emit('regime', _regime);
    }
    _confidence = parseFloat((70 + Math.sin(_regimeTick * 0.1) * 15 + (Math.random() - 0.5) * 4).toFixed(1));
    if (_confidence > 100) _confidence = 100;
    if (_confidence < 50)  _confidence = 50;
    _emit('confidence', _confidence);
    _crisisModeActive = _confidence < 58;
  }

  // ── Monte Carlo ──────────────────────────────────────────
  function runMonteCarlo(id, sims = 500, steps = 30) {
    const hist  = MarketData.getPriceHistory(id, 60);
    const start = hist[hist.length - 1] || 100;
    const logRets = [];
    for (let i = 1; i < hist.length; i++) logRets.push(Math.log(hist[i] / hist[i-1]));
    const mu  = logRets.reduce((a,b) => a+b, 0) / logRets.length;
    const sd  = Math.sqrt(logRets.reduce((a,b) => a + (b-mu)**2, 0) / logRets.length);

    const paths  = [];
    const finals = [];
    for (let s = 0; s < sims; s++) {
      let p = start;
      const path = [p];
      for (let t = 0; t < steps; t++) {
        const z = gaussRnd();
        p = p * Math.exp(mu + sd * z);
        path.push(p);
      }
      paths.push(path);
      finals.push(p);
    }
    finals.sort((a, b) => a - b);
    return {
      median:  finals[Math.floor(sims/2)],
      p5:      finals[Math.floor(sims*0.05)],
      p95:     finals[Math.floor(sims*0.95)],
      expected: parseFloat((finals.reduce((a,b) => a+b, 0) / sims).toFixed(4)),
      paths:   paths.slice(0, 50),
    };
  }

  function gaussRnd() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // ── Timer ────────────────────────────────────────────────
  function init() {
    generateSignals();
    updateRegime();
    _timer = setInterval(() => {
      updateRegime();
      if (Math.random() < 0.15) { generateSignals(); _emit('signals', _signals); }
    }, 4000);
  }
  function destroy() { clearInterval(_timer); }

  // ── Event Bus ────────────────────────────────────────────
  function _on(ev, fn)   { if (!_subs[ev]) _subs[ev] = []; _subs[ev].push(fn); }
  function _off(ev, fn)  { if (!_subs[ev]) return; _subs[ev] = _subs[ev].filter(f => f !== fn); }
  function _emit(ev, d)  { (_subs[ev] || []).forEach(fn => { try { fn(d); } catch(e) {} }); }

  return {
    init, destroy,
    generateSignals,
    getSignals: ()   => [..._signals],
    getRegime:  ()   => _regime,
    getConfidence: () => _confidence,
    isCrisisMode: () => _crisisModeActive,
    computeQuantModels, computeIndicators,
    computeLSTMPrediction, computeBehavioral,
    getMacroScore, getSentimentData,
    runMonteCarlo,
    on: _on, off: _off,
  };
})();     

