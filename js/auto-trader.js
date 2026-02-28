/* ════════════════════════════════════════════════════════════
   auto-trader.js — Autonomous Trading System
   OmniVest AI / ZEN ASSETS
   
   Automatically places trades based on real market data + AI signals
   Manages positions with smart exit engine
════════════════════════════════════════════════════════════ */

const AutoTrader = (() => {
  'use strict';

  // ── Configuration ────────────────────────────────────────
  const CONFIG = {
    enabled: true,
    tradeInterval: 45000,        // Place new trade every 45 seconds
    maxPositions: 8,             // Max concurrent positions
    minConfidence: 65,           // AI confidence threshold (0-100)
    positionSizePercent: 3,      // 3% of portfolio per trade
    useRealPrices: true,         // Use real Binance prices
    symbols: ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'AVAX', 'LINK'],
  };

  let isRunning = false;
  let tradeInterval = null;
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
    
    // Update active positions display
    setInterval(() => {
      updatePositionsList();
    }, 2000);
  }

  // ── Stop Auto Trading ────────────────────────────────────
  function stop() {
    if (!isRunning) return;
    
    isRunning = false;
    if (tradeInterval) {
      clearInterval(tradeInterval);
      tradeInterval = null;
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

  // ── Generate Trade Signal ────────────────────────────────
  function generateTradeSignal() {
    // Pick random symbol from our list
    const symbol = CONFIG.symbols[Math.floor(Math.random() * CONFIG.symbols.length)];
    const asset = MarketData?.getAsset(symbol);
    
    if (!asset) return null;
    
    // Get AI confidence
    const aiConfidence = AIEngine?.getConfidence() || 70;
    
    // Check if confidence meets threshold
    if (aiConfidence < CONFIG.minConfidence) {
      return null;
    }
    
    // Calculate technical indicators
    const rsi = MarketData.computeRSI(symbol);
    const macd = MarketData.computeMACD(symbol);
    
    // Determine trade direction based on indicators
    let side = 'long';
    let confidence = aiConfidence;
    
    // RSI oversold -> long bias
    if (rsi < 35) {
      side = 'long';
      confidence += 5;
    }
    // RSI overbought -> short bias
    else if (rsi > 65) {
      side = 'short';
      confidence += 5;
    }
    // MACD bullish -> long bias
    else if (macd.hist > 0 && macd.macd > macd.signal) {
      side = 'long';
      confidence += 3;
    }
    // MACD bearish -> short bias
    else if (macd.hist < 0 && macd.macd < macd.signal) {
      side = 'short';
      confidence += 3;
    }
    // Random for variety
    else {
      side = Math.random() > 0.5 ? 'long' : 'short';
    }
    
    // Use real market price
    const price = asset.price;
    
    // Calculate position size
    const portfolioValue = Portfolio?.computeMetrics()?.totalValue || 100000;
    const positionSize = (portfolioValue * CONFIG.positionSizePercent) / 100;
    const quantity = positionSize / price;
    
    return {
      symbol: `${symbol}/USD`,
      side,
      price,
      quantity: parseFloat(quantity.toFixed(6)),
      confidence: Math.min(100, confidence),
      rsi,
      macd: macd.hist,
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
    
    // Log to history
    const historyEntry = {
      id: order.id,
      symbol: signal.symbol,
      side: signal.side,
      quantity: signal.quantity,
      entryPrice: signal.price,
      timestamp: signal.timestamp,
      confidence: signal.confidence,
      rsi: signal.rsi,
      macd: signal.macd,
      status: 'open',
      pnl: 0,
      pnlPct: 0,
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

  // ── Update Active Positions List ─────────────────────────
  function updatePositionsList() {
    const container = document.getElementById('auto-positions-list');
    if (!container) return;
    
    activePositions = Trading?.getPositions() || [];
    
    if (activePositions.length === 0) {
      container.innerHTML = '<div class="no-positions">No active positions</div>';
      return;
    }
    
    container.innerHTML = activePositions.map(pos => {
      const pnlClass = pos.pnl >= 0 ? 'profit' : 'loss';
      const sideClass = pos.side === 'long' ? 'long' : 'short';
      
      return `
        <div class="auto-position-item">
          <div class="ap-header">
            <span class="ap-symbol">${pos.sym}</span>
            <span class="ap-side ${sideClass}">${pos.side.toUpperCase()}</span>
            <span class="ap-pnl ${pnlClass}">${pos.pnl >= 0 ? '+' : ''}$${pos.pnl.toFixed(2)}</span>
          </div>
          <div class="ap-details">
            <span>Entry: $${pos.entry.toFixed(2)}</span>
            <span>Current: $${pos.cur.toFixed(2)}</span>
            <span class="${pnlClass}">${pos.pnlPct >= 0 ? '+' : ''}${pos.pnlPct.toFixed(2)}%</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // ── Update Trade History Display ─────────────────────────
  function updateTradeHistoryDisplay() {
    const container = document.getElementById('auto-trade-history');
    if (!container) return;
    
    const recent = tradeHistory.slice(0, 20); // Show last 20 trades
    
    if (recent.length === 0) {
      container.innerHTML = '<div class="no-history">No trade history yet</div>';
      return;
    }
    
    container.innerHTML = recent.map(trade => {
      const pnlClass = trade.pnl >= 0 ? 'profit' : 'loss';
      const statusClass = trade.status === 'open' ? 'status-open' : 'status-closed';
      const sideClass = trade.side === 'long' ? 'long' : 'short';
      
      return `
        <div class="trade-history-item">
          <div class="th-row1">
            <span class="th-symbol">${trade.symbol}</span>
            <span class="th-side ${sideClass}">${trade.side.toUpperCase()}</span>
            <span class="th-status ${statusClass}">${trade.status.toUpperCase()}</span>
          </div>
          <div class="th-row2">
            <span>Entry: $${trade.entryPrice.toFixed(2)}</span>
            ${trade.exitPrice ? `<span>Exit: $${trade.exitPrice.toFixed(2)}</span>` : '<span>-</span>'}
            <span class="${pnlClass}">${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}</span>
            <span class="${pnlClass}">${trade.pnlPct >= 0 ? '+' : ''}${trade.pnlPct.toFixed(2)}%</span>
          </div>
          <div class="th-row3">
            <span class="th-time">${new Date(trade.timestamp).toLocaleString()}</span>
            <span class="th-confidence">AI: ${trade.confidence}%</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // ── Show Trade Notification ──────────────────────────────
  function showTradeNotification(trade) {
    if (typeof createToast !== 'undefined') {
      const icon = trade.side === 'long' ? '📈' : '📉';
      createToast(
        `${icon} Auto Trade: ${trade.side.toUpperCase()} ${trade.symbol}`,
        `Entry: $${trade.entryPrice.toFixed(2)} | Confidence: ${trade.confidence}%`,
        'info',
        4000
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
    
    const wins = closed.filter(t => t.pnl > 0).length;
    const totalPnL = closed.reduce((sum, t) => sum + t.pnl, 0);
    const pnls = closed.map(t => t.pnl);
    
    return {
      totalTrades: closed.length,
      winRate: (wins / closed.length) * 100,
      totalPnL,
      avgPnL: totalPnL / closed.length,
      bestTrade: Math.max(...pnls),
      worstTrade: Math.min(...pnls),
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
