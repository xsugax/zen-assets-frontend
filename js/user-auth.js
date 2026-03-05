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

  // ════════════════════════════════════════════════════════
  //  LOCAL USER STORE — Fully functional offline auth
  //  Stores registered users in localStorage so the site
  //  works even when the backend API is unavailable.
  // ════════════════════════════════════════════════════════

  // Simple deterministic hash (for password obfuscation in localStorage)
  function _simpleHash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) + h) ^ str.charCodeAt(i);
      h = h >>> 0; // keep unsigned 32-bit
    }
    return h.toString(36) + '$' + str.length.toString(36);
  }

  // Generate a lightweight session token (base64 payload + random suffix)
  function _makeToken(userId) {
    const payload = { userId, iat: Date.now(), exp: Date.now() + 7 * 24 * 60 * 60 * 1000 };
    try { return btoa(JSON.stringify(payload)) + '.' + Math.random().toString(36).slice(2); }
    catch { return 'local_' + userId + '_' + Date.now(); }
  }

  // Verify a locally-generated token and return userId or null
  function _verifyLocalToken(token) {
    try {
      const part = token.split('.')[0];
      const payload = JSON.parse(atob(part));
      if (!payload || !payload.userId || payload.exp < Date.now()) return null;
      return payload.userId;
    } catch { return null; }
  }

  // ── Local User Store ─────────────────────────────────────
  const _localStore = {
    USERS_KEY: 'zen_users_db',

    getAll() {
      try { return JSON.parse(localStorage.getItem(this.USERS_KEY)) || []; }
      catch { return []; }
    },

    save(users) {
      try { localStorage.setItem(this.USERS_KEY, JSON.stringify(users)); } catch {}
    },

    findByEmail(email) {
      return this.getAll().find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
    },

    findById(id) {
      return this.getAll().find(u => u.id === id) || null;
    },

    // Seed built-in admin on first run
    ensureAdmin() {
      const existing = this.findByEmail('admin@zenassets.com');
      if (existing) return;
      const users = this.getAll();
      users.unshift({
        id: 'admin_builtin',
        fullName: 'ZEN Admin',
        email: 'admin@zenassets.com',
        passwordHash: _simpleHash('ZenAdmin2026!'),
        tier: 'diamond',
        depositAmount: 0,
        role: 'admin',
        balance: 0,
        earnings: 0,
        status: 'active',
        createdAt: new Date().toISOString(),
      });
      this.save(users);
    },

    // ── register ───────────────────────────────────────────
    register({ fullName, email, password, tier, depositAmount }) {
      if (this.findByEmail(email)) {
        return { ok: false, error: 'An account with this email already exists.' };
      }
      const id = 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      const user = {
        id, fullName, email: email.toLowerCase(),
        passwordHash: _simpleHash(password),
        tier: tier || 'bronze',
        depositAmount: parseFloat(depositAmount) || 0,
        role: 'user', balance: 0, earnings: 0,
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      const users = this.getAll();
      users.push(user);
      this.save(users);
      const token = _makeToken(id);
      const { passwordHash, ...safe } = user;
      return {
        ok: true, token,
        user: safe,
        wallet: {
          totalDeposited: user.depositAmount,
          balance: user.balance,
          earnings: user.earnings,
          currency: 'USD',
        },
      };
    },

    // ── login ──────────────────────────────────────────────
    login(email, password) {
      const user = this.findByEmail(email);
      if (!user) return { ok: false, error: 'No account found with this email address.' };
      if (user.passwordHash !== _simpleHash(password)) {
        return { ok: false, error: 'Incorrect password. Please try again.' };
      }
      const token = _makeToken(user.id);
      const { passwordHash, ...safe } = user;
      return {
        ok: true, token,
        user: safe,
        wallet: {
          totalDeposited: user.depositAmount || 0,
          balance: user.balance || 0,
          earnings: user.earnings || 0,
          currency: 'USD',
        },
      };
    },

    // ── get user by id ─────────────────────────────────────
    getUser(id) {
      const user = this.findById(id);
      if (!user) return { ok: false, status: 401, error: 'User not found.' };
      const { passwordHash, ...safe } = user;
      return {
        ok: true,
        user: safe,
        wallet: {
          totalDeposited: user.depositAmount || 0,
          balance: user.balance || 0,
          earnings: user.earnings || 0,
          currency: 'USD',
        },
      };
    },

    // ── update user fields ─────────────────────────────────
    updateUser(id, updates) {
      const users = this.getAll();
      const idx = users.findIndex(u => u.id === id);
      if (idx === -1) return { ok: false, error: 'User not found.' };
      users[idx] = { ...users[idx], ...updates };
      this.save(users);
      const { passwordHash, ...safe } = users[idx];
      return { ok: true, user: safe };
    },

    // ── list all users (admin) ─────────────────────────────
    listUsers() {
      return this.getAll().map(({ passwordHash, ...u }) => u);
    },
  };

  // Seed admin immediately
  _localStore.ensureAdmin();

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

  // ── API Helper — tries live API first, falls back to localStore ──
  async function _api(endpoint, { method = 'GET', body = null, auth = true } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const token = _loadToken();
    if (auth && token) headers['Authorization'] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    // ── Attempt live API with 5 s timeout ──────────────────
    let apiOk = false;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const resp = await fetch(`${API_BASE}${endpoint}`, { ...opts, signal: controller.signal });
      clearTimeout(timer);
      const data = await resp.json();
      if (!resp.ok) {
        // Rate-limit at backend? surface the message directly
        return { ok: false, status: resp.status, error: data.error || 'Request failed' };
      }
      apiOk = true;
      return { ok: true, ...data };
    } catch (err) {
      // Network error or timeout — fall through to local store
      console.warn(`⚡ LOCAL STORE: API unavailable (${endpoint}) — using offline fallback`);
    }

    // ── LOCAL STORE FALLBACK (register / login / me / logout) ─
    if (!apiOk) {
      // ── Verify email OTP (local: auto-succeed, no real email in offline mode) ──
      if (endpoint === '/auth/verify-email' && method === 'POST') {
        const user = _localStore.findById(body.userId);
        if (!user) return { ok: false, error: 'User not found.' };
        const token = _makeToken(user.id);
        const { passwordHash, ...safe } = user;
        return { ok: true, token, user: safe, wallet: { totalDeposited: user.depositAmount || 0, balance: user.balance || 0, earnings: user.earnings || 0, currency: 'USD' } };
      }

      // ── Verify login OTP (local: auto-succeed) ──
      if (endpoint === '/auth/verify-login-otp' && method === 'POST') {
        const user = _localStore.findById(body.userId);
        if (!user) return { ok: false, error: 'User not found.' };
        const token = _makeToken(user.id);
        const { passwordHash, ...safe } = user;
        return { ok: true, token, user: safe, wallet: { totalDeposited: user.depositAmount || 0, balance: user.balance || 0, earnings: user.earnings || 0, currency: 'USD' } };
      }

      // ── Resend OTP (local: no-op) ──
      if (endpoint === '/auth/resend-otp' && method === 'POST') {
        return { ok: true, message: 'Code sent (offline mode).' };
      }

      // ── Register ──────────────────────────────────────────
      if (endpoint === '/auth/register' && method === 'POST') {
        return _localStore.register(body);
      }

      // ── Login ─────────────────────────────────────────────
      if (endpoint === '/auth/login' && method === 'POST') {
        return _localStore.login(body.email, body.password);
      }

      // ── Me / Session refresh ──────────────────────────────
      if (endpoint === '/auth/me') {
        const userId = _verifyLocalToken(token);
        if (!userId) return { ok: false, status: 401, error: 'Session expired. Please log in again.' };
        return _localStore.getUser(userId);
      }

      // ── Logout ────────────────────────────────────────────
      if (endpoint === '/auth/logout') {
        return { ok: true };
      }

      // ── Admin: list users ─────────────────────────────────
      if (endpoint.startsWith('/admin/users') && method === 'GET') {
        return { ok: true, users: _localStore.listUsers() };
      }

      // ── Admin: update user ────────────────────────────────
      if (endpoint.match(/^\/admin\/users\/[^/]+$/) && method === 'PATCH') {
        const uid = endpoint.split('/').pop();
        return _localStore.updateUser(uid, body);
      }

      // ── Admin: stats ──────────────────────────────────────
      if (endpoint === '/admin/stats') {
        const users = _localStore.listUsers();
        return {
          ok: true,
          totalUsers: users.length,
          activeUsers: users.filter(u => u.status === 'active').length,
          totalDeposited: users.reduce((s, u) => s + (u.depositAmount || 0), 0),
        };
      }

      // ── Wallet / trades / KYC — return graceful empty ─────
      return { ok: true, transactions: [], trades: [], balance: 0, totalDeposited: 0, earnings: 0 };
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

    // Live backend: requires email OTP verification before activating account
    if (result.ok && result.requiresVerification) {
      return { ok: false, requiresVerification: true, userId: result.userId };
    }
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

    // Live backend: requires email OTP before issuing JWT
    if (result.ok && result.requires_otp) {
      return { ok: false, requires_otp: true, userId: result.userId, message: result.message };
    }

    if (result.ok && result.token) {
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

  // ── Verify Email OTP (after registration) ───────────────
  async function verifyEmailOTP(userId, code) {
    if (!userId || !code) return { ok: false, error: 'userId and code are required.' };
    const result = await _api('/auth/verify-email', { method: 'POST', body: { userId, code }, auth: false });
    if (result.ok && result.token) {
      _saveToken(result.token);
      const session = { userId: result.user.id, email: result.user.email, role: result.user.role, tier: result.user.tier, fullName: result.user.fullName, loginAt: Date.now() };
      _saveSession(session);
      if (result.wallet) _saveWallet(result.wallet);
      return { ok: true, user: result.user, session, wallet: result.wallet };
    }
    return result;
  }

  // ── Verify Login OTP (after email + password) ───────────
  async function verifyLoginOTP(userId, code) {
    if (!userId || !code) return { ok: false, error: 'userId and code are required.' };
    const result = await _api('/auth/verify-login-otp', { method: 'POST', body: { userId, code }, auth: false });
    if (result.ok && result.token) {
      _saveToken(result.token);
      const session = { userId: result.user.id, email: result.user.email, role: result.user.role, tier: result.user.tier, fullName: result.user.fullName, loginAt: Date.now() };
      _saveSession(session);
      if (result.wallet) _saveWallet(result.wallet);
      return { ok: true, user: result.user, session, wallet: result.wallet };
    }
    return result;
  }

  // ── Resend OTP (rate-limited at backend) ────────────────
  async function resendOTP(userId, type) {
    if (!userId || !type) return { ok: false, error: 'userId and type are required.' };
    return _api('/auth/resend-otp', { method: 'POST', body: { userId, type }, auth: false });
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
    console.log('🔐 LOGOUT: Starting termination sequence...');
    
    // Get user email BEFORE clearing session
    const sessionBefore = _loadSession();
    const userEmailBefore = sessionBefore?.email;
    
    // ═ STEP 1: Terminate WebSocket & Data Streams ═
    console.log('🔐 LOGOUT: Terminating data pipelines...');
    
    if (typeof RealDataAdapter !== 'undefined' && RealDataAdapter.destroy) {
      try {
        RealDataAdapter.destroy();
        console.log('✓ Real data adapter terminated');
      } catch(e) { console.warn('⚠ RealDataAdapter cleanup error:', e.message); }
    }
    
    if (typeof MarketData !== 'undefined' && MarketData.destroy) {
      try {
        MarketData.destroy();
        console.log('✓ Market data pipeline terminated');
      } catch(e) { console.warn('⚠ MarketData cleanup error:', e.message); }
    }
    
    // ═ STEP 2: Stop Chart Engines ═
    console.log('🔐 LOGOUT: Stopping chart engines...');
    
    if (typeof AdvancedChartEngine !== 'undefined' && AdvancedChartEngine.destroyAll) {
      try {
        AdvancedChartEngine.destroyAll();
        console.log('✓ Advanced chart engine destroyed (all instances)');
      } catch(e) { console.warn('⚠ AdvancedChartEngine cleanup error:', e.message); }
    }
    
    if (typeof AdvancedChartEngine !== 'undefined' && AdvancedChartEngine.stopRealtimeUpdates) {
      try {
        // Stop all realtime updates
        document.querySelectorAll('[id*="chart"]').forEach(el => {
          AdvancedChartEngine.stopRealtimeUpdates(el.id);
        });
        console.log('✓ All chart realtime updates stopped');
      } catch(e) { console.warn('⚠ Chart update stop error:', e.message); }
    }
    
    if (typeof ChartEngine !== 'undefined' && ChartEngine.destroyAll) {
      try {
        ChartEngine.destroyAll();
        console.log('✓ Chart engine destroyed');
      } catch(e) { console.warn('⚠ ChartEngine cleanup error:', e.message); }
    }
    
    // ═ STEP 3: Clear Tick Listeners & Timers ═
    console.log('🔐 LOGOUT: Clearing listeners and timers...');
    
    // Kill all pending timeouts and intervals
    for (let i = 1; i < 10000; i++) {
      clearTimeout(i);
      clearInterval(i);
    }
    console.log('✓ All timers cleared');
    
    // ═ STEP 4: Clear Candle Caches ═
    console.log('🔐 LOGOUT: Clearing candle caches...');
    
    const candleCacheKeys = [
      'zen_candles',
      'zen_ohlcv',
      'zen_chart_cache',
      'zen_ticker_cache',
      'zen_market_snapshot',
    ];
    candleCacheKeys.forEach(key => localStorage.removeItem(key));
    sessionStorage.clear();
    console.log('✓ Candle and chart caches cleared');
    
    // ═ STEP 5: Notify API About Logout ═
    console.log('🔐 LOGOUT: Disconnecting from API...');
    if (_loadToken()) {
      try { 
        await _api('/auth/logout', { method: 'POST' });
        console.log('✓ API logout confirmed');
      } catch { 
        console.warn('⚠ API logout notification failed (expected in offline mode)');
      }
    }
    
    // ═ STEP 6: Clear Auth Tokens & Session ═
    console.log('🔐 LOGOUT: Clearing authentication...');
    _saveToken(null);
    _saveSession(null);
    _saveWallet(null);
    console.log('✓ Auth tokens and session cleared');
    
    // ═ STEP 7: Clear User-Specific Data ═
    console.log('🔐 LOGOUT: Clearing user data...');
    
    if (userEmailBefore) {
      localStorage.removeItem('zen_investment_' + userEmailBefore.toLowerCase());
    }
    
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
      'zen_broadcast_stream',
      'zen_websocket_state',
    ];
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    console.log('✓ All user data cleared');
    
    console.log('🔓 LOGOUT: Complete - Session terminated, caches flushed, streams closed');
    console.log('📊 Final state - Session:', _loadSession(), 'Token:', _loadToken());
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
    verifyEmailOTP, verifyLoginOTP, resendOTP,
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
