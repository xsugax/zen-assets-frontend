/* ════════════════════════════════════════════════════════════
   user-auth.js — User Authentication & Admin Control System
   ZEN ASSETS — API-Connected Version

   Talks to the Node.js backend for real authentication.
   Falls back to cached localStorage session data for
   synchronous checks (isLoggedIn, isAdmin, etc.).

   Backend: POST /api/auth/register, /login, /logout, GET /me
            GET/POST /api/admin/*, /api/wallet/*
════════════════════════════════════════════════════════════ */

const UserAuth = (() => {
  'use strict';

  // ── Configuration ────────────────────────────────────────
  const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:4000/api'
    : 'https://api.zenassets.tech/api';

  const STORAGE_SESSION = 'zen_session';
  const STORAGE_TOKEN   = 'zen_token';
  const STORAGE_WALLET  = 'zen_wallet';

  const TIERS = {
    bronze:   { label: 'Bronze',   minDeposit: 5000,    apyRange: '15–22%',  color: '#cd7f32', icon: 'fa-medal'  },
    silver:   { label: 'Silver',   minDeposit: 25000,   apyRange: '22–32%',  color: '#c0c0c0', icon: 'fa-award'  },
    gold:     { label: 'Gold',     minDeposit: 100000,  apyRange: '32–45%',  color: '#d4a574', icon: 'fa-trophy' },
    platinum: { label: 'Platinum', minDeposit: 500000,  apyRange: '45–65%',  color: '#e5e4e2', icon: 'fa-gem'    },
    diamond:  { label: 'Diamond',  minDeposit: 1000000, apyRange: '65–85%',  color: '#b9f2ff', icon: 'fa-crown'  },
  };

  // ── Local Cache Helpers ──────────────────────────────────
  function _loadSession()  { try { return JSON.parse(localStorage.getItem(STORAGE_SESSION)) || null; } catch { return null; } }
  function _saveSession(s) { s ? localStorage.setItem(STORAGE_SESSION, JSON.stringify(s)) : localStorage.removeItem(STORAGE_SESSION); }
  function _loadToken()    { return localStorage.getItem(STORAGE_TOKEN) || null; }
  function _saveToken(t)   { t ? localStorage.setItem(STORAGE_TOKEN, t) : localStorage.removeItem(STORAGE_TOKEN); }
  function _loadWallet()   { try { return JSON.parse(localStorage.getItem(STORAGE_WALLET)) || null; } catch { return null; } }
  function _saveWallet(w)  { w ? localStorage.setItem(STORAGE_WALLET, JSON.stringify(w)) : localStorage.removeItem(STORAGE_WALLET); }

  // ── API Helper ───────────────────────────────────────────
  async function _api(endpoint, { method = 'GET', body = null, auth = true } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const token = _loadToken();
    if (auth && token) headers['Authorization'] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    try {
      const resp = await fetch(`${API_BASE}${endpoint}`, opts);
      const data = await resp.json();
      if (!resp.ok) return { ok: false, status: resp.status, error: data.error || 'Request failed' };
      return { ok: true, ...data };
    } catch (err) {
      console.error('API error:', err);
      return { ok: false, error: 'Server unreachable. Please check your connection.' };
    }
  }

  // ── Register (async) ────────────────────────────────────
  async function register({ fullName, email, password, tier, deposit }) {
    if (!fullName || !email || !password || !tier) {
      return { ok: false, error: 'All fields are required.' };
    }
    if (password.length < 6) {
      return { ok: false, error: 'Password must be at least 6 characters.' };
    }
    if (!TIERS[tier]) {
      return { ok: false, error: 'Invalid membership tier.' };
    }
    const minDep = TIERS[tier].minDeposit;
    const dep = parseFloat(deposit) || 0;
    if (dep < minDep) {
      return { ok: false, error: `${TIERS[tier].label} tier requires a minimum deposit of $${minDep.toLocaleString()}.` };
    }

    const result = await _api('/auth/register', {
      method: 'POST',
      body: { fullName, email, password, tier, depositAmount: dep },
      auth: false,
    });

    if (result.ok) {
      return { ok: true, user: result.user };
    }
    return result;
  }

  // ── Login (async) ───────────────────────────────────────
  async function login(email, password) {
    if (!email || !password) return { ok: false, error: 'Email and password are required.' };

    const result = await _api('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    });

    if (result.ok) {
      // Store JWT
      _saveToken(result.token);

      // Cache session data locally (for synchronous checks)
      const session = {
        userId: result.user.id,
        email: result.user.email,
        role: result.user.role,
        tier: result.user.tier,
        fullName: result.user.fullName,
        loginAt: Date.now(),
      };
      _saveSession(session);

      // Cache wallet
      if (result.wallet) _saveWallet(result.wallet);

      return { ok: true, user: result.user, session, wallet: result.wallet };
    }

    return result;
  }

  // ── Session (synchronous — reads cache) ──────────────────
  function getSession()     { return _loadSession(); }
  function isLoggedIn() {
    const session = _loadSession();
    const token = _loadToken();
    // Both must exist AND token must be non-empty string
    return !!(session && token && token.length > 0);
  }
  function isAdmin()        { const s = _loadSession(); return s && s.role === 'admin'; }
  function getCurrentTier() { const s = _loadSession(); return s ? s.tier : 'bronze'; }

  function getCurrentUser() {
    const s = _loadSession();
    if (!s) return null;
    return {
      id: s.userId,
      email: s.email,
      fullName: s.fullName,
      tier: s.tier,
      role: s.role,
      deposit: (_loadWallet() || {}).totalDeposited || 0,
    };
  }

  // ── Refresh session from API (async) ─────────────────────
  async function refreshSession() {
    if (!_loadToken()) return null;
    const result = await _api('/auth/me');
    if (result.ok) {
      const session = {
        userId: result.user.id,
        email: result.user.email,
        role: result.user.role,
        tier: result.user.tier,
        fullName: result.user.fullName,
        loginAt: Date.now(),
      };
      _saveSession(session);
      if (result.wallet) _saveWallet(result.wallet);
      return { user: result.user, wallet: result.wallet };
    } else {
      if (result.status === 401) {
        _saveToken(null);
        _saveSession(null);
        _saveWallet(null);
      }
      return null;
    }
  }

  // ── Get Wallet (async) ──────────────────────────────────
  async function getWallet() {
    const result = await _api('/wallet');
    if (result.ok) { _saveWallet(result); return result; }
    return _loadWallet();
  }

  function getCachedWallet() { return _loadWallet(); }

  // ── Logout (async-safe but also works sync) ─────────────
  async function logout() {
    // Get user email BEFORE clearing session
    const sessionBefore = _loadSession();
    const userEmailBefore = sessionBefore?.email;
    
    // Notify API about logout
    if (_loadToken()) {
      try { await _api('/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    }
    
    // Clear auth tokens and session
    _saveToken(null);
    _saveSession(null);
    _saveWallet(null);
    
    // Clear user-specific per-email data
    if (userEmailBefore) {
      localStorage.removeItem('zen_investment_' + userEmailBefore.toLowerCase());
    }
    
    // Clear ALL user-specific data keys
    const keysToRemove = [
      'zen_investment_state',
      'zen_trades',
      'zen_auto_trades',
      'zen_gamification',
      'zen_portfolio',
      'zen_positions',
      'zen_settings',
      'zen_watchlist',
      'zen_market_data_cache',
      'zen_price_cache',
    ];
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Clear all session storage
    sessionStorage.clear();
    
    // Debug logging
    console.log('🔓 Logout complete - all data cleared');
    console.log('Session is now:', _loadSession());
    console.log('Token is now:', _loadToken());
  }

  // ── Admin: User Management (async) ──────────────────────
  async function adminGetAllUsers(params = {}) {
    if (!isAdmin()) return [];
    const qs = new URLSearchParams(params).toString();
    const result = await _api(`/admin/users${qs ? '?' + qs : ''}`);
    return result.ok ? result.users : [];
  }

  async function adminGetUser(userId) {
    if (!isAdmin()) return null;
    return _api(`/admin/users/${userId}`);
  }

  async function adminUpdateUser(userId, updates) {
    if (!isAdmin()) return { ok: false, error: 'Not authorised.' };
    return _api(`/admin/users/${userId}`, { method: 'PATCH', body: updates });
  }

  async function adminDeleteUser(userId) {
    if (!isAdmin()) return { ok: false, error: 'Not authorised.' };
    return _api(`/admin/users/${userId}`, { method: 'DELETE' });
  }

  async function adminCreditUser(userId, amount, notes = '') {
    if (!isAdmin()) return { ok: false, error: 'Not authorised.' };
    return _api(`/admin/users/${userId}/credit`, { method: 'POST', body: { amount, notes } });
  }

  async function adminDebitUser(userId, amount, notes = '') {
    if (!isAdmin()) return { ok: false, error: 'Not authorised.' };
    return _api(`/admin/users/${userId}/debit`, { method: 'POST', body: { amount, notes } });
  }

  async function adminGetWithdrawals() {
    if (!isAdmin()) return [];
    const result = await _api('/admin/withdrawals');
    return result.ok ? result.withdrawals : [];
  }

  async function adminApproveWithdrawal(txId) {
    return _api(`/admin/withdrawals/${txId}/approve`, { method: 'POST' });
  }

  async function adminRejectWithdrawal(txId, reason = '') {
    return _api(`/admin/withdrawals/${txId}/reject`, { method: 'POST', body: { reason } });
  }

  async function adminGetStats() {
    if (!isAdmin()) return null;
    const result = await _api('/admin/stats');
    return result.ok ? result : null;
  }

  async function adminGetAuditLog(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return _api(`/admin/audit${qs ? '?' + qs : ''}`);
  }

  // ── Wallet Operations (async) ───────────────────────────
  async function requestDeposit(amount, method, reference = '') {
    return _api('/wallet/deposit', { method: 'POST', body: { amount, method, reference } });
  }

  async function requestWithdrawal(amount, method, address = '', notes = '') {
    return _api('/wallet/withdraw', { method: 'POST', body: { amount, method, address, notes } });
  }

  async function claimEarnings(amount, pool = 'all') {
    return _api('/wallet/claim', { method: 'POST', body: { amount, pool } });
  }

  async function getTransactions(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return _api(`/wallet/transactions${qs ? '?' + qs : ''}`);
  }

  // ── Tier Upgrade Request ─────────────────────────────────
  async function requestUpgrade(newTier) {
    if (!isLoggedIn()) return { ok: false, error: 'Not logged in.' };
    if (!TIERS[newTier]) return { ok: false, error: 'Invalid tier.' };
    const s = _loadSession();
    const tierOrder = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
    const curIdx = tierOrder.indexOf(s.tier);
    const newIdx = tierOrder.indexOf(newTier);
    if (newIdx <= curIdx) return { ok: false, error: 'You can only upgrade to a higher tier.' };
    return { ok: true, message: `Upgrade request to ${TIERS[newTier].label} submitted. An admin will review your request.` };
  }

  // ── Trade History ────────────────────────────────────────
  async function saveTrade(tradeData) {
    if (!isLoggedIn()) return { ok: false, error: 'Not logged in.' };
    return _api('/trades', { method: 'POST', body: tradeData });
  }

  async function getTrades(params = {}) {
    if (!isLoggedIn()) return { trades: [], total: 0 };
    const qs = new URLSearchParams(params).toString();
    return _api(`/trades${qs ? '?' + qs : ''}`);
  }

  async function getTradeStats() {
    if (!isLoggedIn()) return null;
    const result = await _api('/trades/stats');
    return result.ok !== false ? result : null;
  }

  // ── KYC ─────────────────────────────────────────────────
  async function submitKYC(docType, docFront, docBack = null, selfie = null, meta = {}) {
    if (!isLoggedIn()) return { ok: false, error: 'Not logged in.' };
    return _api('/kyc/submit', {
      method: 'POST',
      body: { doc_type: docType, doc_front: docFront, doc_back: docBack, selfie, ...meta },
    });
  }

  async function getKYCStatus() {
    if (!isLoggedIn()) return null;
    return _api('/kyc/status');
  }

  // ── Stripe Deposits ──────────────────────────────────────
  async function getStripePublishableKey() {
    const result = await _api('/stripe/publishable-key');
    return result.key || null;
  }

  async function createStripeSession(amount) {
    if (!isLoggedIn()) return { ok: false, error: 'Not logged in.' };
    if (!amount || isNaN(amount) || Number(amount) < 10) {
      return { ok: false, error: 'Minimum deposit is $10.' };
    }
    return _api('/stripe/create-session', { method: 'POST', body: { amount: Number(amount) } });
  }

  // ── Redirect to Stripe Checkout ──────────────────────────
  async function redirectToStripe(amount) {
    const result = await createStripeSession(amount);
    if (!result.ok && !result.url) {
      return { ok: false, error: result.error || 'Failed to create payment session.' };
    }
    if (result.url) {
      window.location.href = result.url;
      return { ok: true };
    }
    return result;
  }

  // ── Init ─────────────────────────────────────────────────
  function init() {
    if (_loadToken()) refreshSession().catch(() => {});
  }

  return {
    init, register, login, logout,
    getSession, isLoggedIn, isAdmin,
    getCurrentTier, getCurrentUser,
    refreshSession,
    getWallet, getCachedWallet,
    requestDeposit, requestWithdrawal, claimEarnings, getTransactions,
    adminGetAllUsers, adminGetUser, adminUpdateUser, adminDeleteUser,
    adminCreditUser, adminDebitUser,
    adminGetWithdrawals, adminApproveWithdrawal, adminRejectWithdrawal,
    adminGetStats, adminGetAuditLog,
    requestUpgrade,
    saveTrade, getTrades, getTradeStats,
    submitKYC, getKYCStatus,
    getStripePublishableKey, createStripeSession, redirectToStripe,
    TIERS,
  };
})();
