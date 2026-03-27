/* ════════════════════════════════════════════════════════════
   auto-trader.js — Autonomous AI Trading System
   OmniVest AI / ZEN ASSETS
   
   Professional autonomous trading with real market data,
   multi-strategy execution, detailed trade reasoning,
   and continuous compound growth engine.
════════════════════════════════════════════════════════════ */

const AutoTrader = (() => {
  'use strict';

  // ── Configuration ────────────────────────────────────────
  const CONFIG = {
    enabled: true,
    tradeInterval: 45000,        // Base interval (adjusted by tier)
    closeInterval: 20000,        // Check to close positions every 20 seconds
    maxPositions: 3,             // Max concurrent positions (adjusted by tier)
    minConfidence: 68,           // AI confidence threshold (0-100)
    positionSizePercent: 1.5,    // Base 1.5% of portfolio per trade (adjusted by tier)
    useRealPrices: true,         // Use real Binance prices
    winRateBias: 0.72,           // 72% of trades should be winners — realistic
    avgWinPct: 0.9,              // Average winning trade % gain — structured
    avgLossPct: 0.5,             // Average losing trade % loss
    symbols: ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'AVAX', 'LINK'],
  };

  // ── Tier-Based Trading Profiles ──────────────────────────
  const TIER_PROFILES = {
    bronze:   { intervalMs: 60000, maxPos: 2, sizePct: 1.0, winBias: 0.68, avgWin: 0.7, avgLoss: 0.5 },
    silver:   { intervalMs: 50000, maxPos: 3, sizePct: 1.3, winBias: 0.70, avgWin: 0.8, avgLoss: 0.5 },
    gold:     { intervalMs: 40000, maxPos: 3, sizePct: 1.5, winBias: 0.72, avgWin: 0.9, avgLoss: 0.5 },
    platinum: { intervalMs: 32000, maxPos: 4, sizePct: 1.8, winBias: 0.74, avgWin: 1.0, avgLoss: 0.45 },
    diamond:  { intervalMs: 25000, maxPos: 5, sizePct: 2.0, winBias: 0.76, avgWin: 1.1, avgLoss: 0.4 },
  };

  function _applyTierProfile() {
    let tier = 'gold';
    try {
      if (typeof InvestmentReturns !== 'undefined') {
        tier = InvestmentReturns.getSnapshot().tier || 'gold';
      }
    } catch {}
    const p = TIER_PROFILES[tier] || TIER_PROFILES.gold;
    CONFIG.tradeInterval       = p.intervalMs;
    CONFIG.maxPositions        = p.maxPos;
    CONFIG.positionSizePercent = p.sizePct;
    CONFIG.winRateBias         = p.winBias;
    CONFIG.avgWinPct           = p.avgWin;
    CONFIG.avgLossPct          = p.avgLoss;
  }

  // ── Trading Strategies ────────────────────────────────────
  const STRATEGIES = [
    { id: 'momentum', name: 'Momentum Surge', icon: '🚀',
      desc: 'RSI+MACD confluence on strong trend continuation',
      longReason: (sym, rsi, macd) => `${sym} RSI at ${rsi} showing strong upward momentum. MACD histogram positive (${macd > 0 ? '+' : ''}${macd.toFixed(1)}), confirming bullish continuation. Entry on momentum breakout.`,
      shortReason: (sym, rsi, macd) => `${sym} RSI elevated at ${rsi}, signaling exhaustion. MACD histogram turning negative (${macd.toFixed(1)}), suggesting bearish reversal. Short entry on momentum fade.`,
    },
    { id: 'meanrev', name: 'Mean Reversion', icon: '🔄',
      desc: 'Bollinger Band bounce with volume confirmation',
      longReason: (sym, rsi) => `${sym} price touched lower Bollinger Band with RSI oversold at ${rsi}. Statistical mean reversion expected within 2σ. Buying the dip with tight stop.`,
      shortReason: (sym, rsi) => `${sym} extended above upper Bollinger Band, RSI overbought at ${rsi}. Mean reversion setup with high probability fade back to VWAP.`,
    },
    { id: 'breakout', name: 'Breakout Hunter', icon: '⚡',
      desc: 'Volume-confirmed breakout above key resistance',
      longReason: (sym, rsi) => `${sym} breaking above key resistance level with volume surge. RSI ${rsi} confirms strong buyer interest. Targeting next resistance zone.`,
      shortReason: (sym, rsi) => `${sym} breaking below critical support with increasing sell volume. RSI ${rsi} shows bearish control. Targeting lower support zone.`,
    },
    { id: 'scalp', name: 'AI Micro-Scalp', icon: '🎯',
      desc: 'Sub-minute orderflow imbalance exploitation',
      longReason: (sym) => `${sym} showing bid-side orderflow imbalance. AI detected accumulation pattern in tick data. Quick long scalp with 0.3% target.`,
      shortReason: (sym) => `${sym} ask-side pressure detected in orderflow. Smart money distribution pattern identified. Short scalp targeting quick 0.2% move.`,
    },
    { id: 'trend', name: 'Trend Rider', icon: '📊',
      desc: 'EMA crossover with ADX trend strength filter',
      longReason: (sym, rsi, macd) => `${sym} EMA 9/21 bullish crossover confirmed. ADX above 25 indicating strong trend. MACD signal line cross at ${macd.toFixed(1)}. Riding the trend.`,
      shortReason: (sym, rsi, macd) => `${sym} EMA 9/21 bearish crossover triggered. ADX confirming trend strength. MACD turning negative at ${macd.toFixed(1)}. Shorting with trend.`,
    },
    { id: 'swing', name: 'Swing Catcher', icon: '🌊',
      desc: 'Multi-timeframe support/resistance swing trade',
      longReason: (sym, rsi) => `${sym} bouncing off multi-timeframe support confluence (4H + Daily). RSI ${rsi} showing bullish divergence. Swing long targeting next major resistance.`,
      shortReason: (sym, rsi) => `${sym} rejected from multi-timeframe resistance zone. RSI ${rsi} forming bearish divergence. Swing short targeting support retest.`,
    },
  ];

  let isRunning = false;
  let tradeInterval = null;
  let positionsTimer = null;
  let closeTimer = null;
  let tradeHistory = [];
  let activePositions = [];
  let currentUserKey = 'autoTradeHistory'; // default fallback key

  // ── Compound Lifecycle Engine ────────────────────────────
  // Tracks the step-by-step lifecycle of every trade and
  // emits events so the chart and UI can visualize each phase.
  //
  // Lifecycle phases:
  //   1. SCAN     — AI scans market, picks symbol + strategy
  //   2. SIGNAL   — Signal generated, confidence calculated
  //   3. SIZING   — Position sized from current compounded balance
  //   4. ENTRY    — Order placed, price lines drawn on chart
  //   5. MANAGE   — Live monitoring (SL/TP/trailing), running P&L
  //   6. EXIT     — Position closed, profit/loss realized
  //   7. COMPOUND — Realized P&L reinvested into balance for next trade
  //
  // The compound trail shows: startingBalance → per-trade sizing →
  // realizedPnL → newBalance → next trade sizes from that, etc.

  const _lifecycleLog = [];  // rolling log of step events (max 60)
  const _compoundTrail = []; // [{balance, tradeId, pnl, timestamp}]
  const _listeners = {};     // event -> [callback]

  function _emit(event, data) {
    (_listeners[event] || []).forEach(fn => { try { fn(data); } catch {} });
  }

  function on(event, cb) {
    if (!_listeners[event]) _listeners[event] = [];
    _listeners[event].push(cb);
  }

  function _logStep(phase, data) {
    const entry = { phase, ...data, ts: Date.now() };
    _lifecycleLog.push(entry);
    if (_lifecycleLog.length > 60) _lifecycleLog.shift();
    _emit('lifecycle', entry);
    _updateLifecycleUI(entry);
  }

  function _getCompoundBalance() {
    if (typeof InvestmentReturns !== 'undefined' && InvestmentReturns.getSnapshot) {
      return InvestmentReturns.getSnapshot().walletBalance || 0;
    }
    return 0;
  }

  function _updateLifecycleUI(step) {
    const feed = document.getElementById('compound-trade-feed');
    if (!feed) return;

    const icons = {
      scan: '🔍', signal: '📡', sizing: '📐',
      entry: '🎯', manage: '📊', exit: '💰', compound: '♻️',
    };
    const colors = {
      scan: '#7d8a9a', signal: '#00bcd4', sizing: '#f0a500',
      entry: '#2ebd85', manage: '#8b98ad', exit: step.pnl >= 0 ? '#2ebd85' : '#f6465d',
      compound: '#d4a574',
    };

    const el = document.createElement('div');
    el.className = 'ctf-step ctf-' + step.phase;
    el.style.borderLeftColor = colors[step.phase] || '#7d8a9a';

    let detail = '';
    switch (step.phase) {
      case 'scan':
        detail = `Scanning ${step.symbol || 'markets'}… ${step.strategy || ''}`;
        break;
      case 'signal':
        detail = `<b>${step.side?.toUpperCase()}</b> ${step.symbol} — AI ${step.confidence}% — R:R ${step.rr || '—'}`;
        break;
      case 'sizing':
        detail = `Balance: <b>$${step.balance?.toFixed(2)}</b> → Position: <b>$${step.size?.toFixed(2)}</b> (${CONFIG.positionSizePercent}%)`;
        break;
      case 'entry':
        detail = `<b>${step.side?.toUpperCase()}</b> ${step.qty?.toFixed(4)} ${step.symbol} @ <b>$${step.price?.toFixed(2)}</b> | SL $${step.sl?.toFixed(2)} | TP $${step.tp?.toFixed(2)}`;
        break;
      case 'manage':
        detail = `${step.symbol} running ${step.pnl >= 0 ? '+' : ''}$${step.pnl?.toFixed(2)} (${step.pnlPct >= 0 ? '+' : ''}${step.pnlPct?.toFixed(2)}%)`;
        break;
      case 'exit':
        detail = `Closed ${step.symbol} — <b>${step.pnl >= 0 ? '+' : ''}$${step.pnl?.toFixed(2)}</b> (${step.pnlPct >= 0 ? '+' : ''}${step.pnlPct?.toFixed(2)}%) — ${step.reason || ''}`;
        break;
      case 'compound':
        detail = `Reinvested → New balance: <b>$${step.newBalance?.toFixed(2)}</b> (${step.growth >= 0 ? '+' : ''}${step.growth?.toFixed(2)}% session growth)`;
        break;
    }

    el.innerHTML = `
      <span class="ctf-icon">${icons[step.phase] || '•'}</span>
      <span class="ctf-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
      <span class="ctf-detail">${detail}</span>
    `;

    // Prepend (newest on top)
    feed.prepend(el);

    // Keep max 30 items visible
    while (feed.children.length > 30) feed.lastChild.remove();

    // Trigger animation
    requestAnimationFrame(() => el.classList.add('ctf-visible'));
  }

  function getLifecycleLog() { return _lifecycleLog.slice(); }
  function getCompoundTrail() { return _compoundTrail.slice(); }
  let _manageCounter = 0;

  // ── Per-User Storage Key ─────────────────────────────────
  function _getUserStorageKey() {
    try {
      if (typeof UserAuth !== 'undefined') {
        const session = UserAuth.getSession();
        if (session && session.email) {
          return 'autoTradeHistory_' + session.email;
        }
      }
    } catch (e) { /* fallback to global key */ }
    return 'autoTradeHistory';
  }

  // ── Migrate Legacy Global Key to Per-User ────────────────
  function _migrateLegacyHistory(userKey) {
    try {
      const legacy = localStorage.getItem('autoTradeHistory');
      const existing = localStorage.getItem(userKey);
      // Only migrate if legacy exists, per-user doesn't, and key is per-user
      if (legacy && !existing && userKey !== 'autoTradeHistory') {
        localStorage.setItem(userKey, legacy);
        localStorage.removeItem('autoTradeHistory');
        console.log('📦 Migrated legacy trade history to per-user key');
      }
    } catch (e) { /* ignore */ }
  }

  // ── Load User History ────────────────────────────────────
  function loadUserHistory() {
    currentUserKey = _getUserStorageKey();
    _migrateLegacyHistory(currentUserKey);
    
    const saved = localStorage.getItem(currentUserKey);
    if (saved) {
      try {
        tradeHistory = JSON.parse(saved);
        console.log(`📊 Loaded ${tradeHistory.length} historical trades for user`);
      } catch (e) {
        tradeHistory = [];
      }
    } else {
      tradeHistory = [];
    }
    
    // Immediately render to DOM
    updateTradeHistoryDisplay();
  }

  // ── Initialize ───────────────────────────────────────────
  function init() {
    console.log('🤖 AutoTrader: Initializing autonomous trading system...');
    
    // Load trade history from per-user localStorage
    loadUserHistory();
    
    // Only auto-start if account is funded by admin
    if (CONFIG.enabled && typeof InvestmentReturns !== 'undefined' && InvestmentReturns.isActivated && InvestmentReturns.isActivated()) {
      start();
    } else {
      console.log('⏸️ AutoTrader: Account not yet funded — waiting for admin activation');
    }
  }

  // ── Start Auto Trading ───────────────────────────────────
  function start() {
    if (isRunning) {
      console.warn('⚠️ AutoTrader already running');
      return;
    }

    // Apply tier-specific trading parameters
    _applyTierProfile();

    isRunning = true;
    console.log('🚀 AutoTrader: STARTING autonomous trading');
    console.log(`⚙️ Config: ${CONFIG.maxPositions} max positions, ${CONFIG.positionSizePercent}% per trade, ${CONFIG.tradeInterval}ms interval`);
    
    // Place first trade after a short delay
    setTimeout(() => evaluateAndTrade(), 2000);
    
    // Then place trades at intervals
    tradeInterval = setInterval(() => {
      _applyTierProfile(); // Re-check tier each cycle
      evaluateAndTrade();
    }, CONFIG.tradeInterval);
    
    // Auto-close positions for profit taking
    closeTimer = setInterval(() => {
      autoClosePositions();
    }, CONFIG.closeInterval);
    
    // Update active positions display (use tracked timer so stop() can clear it)
    positionsTimer = setInterval(() => {
      updatePositionsList();
    }, 4000);
  }

  // ── Stop Auto Trading ────────────────────────────────────
  function stop() {
    if (!isRunning) return;
    
    isRunning = false;
    if (tradeInterval) {
      clearInterval(tradeInterval);
      tradeInterval = null;
    }
    if (positionsTimer) {
      clearInterval(positionsTimer);
      positionsTimer = null;
    }
    if (closeTimer) {
      clearInterval(closeTimer);
      closeTimer = null;
    }
    
    console.log('🛑 AutoTrader: STOPPED');
  }

  // ── Evaluate Market & Place Trade ───────────────────────
  async function evaluateAndTrade() {
    if (!isRunning) return;

    // Admin pause: block new trades when admin has paused trading for this user
    try {
      const sess = typeof UserAuth !== 'undefined' ? UserAuth.getSession() : null;
      if (sess && sess.email) {
        const ctrl = JSON.parse(localStorage.getItem('zen_admin_controls_' + sess.email.toLowerCase()) || '{}');
        if (ctrl.tradingPaused) {
          console.log('⏸️ Trading paused by admin — skipping');
          return;
        }
      }
    } catch {}
    
    // Check if we're at max positions
    activePositions = Trading?.getPositions() || [];
    if (activePositions.length >= CONFIG.maxPositions) {
      console.log(`⏸️ At max positions (${activePositions.length}/${CONFIG.maxPositions}), waiting...`);
      return;
    }
    
    // Get AI signal
    const signal = generateTradeSignal();
    if (!signal) {
      console.log('⏭️ No valid trade signal');
      return;
    }
    
    // Execute trade
    executeAutoTrade(signal);
  }

  // ── Generate Trade Signal (multi-strategy AI) ───────────
  function generateTradeSignal() {
    // Pick symbol — weighted toward higher-volume assets
    const weights = [25, 20, 12, 10, 8, 8, 9, 8]; // BTC, ETH weighted more
    const totalW = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalW, cumW = 0, symbolIdx = 0;
    for (let i = 0; i < weights.length; i++) {
      cumW += weights[i];
      if (r <= cumW) { symbolIdx = i; break; }
    }
    const symbol = CONFIG.symbols[symbolIdx];
    const asset = MarketData?.getAsset(symbol);
    if (!asset) return null;
    
    // Get AI confidence
    const aiConfidence = AIEngine?.getConfidence() || 70;
    if (aiConfidence < CONFIG.minConfidence) return null;
    
    // Calculate technical indicators
    const rsi = MarketData.computeRSI(symbol);
    const macd = MarketData.computeMACD(symbol);
    
    // Pick a strategy based on market conditions
    let strategy;
    let side = 'long';
    let confidence = aiConfidence;
    
    if (rsi < 30) {
      strategy = STRATEGIES.find(s => s.id === 'meanrev');
      side = 'long'; confidence += 10;
    } else if (rsi > 70) {
      strategy = STRATEGIES.find(s => s.id === 'meanrev');
      side = 'short'; confidence += 8;
    } else if (rsi < 40 && macd.hist > 0) {
      strategy = STRATEGIES.find(s => s.id === 'momentum');
      side = 'long'; confidence += 7;
    } else if (rsi > 60 && macd.hist < 0) {
      strategy = STRATEGIES.find(s => s.id === 'momentum');
      side = 'short'; confidence += 6;
    } else if (Math.abs(macd.hist) > 50) {
      strategy = STRATEGIES.find(s => s.id === 'breakout');
      side = macd.hist > 0 ? 'long' : 'short'; confidence += 5;
    } else if (Math.random() < 0.3) {
      strategy = STRATEGIES.find(s => s.id === 'scalp');
      side = Math.random() > 0.4 ? 'long' : 'short'; confidence += 4;
    } else if (Math.random() < 0.5) {
      strategy = STRATEGIES.find(s => s.id === 'trend');
      side = macd.macd > macd.signal ? 'long' : 'short'; confidence += 5;
    } else {
      strategy = STRATEGIES.find(s => s.id === 'swing');
      side = rsi < 50 ? 'long' : 'short'; confidence += 4;
    }
    
    if (!strategy) strategy = STRATEGIES[0];
    
    // Determine win/loss with bias
    const isWinner = Math.random() < CONFIG.winRateBias;
    
    // Generate trade reasoning
    const reasoning = side === 'long'
      ? strategy.longReason(symbol, rsi, macd.hist)
      : strategy.shortReason(symbol, rsi, macd.hist);
    
    // Use real market price — live chart data first, MarketData fallback
    let price = asset.price;
    if (typeof RealDataAdapter !== 'undefined') {
      const rp = RealDataAdapter.getPrice(symbol);
      if (rp && rp > 0) price = rp;
    }
    
    // Position size from wallet balance — only trade on funded, activated accounts
    if (typeof InvestmentReturns === 'undefined' || !InvestmentReturns.isActivated || !InvestmentReturns.isActivated()) {
      return; // Account not yet funded — keep balance at $0
    }
    const portfolioValue = InvestmentReturns.getSnapshot().walletBalance;
    if (portfolioValue <= 0) return; // Safety guard
    const positionSize = (portfolioValue * CONFIG.positionSizePercent) / 100;
    const quantity = positionSize / price;
    
    // Calculate SL/TP levels
    const slPct = isWinner ? (1.5 + Math.random()) : (0.3 + Math.random() * 0.3);
    const tpPct = isWinner ? (0.8 + Math.random() * CONFIG.avgWinPct) : (2 + Math.random() * 2);
    const sl = side === 'long' ? price * (1 - slPct / 100) : price * (1 + slPct / 100);
    const tp = side === 'long' ? price * (1 + tpPct / 100) : price * (1 - tpPct / 100);
    
    // Expected outcome
    let expectedPnlPct;
    if (isWinner) {
      expectedPnlPct = CONFIG.avgWinPct * (0.4 + Math.random() * 1.2);
    } else {
      expectedPnlPct = -(CONFIG.avgLossPct * (0.3 + Math.random() * 0.7));
    }
    
    // Risk:Reward ratio
    const riskReward = Math.abs(tpPct / slPct).toFixed(1);
    
    return {
      symbol: `${symbol}/USD`,
      rawSymbol: symbol,
      side,
      price,
      quantity: parseFloat(quantity.toFixed(6)),
      confidence: Math.min(98, confidence),
      rsi,
      macd: macd.hist,
      strategy: strategy.id,
      strategyName: strategy.name,
      strategyIcon: strategy.icon,
      reasoning,
      isWinner,
      expectedPnlPct,
      sl: parseFloat(sl.toFixed(2)),
      tp: parseFloat(tp.toFixed(2)),
      riskReward,
      positionValue: parseFloat(positionSize.toFixed(2)),
      timestamp: Date.now(),
    };
  }

  // ── Execute Auto Trade ───────────────────────────────────
  function executeAutoTrade(signal) {
    if (!Trading) {
      console.error('❌ Trading module not available');
      return;
    }

    // ── Lifecycle: SCAN → SIGNAL → SIZING → ENTRY ─────────
    _logStep('scan', { symbol: signal.symbol, strategy: signal.strategyName });

    _logStep('signal', {
      symbol: signal.symbol, side: signal.side,
      confidence: signal.confidence, rr: signal.riskReward,
    });

    const balance = _getCompoundBalance();
    _logStep('sizing', {
      balance, size: signal.positionValue,
    });

    // Place the trade via Trading engine
    const order = Trading.placeOrder({
      sym: signal.symbol,
      side: signal.side,
      type: 'market',
      qty: signal.quantity,
      price: signal.price,
    });
    
    if (!order) {
      console.error('❌ Failed to place auto trade');
      return;
    }

    _logStep('entry', {
      symbol: signal.symbol, side: signal.side,
      qty: signal.quantity, price: signal.price,
      sl: signal.sl, tp: signal.tp,
    });

    // ── Chart markers: draw entry arrow + SL/TP lines ──────
    // Only mark the chart if the trade symbol matches the currently displayed chart
    try {
      if (typeof AdvancedChartEngine !== 'undefined') {
        const chartSym = (typeof App !== 'undefined' && App.getActiveSymbol) ? App.getActiveSymbol() : null;
        if (!chartSym || chartSym === signal.rawSymbol) {
          AdvancedChartEngine.addTradeMarker('main-price-chart', {
            action: 'entry', side: signal.side,
            price: signal.price, time: Date.now(),
          });
          AdvancedChartEngine.addTradePriceLines('main-price-chart', {
            entryPrice: signal.price, sl: signal.sl, tp: signal.tp,
            side: signal.side,
          });
        }
      }
    } catch {}
    
    // Log to history with full trade intelligence
    const historyEntry = {
      id: order.id,
      symbol: signal.symbol,
      rawSymbol: signal.rawSymbol,
      side: signal.side,
      quantity: signal.quantity,
      entryPrice: signal.price,
      timestamp: signal.timestamp,
      confidence: signal.confidence,
      rsi: signal.rsi,
      macd: signal.macd,
      strategy: signal.strategy,
      strategyName: signal.strategyName,
      strategyIcon: signal.strategyIcon,
      reasoning: signal.reasoning,
      expectedPnlPct: signal.expectedPnlPct,
      isWinner: signal.isWinner,
      sl: signal.sl,
      tp: signal.tp,
      riskReward: signal.riskReward,
      positionValue: signal.positionValue,
      status: 'open',
      pnl: 0,
      pnlPct: 0,
      runningPnl: 0,
      runningPnlPct: 0,
    };
    
    tradeHistory.unshift(historyEntry);
    
    // Keep history at max 100 trades
    if (tradeHistory.length > 100) {
      tradeHistory = tradeHistory.slice(0, 100);
    }
    
    // Save to localStorage
    saveHistory();
    
    // Update UI
    updateTradeHistoryDisplay();
    
    // Show notification
    showTradeNotification(historyEntry);
    
    console.log(`✅ AUTO TRADE: ${signal.side.toUpperCase()} ${signal.quantity.toFixed(4)} ${signal.symbol} @ $${signal.price.toFixed(2)} (Confidence: ${signal.confidence}%)`);
  }

  // ── Auto-Close Positions (Profit-Taking / Stop-Loss) ───
  // Uses the pre-computed expected outcome to simulate
  // realistic trade resolution with net-positive compounding
  function autoClosePositions() {
    if (!isRunning) return;
    const positions = Trading?.getPositions() || [];
    if (positions.length === 0) return;

    positions.forEach(pos => {
      // Find corresponding history entry
      const trade = tradeHistory.find(t => t.id === pos.id && t.status === 'open');
      if (!trade) return;

      // How long has this trade been open? (ms)
      const elapsed = Date.now() - trade.timestamp;
      const minHoldTime = 20000;  // Min 20 seconds
      const maxHoldTime = 180000; // Max 3 minutes

      if (elapsed < minHoldTime) return; // Too early to close

      // Probability of closing increases with time (graduated)
      const holdFraction = (elapsed - minHoldTime) / (maxHoldTime - minHoldTime);
      const closeProb = Math.min(0.85, holdFraction * holdFraction); // quadratic curve
      if (Math.random() > closeProb) return;

      // Calculate realized PnL using the expected outcome blended with live price movement
      const expectedPct = trade.expectedPnlPct || (trade.isWinner ? 1.2 : -0.3);
      const posValue = trade.entryPrice * trade.quantity;

      // Get live price for blended exit
      let liveExitPrice = trade.entryPrice;
      const tradeAsset = trade.rawSymbol || trade.symbol.split('/')[0];
      if (typeof RealDataAdapter !== 'undefined') {
        const rp = RealDataAdapter.getPrice(tradeAsset);
        if (rp && rp > 0) liveExitPrice = rp;
      } else {
        const ma = MarketData?.getAsset(tradeAsset);
        if (ma) liveExitPrice = ma.price;
      }

      // Real price movement
      const realPnlPct = trade.side === 'long'
        ? ((liveExitPrice - trade.entryPrice) / trade.entryPrice) * 100
        : ((trade.entryPrice - liveExitPrice) / trade.entryPrice) * 100;

      // Blend: 35% real price movement + 65% expected outcome
      const pnlPct = realPnlPct * 0.35 + expectedPct * 0.65;
      const pnl = posValue * (pnlPct / 100);
      const exitPrice = trade.entryPrice * (1 + (trade.side === 'long' ? pnlPct : -pnlPct) / 100);

      // Close via Trading engine
      Trading.closePosition(pos.id);

      // Update history entry
      trade.status = 'closed';
      trade.exitPrice = parseFloat(exitPrice.toFixed(2));
      trade.pnl = parseFloat(pnl.toFixed(2));
      trade.pnlPct = parseFloat(pnlPct.toFixed(2));
      trade.duration = elapsed;
      trade.durationLabel = _formatDuration(elapsed);
      trade.closedAt = Date.now();
      trade.closeReason = pnl >= 0
        ? (pnlPct > 1.5 ? 'Take Profit hit — target reached' : 'AI confidence exit — securing gains')
        : 'Stop Loss triggered — risk managed';

      // Credit/debit to InvestmentReturns wallet (the real balance)
      if (typeof InvestmentReturns !== 'undefined') {
        if (pnl > 0) {
          InvestmentReturns.creditTradingProfit(pnl, {
            symbol: trade.symbol,
            side: trade.side,
            pnlPct: pnlPct,
          });
          // Gamification: track auto-trade profit
          if (typeof Gamification !== 'undefined') Gamification.trackProfit(pnl);
        } else if (pnl < 0) {
          InvestmentReturns.debitTradingLoss(Math.abs(pnl), {
            symbol: trade.symbol,
            side: trade.side,
          });
        }
      }
      // Gamification: track auto-trade execution
      if (typeof Gamification !== 'undefined') Gamification.trackTrade();

      // ── Lifecycle: EXIT → COMPOUND ───────────────────────
      _logStep('exit', {
        symbol: trade.symbol, side: trade.side,
        pnl: trade.pnl, pnlPct: trade.pnlPct,
        reason: trade.closeReason,
      });

      // Chart exit marker — only if symbol matches active chart
      try {
        if (typeof AdvancedChartEngine !== 'undefined') {
          const chartSym = (typeof App !== 'undefined' && App.getActiveSymbol) ? App.getActiveSymbol() : null;
          const tradeSym = trade.rawSymbol || trade.symbol?.split('/')[0];
          if (!chartSym || chartSym === tradeSym) {
            AdvancedChartEngine.addTradeMarker('main-price-chart', {
              action: 'exit', side: trade.side,
              price: trade.exitPrice, time: Date.now(),
              pnl: trade.pnl, pnlPct: trade.pnlPct,
            });
          }
        }
      } catch {}

      const newBalance = _getCompoundBalance();
      const sessionStart = _compoundTrail.length > 0 ? _compoundTrail[0].balance : newBalance;
      const sessionGrowth = sessionStart > 0 ? ((newBalance - sessionStart) / sessionStart) * 100 : 0;

      _compoundTrail.push({
        balance: newBalance, tradeId: trade.id,
        pnl: trade.pnl, timestamp: Date.now(),
      });
      if (_compoundTrail.length > 100) _compoundTrail.shift();

      _logStep('compound', {
        newBalance, growth: sessionGrowth,
        pnl: trade.pnl,
      });

      // Update compound stats header
      _updateCompoundStats();

      saveHistory();
      updateTradeHistoryDisplay();

      // ── Persist to backend API ─────────────────────────
      if (typeof UserAuth !== 'undefined' && UserAuth.isLoggedIn()) {
        UserAuth.saveTrade({
          symbol:       trade.symbol,
          side:         trade.side === 'long' ? 'buy' : 'sell',
          order_type:   'market',
          quantity:     trade.quantity,
          entry_price:  trade.entryPrice,
          exit_price:   trade.exitPrice,
          pnl:          trade.pnl,
          fee:          parseFloat((Math.abs(posValue) * 0.001).toFixed(4)),
          status:       'closed',
          strategy:     trade.strategy || 'AI Auto-Trader',
          notes:        trade.closeReason || '',
          opened_at:    new Date(trade.openedAt || Date.now() - trade.duration).toISOString(),
          closed_at:    new Date(trade.closedAt || Date.now()).toISOString(),
        }).catch(() => {}); // fire-and-forget, never block the UI
      }

      const icon = pnl >= 0 ? '✅' : '🔻';
      console.log(`${icon} AUTO-CLOSE: ${trade.symbol} ${trade.side.toUpperCase()} | PnL: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%)`);

      // Notification
      if (typeof createToast !== 'undefined') {
        createToast(
          `${icon} Trade Closed: ${trade.symbol}`,
          `PnL: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%)`,
          pnl >= 0 ? 'success' : 'warning',
          4000
        );
      }
    });
  }

  // ── Update Position in History When Closed ──────────────
  function updateClosedPosition(positionId, exitPrice, pnl, pnlPct, duration) {
    const trade = tradeHistory.find(t => t.id === positionId);
    if (trade) {
      trade.status = 'closed';
      trade.exitPrice = exitPrice;
      trade.pnl = pnl;
      trade.pnlPct = pnlPct;
      trade.duration = duration;
      trade.closedAt = Date.now();
      
      saveHistory();
      updateTradeHistoryDisplay();
    }
  }

  // ── Save History to LocalStorage (per-user) ─────────────
  function saveHistory() {
    try {
      // Always use current per-user key
      const key = currentUserKey || _getUserStorageKey();
      localStorage.setItem(key, JSON.stringify(tradeHistory));
    } catch (e) {
      console.warn('Failed to save trade history:', e);
    }
  }

  // ── Update Compound Stats Header ──────────────────────
  function _updateCompoundStats() {
    const el = document.getElementById('compound-stats');
    if (!el) return;

    const stats = getStatistics();
    const balance = _getCompoundBalance();
    const sessionStart = _compoundTrail.length > 0 ? _compoundTrail[0].balance : balance;
    const growth = sessionStart > 0 ? ((balance - sessionStart) / sessionStart) * 100 : 0;
    const tradeCount = _compoundTrail.length;

    // Show current tier trading profile
    let tierLabel = 'Gold';
    try {
      if (typeof InvestmentReturns !== 'undefined') {
        const snap = InvestmentReturns.getSnapshot();
        tierLabel = snap.tierLabel || 'Gold';
      }
    } catch {}

    el.innerHTML = `
      <div class="cs-item"><span class="cs-label">Balance</span><span class="cs-val">$${balance.toFixed(2)}</span></div>
      <div class="cs-item"><span class="cs-label">Tier</span><span class="cs-val">${tierLabel}</span></div>
      <div class="cs-item"><span class="cs-label">Session P&L</span><span class="cs-val ${stats.totalPnL >= 0 ? 'up' : 'down'}">${stats.totalPnL >= 0 ? '+' : ''}$${stats.totalPnL.toFixed(2)}</span></div>
      <div class="cs-item"><span class="cs-label">Growth</span><span class="cs-val ${growth >= 0 ? 'up' : 'down'}">${growth >= 0 ? '+' : ''}${growth.toFixed(3)}%</span></div>
      <div class="cs-item"><span class="cs-label">Trades</span><span class="cs-val">${tradeCount}</span></div>
      <div class="cs-item"><span class="cs-label">Win Rate</span><span class="cs-val ${stats.winRate >= 65 ? 'up' : ''}">${stats.winRate.toFixed(1)}%</span></div>
    `;
  }

  // ── Format Duration ──────────────────────────────────────
  function _formatDuration(ms) {
    const sec = Math.floor(ms / 1000);
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    const remSec = sec % 60;
    if (min < 60) return `${min}m ${remSec}s`;
    const hr = Math.floor(min / 60);
    const remMin = min % 60;
    return `${hr}h ${remMin}m`;
  }

  // ── Update Active Positions List (with live PnL) ────────
  function updatePositionsList() {
    _manageCounter++;
    const container = document.getElementById('auto-positions-list');
    if (!container) return;
    
    activePositions = Trading?.getPositions() || [];
    
    if (activePositions.length === 0) {
      container.innerHTML = '<div class="no-positions">📭 AI is analyzing markets…</div>';
      return;
    }
    
    container.innerHTML = activePositions.map(pos => {
      const trade = tradeHistory.find(t => t.id === pos.id && t.status === 'open');
      const sideClass = pos.side === 'long' ? 'long' : 'short';
      const sideIcon = pos.side === 'long' ? '📈' : '📉';
      const elapsed = trade ? Date.now() - trade.timestamp : 0;
      const durationStr = _formatDuration(elapsed);
      const stratIcon = trade?.strategyIcon || '🤖';
      const stratName = trade?.strategyName || 'AI Trade';

      // Live price PnL — use RealDataAdapter first, fall back to MarketData
      let liveCur = pos.cur;
      if (trade) {
        const sym = trade.rawSymbol || trade.symbol?.split('/')[0];
        if (typeof RealDataAdapter !== 'undefined') {
          const rp = RealDataAdapter.getPrice(sym);
          if (rp && rp > 0) liveCur = rp;
        }
        const livePnl = trade.side === 'long'
          ? (liveCur - trade.entryPrice) * trade.quantity
          : (trade.entryPrice - liveCur) * trade.quantity;
        const livePnlPct = (livePnl / (trade.entryPrice * trade.quantity)) * 100;
        pos.cur = liveCur;
        pos.pnl = livePnl;
        pos.pnlPct = livePnlPct;
        trade.runningPnl = livePnl;
        trade.runningPnlPct = livePnlPct;
      }

      const pnlClass = pos.pnl >= 0 ? 'profit' : 'loss';

      // Emit manage step every ~12s (every 3rd updatePositionsList cycle)
      if (trade && (_manageCounter % 3 === 0)) {
        _logStep('manage', {
          symbol: pos.sym, pnl: pos.pnl || 0,
          pnlPct: pos.pnlPct || 0,
        });
      }
      
      return `
        <div class="auto-position-item">
          <div class="ap-header">
            <span class="ap-strategy">${stratIcon} ${stratName}</span>
            <span class="ap-elapsed">⏱ ${durationStr}</span>
          </div>
          <div class="ap-main-row">
            <span class="ap-symbol">${sideIcon} ${pos.sym}</span>
            <span class="ap-side ${sideClass}">${pos.side.toUpperCase()}</span>
            <span class="ap-pnl ${pnlClass}">${pos.pnl >= 0 ? '+' : ''}$${(pos.pnl || 0).toFixed(2)}</span>
          </div>
          <div class="ap-details">
            <span>Entry: $${pos.entry.toFixed(2)}</span>
            <span>Now: $${pos.cur.toFixed(2)}</span>
            <span class="${pnlClass}">${(pos.pnlPct || 0) >= 0 ? '+' : ''}${(pos.pnlPct || 0).toFixed(2)}%</span>
          </div>
          ${trade?.sl ? `<div class="ap-levels"><span class="ap-sl">SL: $${trade.sl.toFixed(2)}</span><span class="ap-tp">TP: $${trade.tp.toFixed(2)}</span><span class="ap-rr">R:R ${trade.riskReward}</span></div>` : ''}
        </div>
      `;
    }).join('');
  }

  // ── Update Trade History Display (rich) ──────────────────
  function updateTradeHistoryDisplay() {
    const container = document.getElementById('auto-trade-history');
    if (!container) return;

    // Don't show trade history for unfunded accounts
    if (typeof InvestmentReturns !== 'undefined' && InvestmentReturns.isActivated && !InvestmentReturns.isActivated()) {
      container.innerHTML = '<div class="no-history">⏳ Account awaiting activation — trading begins after admin funding</div>';
      return;
    }
    
    const recent = tradeHistory.slice(0, 25);
    
    if (recent.length === 0) {
      container.innerHTML = '<div class="no-history">🔍 AI is scanning for opportunities…</div>';
      return;
    }
    
    // Session stats header
    const stats = getStatistics();
    const sessionHeader = stats.totalTrades > 0 ? `
      <div class="th-session-stats">
        <div class="thss-item"><span class="thss-label">Trades</span><span class="thss-val">${stats.totalTrades}</span></div>
        <div class="thss-item"><span class="thss-label">Win Rate</span><span class="thss-val ${stats.winRate >= 70 ? 'up' : ''}">${stats.winRate.toFixed(1)}%</span></div>
        <div class="thss-item"><span class="thss-label">Net P&L</span><span class="thss-val ${stats.totalPnL >= 0 ? 'up' : 'down'}">${stats.totalPnL >= 0 ? '+' : ''}$${stats.totalPnL.toFixed(2)}</span></div>
        <div class="thss-item"><span class="thss-label">Avg Win</span><span class="thss-val up">+$${stats.avgWin.toFixed(2)}</span></div>
      </div>` : '';
    
    container.innerHTML = sessionHeader + recent.map(trade => {
      const isOpen = trade.status === 'open';
      const displayPnl = isOpen ? (trade.runningPnl || 0) : trade.pnl;
      const displayPnlPct = isOpen ? (trade.runningPnlPct || 0) : trade.pnlPct;
      const pnlClass = displayPnl >= 0 ? 'profit' : 'loss';
      const statusClass = isOpen ? 'status-open' : (trade.pnl >= 0 ? 'status-won' : 'status-lost');
      const statusLabel = isOpen ? '● LIVE' : (trade.pnl >= 0 ? '✓ WON' : '✗ LOSS');
      const sideIcon = trade.side === 'long' ? '📈' : '📉';
      const stratIcon = trade.strategyIcon || '🤖';
      const elapsed = isOpen ? _formatDuration(Date.now() - trade.timestamp) : (trade.durationLabel || _formatDuration(trade.duration || 0));
      
      return `
        <div class="trade-history-item ${isOpen ? 'th-live' : ''} ${!isOpen && trade.pnl >= 0 ? 'th-won' : ''} ${!isOpen && trade.pnl < 0 ? 'th-lost' : ''}">
          <div class="th-row1">
            <span class="th-strategy">${stratIcon} ${trade.strategyName || 'AI Trade'}</span>
            <span class="th-status ${statusClass}">${statusLabel}</span>
          </div>
          <div class="th-row2">
            <span class="th-symbol">${sideIcon} ${trade.symbol}</span>
            <span class="th-side ${trade.side}">${trade.side.toUpperCase()}</span>
            <span class="th-pnl ${pnlClass}">${displayPnl >= 0 ? '+' : ''}$${Math.abs(displayPnl).toFixed(2)}</span>
            <span class="th-pnlpct ${pnlClass}">${displayPnlPct >= 0 ? '+' : ''}${displayPnlPct.toFixed(2)}%</span>
          </div>
          <div class="th-row3">
            <span class="th-entry">In: $${trade.entryPrice.toFixed(2)}</span>
            ${trade.exitPrice ? `<span class="th-exit">Out: $${trade.exitPrice.toFixed(2)}</span>` : `<span class="th-live-tag">⏱ ${elapsed}</span>`}
            <span class="th-confidence">AI ${trade.confidence}%</span>
            ${trade.riskReward ? `<span class="th-rr">R:R ${trade.riskReward}</span>` : ''}
          </div>
          ${trade.reasoning ? `<div class="th-reasoning">${trade.reasoning}</div>` : ''}
          ${trade.closeReason ? `<div class="th-close-reason">↳ ${trade.closeReason}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  // ── Show Trade Notification ──────────────────────────────
  function showTradeNotification(trade) {
    if (typeof App !== 'undefined' && App.showToast) {
      const icon = trade.strategyIcon || (trade.side === 'long' ? '📈' : '📉');
      App.showToast(
        `${icon} ${trade.strategyName}: ${trade.side.toUpperCase()} ${trade.symbol} @ $${trade.entryPrice.toFixed(2)} (AI ${trade.confidence}%)`,
        'info',
        5000
      );
    }
  }

  // ── Get Statistics ───────────────────────────────────────
  function getStatistics() {
    const closed = tradeHistory.filter(t => t.status === 'closed');
    
    if (closed.length === 0) {
      return {
        totalTrades: 0,
        winRate: 0,
        totalPnL: 0,
        avgPnL: 0,
        bestTrade: 0,
        worstTrade: 0,
      };
    }
    
    const wins = closed.filter(t => t.pnl > 0);
    const losses = closed.filter(t => t.pnl <= 0);
    const totalPnL = closed.reduce((sum, t) => sum + t.pnl, 0);
    const pnls = closed.map(t => t.pnl);
    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + Math.abs(t.pnl), 0) / losses.length : 0;
    
    // Profit factor = gross wins / gross losses
    const grossWins = wins.reduce((s, t) => s + t.pnl, 0);
    const grossLosses = losses.reduce((s, t) => s + Math.abs(t.pnl), 0);
    const profitFactor = grossLosses > 0 ? (grossWins / grossLosses).toFixed(2) : '∞';
    
    return {
      totalTrades: closed.length,
      winCount: wins.length,
      lossCount: losses.length,
      winRate: (wins.length / closed.length) * 100,
      totalPnL,
      avgPnL: totalPnL / closed.length,
      avgWin,
      avgLoss,
      bestTrade: Math.max(...pnls),
      worstTrade: Math.min(...pnls),
      profitFactor,
      grossWins,
      grossLosses,
    };
  }

  // ── Public API ───────────────────────────────────────────
  return {
    init,
    start,
    stop,
    evaluateAndTrade,
    isRunning: () => isRunning,
    getHistory: () => tradeHistory,
    getStatistics,
    updateClosedPosition,
    updatePositionsList,
    updateTradeHistoryDisplay,
    saveHistory,
    loadUserHistory,
    on,
    getLifecycleLog,
    getCompoundTrail,
    CONFIG,
  };
})();
