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
    // Fund Manager — non-overlapping claim pools (V2)
    unclaimedDaily: 0,               // Daily loyalty bonus (generated at midnight)
    unclaimedWeekly: 0,              // Weekly mega bonus (generated Monday)
    unclaimedTrading: 0,             // Unclaimed trading profits
    unclaimedInterest: 0,            // Unclaimed compound interest
    totalClaimed: 0,                 // Lifetime claimed total
    claimStreak: 0,                  // Consecutive days with a claim
    lastClaimDate: null,             // Date of last claim (for streak)
    transferLog: [],                 // Array of { ts, type, amount, label }
  };

  let STORAGE_KEY = 'zen_investment_state';
  const ACCRUAL_INTERVAL = 10000;    // Accrue returns every 10 seconds for smoother compounding
  let accrualTimer = null;
  const subscribers = {};

  // ── Helper: Total unclaimed across all non-overlapping pools
  function _totalUnclaimed() {
    return (state.unclaimedTrading || 0) + (state.unclaimedInterest || 0) +
           (state.unclaimedDaily || 0) + (state.unclaimedWeekly || 0);
  }

  // ── Per-User Storage Key ─────────────────────────────────
  function _getUserStorageKey() {
    try {
      if (typeof UserAuth !== 'undefined') {
        const session = UserAuth.getSession();
        if (session && session.email) {
          return 'zen_investment_' + session.email.toLowerCase();
        }
      }
    } catch (e) { /* fallback */ }
    return 'zen_investment_state';
  }

  // ── Initialize ───────────────────────────────────────────
  function init() {
    // Set per-user storage key
    STORAGE_KEY = _getUserStorageKey();
    loadState();

    // V2 Migration: Old system added earnings to BOTH walletBalance AND unclaimed pools.
    // New system: earnings only go to pools, claiming moves to wallet.
    // On first V2 load, zero out unclaimed pools (amounts already in walletBalance).
    if (!state._v2ClaimMigrated) {
      state.unclaimedDaily = 0;
      state.unclaimedWeekly = 0;
      state.unclaimedTrading = 0;
      state.unclaimedInterest = 0;
      state._v2ClaimMigrated = true;
      saveState();
    }

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

    // Catch up on missed compounding (if user was away)
    _catchUpCompounding();

    // Check if we need a daily/weekly roll
    checkDailyWeeklyReset();

    // Start continuous accrual engine
    if (accrualTimer) clearInterval(accrualTimer);
    accrualTimer = setInterval(() => {
      accrueReturns();
    }, ACCRUAL_INTERVAL);

    console.log(`💰 InvestmentReturns: ${TIERS[state.tier].icon} ${TIERS[state.tier].label} tier | Balance: $${state.walletBalance.toFixed(2)}`);
  }

  // ── Activation gate — account is dormant until admin funds it ─
  function isActivated() {
    return state.walletBalance > 0 || state.initialDeposit > 0 || state._adminActivated === true;
  }

  // ── Load for a specific user (called on login) ───────────
  function loadForUser() {
    // Stop existing accrual if running
    if (accrualTimer) { clearInterval(accrualTimer); accrualTimer = null; }
    STORAGE_KEY = _getUserStorageKey();
    loadState();

    // Sync from admin-credited wallet if account was funded but investment state not yet seeded
    if (!state._adminActivated && state.walletBalance <= 0) {
      try {
        const w = (typeof UserAuth !== 'undefined') ? UserAuth.getCachedWallet() : null;
        const amount = w ? (w.balance || w.totalDeposited || 0) : 0;
        if (amount > 0) {
          state.walletBalance   = amount;
          state.initialDeposit  = amount;
          state.dayStartBalance = amount;
          state.weekStartBalance = amount;
          state.lastAccrualTick  = Date.now();
          state.lastDailyReset   = startOfDay();
          state.lastWeeklyReset  = startOfWeek();
          state._adminActivated  = true;
          state._seeded          = true;
          state.unclaimedDaily   = 0;
          state.unclaimedWeekly  = 0;
          state.unclaimedTrading = 0;
          state.unclaimedInterest = 0;
          saveState();
          console.log(`💰 Account activated from wallet: $${amount.toFixed(2)}`);
        }
      } catch (e) { /* ignore */ }
    }

    _catchUpCompounding();
    checkDailyWeeklyReset();
    // Restart accrual
    accrualTimer = setInterval(() => accrueReturns(), ACCRUAL_INTERVAL);
    console.log(`💰 Loaded user investment state: $${state.walletBalance.toFixed(2)}`);
  }

  // ── Catch up on missed compounding while user was away ───
  function _catchUpCompounding() {
    if (state.walletBalance <= 0 || !state.lastAccrualTick) return;
    const now = Date.now();
    const elapsed = now - state.lastAccrualTick;
    if (elapsed < 60000) return; // Less than 1 minute, skip

    const tier = TIERS[state.tier];
    if (!tier) return;

    const avgAPY = (tier.minAPY + tier.maxAPY) / 2;
    const dailyRate = avgAPY / 365;
    const dayFraction = elapsed / 86400000;

    // Compound: B * (1 + r)^t - B
    const accrued = state.walletBalance * (Math.pow(1 + dailyRate, dayFraction) - 1);
    if (accrued > 0) {
      // V2: Catch-up earnings go to pending pool — NOT to walletBalance
      state.unclaimedInterest += accrued;
      state.totalReturnCredit += accrued;
      state.dailyReturnAccrued += accrued;
      state.weeklyReturnAccrued += accrued;
      state.returnHistory.unshift({
        ts: now, amount: accrued, type: 'catchup_compound',
        balance: state.walletBalance + _totalUnclaimed(), tier: state.tier,
      });
      if (state.returnHistory.length > 200) state.returnHistory.pop();
    }
    state.lastAccrualTick = now;
    saveState();
    console.log(`📊 Caught up compounding: +$${accrued.toFixed(2)} for ${(elapsed / 3600000).toFixed(1)}h away`);
  }

  // ── Save state & disconnect (for logout — does NOT wipe) ─
  function saveAndDisconnect() {
    saveState();
    if (accrualTimer) { clearInterval(accrualTimer); accrualTimer = null; }
    console.log('💾 Investment state saved for user (preserved for next login)');
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

    // ── Real Compound Interest Mathematics ────────────────
    // APY from tier range, with slight variance for realism
    const avgAPY = (tier.minAPY + tier.maxAPY) / 2;
    const jitter = (Math.random() - 0.5) * (tier.maxAPY - tier.minAPY) * 0.2;
    const effectiveAPY = Math.max(tier.minAPY, Math.min(tier.maxAPY, avgAPY + jitter));

    // Convert APY to per-second rate for continuous compounding:
    // r_second = (1 + APY)^(1/31536000) - 1
    const secondsInYear = 365 * 24 * 3600;
    const elapsedSeconds = elapsed / 1000;
    const perSecondRate = Math.pow(1 + effectiveAPY, 1 / secondsInYear) - 1;

    // Compound: B * (1 + r)^t — compounds on CLAIMED balance only
    // Unclaimed funds don't compound → incentivizes frequent claiming!
    const accrued = state.walletBalance * (Math.pow(1 + perSecondRate, elapsedSeconds) - 1);

    if (accrued > 0) {
      // V2: Earnings go to pending Interest pool — NOT directly to walletBalance
      // walletBalance only increases when user CLAIMS
      state.unclaimedInterest += accrued;
      state.totalReturnCredit += accrued;
      state.dailyReturnAccrued += accrued;
      state.weeklyReturnAccrued += accrued;

      // Log entry (throttled — only every ~5 minutes)
      if (!state.returnHistory.length || now - state.returnHistory[0].ts > 300000) {
        const effectiveDailyRate = effectiveAPY / 365;
        state.returnHistory.unshift({
          ts: now,
          amount: accrued,
          type: 'tier_return',
          balance: state.walletBalance + _totalUnclaimed(),
          tier: state.tier,
          dailyRate: (effectiveDailyRate * 100).toFixed(4),
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

    // V2: Trading profits go to pending pool — NOT directly to walletBalance
    state.unclaimedTrading += amount;
    state.totalTradingProfit += amount;
    state.dailyReturnAccrued += amount;
    state.weeklyReturnAccrued += amount;

    const portfolioValue = state.walletBalance + _totalUnclaimed();
    state.returnHistory.unshift({
      ts: Date.now(),
      amount,
      type: 'trading_profit',
      balance: portfolioValue,
      symbol: tradeInfo.symbol || '—',
      side: tradeInfo.side || '—',
      pnlPct: tradeInfo.pnlPct || 0,
    });
    if (state.returnHistory.length > 200) state.returnHistory.pop();

    saveState();
    emit('profit', { amount, balance: portfolioValue, tradeInfo });
    console.log(`💵 Trading profit +$${amount.toFixed(2)} → Pending Claim | Portfolio: $${portfolioValue.toFixed(2)}`);
  }

  // ── Trading Loss Debit ───────────────────────────────────
  // Losses are absorbed by the AI risk engine — balance never decreases
  // This keeps the user experience simple: money only goes up
  function debitTradingLoss(amount, tradeInfo = {}) {
    // No-op: losses are hedged by the platform's risk pool
    // Balance only ever increases for clean UX
    return;
  }

  // ── Daily/Weekly Reset Logic ─────────────────────────────
  function checkDailyWeeklyReset() {
    const now = Date.now();
    const todayStart = startOfDay();
    const weekStart = startOfWeek();
    const portfolioValue = state.walletBalance + _totalUnclaimed();

    // Daily reset — generate daily loyalty bonus
    if (!state.lastDailyReset || todayStart > state.lastDailyReset) {
      state.dailyReturnAccrued = 0;
      state.dayStartBalance = portfolioValue;
      state.lastDailyReset = todayStart;
      // Daily Bonus: 0.05%-0.15% of portfolio value
      if (portfolioValue > 0) {
        const bonusRate = 0.0005 + Math.random() * 0.001;
        const bonus = +(portfolioValue * bonusRate).toFixed(2);
        state.unclaimedDaily += bonus;
        emit('dailyBonus', { amount: bonus, balance: portfolioValue });
      }
    }

    // Weekly reset (Monday) — generate weekly mega bonus
    if (!state.lastWeeklyReset || weekStart > state.lastWeeklyReset) {
      state.weeklyReturnAccrued = 0;
      state.weekStartBalance = portfolioValue;
      state.lastWeeklyReset = weekStart;
      // Weekly Mega Bonus: 0.2%-0.5% of portfolio value
      if (portfolioValue > 0) {
        const bonusRate = 0.002 + Math.random() * 0.003;
        const bonus = +(portfolioValue * bonusRate).toFixed(2);
        state.unclaimedWeekly += bonus;
        emit('weeklyBonus', { amount: bonus, balance: portfolioValue });
      }
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

    const totalUnclaimed = _totalUnclaimed();
    const totalPortfolioValue = state.walletBalance + totalUnclaimed;

    return {
      tier: state.tier,
      tierLabel: tier?.label || 'Gold',
      tierIcon: tier?.icon || '🥇',
      tierColor: tier?.color || '#d4a574',
      tierAPY: `${(tier?.minAPY * 100).toFixed(0)}-${(tier?.maxAPY * 100).toFixed(0)}%`,
      walletBalance: state.walletBalance,
      totalUnclaimed,
      totalPortfolioValue,
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
      claimStreak: state.claimStreak || 0,
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
    // Only used by admin to forcefully reset a user — NOT on logout
    localStorage.removeItem(STORAGE_KEY);
    state = {
      tier: 'gold', walletBalance: 0, initialDeposit: 0,
      totalTradingProfit: 0, totalReturnCredit: 0,
      dailyReturnAccrued: 0, weeklyReturnAccrued: 0,
      lastDailyReset: null, lastWeeklyReset: null,
      lastAccrualTick: null, returnHistory: [],
      dayStartBalance: 0, weekStartBalance: 0,
      // Fund Manager — claim/transfer tracking
      unclaimedDaily: 0, unclaimedWeekly: 0, unclaimedTrading: 0, unclaimedInterest: 0,
      totalClaimed: 0, claimStreak: 0, lastClaimDate: null, transferLog: [],
    };
  }

  // ── Compute projected balance at end of session ──────────
  function getProjectedGrowth(daysAhead = 30) {
    const tier = TIERS[state.tier];
    const totalValue = state.walletBalance + _totalUnclaimed();
    if (!tier || totalValue <= 0) return { current: 0, projected: 0, gain: 0 };
    const avgAPY = (tier.minAPY + tier.maxAPY) / 2;
    const dailyRate = avgAPY / 365;
    const projected = totalValue * Math.pow(1 + dailyRate, daysAhead);
    return {
      current: totalValue,
      projected,
      gain: projected - totalValue,
      dailyRate: dailyRate * 100,
      apy: avgAPY * 100,
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

  // ── Fund Manager: Claim / Transfer Functions ────────────
  function claimEarnings(pool) {
    const poolMap = {
      daily:    { field: 'unclaimedDaily',    label: 'Daily Bonus' },
      weekly:   { field: 'unclaimedWeekly',   label: 'Weekly Bonus' },
      trading:  { field: 'unclaimedTrading',  label: 'Trading Profits' },
      interest: { field: 'unclaimedInterest', label: 'Compound Interest' },
    };
    const p = poolMap[pool];
    if (!p) return { success: false };
    const amount = state[p.field] || 0;
    if (amount <= 0) return { success: false, amount: 0 };

    // V2: Actually transfer from pending pool → walletBalance!
    // This is the REAL money movement — wallet visibly increases
    const balanceBefore = state.walletBalance;
    state.walletBalance += amount;
    state[p.field] = 0;
    state.totalClaimed += amount;

    // Update claim streak
    const today = new Date().toDateString();
    if (state.lastClaimDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      state.claimStreak = (state.lastClaimDate === yesterday) ? (state.claimStreak || 0) + 1 : 1;
      state.lastClaimDate = today;
    }

    state.transferLog.unshift({
      ts: Date.now(), type: pool, amount, label: p.label,
      balanceBefore, balanceAfter: state.walletBalance,
    });
    if (state.transferLog.length > 50) state.transferLog.pop();
    saveState();
    emit('claim', { pool, amount, label: p.label, balance: state.walletBalance, balanceBefore, streak: state.claimStreak });
    return { success: true, amount, label: p.label, balanceBefore, balanceAfter: state.walletBalance, streak: state.claimStreak };
  }

  function claimAll() {
    const pools = ['daily', 'weekly', 'trading', 'interest'];
    let totalClaimed = 0;
    const claimed = [];
    pools.forEach(pool => {
      const result = claimEarnings(pool);
      if (result.success) {
        totalClaimed += result.amount;
        claimed.push(result.label);
      }
    });
    return { success: totalClaimed > 0, totalClaimed, claimed };
  }

  function getFundManagerSnapshot() {
    const unclaimed = _totalUnclaimed();
    return {
      unclaimedDaily: state.unclaimedDaily || 0,
      unclaimedWeekly: state.unclaimedWeekly || 0,
      unclaimedTrading: state.unclaimedTrading || 0,
      unclaimedInterest: state.unclaimedInterest || 0,
      totalUnclaimed: unclaimed,
      totalClaimed: state.totalClaimed || 0,
      claimStreak: state.claimStreak || 0,
      transferLog: (state.transferLog || []).slice(0, 20),
      walletBalance: state.walletBalance,
      totalPortfolioValue: state.walletBalance + unclaimed,
    };
  }

  // ── Cleanup ──────────────────────────────────────────────
  function destroy() {
    if (accrualTimer) clearInterval(accrualTimer);
  }

  // ── Public API ───────────────────────────────────────────
  return {
    init,
    loadForUser,
    saveAndDisconnect,
    isActivated,
    getSnapshot,
    getProjectedGrowth,
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
    // Fund Manager
    claimEarnings,
    claimAll,
    getFundManagerSnapshot,
  };
})();
