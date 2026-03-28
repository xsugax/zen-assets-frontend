/* ════════════════════════════════════════════════════════════
   trading.js — Trading Engine & Position Manager
   OmniVest AI / ZEN ASSETS
════════════════════════════════════════════════════════════ */

const Trading = (() => {
  'use strict';

  const rand  = (lo, hi) => lo + Math.random() * (hi - lo);
  const randI = (lo, hi) => Math.floor(rand(lo, hi + 1));
  const pick  = arr => arr[Math.floor(Math.random() * arr.length)];

  // ── Open Positions ───────────────────────────────────────
  let positions = [
    { id: 'pos1', sym: 'BTC/USD', side: 'long', qty: 0.42, entry: 65200, cur: 67420, sl: 63000, tp: 72000 },
    { id: 'pos2', sym: 'ETH/USD', side: 'long', qty: 4.2,  entry: 3380,  cur: 3524,  sl: 3200,  tp: 4000  },
    { id: 'pos3', sym: 'NVDA',    side: 'long', qty: 12,   entry: 812,   cur: 875,   sl: 780,   tp: 1000  },
    { id: 'pos4', sym: 'EUR/USD', side: 'short',qty: 20000,entry: 1.0930,cur: 1.0842,sl: 1.1050,tp: 1.0600},
  ];

  // ── Order History ────────────────────────────────────────
  const orderLog = [];

  // ── Copy Traders (Live Trading) ───────────────────────────
  // Tier order for comparison
  const TIER_ORDER = { bronze: 0, silver: 1, gold: 2, platinum: 3, diamond: 4 };

  const copyTraders = [
    { id: 'ct4', name: 'SilverDelta', avatar: '🔮', pnl30d: '+12.3%', winRate: '61%', drawdown: '4.1%', active: false, subscribers: 980,  copiedBal: 0, totalCopied: 0, tradesExecuted: 0, lastTradeTime: 0, strategy: 'Scalping',       minTier: 'bronze' },
    { id: 'ct2', name: 'QuantEdge',   avatar: '⚡', pnl30d: '+19.7%', winRate: '68%', drawdown: '5.6%', active: false, subscribers: 2150, copiedBal: 0, totalCopied: 0, tradesExecuted: 0, lastTradeTime: 0, strategy: 'Mean Reversion', minTier: 'silver' },
    { id: 'ct1', name: 'CryptoWolf',  avatar: '🐺', pnl30d: '+28.4%', winRate: '73%', drawdown: '8.2%', active: false, subscribers: 3841, copiedBal: 0, totalCopied: 0, tradesExecuted: 0, lastTradeTime: 0, strategy: 'Momentum',       minTier: 'gold' },
    { id: 'ct3', name: 'IronAlpha',   avatar: '🦾', pnl30d: '+41.2%', winRate: '81%', drawdown: '11.4%',active: false, subscribers: 6720, copiedBal: 0, totalCopied: 0, tradesExecuted: 0, lastTradeTime: 0, strategy: 'Breakout',       minTier: 'platinum' },
  ];

  // Copy trader execution engine — runs periodically
  let _copyTradeTimer = null;
  const _activeCopyPositions = [];  // live tracked positions from copy traders
  let _copyPnlTimer = null;

  function startCopyTradeEngine() {
    if (_copyTradeTimer) return;
    _copyTradeTimer = setInterval(() => {
      const active = copyTraders.filter(t => t.active);
      if (active.length === 0) return;

      active.forEach(trader => {
        const timeSinceLast = Date.now() - trader.lastTradeTime;
        if (timeSinceLast < 35000) return; // Min 35s between trades per trader

        if (Math.random() < 0.35) { // 35% chance each tick
          executeCopyTrade(trader);
        }
      });
    }, 12000); // Check every 12 seconds

    // Start live P&L tracker for copy positions — synced to chart ticks
    if (!_copyPnlTimer) {
      _copyPnlTimer = setInterval(() => _updateCopyPositionsPnL(), 2000);
    }
  }

  function _getLivePrice(assetId) {
    // Priority: RealDataAdapter (live) → MarketData (simulated fallback)
    if (typeof RealDataAdapter !== 'undefined') {
      const rp = RealDataAdapter.getPrice(assetId);
      if (rp && rp > 0) return rp;
    }
    const asset = MarketData.getAllAssets().find(a => a.id === assetId);
    return asset ? asset.price : null;
  }

  function _updateCopyPositionsPnL() {
    // Update every active copy position with the latest live price
    _activeCopyPositions.forEach(cp => {
      const livePrice = _getLivePrice(cp.assetId);
      if (!livePrice) return;
      cp.currentPrice = livePrice;
      cp.pnl = cp.side === 'long'
        ? (livePrice - cp.entryPrice) * cp.quantity
        : (cp.entryPrice - livePrice) * cp.quantity;
      cp.pnlPct = ((cp.pnl / cp.positionValue) * 100);
    });
  }

  function executeCopyTrade(trader) {
    const symbols = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'BNB/USD', 'XRP/USD'];
    const sym = symbols[Math.floor(Math.random() * symbols.length)];
    const assetId = sym.split('/')[0];

    // Use LIVE price from chart data
    const livePrice = _getLivePrice(assetId);
    if (!livePrice || livePrice <= 0) return;

    const side = Math.random() > 0.45 ? 'long' : 'short';
    const wr = parseFloat(trader.winRate) / 100;
    let outcomeRoll = Math.random();
    let outcome;
    if (outcomeRoll < wr * 0.93) outcome = 'win';
    else if (outcomeRoll < wr * 0.93 + 0.05) outcome = 'breakeven';
    else outcome = 'loss';

    // Position size: 0.7-2.2% of balance
    const tradePct = 0.007 + Math.random() * 0.015;
    let portfolioValue = 100000;
    if (typeof InvestmentReturns !== 'undefined') {
      const snap = InvestmentReturns.getSnapshot();
      if (snap.walletBalance > 0) portfolioValue = snap.walletBalance;
    }
    const tradeValue = portfolioValue * tradePct;
    const quantity = tradeValue / livePrice;

    // Calculate exit target based on outcome
    let targetPnlPct;
    if (outcome === 'win') targetPnlPct = 0.2 + Math.random() * 0.8;
    else if (outcome === 'loss') targetPnlPct = -(0.3 + Math.random() * 0.9);
    else targetPnlPct = (Math.random() - 0.5) * 0.1;

    // Create a live-tracked position
    const copyPos = {
      id: `cp_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      traderName: trader.name,
      traderAvatar: trader.avatar,
      sym, assetId, side,
      entryPrice: livePrice,
      currentPrice: livePrice,
      quantity,
      positionValue: tradeValue,
      pnl: 0, pnlPct: 0,
      targetPnlPct,
      outcome,
      openedAt: Date.now(),
      holdTime: 25000 + Math.random() * 90000, // 25-115s hold
    };
    _activeCopyPositions.push(copyPos);

    // Chart marker: entry arrow — only if symbol matches active chart
    try {
      if (typeof AdvancedChartEngine !== 'undefined') {
        const chartSym = (typeof App !== 'undefined' && App.getActiveSymbol) ? App.getActiveSymbol() : null;
        if (!chartSym || chartSym === assetId) {
          AdvancedChartEngine.addTradeMarker('main-price-chart', {
            action: 'entry', side,
            price: livePrice, time: Date.now(),
          });
        }
      }
    } catch {}

    trader.tradesExecuted++;
    trader.lastTradeTime = Date.now();
    trader.subscribers += Math.floor(Math.random() * 5 - 1);

    _log(`COPY [${trader.name}] OPEN ${side.toUpperCase()} ${sym} @ $${livePrice.toFixed(2)} (${outcome})`);

    // Schedule close based on hold time
    setTimeout(() => _closeCopyPosition(copyPos, trader), copyPos.holdTime);
  }

  function _closeCopyPosition(cp, trader) {
    const idx = _activeCopyPositions.indexOf(cp);
    if (idx < 0) return;

    // Final P&L from live price difference
    const livePrice = _getLivePrice(cp.assetId) || cp.currentPrice;
    let pnl = cp.side === 'long'
      ? (livePrice - cp.entryPrice) * cp.quantity
      : (cp.entryPrice - livePrice) * cp.quantity;

    // Nudge toward expected outcome to keep win/loss ratio realistic
    const targetPnl = cp.positionValue * (cp.targetPnlPct / 100);
    pnl = pnl * 0.3 + targetPnl * 0.7; // blend 30% real, 70% expected

    _activeCopyPositions.splice(idx, 1);

    // Credit/debit to wallet
    if (typeof InvestmentReturns !== 'undefined') {
      if (pnl > 0.01) {
        InvestmentReturns.creditTradingProfit(pnl, { symbol: cp.sym, side: cp.side, source: `Copy: ${trader.name}` });
      } else if (pnl < -0.01) {
        InvestmentReturns.debitTradingLoss(Math.abs(pnl), { symbol: cp.sym, side: cp.side, source: `Copy: ${trader.name}` });
      }
    }

    trader.totalCopied += Math.abs(pnl);
    trader.copiedBal += pnl;

    // Chart marker: exit — only if symbol matches active chart
    try {
      if (typeof AdvancedChartEngine !== 'undefined') {
        const chartSym = (typeof App !== 'undefined' && App.getActiveSymbol) ? App.getActiveSymbol() : null;
        if (!chartSym || chartSym === cp.assetId) {
          const pnlPct = cp.positionValue > 0 ? (pnl / cp.positionValue) * 100 : 0;
          AdvancedChartEngine.addTradeMarker('main-price-chart', {
            action: 'exit', side: cp.side,
            price: livePrice, time: Date.now(),
            pnl, pnlPct,
          });
        }
      }
    } catch {}

    // Toast notification
    if (typeof createToast !== 'undefined') {
      const icon = pnl >= 0 ? '✅' : '🔻';
      createToast(
        `${icon} Copy ${trader.name}: ${cp.sym}`,
        `${cp.side.toUpperCase()} closed ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`,
        pnl >= 0 ? 'success' : 'warning', 4000
      );
    }

    _log(`COPY [${trader.name}] CLOSE ${cp.side.toUpperCase()} ${cp.sym} PnL: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`);
  }

  function stopCopyTradeEngine() {
    if (_copyTradeTimer) { clearInterval(_copyTradeTimer); _copyTradeTimer = null; }
    if (_copyPnlTimer) { clearInterval(_copyPnlTimer); _copyPnlTimer = null; }
  }

  // ── Strategies ───────────────────────────────────────────
  const strategies = [
    { id: 'str1', name: 'ZEN Momentum PRO',  price: 'Free',   winRate: 71, trades: 1840, pnl: '+347%', desc: 'RSI/MACD momentum with adaptive stops.' },
    { id: 'str2', name: 'Quantum Grid v2',   price: '$29/mo', winRate: 66, trades: 4210, pnl: '+212%', desc: 'Multi-level grid scaled by volatility.' },
    { id: 'str3', name: 'Mean Rev Ultra',    price: '$49/mo', winRate: 78, trades: 920,  pnl: '+189%', desc: 'Statistical mean-reversion with ML filter.' },
    { id: 'str4', name: 'Macro Trend Alpha', price: '$79/mo', winRate: 64, trades: 610,  pnl: '+428%', desc: 'Macro-driven trend with AI regime filter.' },
  ];

  // ── Audit Log ────────────────────────────────────────────
  const auditLog = [];

  // ── Place Order ──────────────────────────────────────────
  function placeOrder({ sym, side, type, qty, price, sl, tp, oco = false, trailing = false }) {
    const asset = MarketData.getAllAssets().find(a => a.sym === sym || a.id === sym);
    const execPrice = asset ? asset.price : (price || 100);
    const order = {
      id:     `ORD-${Date.now().toString(36).toUpperCase()}`,
      sym, side, type, qty: parseFloat(qty),
      price: execPrice, sl, tp,
      ts: Date.now(), status: 'FILLED',
      pnl: 0, oco, trailing,
    };
    orderLog.unshift(order);
    if (orderLog.length > 200) orderLog.pop();

    // Maybe open a position
    if (type !== 'limit' && type !== 'stop') {
      const pos = {
        id: `pos_${Date.now()}`, sym, side,
        qty: parseFloat(qty), entry: execPrice, cur: execPrice,
        sl: sl || execPrice * (side === 'long' ? 0.97 : 1.03),
        tp: tp || execPrice * (side === 'long' ? 1.06 : 0.94),
      };
      positions.unshift(pos);
    }

    _log(`ORDER ${order.id} ${side.toUpperCase()} ${qty} ${sym} @ $${execPrice.toLocaleString()}`);
    return order;
  }

  function closePosition(posId) {
    const idx = positions.findIndex(p => p.id === posId);
    if (idx < 0) return null;
    const pos = positions.splice(idx, 1)[0];
    const asset = MarketData.getAllAssets().find(a => a.sym === pos.sym);
    const exitPx = asset ? asset.price : pos.cur;
    pos.pnl = pos.side === 'long' ? (exitPx - pos.entry) * pos.qty : (pos.entry - exitPx) * pos.qty;
    
    // Credit/debit to InvestmentReturns wallet
    if (typeof InvestmentReturns !== 'undefined') {
      if (pos.pnl > 0) {
        InvestmentReturns.creditTradingProfit(pos.pnl, { symbol: pos.sym, side: pos.side, pnlPct: ((pos.pnl / (pos.entry * pos.qty)) * 100) });
      } else if (pos.pnl < 0) {
        InvestmentReturns.debitTradingLoss(Math.abs(pos.pnl), { symbol: pos.sym, side: pos.side });
      }
    }
    
    _log(`CLOSE POS ${pos.id} ${pos.sym} PnL: $${pos.pnl.toFixed(2)}`);
    return pos;
  }

  // ── Compute PnL ──────────────────────────────────────────
  function computePnL() {
    let totalPnL = 0;
    const assets = MarketData.getAllAssets();
    const aMap = {}; assets.forEach(a => { aMap[a.sym] = a.price; });
    positions.forEach(p => {
      const cur = aMap[p.sym] || p.cur;
      p.cur = cur;
      p.pnl = p.side === 'long' ? (cur - p.entry) * p.qty : (p.entry - cur) * p.qty;
      totalPnL += p.pnl;
    });
    return { totalPnL, positions };
  }

  // ── Audit Log ────────────────────────────────────────────
  function _log(msg) {
    auditLog.unshift({ ts: new Date().toISOString(), msg, hash: Math.random().toString(36).slice(2,10).toUpperCase() });
    if (auditLog.length > 500) auditLog.pop();
  }

  function getAuditLog(n = 50) { return auditLog.slice(0, n); }
  function getOrderLog(n = 50) { return orderLog.slice(0, n); }
  function getPositions()      { return [...positions]; }
  function getCopyTraders()    { return copyTraders; }
  function getStrategies()     { return strategies; }

  function _getUserTier() {
    try {
      if (typeof InvestmentReturns !== 'undefined' && InvestmentReturns.getSnapshot) {
        return InvestmentReturns.getSnapshot().tier || 'bronze';
      }
    } catch {}
    return 'bronze';
  }

  function canAccessCopyTrader(id) {
    const t = copyTraders.find(c => c.id === id);
    if (!t) return false;
    const userRank = TIER_ORDER[_getUserTier()] || 0;
    const required = TIER_ORDER[t.minTier] || 0;
    return userRank >= required;
  }

  function toggleCopyTrader(id) {
    const t = copyTraders.find(c => c.id === id);
    if (!t) return;

    // Tier gate — check before activation
    if (!t.active && !canAccessCopyTrader(id)) {
      const tierLabels = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum', diamond: 'Diamond' };
      if (typeof createToast !== 'undefined') {
        createToast('🔒 Tier Locked', `${t.name} requires ${tierLabels[t.minTier] || t.minTier} tier or higher`, 'warning', 4000);
      }
      return;
    }

    t.active = !t.active;
    if (t.active) {
      t.copiedBal = 0;
      t.tradesExecuted = 0;
      t.totalCopied = 0;
      t.lastTradeTime = 0;
      startCopyTradeEngine(); // Ensure engine is running
      // Gamification: track copy trader activation
      if (typeof Gamification !== 'undefined') Gamification.trackCopyTrader();
    } else {
      t.copiedBal = 0;
      t.tradesExecuted = 0;
      // Stop engine if no traders are active
      if (!copyTraders.some(c => c.active)) stopCopyTradeEngine();
    }
  }

  // ── Fee Calculator ───────────────────────────────────────
  function calcFee(side, vol) {
    const maker = 0.001, taker = 0.0018;
    return { maker: vol * maker, taker: vol * taker, vol };
  }

  // ── Hedging ──────────────────────────────────────────────
  function autoHedge(sym, pct = 0.5) {
    const pos = positions.find(p => p.sym === sym);
    if (!pos) return null;
    const hedgeQty = pos.qty * pct;
    return placeOrder({ sym, side: pos.side === 'long' ? 'short' : 'long', type: 'market', qty: hedgeQty, price: pos.cur });
  }

  _log('Trading Engine Initialized. ZEN ASSETS v3.0');

  return {
    placeOrder, closePosition, computePnL,
    getPositions, getCopyTraders, getStrategies,
    getAuditLog, getOrderLog, calcFee, autoHedge,
    toggleCopyTrader, canAccessCopyTrader,
    getActiveCopyPositions() { return _activeCopyPositions; },
  };
})();
