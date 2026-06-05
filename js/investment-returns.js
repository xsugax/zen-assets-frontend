/* ════════════════════════════════════════════════════════════
   investment-returns.js — Investment Returns & Wallet Engine
   OmniVest AI / ZEN ASSETS

   Bridges trading profits → wallet balance, enforcing
   tier-based daily/weekly return logic with compounding.
════════════════════════════════════════════════════════════ */

const InvestmentReturns = (() => {
  'use strict';

  // ── Admin Pause Control ───────────────────────────────────
  // Admin can pause profits per user via localStorage flag.
  // When paused, accrual drops to ~1% (near-zero) and trading profit credits are blocked.
  function _isAdminPaused() {
    try {
      const email = _getCurrentUserEmail();
      if (!email) return false;
      const raw = localStorage.getItem('zen_admin_controls_' + email);
      if (!raw) return false;
      const ctrl = JSON.parse(raw);
      return !!ctrl.profitPaused;
    } catch { return false; }
  }
  function _getCurrentUserEmail() {
    try {
      if (typeof UserAuth !== 'undefined') {
        const s = UserAuth.getSession();
        if (s && s.email) return s.email.toLowerCase();
      }
    } catch {}
    return '';
  }

  // ── Membership Tiers ─────────────────────────────────────
  const TIERS = {
    bronze:   { label: 'Bronze',   minAPY: 0.55,  maxAPY: 0.78,  color: '#cd7f32', icon: '🥉' },
    silver:   { label: 'Silver',   minAPY: 0.78,  maxAPY: 1.15,  color: '#c0c0c0', icon: '🥈' },
    gold:     { label: 'Gold',     minAPY: 1.15,  maxAPY: 1.75,  color: '#d4a574', icon: '🥇' },
    platinum: { label: 'Platinum', minAPY: 1.75,  maxAPY: 2.60,  color: '#e5e4e2', icon: '💎' },
    diamond:  { label: 'Diamond',  minAPY: 2.60,  maxAPY: 4.00,  color: '#b9f2ff', icon: '👑' },
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
    // Fund Manager — server-synced pending (single ledger)
    pendingEarnings: 0,              // Mirrors wallets.pending_earnings from API
    unclaimedDaily: 0,               // Legacy — kept at 0
    unclaimedWeekly: 0,
    unclaimedTrading: 0,
    unclaimedInterest: 0,
    totalClaimed: 0,                 // Lifetime claimed total
    claimStreak: 0,                  // Consecutive days with a claim
    lastClaimDate: null,             // Date of last claim (for streak)
    transferLog: [],                 // Array of { ts, type, amount, label }
  };

  let STORAGE_KEY = 'zen_investment_state';
  const BALANCE_SYNC_INTERVAL = 30000; // Sync balance from API every 30 seconds
  let accrualTimer = null;
  let balanceSyncTimer = null;
  const subscribers = {};
  let lastKnownBalance = 0; // Track last balance from API to detect changes

  // ── Helper: Total unclaimed (server pending_earnings)
  function _totalUnclaimed() {
    return parseFloat(state.pendingEarnings) || 0;
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

    // Sync tier from session (cross-device: ensures correct APY even on new device)
    try {
      if (typeof UserAuth !== 'undefined') {
        const s = UserAuth.getSession();
        if (s && s.tier && TIERS[s.tier]) state.tier = s.tier;
      }
    } catch (e) { /* ignore */ }

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

    // ── Cross-device bootstrap: sync wallet from API login data ──
    // When a user logs in from a new device/country, their investment
    // localStorage state won't exist yet. Pull the funded balance from
    // the cached wallet (stored at login by UserAuth._persistAuth).
    if (!state._adminActivated && state.walletBalance <= 0) {
      try {
        const w = (typeof UserAuth !== 'undefined') ? UserAuth.getCachedWallet() : null;
        const amount = w ? (w.balance || w.totalDeposited || 0) : 0;
        if (amount > 0) {
          state.walletBalance    = amount;
          state.initialDeposit   = amount;
          state.pendingEarnings  = w.pendingEarnings || 0;
          state._adminActivated  = true;
          state._seeded          = true;
          saveState();
          console.log(`💰 Cross-device wallet bootstrap: $${amount.toFixed(2)}`);
        }
      } catch (e) { /* ignore */ }
    }

    // Async wallet refresh on login (no synthetic earnings)
    if (typeof UserAuth !== 'undefined' && UserAuth.isLoggedIn()) {
      UserAuth.refreshSession().then(() => syncBalanceFromAPI()).catch(() => {});
    }

    startBalanceSync();

    console.log(`💰 InvestmentReturns: ${TIERS[state.tier].icon} ${TIERS[state.tier].label} tier | Balance: $${state.walletBalance.toFixed(2)}`);
  }

  // ── Activation gate — account is dormant until admin funds it ─
  function isActivated() {
    if (state.walletBalance > 0) return true;
    try {
      const w = (typeof UserAuth !== 'undefined') ? UserAuth.getCachedWallet() : null;
      return !!(w && (w.balance > 0 || w.totalDeposited > 0));
    } catch { return false; }
  }

  // ── Load for a specific user (called on login) ───────────
  function loadForUser() {
    // Stop existing accrual if running
    if (accrualTimer) { clearInterval(accrualTimer); accrualTimer = null; }
    STORAGE_KEY = _getUserStorageKey();
    loadState();

    // Bootstrap principal from API only — no synthetic earnings
    try {
      const w = (typeof UserAuth !== 'undefined') ? UserAuth.getCachedWallet() : null;
      if (w) {
        state.walletBalance = w.balance || 0;
        state.initialDeposit = w.totalDeposited || w.initialDeposit || 0;
        state.pendingEarnings = w.pendingEarnings || 0;
        state.totalClaimed = w.totalClaimed || 0;
        state._adminActivated = state.walletBalance > 0;
      }
    } catch (e) { /* ignore */ }

    state.unclaimedDaily = 0;
    state.unclaimedWeekly = 0;
    state.unclaimedTrading = 0;
    state.unclaimedInterest = 0;
    saveState();

    startBalanceSync();

    console.log(`💰 Loaded user investment state: $${state.walletBalance.toFixed(2)}`);
  }

  // ── Balance Synchronization ──────────────────────────────
  // Ensures all devices show the exact same balance by periodically
  // syncing with the backend API and detecting external changes

  function startBalanceSync() {
    if (balanceSyncTimer) clearInterval(balanceSyncTimer);

    // Initial sync on startup
    syncBalanceFromAPI();

    // Periodic sync every 30 seconds
    balanceSyncTimer = setInterval(() => {
      syncBalanceFromAPI();
    }, BALANCE_SYNC_INTERVAL);

    console.log('🔄 Balance sync engine started (30s intervals)');
  }

  async function syncBalanceFromAPI() {
    if (typeof UserAuth === 'undefined' || !UserAuth.isLoggedIn()) return;

    try {
      const walletData = await UserAuth.getWallet();
      if (!walletData || walletData.ok === false || typeof walletData.balance !== 'number') return;

      const apiBalance = walletData.balance || 0;
      const apiTotalDeposited = walletData.totalDeposited || 0;
      const apiTotalEarned = walletData.totalEarned || 0;
      const apiTotalClaimed = walletData.totalClaimed || 0;
      const apiPendingEarnings = walletData.pendingEarnings || 0;

      const oldBalance = state.walletBalance;
      const oldPending = state.pendingEarnings || 0;
      const balanceChanged = Math.abs(apiBalance - oldBalance) > 0.01;
      const pendingChanged = Math.abs(apiPendingEarnings - oldPending) > 0.01;

      state.walletBalance = apiBalance;
      state.initialDeposit = apiTotalDeposited;
      state.totalTradingProfit = apiTotalEarned;
      state.totalClaimed = apiTotalClaimed;
      state.pendingEarnings = apiPendingEarnings;
      state._adminActivated = apiBalance > 0;
      state.unclaimedDaily = 0;
      state.unclaimedWeekly = 0;
      state.unclaimedTrading = 0;
      state.unclaimedInterest = 0;

      if (balanceChanged || pendingChanged) {
        saveState();
        if (balanceChanged) {
          emit('balanceChanged', { balance: apiBalance, oldBalance, source: 'api_sync' });
        }
        if (typeof updateReturnsUI === 'function') updateReturnsUI();
        if (typeof updateFundManagerUI === 'function') updateFundManagerUI();
      }

      lastKnownBalance = apiBalance;

    } catch (err) {
      console.warn('⚠ Balance sync failed:', err.message);
    }
  }

  // Force immediate balance sync (called by admin panel after funding)
  function forceBalanceSync() {
    console.log('🔄 Force balance sync requested');
    syncBalanceFromAPI();
  }

  function _catchUpCompounding() { /* disabled — earnings come from server trades only */ }

  // ── Save state & disconnect (for logout — does NOT wipe) ─
  function saveAndDisconnect() {
    saveState();
    if (accrualTimer) { clearInterval(accrualTimer); accrualTimer = null; }
    console.log('💾 Investment state saved for user (preserved for next login)');
  }

  function accrueReturns() { /* disabled — server pending_earnings is source of truth */ }

  // ── Trading Profit Credit ────────────────────────────────
  // Called when auto-trader closes a profitable position
  function creditTradingProfit(amount, tradeInfo = {}) {
    if (!amount || amount <= 0) return;

    // Admin pause: block trading profit credits entirely
    if (_isAdminPaused()) return;

    // Optimistic UI bump — server reconciles via saveTrade → pending_earnings
    state.pendingEarnings = (state.pendingEarnings || 0) + amount;
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

  function checkDailyWeeklyReset() { /* disabled — no client-side bonus pools */ }

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
      pendingEarnings: 0,
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
  async function claimEarnings(pool) {
    await syncBalanceFromAPI();
    const amount = _totalUnclaimed();
    if (amount <= 0) return { success: false, amount: 0, error: 'Nothing to claim' };

    const label = 'Accrued Earnings';

    try {
      if (typeof UserAuth !== 'undefined') {
        const result = await UserAuth.claimEarnings(amount, pool || 'all');

        if (result.ok) {
          const balanceBefore = state.walletBalance;
          const claimedAmt = result.claimed || amount;
          state.walletBalance = result.balanceAfter ?? (balanceBefore + claimedAmt);
          state.pendingEarnings = result.pendingEarnings ?? Math.max(0, amount - claimedAmt);
          state.totalClaimed += claimedAmt;

          const today = new Date().toDateString();
          if (state.lastClaimDate !== today) {
            const yesterday = new Date(Date.now() - 86400000).toDateString();
            state.claimStreak = (state.lastClaimDate === yesterday) ? (state.claimStreak || 0) + 1 : 1;
            state.lastClaimDate = today;
          }

          state.transferLog.unshift({
            ts: Date.now(), type: 'all', amount: claimedAmt, label,
            balanceBefore, balanceAfter: state.walletBalance,
          });
          if (state.transferLog.length > 50) state.transferLog.pop();
          saveState();
          emit('claim', { pool: 'all', amount: claimedAmt, label, balance: state.walletBalance, balanceBefore, streak: state.claimStreak });
          return { success: true, amount: claimedAmt, label, balanceBefore, balanceAfter: state.walletBalance, streak: state.claimStreak };
        }
        console.error('Claim API failed:', result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      console.error('Claim request failed:', err);
      return { success: false, error: 'Network error' };
    }

    return { success: false, error: 'Not logged in' };
  }

  async function claimAll() {
    const result = await claimEarnings('all');
    return {
      success: result.success,
      totalClaimed: result.amount || 0,
      claimed: result.success ? [result.label] : [],
    };
  }

  function getFundManagerSnapshot() {
    const unclaimed = _totalUnclaimed();
    const activated = isActivated();
    return {
      pendingEarnings: unclaimed,
      unclaimedDaily: 0,
      unclaimedWeekly: 0,
      unclaimedTrading: 0,
      unclaimedInterest: 0,
      totalUnclaimed: unclaimed,
      totalClaimed: state.totalClaimed || 0,
      claimStreak: state.claimStreak || 0,
      transferLog: (state.transferLog || []).slice(0, 20),
      walletBalance: state.walletBalance,
      totalPortfolioValue: state.walletBalance + unclaimed,
      activated,
      adminPercent: (typeof CopyTradeConfig !== 'undefined')
        ? (CopyTradeConfig.getForCurrentUser().percent || 0)
        : 0,
    };
  }

  // ── Reload from localStorage (picks up admin funding changes) ──
  function reloadFromStorage() {
    const key = _getUserStorageKey();
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return false;
      const parsed = JSON.parse(saved);
      // Apply if: stored data was admin-activated AND balance/tier differs,
      // OR current state is dormant ($0) and stored data has funds
      const balanceChanged = parsed.walletBalance !== state.walletBalance;
      const tierChanged = parsed.tier !== state.tier;
      const dormantToFunded = state.walletBalance <= 0 && parsed.walletBalance > 0;
      if ((parsed._adminActivated && (balanceChanged || tierChanged)) || dormantToFunded) {
        const oldBal = state.walletBalance;
        state = { ...state, ...parsed };
        STORAGE_KEY = key;
        console.log(`🔄 Investment state reloaded: $${oldBal.toFixed(2)} → $${state.walletBalance.toFixed(2)}`);
        emit('reload', getSnapshot());
        return true;
      }
    } catch (e) { /* ignore */ }
    return false;
  }

  // ── Cleanup ──────────────────────────────────────────────
  function destroy() {
    if (accrualTimer) clearInterval(accrualTimer);
  }

  // ── Public API ───────────────────────────────────────────
  return {
    init,
    loadForUser,
    reloadFromStorage,
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
    // Balance Synchronization
    forceBalanceSync,
  };
})();
