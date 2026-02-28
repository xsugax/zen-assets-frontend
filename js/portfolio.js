/* ════════════════════════════════════════════════════════════
   portfolio.js — Portfolio Analytics Engine
   OmniVest AI / ZEN ASSETS
════════════════════════════════════════════════════════════ */

const Portfolio = (() => {
  'use strict';

  const rand = (lo, hi) => lo + Math.random() * (hi - lo);

  // ── Holdings ─────────────────────────────────────────────
  let holdings = [
    { id: 'BTC',   sym: 'BTC/USD',  name: 'Bitcoin',   qty: 1.84,   avgEntry: 58200,  cat: 'crypto',    risk: 'high' },
    { id: 'ETH',   sym: 'ETH/USD',  name: 'Ethereum',  qty: 12.5,   avgEntry: 3120,   cat: 'crypto',    risk: 'high' },
    { id: 'SOL',   sym: 'SOL/USD',  name: 'Solana',    qty: 80,     avgEntry: 145,    cat: 'crypto',    risk: 'high' },
    { id: 'AAPL',  sym: 'AAPL',     name: 'Apple',     qty: 40,     avgEntry: 195,    cat: 'stocks',    risk: 'low'  },
    { id: 'NVDA',  sym: 'NVDA',     name: 'NVIDIA',    qty: 15,     avgEntry: 720,    cat: 'stocks',    risk: 'med'  },
    { id: 'TSLA',  sym: 'TSLA',     name: 'Tesla',     qty: 25,     avgEntry: 225,    cat: 'stocks',    risk: 'med'  },
    { id: 'GOLD',  sym: 'XAU/USD',  name: 'Gold',      qty: 8,      avgEntry: 2250,   cat: 'commodities',risk:'low' },
    { id: 'EURUSD',sym: 'EUR/USD',  name: 'Euro/USD',  qty: 50000,  avgEntry: 1.0780, cat: 'forex',     risk: 'low'  },
    { id: 'LINK',  sym: 'LINK/USD', name: 'Chainlink', qty: 400,    avgEntry: 14.20,  cat: 'defi',      risk: 'high' },
    { id: 'UNI',   sym: 'UNI/USD',  name: 'Uniswap',   qty: 600,    avgEntry: 7.80,   cat: 'defi',      risk: 'high' },
  ];

  // ── Equity Curve Seed ────────────────────────────────────
  const _equityHistory = (() => {
    const curve = [100000];
    for (let i = 1; i < 90; i++) {
      const d = curve[i-1] * (1 + (Math.random() - 0.44) * 0.018);
      curve.push(parseFloat(d.toFixed(2)));
    }
    return curve;
  })();

  // ── Compute Metrics ──────────────────────────────────────
  function computeMetrics() {
    const assets = MarketData.getAllAssets();
    const aMap = {}; assets.forEach(a => { aMap[a.id] = a; });

    let totalValue = 0, totalCost = 0;
    const enriched = holdings.map(h => {
      const a   = aMap[h.id];
      const px  = a ? a.price : h.avgEntry;
      const val = px * h.qty;
      const cost = h.avgEntry * h.qty;
      const pnl = val - cost;
      const pct = ((pnl / cost) * 100).toFixed(2);
      const aiScore = a ? AIEngine.computeRSI?.(h.id) ?? parseFloat(rand(60,95).toFixed(1)) : parseFloat(rand(60,95).toFixed(1));
      totalValue += val; totalCost += cost;
      return { ...h, price: px, value: val, cost, pnl, pct: parseFloat(pct), aiScore: parseFloat(rand(60,95).toFixed(1)), pct24h: a ? a.pct24h : 0 };
    });

    const totalPnL  = totalValue - totalCost;
    const totalPct  = ((totalPnL / totalCost) * 100).toFixed(2);
    const alloc     = enriched.map(h => ({ label: h.name, pct: parseFloat(((h.value / totalValue) * 100).toFixed(1)) }));

    // Risk metrics (computed from equity history)
    const hist  = _equityHistory;
    const rets  = hist.map((v, i) => i === 0 ? 0 : (v - hist[i-1]) / hist[i-1]).slice(1);
    const mean  = rets.reduce((a,b) => a+b, 0) / rets.length;
    const std   = Math.sqrt(rets.reduce((a,b) => a + (b-mean)**2, 0) / rets.length);

    const annualRet = mean * 252;
    const annualStd = std  * Math.sqrt(252);
    const sharpe    = annualStd > 0 ? (annualRet - 0.05) / annualStd : 0;

    const negRets = rets.filter(r => r < 0);
    const downStd = negRets.length > 0 ? Math.sqrt(negRets.reduce((a,b) => a + b**2, 0) / negRets.length) : std;
    const sortino = downStd > 0 ? (annualRet - 0.05) / (downStd * Math.sqrt(252)) : 0;

    // Max drawdown
    let peak = hist[0], maxDD = 0;
    hist.forEach(v => {
      if (v > peak) peak = v;
      const dd = (peak - v) / peak;
      if (dd > maxDD) maxDD = dd;
    });

    // Push today's simulated equity
    _equityHistory.push(_equityHistory[_equityHistory.length - 1] * (1 + (Math.random() - 0.45) * 0.015));
    if (_equityHistory.length > 200) _equityHistory.shift();

    return {
      totalValue, totalCost, totalPnL, totalPct: parseFloat(totalPct),
      alloc, enriched,
      sharpe: parseFloat(sharpe.toFixed(2)),
      sortino: parseFloat(sortino.toFixed(2)),
      maxDD: parseFloat((maxDD * 100).toFixed(2)),
      alpha: parseFloat(rand(2, 15).toFixed(2)),
      beta:  parseFloat(rand(0.7, 1.4).toFixed(2)),
      diversification: parseFloat(rand(70, 95).toFixed(0)),
      equityHistory: [..._equityHistory],
    };
  }

  // ── Correlation Matrix ───────────────────────────────────
  function correlationMatrix() {
    const syms = ['BTC', 'ETH', 'SOL', 'AAPL', 'NVDA', 'GOLD'];
    const matrix = syms.map((r, i) => syms.map((c, j) => {
      if (i === j) return 1.00;
      const base = i < 3 && j < 3 ? 0.65 : i >= 3 && j >= 3 ? 0.55 : -0.1;
      return parseFloat((base + (Math.random() - 0.5) * 0.3).toFixed(2));
    }));
    return { syms, matrix };
  }

  // ── Risk Heatmap ─────────────────────────────────────────
  function riskHeatmap() {
    return holdings.map(h => {
      const a = MarketData.getAsset(h.id);
      const rsi = a ? MarketData.computeRSI(h.id) : 50;
      let risk = 'low';
      if (rsi > 70 || rsi < 30 || h.risk === 'high') risk = 'high';
      else if (h.risk === 'med' || rsi > 60 || rsi < 40) risk = 'med';
      const val = VOLS_MAP[h.cat] || 0.5;
      return { id: h.id, sym: h.sym, name: h.name, risk, rsi, vol: val };
    });
  }
  const VOLS_MAP = { crypto: 0.85, stocks: 0.45, forex: 0.15, commodities: 0.40, defi: 0.90 };

  // ── Rebalance Plan ───────────────────────────────────────
  function rebalancePlan() {
    const TARGET = { crypto: 45, stocks: 30, forex: 10, commodities: 8, defi: 7 };
    const m = computeMetrics();
    const current = {};
    m.enriched.forEach(h => {
      current[h.cat] = (current[h.cat] || 0) + (h.value / m.totalValue * 100);
    });
    return Object.entries(TARGET).map(([cat, target]) => {
      const cur = current[cat] || 0;
      const delta = target - cur;
      return { cat, target, current: parseFloat(cur.toFixed(1)), delta: parseFloat(delta.toFixed(1)), action: delta > 2 ? 'buy' : delta < -2 ? 'reduce' : 'hold' };
    });
  }

  // ── Getters ──────────────────────────────────────────────
  function getHoldings()     { return [...holdings]; }
  function getEquityHistory(){ return [..._equityHistory]; }

  return {
    computeMetrics, correlationMatrix, riskHeatmap, rebalancePlan,
    getHoldings, getEquityHistory,
  };
})();
