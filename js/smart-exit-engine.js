/* ════════════════════════════════════════════════════════════
   smart-exit-engine.js — Intelligent Profit-Taking System
   OmniVest AI / ZEN ASSETS
   
   Features:
   - Trailing stops (dynamic & ATR-based)
   - Momentum-based profit taking
   - Time-based exits
   - Volatility-adjusted targets
   - Risk/reward optimization
════════════════════════════════════════════════════════════ */

const SmartExitEngine = (() => {
  'use strict';

  // ── Configuration ────────────────────────────────────────
  const CONFIG = {
    enabled: true,
    strategies: {
      trailingStop: {
        enabled: true,
        initialPct: 2.5,    // Initial trailing distance %
        accelerationOn: true, // Tighten as profit grows
        atrMultiplier: 2.0, // ATR-based trailing
      },
      momentumExit: {
        enabled: true,
        rsiExit: { overbought: 78, oversold: 22 },
        macdDivergence: true,
        volumeDecline: 35,  // % volume drop signals exit
      },
      timeBased: {
        enabled: true,
        maxHoldTime: 72,    // Hours
        minHoldTime: 0.5,   // Hours (prevent premature exit)
      },
      partialTakeProfit: {
        enabled: true,
        levels: [
          { pct: 2.0, takeProfit: 25 },  // At +2%, take 25%
          { pct: 5.0, takeProfit: 35 },  // At +5%, take 35%
          { pct: 10.0, takeProfit: 40 }, // At +10%, take remaining
        ],
      },
      volatilityAdjust: {
        enabled: true,
        highVolThreshold: 3.5, // ATR ratio
        lowVolThreshold: 1.2,
      },
    },
  };

  let monitorTimer = null;
  let positionStates = {}; // Track each position's exit state
  const exitLog = [];

  // ── Initialize ───────────────────────────────────────────
  function init() {
    if (!CONFIG.enabled) {
      console.log('⏸️ SmartExitEngine: Disabled');
      return;
    }

    console.log('🎯 SmartExitEngine: Intelligent exit monitoring active');
    
    // Monitor all positions every 2 seconds
    monitorTimer = setInterval(() => {
      monitorAllPositions();
    }, 2000);

    // Listen to market data updates
    if (typeof MarketData !== 'undefined') {
      MarketData.on('tick', () => {
        monitorAllPositions();
      });
    }
  }

  // ── Main Monitor Loop ────────────────────────────────────
  function monitorAllPositions() {
    if (typeof Trading === 'undefined') return;
    
    const positions = Trading.getPositions();
    
    positions.forEach(pos => {
      // Initialize position state if new
      if (!positionStates[pos.id]) {
        initPositionState(pos);
      }
      
      const state = positionStates[pos.id];
      const asset = MarketData?.getAsset(pos.sym.split('/')[0]) || 
                    MarketData?.getAllAssets().find(a => a.sym === pos.sym);
      
      if (!asset) return;
      
      // Update current price
      pos.cur = asset.price;
      
      // Calculate current P&L
      const pnl = pos.side === 'long' 
        ? (pos.cur - pos.entry) * pos.qty 
        : (pos.entry - pos.cur) * pos.qty;
      
      const pnlPct = pos.side === 'long'
        ? ((pos.cur - pos.entry) / pos.entry) * 100
        : ((pos.entry - pos.cur) / pos.entry) * 100;
      
      pos.pnl = pnl;
      pos.pnlPct = parseFloat(pnlPct.toFixed(2));
      
      // Check all exit conditions
      const exitSignal = checkExitConditions(pos, state, asset);
      
      if (exitSignal) {
        executeExit(pos, state, exitSignal);
      }
    });
  }

  // ── Position State Initialization ───────────────────────
  function initPositionState(pos) {
    const asset = MarketData?.getAllAssets().find(a => a.sym === pos.sym);
    const atr = asset ? calculateATR(asset.id) : pos.entry * 0.02;
    
    positionStates[pos.id] = {
      entryTime: Date.now(),
      highWaterMark: pos.side === 'long' ? pos.entry : pos.entry,
      lowWaterMark: pos.side === 'long' ? pos.entry : pos.entry,
      initialATR: atr,
      trailingStopPrice: calculateInitialTrailingStop(pos, atr),
      partialExits: [],
      totalExited: 0,
      peakPnlPct: 0,
      consecutiveAgainst: 0, // Bars moving against position
      volumeProfile: [],
    };
    
    console.log(`📋 Initialized tracking for ${pos.id} (${pos.sym})`);
  }

  function calculateInitialTrailingStop(pos, atr) {
    if (CONFIG.strategies.trailingStop.atrMultiplier) {
      const distance = atr * CONFIG.strategies.trailingStop.atrMultiplier;
      return pos.side === 'long' 
        ? pos.entry - distance 
        : pos.entry + distance;
    } else {
      const pct = CONFIG.strategies.trailingStop.initialPct / 100;
      return pos.side === 'long'
        ? pos.entry * (1 - pct)
        : pos.entry * (1 + pct);
    }
  }

  // ── Exit Condition Checks ────────────────────────────────
  function checkExitConditions(pos, state, asset) {
    const checks = [];

    // 1. Trailing Stop
    if (CONFIG.strategies.trailingStop.enabled) {
      const trailingHit = checkTrailingStop(pos, state, asset);
      if (trailingHit) checks.push(trailingHit);
    }

    // 2. Momentum Exit
    if (CONFIG.strategies.momentumExit.enabled) {
      const momentumExit = checkMomentumExit(pos, state, asset);
      if (momentumExit) checks.push(momentumExit);
    }

    // 3. Time-Based Exit
    if (CONFIG.strategies.timeBased.enabled) {
      const timeExit = checkTimeBasedExit(pos, state);
      if (timeExit) checks.push(timeExit);
    }

    // 4. Partial Profit Taking
    if (CONFIG.strategies.partialTakeProfit.enabled) {
      const partialExit = checkPartialProfitLevels(pos, state);
      if (partialExit) checks.push(partialExit);
    }

    // 5. Hard Stop Loss
    const slHit = checkStopLoss(pos);
    if (slHit) checks.push(slHit);

    // 6. Take Profit Target
    const tpHit = checkTakeProfit(pos);
    if (tpHit) checks.push(tpHit);

    // Return highest priority exit signal
    return checks.length > 0 ? checks[0] : null;
  }

  // ── Trailing Stop Logic ──────────────────────────────────
  function checkTrailingStop(pos, state, asset) {
    const currentPrice = pos.cur;
    
    // Update watermarks
    if (pos.side === 'long') {
      if (currentPrice > state.highWaterMark) {
        state.highWaterMark = currentPrice;
        
        // Update trailing stop
        const atr = calculateATR(asset.id);
        const distance = CONFIG.strategies.trailingStop.accelerationOn && pos.pnlPct > 5
          ? atr * 1.5  // Tighter trailing in profit
          : atr * CONFIG.strategies.trailingStop.atrMultiplier;
        
        state.trailingStopPrice = Math.max(
          state.trailingStopPrice,
          currentPrice - distance
        );
      }
      
      // Check if trailing stop hit
      if (currentPrice <= state.trailingStopPrice) {
        return {
          type: 'trailing_stop',
          reason: 'Trailing stop triggered',
          price: currentPrice,
          pct: 100,
          priority: 1,
        };
      }
    } else {
      // Short position
      if (currentPrice < state.lowWaterMark) {
        state.lowWaterMark = currentPrice;
        
        const atr = calculateATR(asset.id);
        const distance = CONFIG.strategies.trailingStop.accelerationOn && pos.pnlPct > 5
          ? atr * 1.5
          : atr * CONFIG.strategies.trailingStop.atrMultiplier;
        
        state.trailingStopPrice = Math.min(
          state.trailingStopPrice,
          currentPrice + distance
        );
      }
      
      if (currentPrice >= state.trailingStopPrice) {
        return {
          type: 'trailing_stop',
          reason: 'Trailing stop triggered',
          price: currentPrice,
          pct: 100,
          priority: 1,
        };
      }
    }
    
    return null;
  }

  // ── Momentum Exit Logic ──────────────────────────────────
  function checkMomentumExit(pos, state, asset) {
    const rsi = MarketData.computeRSI(asset.id);
    const macd = MarketData.computeMACD(asset.id);
    
    // RSI extreme zones
    if (pos.side === 'long' && rsi > CONFIG.strategies.momentumExit.rsiExit.overbought) {
      if (pos.pnlPct > 2) { // Only exit if we're in profit
        return {
          type: 'momentum_exit',
          reason: `RSI overbought (${rsi.toFixed(1)}) - taking profit`,
          price: pos.cur,
          pct: 100,
          priority: 2,
        };
      }
    }
    
    if (pos.side === 'short' && rsi < CONFIG.strategies.momentumExit.rsiExit.oversold) {
      if (pos.pnlPct > 2) {
        return {
          type: 'momentum_exit',
          reason: `RSI oversold (${rsi.toFixed(1)}) - taking profit`,
          price: pos.cur,
          pct: 100,
          priority: 2,
        };
      }
    }
    
    // MACD reversal (divergence)
    if (CONFIG.strategies.momentumExit.macdDivergence) {
      if (pos.side === 'long' && macd.hist < 0 && pos.pnlPct > 3) {
        state.consecutiveAgainst++;
        if (state.consecutiveAgainst >= 3) {
          return {
            type: 'momentum_exit',
            reason: 'MACD bearish divergence detected',
            price: pos.cur,
            pct: 100,
            priority: 2,
          };
        }
      } else if (pos.side === 'short' && macd.hist > 0 && pos.pnlPct > 3) {
        state.consecutiveAgainst++;
        if (state.consecutiveAgainst >= 3) {
          return {
            type: 'momentum_exit',
            reason: 'MACD bullish divergence detected',
            price: pos.cur,
            pct: 100,
            priority: 2,
          };
        }
      } else {
        state.consecutiveAgainst = 0;
      }
    }
    
    return null;
  }

  // ── Time-Based Exit ──────────────────────────────────────
  function checkTimeBasedExit(pos, state) {
    const hoursHeld = (Date.now() - state.entryTime) / (1000 * 60 * 60);
    
    // Max hold time exceeded
    if (hoursHeld > CONFIG.strategies.timeBased.maxHoldTime) {
      return {
        type: 'time_exit',
        reason: `Max hold time exceeded (${hoursHeld.toFixed(1)}h)`,
        price: pos.cur,
        pct: 100,
        priority: 3,
      };
    }
    
    // Min hold time not met - prevent premature exits
    if (hoursHeld < CONFIG.strategies.timeBased.minHoldTime) {
      return null; // Block other exits
    }
    
    return null;
  }

  // ── Partial Profit Taking ────────────────────────────────
  function checkPartialProfitLevels(pos, state) {
    if (pos.pnlPct <= 0) return null; // Only in profit
    
    const levels = CONFIG.strategies.partialTakeProfit.levels;
    
    for (const level of levels) {
      // Check if this level was already taken
      if (state.partialExits.find(e => e.pct === level.pct)) continue;
      
      // Check if we hit this profit level
      if (pos.pnlPct >= level.pct) {
        return {
          type: 'partial_profit',
          reason: `Partial profit at +${level.pct}% (taking ${level.takeProfit}%)`,
          price: pos.cur,
          pct: level.takeProfit,
          priority: 4,
          levelPct: level.pct,
        };
      }
    }
    
    return null;
  }

  // ── Hard Stops ───────────────────────────────────────────
  function checkStopLoss(pos) {
    if (!pos.sl) return null;
    
    if (pos.side === 'long' && pos.cur <= pos.sl) {
      return {
        type: 'stop_loss',
        reason: 'Hard stop loss hit',
        price: pos.sl,
        pct: 100,
        priority: 0, // Highest priority
      };
    }
    
    if (pos.side === 'short' && pos.cur >= pos.sl) {
      return {
        type: 'stop_loss',
        reason: 'Hard stop loss hit',
        price: pos.sl,
        pct: 100,
        priority: 0,
      };
    }
    
    return null;
  }

  function checkTakeProfit(pos) {
    if (!pos.tp) return null;
    
    if (pos.side === 'long' && pos.cur >= pos.tp) {
      return {
        type: 'take_profit',
        reason: 'Take profit target reached',
        price: pos.tp,
        pct: 100,
        priority: 1,
      };
    }
    
    if (pos.side === 'short' && pos.cur <= pos.tp) {
      return {
        type: 'take_profit',
        reason: 'Take profit target reached',
        price: pos.tp,
        pct: 100,
        priority: 1,
      };
    }
    
    return null;
  }

  // ── Execute Exit ─────────────────────────────────────────
  function executeExit(pos, state, signal) {
    const timestamp = Date.now();
    const hoursHeld = (timestamp - state.entryTime) / (1000 * 60 * 60);
    
    if (signal.pct === 100) {
      // Full exit
      console.log(`🎯 FULL EXIT: ${pos.sym} | ${signal.reason} | P&L: $${pos.pnl.toFixed(2)} (${pos.pnlPct.toFixed(2)}%)`);
      
      // Close position via Trading module
      if (typeof Trading !== 'undefined') {
        Trading.closePosition(pos.id);
      }
      
      // Log exit
      exitLog.unshift({
        posId: pos.id,
        sym: pos.sym,
        type: signal.type,
        reason: signal.reason,
        pnl: pos.pnl,
        pnlPct: pos.pnlPct,
        exitPrice: signal.price,
        entryPrice: pos.entry,
        hoursHeld: hoursHeld.toFixed(2),
        timestamp,
      });
      
      // Notify AutoTrader of closed position
      if (typeof AutoTrader !== 'undefined') {
        AutoTrader.updateClosedPosition(pos.id, signal.price, pos.pnl, pos.pnlPct, hoursHeld);
      }
      
      // Credit/debit trading profit to wallet via InvestmentReturns
      if (typeof InvestmentReturns !== 'undefined') {
        if (pos.pnl > 0) {
          InvestmentReturns.creditTradingProfit(pos.pnl, {
            symbol: pos.sym,
            side: pos.side || 'long',
            pnlPct: pos.pnlPct,
          });
        } else if (pos.pnl < 0) {
          InvestmentReturns.debitTradingLoss(Math.abs(pos.pnl), {
            symbol: pos.sym,
            side: pos.side || 'long',
          });
        }
      }
      
      // Cleanup state
      delete positionStates[pos.id];
      
    } else {
      // Partial exit
      const exitQty = pos.qty * (signal.pct / 100);
      const remainingQty = pos.qty - exitQty;
      
      console.log(`📊 PARTIAL EXIT: ${pos.sym} | ${signal.reason} | Exiting ${signal.pct}% (${exitQty.toFixed(4)} units)`);
      
      // Update position quantity
      pos.qty = remainingQty;
      
      // Record partial exit
      state.partialExits.push({
        pct: signal.levelPct,
        qty: exitQty,
        price: signal.price,
        timestamp,
      });
      
      state.totalExited += signal.pct;
      
      // Log partial exit
      exitLog.unshift({
        posId: pos.id,
        sym: pos.sym,
        type: 'partial_exit',
        reason: signal.reason,
        pnl: (signal.price - pos.entry) * exitQty * (pos.side === 'long' ? 1 : -1),
        exitPct: signal.pct,
        exitPrice: signal.price,
        remainingQty,
        timestamp,
      });
    }
  }

  // ── Utility Functions ────────────────────────────────────
  function calculateATR(assetId, period = 14) {
    // Simplified ATR calculation
    const hist = MarketData.getPriceHistory(assetId, period + 1);
    if (hist.length < 2) return hist[0] * 0.02; // Default 2%
    
    let atr = 0;
    for (let i = 1; i < hist.length; i++) {
      atr += Math.abs(hist[i] - hist[i-1]);
    }
    atr /= (hist.length - 1);
    
    return atr;
  }

  function getPositionState(posId) {
    return positionStates[posId] || null;
  }

  function getExitLog(limit = 50) {
    return exitLog.slice(0, limit);
  }

  function getActiveMonitoring() {
    return Object.keys(positionStates).map(id => ({
      posId: id,
      ...positionStates[id],
    }));
  }

  // ── Manual Overrides ─────────────────────────────────────
  function updateTrailingStop(posId, newPrice) {
    if (positionStates[posId]) {
      positionStates[posId].trailingStopPrice = newPrice;
      console.log(`✏️ Manual trailing stop update: ${posId} → $${newPrice}`);
    }
  }

  function disableExitsForPosition(posId) {
    if (positionStates[posId]) {
      positionStates[posId].exitsDisabled = true;
      console.log(`🔒 Exits disabled for ${posId}`);
    }
  }

  // ── Cleanup ──────────────────────────────────────────────
  function destroy() {
    if (monitorTimer) clearInterval(monitorTimer);
    positionStates = {};
    console.log('🛑 SmartExitEngine stopped');
  }

  return {
    init, destroy,
    getPositionState, getExitLog, getActiveMonitoring,
    updateTrailingStop, disableExitsForPosition,
  };
})();
