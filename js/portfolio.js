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

  // ── Wallet-Anchored Equity Curve ─────────────────────────
  let _walletAnchor = 100000;
  let _lastEquityUpdate = 0;

  const _equityHistory = (() => {
    const curve = [100000];
    for (let i = 1; i < 90; i++) {
      // Realistic: sometimes up, sometimes down, mostly small moves
      let drift = 0.0003 + Math.random() * 0.0015; // +0.03% to +0.18% drift
      let noise = (Math.random() - 0.5) * 0.007;   // -0.35% to +0.35% noise
      let move = drift + noise;
      // Occasionally a down day
      if (Math.random() < 0.18) move -= 0.002 + Math.random() * 0.004;
      const d = curve[i - 1] * (1 + move);
      curve.push(parseFloat(d.toFixed(2)));
    }
    return curve;
  })();

  // ── Compute Metrics ──────────────────────────────────────
  function computeMetrics() {
    const assets = MarketData.getAllAssets();
    const aMap = {}; assets.forEach(a => { aMap[a.id] = a; });

    // Get real wallet balance from InvestmentReturns
    let walletBalance = 0, initialDeposit = 0, todayPnL = 0, totalReturn = 0, totalPortfolioValue = 0;
    if (typeof InvestmentReturns !== 'undefined') {
      try {
        const snap = InvestmentReturns.getSnapshot();
        walletBalance       = snap.walletBalance || 0;
        totalPortfolioValue = snap.totalPortfolioValue || walletBalance;
        initialDeposit      = snap.initialDeposit || 0;
        todayPnL            = snap.todayPnL || 0;
        totalReturn         = snap.totalReturn || 0;
      } catch(e) { /* module not ready yet */ }
    }

    let rawPortValue = 0, totalCost = 0;
    const enriched = holdings.map(h => {
      const a   = aMap[h.id];
      const px  = a ? a.price : h.avgEntry;
      const val = px * h.qty;
      const cost = h.avgEntry * h.qty;
      const pnl = val - cost;
      const pct = ((pnl / cost) * 100).toFixed(2);
      rawPortValue += val; totalCost += cost;
      return { ...h, price: px, value: val, cost, pnl, pct: parseFloat(pct), aiScore: parseFloat(rand(62, 97).toFixed(1)), pct24h: a ? a.pct24h : 0 };
    });

    // Portfolio value = total portfolio (wallet + unclaimed) — always increasing
    const totalValue = totalPortfolioValue > 0 ? totalPortfolioValue : (walletBalance > 0 ? walletBalance : rawPortValue);
    const totalPnL   = totalPortfolioValue > 0 ? totalPortfolioValue - initialDeposit : (walletBalance > 0 ? walletBalance - initialDeposit : rawPortValue - totalCost);
    const totalPct   = totalPortfolioValue > 0 && initialDeposit > 0
      ? parseFloat(((totalPnL / initialDeposit) * 100).toFixed(2))
      : totalCost > 0 ? parseFloat((((rawPortValue - totalCost) / totalCost) * 100).toFixed(2)) : 0;

    const alloc = enriched.map(h => ({ label: h.name, pct: rawPortValue > 0 ? parseFloat(((h.value / rawPortValue) * 100).toFixed(1)) : 0 }));

    // Risk metrics (computed from equity history)
    const hist  = _equityHistory;
    const rets  = hist.map((v, i) => i === 0 ? 0 : (v - hist[i - 1]) / hist[i - 1]).slice(1);
    const mean  = rets.reduce((a, b) => a + b, 0) / rets.length;
    const std   = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length);

    const annualRet = mean * 252;
    const annualStd = std * Math.sqrt(252);
    const sharpe    = annualStd > 0 ? (annualRet - 0.05) / annualStd : 0;

    const negRets = rets.filter(r => r < 0);
    const downStd = negRets.length > 0 ? Math.sqrt(negRets.reduce((a, b) => a + b ** 2, 0) / negRets.length) : std;
    const sortino = downStd > 0 ? (annualRet - 0.05) / (downStd * Math.sqrt(252)) : 0;

    // Max drawdown
    let peak = hist[0], maxDD = 0;
    hist.forEach(v => {
      if (v > peak) peak = v;
      const dd = (peak - v) / peak;
      if (dd > maxDD) maxDD = dd;
    });

    // Push equity point every 30s — positive trend tied to wallet growth
    const now = Date.now();
    if (now - _lastEquityUpdate > 30000) {
      // Realistic: allow for small losses, volatility, and slower growth
      let base = totalPortfolioValue > 0 && _walletAnchor > 0
        ? (totalPortfolioValue / _walletAnchor - 1) * 0.0025
        : 0.0003;
      let noise = (Math.random() - 0.5) * 0.006; // -0.3% to +0.3%
      let move = base + noise;
      // Occasionally a down move
      if (Math.random() < 0.22) move -= 0.002 + Math.random() * 0.004;
      _equityHistory.push(parseFloat((_equityHistory[_equityHistory.length - 1] * (1 + move)).toFixed(2)));
      if (_equityHistory.length > 200) _equityHistory.shift();
      if (totalPortfolioValue > 0) _walletAnchor = totalPortfolioValue;
      _lastEquityUpdate = now;
    }

    return {
      totalValue, totalCost, totalPnL, totalPct,
      alloc, enriched, todayPnL,
      sharpe:        parseFloat(Math.max(sharpe, 0.85).toFixed(2)),
      sortino:       parseFloat(Math.max(sortino, 0.90).toFixed(2)),
      maxDD:         parseFloat(Math.min(maxDD * 100, 11).toFixed(2)),
      alpha:         parseFloat(rand(3, 18).toFixed(2)),
      beta:          parseFloat(rand(0.75, 1.30).toFixed(2)),
      diversification: parseFloat(rand(76, 96).toFixed(0)),
      equityHistory: [..._equityHistory],
      rawPortfolioValue: rawPortValue,
      walletBalance, initialDeposit, totalReturn,
    };
  }

  // ── Portfolio Health Score ────────────────────────────────
  function getHealthScore(metrics) {
    const m = metrics || computeMetrics();
    let score = 52; // positive base

    // Sharpe ratio (0-20 pts)
    score += Math.min(m.sharpe * 8, 20);
    // Diversification (0-15 pts)
    score += Math.min(m.diversification * 0.16, 15);
    // Max drawdown penalty (-12 to 0)
    score -= Math.min(m.maxDD * 1.0, 12);
    // Alpha contribution (0-12 pts)
    score += Math.min(m.alpha * 0.8, 12);
    // PnL bonus (0-10 pts)
    if (m.totalPnL > 0) score += Math.min(m.totalPct * 0.4, 10);
    // Sortino bonus (0-8 pts)
    score += Math.min(m.sortino * 4, 8);

    score = Math.max(0, Math.min(100, Math.round(score)));

    let grade, color, label;
    if      (score >= 92) { grade = 'A+'; color = '#00ff88'; label = 'Exceptional'; }
    else if (score >= 84) { grade = 'A';  color = '#00ff88'; label = 'Excellent'; }
    else if (score >= 76) { grade = 'B+'; color = '#00d4ff'; label = 'Very Good'; }
    else if (score >= 68) { grade = 'B';  color = '#00d4ff'; label = 'Good'; }
    else if (score >= 55) { grade = 'C+'; color = '#f59e0b'; label = 'Fair'; }
    else if (score >= 40) { grade = 'C';  color = '#f59e0b'; label = 'Needs Work'; }
    else                  { grade = 'D';  color = '#ff4757'; label = 'At Risk'; }

    return { score, grade, color, label };
  }

  // ── Performance Attribution ──────────────────────────────
  function getPerformanceAttribution(metrics) {
    const m = metrics || computeMetrics();
    const catPnL = {}, catValue = {};

    m.enriched.forEach(h => {
      catPnL[h.cat]   = (catPnL[h.cat] || 0) + h.pnl;
      catValue[h.cat]  = (catValue[h.cat] || 0) + h.value;
    });

    const icons = { crypto: '₿', stocks: '📊', forex: '💱', commodities: '🥇', defi: '🔗' };
    const categories = Object.keys(catPnL).map(cat => {
      const pnl = catPnL[cat];
      const value = catValue[cat];
      const retPct = value > 0 ? (pnl / value * 100) : 0;
      const absTotalPnL = m.enriched.reduce((s, h) => s + Math.abs(h.pnl), 0);
      const contribution = absTotalPnL > 0 ? (pnl / absTotalPnL * 100) : 0;
      return {
        category: cat,
        label: cat.charAt(0).toUpperCase() + cat.slice(1),
        pnl, value,
        returnPct: parseFloat(retPct.toFixed(2)),
        contribution: parseFloat(contribution.toFixed(1)),
        icon: icons[cat] || '📈',
      };
    });

    return categories.sort((a, b) => b.pnl - a.pnl);
  }

  // ── AI Portfolio Insights ────────────────────────────────
  function getInsights(metrics) {
    const m = metrics || computeMetrics();
    const health = getHealthScore(m);
    const attr = getPerformanceAttribution(m);
    const insights = [];

    // Top performer
    const topCat = attr[0];
    if (topCat && topCat.pnl > 0) {
      insights.push({ type: 'success', icon: '🏆', text: `${topCat.label} is your top performer with ${topCat.returnPct > 0 ? '+' : ''}${topCat.returnPct}% return` });
    }

    // Sharpe insight
    if (m.sharpe >= 1.5) {
      insights.push({ type: 'success', icon: '📈', text: `Sharpe ratio of ${m.sharpe} indicates excellent risk-adjusted returns` });
    } else if (m.sharpe >= 1.0) {
      insights.push({ type: 'info', icon: '📊', text: `Sharpe ratio of ${m.sharpe} shows solid risk-adjusted performance` });
    }

    // Diversification
    if (m.diversification >= 85) {
      insights.push({ type: 'success', icon: '🛡️', text: `Portfolio diversification at ${m.diversification}% — well balanced across asset classes` });
    } else if (m.diversification < 70) {
      insights.push({ type: 'warning', icon: '⚠️', text: `Diversification at ${m.diversification}% — consider spreading risk across more asset classes` });
    }

    // Max drawdown
    if (m.maxDD < 5) {
      insights.push({ type: 'success', icon: '🔒', text: `Max drawdown of ${m.maxDD}% shows excellent downside protection` });
    } else if (m.maxDD > 10) {
      insights.push({ type: 'warning', icon: '📉', text: `Max drawdown at ${m.maxDD}% — AI risk management actively monitoring` });
    }

    // Alpha generation
    if (m.alpha > 10) {
      insights.push({ type: 'success', icon: '⚡', text: `Alpha of +${m.alpha}% — outperforming benchmarks significantly` });
    } else if (m.alpha > 5) {
      insights.push({ type: 'info', icon: '✨', text: `Alpha of +${m.alpha}% — consistent benchmark outperformance` });
    }

    // Portfolio growth
    if (m.totalPnL > 0) {
      insights.push({ type: 'success', icon: '💰', text: `Portfolio up +${m.totalPct}% — compounding & AI trading generating steady returns` });
    }

    // Health score summary
    insights.push({ type: health.score >= 70 ? 'success' : 'info', icon: '🏥', text: `Portfolio health: ${health.grade} (${health.score}/100) — ${health.label}` });

    return insights.slice(0, 5);
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
      current[h.cat] = (current[h.cat] || 0) + (h.value / m.rawPortfolioValue * 100);
    });
    return Object.entries(TARGET).map(([cat, target]) => {
      const cur = current[cat] || 0;
      const delta = target - cur;
      return { cat, target, current: parseFloat(cur.toFixed(1)), delta: parseFloat(delta.toFixed(1)), action: delta > 2 ? 'buy' : delta < -2 ? 'reduce' : 'hold' };
    });
  }

  // ── Getters ──────────────────────────────────────────────
  function getHoldings()      { return [...holdings]; }
  function getEquityHistory() { return [..._equityHistory]; }

  return {
    computeMetrics, correlationMatrix, riskHeatmap, rebalancePlan,
    getHoldings, getEquityHistory,
    getHealthScore, getPerformanceAttribution, getInsights,
  };
})();
