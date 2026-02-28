/* ════════════════════════════════════════════════════════════
   investment-returns.js — Investment Returns & Wallet Engine
   OmniVest AI / ZEN ASSETS

   Bridges trading profits → wallet balance, enforcing
   tier-based daily/weekly return logic with compounding.
════════════════════════════════════════════════════════════ */

const InvestmentReturns = (() => {
  'use strict';

  // ── Membership Tiers ─────────────────────────────────────
  const TIERS = {
    bronze:   { label: 'Bronze',   minAPY: 0.15,  maxAPY: 0.22,  color: '#cd7f32', icon: '🥉' },
    silver:   { label: 'Silver',   minAPY: 0.22,  maxAPY: 0.32,  color: '#c0c0c0', icon: '🥈' },
    gold:     { label: 'Gold',     minAPY: 0.32,  maxAPY: 0.45,  color: '#d4a574', icon: '🥇' },
    platinum: { label: 'Platinum', minAPY: 0.45,  maxAPY: 0.65,  color: '#e5e4e2', icon: '💎' },
    diamond:  { label: 'Diamond',  minAPY: 0.65,  maxAPY: 0.85,  color: '#b9f2ff', icon: '👑' },
  };

  // ── State ────────────────────────────────────────────────
  let state = {
    tier: 'gold',                    // Current membership tier
    walletBalance: 0,                // Current wallet balance ($)
    initialDeposit: 0,               // First deposit amount
    totalTradingProfit: 0,           // Cumulative profit from auto-trading
    totalReturnCredit: 0,            // Cumulative tier-based return credits
    dailyReturnAccrued: 0,           // Today's accrued return
    weeklyReturnAccrued: 0,          // This week's accrued return
    lastDailyReset: null,            // Timestamp of last daily reset
    lastWeeklyReset: null,           // Timestamp of last weekly reset
    lastAccrualTick: null,           // Last time we accrued return
    returnHistory: [],               // Array of { ts, amount, type, balance }
    dayStartBalance: 0,              // Balance at start of today
    weekStartBalance: 0,             // Balance at start of this week
  };

  const STORAGE_KEY = 'zen_investment_state';
  const ACCRUAL_INTERVAL = 30000;    // Accrue returns every 30 seconds
  let accrualTimer = null;
  const subscribers = {};

  // ── Initialize ───────────────────────────────────────────
  function init() {
    loadState();

    // New accounts start at $0 — balance only grows via admin funding or trading
    if (state.walletBalance <= 0 && !state._seeded) {
      state.walletBalance = 0;
      state.initialDeposit = 0;
      state.dayStartBalance = 0;
      state.weekStartBalance = 0;
      state.lastDailyReset = startOfDay();
      state.lastWeeklyReset = startOfWeek();
      state.lastAccrualTick = Date.now();
      state._seeded = true;
      saveState();
    }

    // Check if we need a daily/weekly roll
    checkDailyWeeklyReset();

    // Start continuous accrual engine
    accrualTimer = setInterval(() => {
      accrueReturns();
    }, ACCRUAL_INTERVAL);

    console.log(`💰 InvestmentReturns: ${TIERS[state.tier].icon} ${TIERS[state.tier].label} tier | Balance: $${state.walletBalance.toFixed(2)}`);
  }

  // ── Core: Accrue Returns ─────────────────────────────────
  // This runs every 30 seconds. It computes the fraction of the
  // daily return that should accrue since the last tick and adds
  // it to the wallet balance.
  function accrueReturns() {
    const now = Date.now();
    const tier = TIERS[state.tier];
    if (!tier) return;

    // Check daily/weekly roll first
    checkDailyWeeklyReset();

    // Time elapsed since last tick (in ms)
    const elapsed = now - (state.lastAccrualTick || now);
    if (elapsed <= 0) {
      state.lastAccrualTick = now;
      return;
    }

    // Daily return rate = APY / 365
    // We use a value within the tier's range, slightly randomized for realism
    const avgAPY = (tier.minAPY + tier.maxAPY) / 2;
    const jitter = (Math.random() - 0.5) * (tier.maxAPY - tier.minAPY) * 0.3;
    const effectiveAPY = avgAPY + jitter;
    const dailyRate = effectiveAPY / 365;

    // Fraction of the day that elapsed since last tick
    const dayFraction = elapsed / 86400000; // ms in a day

    // Compute accrued return (compound: balance * (1 + rate)^fraction - balance)
    const accrued = state.walletBalance * (Math.pow(1 + dailyRate, dayFraction) - 1);

    if (accrued > 0) {
      state.walletBalance += accrued;
      state.totalReturnCredit += accrued;
      state.dailyReturnAccrued += accrued;
      state.weeklyReturnAccrued += accrued;

      // Log entry (throttled — only every ~5 minutes)
      if (!state.returnHistory.length || now - state.returnHistory[0].ts > 300000) {
        state.returnHistory.unshift({
          ts: now,
          amount: accrued,
          type: 'tier_return',
          balance: state.walletBalance,
          tier: state.tier,
          dailyRate: (dailyRate * 100).toFixed(4),
        });
        if (state.returnHistory.length > 200) state.returnHistory.pop();
      }
    }

    state.lastAccrualTick = now;
    saveState();
    emit('accrual', getSnapshot());
  }

  // ── Trading Profit Credit ────────────────────────────────
  // Called when auto-trader closes a profitable position
  function creditTradingProfit(amount, tradeInfo = {}) {
    if (!amount || amount <= 0) return;

    state.walletBalance += amount;
    state.totalTradingProfit += amount;
    state.dailyReturnAccrued += amount;
    state.weeklyReturnAccrued += amount;

    state.returnHistory.unshift({
      ts: Date.now(),
      amount,
      type: 'trading_profit',
      balance: state.walletBalance,
      symbol: tradeInfo.symbol || '—',
      side: tradeInfo.side || '—',
      pnlPct: tradeInfo.pnlPct || 0,
    });
    if (state.returnHistory.length > 200) state.returnHistory.pop();

    saveState();
    emit('profit', { amount, balance: state.walletBalance, tradeInfo });
    console.log(`💵 Trading profit +$${amount.toFixed(2)} credited to wallet → Balance: $${state.walletBalance.toFixed(2)}`);
  }

  // ── Trading Loss Debit ───────────────────────────────────
  function debitTradingLoss(amount, tradeInfo = {}) {
    if (!amount || amount <= 0) return;

    // Losses reduce balance but can't go below 0
    const debit = Math.min(amount, state.walletBalance * 0.02); // Cap single-trade loss at 2% of balance
    state.walletBalance = Math.max(0, state.walletBalance - debit);
    state.dailyReturnAccrued -= debit;
    state.weeklyReturnAccrued -= debit;

    state.returnHistory.unshift({
      ts: Date.now(),
      amount: -debit,
      type: 'trading_loss',
      balance: state.walletBalance,
      symbol: tradeInfo.symbol || '—',
      side: tradeInfo.side || '—',
    });
    if (state.returnHistory.length > 200) state.returnHistory.pop();

    saveState();
  }

  // ── Daily/Weekly Reset Logic ─────────────────────────────
  function checkDailyWeeklyReset() {
    const now = Date.now();
    const todayStart = startOfDay();
    const weekStart = startOfWeek();

    // Daily reset
    if (!state.lastDailyReset || todayStart > state.lastDailyReset) {
      state.dailyReturnAccrued = 0;
      state.dayStartBalance = state.walletBalance;
      state.lastDailyReset = todayStart;
    }

    // Weekly reset (Monday)
    if (!state.lastWeeklyReset || weekStart > state.lastWeeklyReset) {
      state.weeklyReturnAccrued = 0;
      state.weekStartBalance = state.walletBalance;
      state.lastWeeklyReset = weekStart;
    }
  }

  // ── Snapshot for UI ──────────────────────────────────────
  function getSnapshot() {
    const tier = TIERS[state.tier];
    const avgAPY = tier ? (tier.minAPY + tier.maxAPY) / 2 : 0.38;
    const dailyRate = avgAPY / 365;
    const weeklyRate = dailyRate * 7;

    // Expected daily return on current balance
    const expectedDailyReturn = state.walletBalance * dailyRate;
    const expectedWeeklyReturn = state.walletBalance * weeklyRate;

    // Actual returns so far today/this week
    const todayPnL = state.dailyReturnAccrued;
    const weekPnL = state.weeklyReturnAccrued;

    // % change today/this week
    const todayPct = state.dayStartBalance > 0 ? (todayPnL / state.dayStartBalance) * 100 : 0;
    const weekPct = state.weekStartBalance > 0 ? (weekPnL / state.weekStartBalance) * 100 : 0;

    // Total all-time return
    const totalReturn = state.totalTradingProfit + state.totalReturnCredit;
    const totalReturnPct = state.initialDeposit > 0 ? (totalReturn / state.initialDeposit) * 100 : 0;

    return {
      tier: state.tier,
      tierLabel: tier?.label || 'Gold',
      tierIcon: tier?.icon || '🥇',
      tierColor: tier?.color || '#d4a574',
      tierAPY: `${(tier?.minAPY * 100).toFixed(0)}-${(tier?.maxAPY * 100).toFixed(0)}%`,
      walletBalance: state.walletBalance,
      initialDeposit: state.initialDeposit,
      todayPnL,
      todayPct,
      weekPnL,
      weekPct,
      expectedDailyReturn,
      expectedWeeklyReturn,
      totalReturn,
      totalReturnPct,
      totalTradingProfit: state.totalTradingProfit,
      totalReturnCredit: state.totalReturnCredit,
      recentHistory: state.returnHistory.slice(0, 30),
    };
  }

  // ── Tier Management ──────────────────────────────────────
  function setTier(tierKey) {
    if (!TIERS[tierKey]) {
      console.warn('Invalid tier:', tierKey);
      return;
    }
    state.tier = tierKey;
    saveState();
    emit('tierChange', { tier: tierKey, ...TIERS[tierKey] });
    console.log(`${TIERS[tierKey].icon} Tier changed to ${TIERS[tierKey].label}`);
  }

  function getTier() {
    return { key: state.tier, ...TIERS[state.tier] };
  }

  function getAllTiers() {
    return Object.entries(TIERS).map(([key, t]) => ({ key, ...t }));
  }

  // ── Manual Deposit ───────────────────────────────────────
  function deposit(amount) {
    if (!amount || amount <= 0) return;
    state.walletBalance += amount;
    state.initialDeposit += amount;
    state.returnHistory.unshift({
      ts: Date.now(), amount, type: 'deposit', balance: state.walletBalance,
    });
    if (state.returnHistory.length > 200) state.returnHistory.pop();
    saveState();
    emit('deposit', { amount, balance: state.walletBalance });
  }

  // ── Persistence ──────────────────────────────────────────
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* quota exceeded — ignore */ }
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        state = { ...state, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load investment state:', e);
    }
  }

  function resetState() {
    localStorage.removeItem(STORAGE_KEY);
    state = {
      tier: 'gold', walletBalance: 0, initialDeposit: 0,
      totalTradingProfit: 0, totalReturnCredit: 0,
      dailyReturnAccrued: 0, weeklyReturnAccrued: 0,
      lastDailyReset: null, lastWeeklyReset: null,
      lastAccrualTick: null, returnHistory: [],
      dayStartBalance: 0, weekStartBalance: 0,
    };
  }

  // ── Date Helpers ─────────────────────────────────────────
  function startOfDay() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function startOfWeek() {
    const d = new Date();
    const day = d.getDay(); // 0=Sun
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  // ── Events ───────────────────────────────────────────────
  function on(event, fn) {
    if (!subscribers[event]) subscribers[event] = [];
    subscribers[event].push(fn);
  }

  function emit(event, data) {
    (subscribers[event] || []).forEach(fn => {
      try { fn(data); } catch (e) { console.error(e); }
    });
  }

  // ── Cleanup ──────────────────────────────────────────────
  function destroy() {
    if (accrualTimer) clearInterval(accrualTimer);
  }

  // ── Public API ───────────────────────────────────────────
  return {
    init,
    getSnapshot,
    creditTradingProfit,
    debitTradingLoss,
    setTier,
    getTier,
    getAllTiers,
    deposit,
    resetState,
    destroy,
    on,
    TIERS,
  };
})();
