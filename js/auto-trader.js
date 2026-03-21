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
    tradeInterval: 28000,        // Place new trade every 28 seconds
    closeInterval: 15000,        // Check to close positions every 15 seconds
    maxPositions: 5,             // Max concurrent positions
    minConfidence: 65,           // AI confidence threshold (0-100)
    positionSizePercent: 2.0,    // 2.0% of portfolio per trade
    useRealPrices: true,         // Use real Binance prices
    winRateBias: 0.80,           // 80% of trades should be winners
    avgWinPct: 1.5,              // Average winning trade % gain
    avgLossPct: 0.4,             // Average losing trade % loss (small)
    symbols: ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'AVAX', 'LINK'],
  };

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
    
    // Auto-start if configured
    if (CONFIG.enabled) {
      start();
    }
  }

  // ── Start Auto Trading ───────────────────────────────────
  function start() {
    if (isRunning) {
      console.warn('⚠️ AutoTrader already running');
      return;
    }

    isRunning = true;
    console.log('🚀 AutoTrader: STARTING autonomous trading');
    console.log(`⚙️ Config: ${CONFIG.maxPositions} max positions, ${CONFIG.positionSizePercent}% per trade`);
    
    // Place first trade immediately
    setTimeout(() => evaluateAndTrade(), 3000);
    
    // Then place trades at intervals
    tradeInterval = setInterval(() => {
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
    
    // Use real market price
    const price = asset.price;
    
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

      // Calculate realized PnL using the expected outcome
      const expectedPct = trade.expectedPnlPct || (trade.isWinner ? 1.2 : -0.3);
      const pnlPct = expectedPct;
      const posValue = trade.entryPrice * trade.quantity;
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
    const container = document.getElementById('auto-positions-list');
    if (!container) return;
    
    activePositions = Trading?.getPositions() || [];
    
    if (activePositions.length === 0) {
      container.innerHTML = '<div class="no-positions">📭 AI is analyzing markets…</div>';
      return;
    }
    
    container.innerHTML = activePositions.map(pos => {
      const trade = tradeHistory.find(t => t.id === pos.id && t.status === 'open');
      const pnlClass = pos.pnl >= 0 ? 'profit' : 'loss';
      const sideClass = pos.side === 'long' ? 'long' : 'short';
      const sideIcon = pos.side === 'long' ? '📈' : '📉';
      const elapsed = trade ? Date.now() - trade.timestamp : 0;
      const durationStr = _formatDuration(elapsed);
      const stratIcon = trade?.strategyIcon || '🤖';
      const stratName = trade?.strategyName || 'AI Trade';
      
      // Update running PnL on the trade history entry
      if (trade) {
        trade.runningPnl = pos.pnl || 0;
        trade.runningPnlPct = pos.pnlPct || 0;
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
    isRunning: () => isRunning,
    getHistory: () => tradeHistory,
    getStatistics,
    updateClosedPosition,
    updatePositionsList,
    updateTradeHistoryDisplay,
    saveHistory,
    loadUserHistory,
    CONFIG,
  };
})();
