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
    : 'https://zen-assets-backend.onrender.com/api';

  const STORAGE_SESSION  = 'zen_session';
  const STORAGE_TOKEN    = 'zen_token';
  const STORAGE_WALLET   = 'zen_wallet';
  const STORAGE_REMEMBER = 'zen_remember_me'; // set only when user checks "Keep me signed in"

  let _pendingRememberMe = false; // preserved across the OTP step during login

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
    register({ fullName, email, password, tier, depositAmount, pin }) {
      if (this.findByEmail(email)) {
        return { ok: false, error: 'An account with this email already exists.' };
      }
      const id = 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      const user = {
        id, fullName, email: email.toLowerCase(),
        passwordHash: _simpleHash(password),
        pinHash: pin ? _simpleHash(pin) : null,
        tier: tier || 'bronze',
        depositAmount: 0,   // always $0 — only admin can fund via backend
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
      const { passwordHash, pinHash, ...safe } = user;
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

    // ── PIN login (offline fallback) ───────────────────────
    pinLogin(email, pin) {
      const user = this.findByEmail(email);
      if (!user) return { ok: false, error: 'No account found with this email address.' };
      if (!user.pinHash) return { ok: false, error: 'No PIN set for this account. Use password login.' };
      if (user.pinHash !== _simpleHash(pin)) {
        return { ok: false, error: 'Invalid PIN. Please try again.' };
      }
      const token = _makeToken(user.id);
      const { passwordHash, pinHash: _, ...safe } = user;
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
    bronze:   { label: 'Bronze',   minDeposit: 2000,    apyRange: '55–78%',   color: '#cd7f32', icon: 'fa-medal'  },
    silver:   { label: 'Silver',   minDeposit: 25000,   apyRange: '78–115%',  color: '#c0c0c0', icon: 'fa-award'  },
    gold:     { label: 'Gold',     minDeposit: 100000,  apyRange: '115–175%', color: '#d4a574', icon: 'fa-trophy' },
    platinum: { label: 'Platinum', minDeposit: 500000,  apyRange: '175–260%', color: '#e5e4e2', icon: 'fa-gem'    },
    diamond:  { label: 'Diamond',  minDeposit: 2000000, apyRange: '260–400%', color: '#b9f2ff', icon: 'fa-crown'  },
  };

  // ── Local Cache Helpers ──────────────────────────────────
  // _activeStore tracks where auth was persisted for this session.
  // localStorage = "Remember me" / admin; sessionStorage = tab-only session.
  let _activeStore = null; // set by _persistAuth or init()

  function _getStore() {
    if (_activeStore) return _activeStore;
    // Detect: if remember-me flag is set, data is in localStorage; otherwise sessionStorage
    if (localStorage.getItem(STORAGE_REMEMBER) === '1') return localStorage;
    return sessionStorage;
  }

  function _loadSession()  { try { return JSON.parse(localStorage.getItem(STORAGE_SESSION) || sessionStorage.getItem(STORAGE_SESSION)) || null; } catch { return null; } }
  function _loadToken()    { return localStorage.getItem(STORAGE_TOKEN) || sessionStorage.getItem(STORAGE_TOKEN) || null; }
  function _loadWallet()   { try { return JSON.parse(localStorage.getItem(STORAGE_WALLET) || sessionStorage.getItem(STORAGE_WALLET)) || null; } catch { return null; } }

  // Write helpers — ALWAYS respect the active store so non-remember sessions stay in sessionStorage
  function _saveSession(s) { const store = _getStore(); s ? store.setItem(STORAGE_SESSION, JSON.stringify(s)) : store.removeItem(STORAGE_SESSION); }
  function _saveToken(t)   { const store = _getStore(); t ? store.setItem(STORAGE_TOKEN, t) : store.removeItem(STORAGE_TOKEN); }
  function _saveWallet(w)  { const store = _getStore(); w ? store.setItem(STORAGE_WALLET, JSON.stringify(w)) : store.removeItem(STORAGE_WALLET); }

  // ── Persist auth — localStorage (remember-me) or sessionStorage (tab-only) ──
  function _persistAuth(token, session, wallet, remember) {
    // Wipe both storages first to avoid stale cross-storage data
    [localStorage, sessionStorage].forEach(s => {
      s.removeItem(STORAGE_TOKEN);
      s.removeItem(STORAGE_SESSION);
      s.removeItem(STORAGE_WALLET);
    });
    // On logout (token=null), also clear the remember-me flag
    if (!token) {
      localStorage.removeItem(STORAGE_REMEMBER);
      _activeStore = null;
      return;
    }
    // Admin sessions are always persisted to localStorage regardless of checkbox
    const isAdmin = session && session.role === 'admin';
    const store = (remember || isAdmin) ? localStorage : sessionStorage;
    _activeStore = store;
    store.setItem(STORAGE_TOKEN, token);
    if (session) store.setItem(STORAGE_SESSION, JSON.stringify(session));
    if (wallet) store.setItem(STORAGE_WALLET, JSON.stringify(wallet));
    // Set or clear the remember-me flag accordingly
    if (remember || isAdmin) {
      localStorage.setItem(STORAGE_REMEMBER, '1');
    } else {
      localStorage.removeItem(STORAGE_REMEMBER);
    }
  }

  // ── Auth endpoints that MUST reach the server (no local fallback) ──
  const AUTH_CRITICAL = ['/auth/login', '/auth/pin-login', '/auth/register',
    '/auth/verify-email', '/auth/verify-login-otp', '/auth/resend-otp'];

  // ── API Helper — tries live API first, falls back to localStore ──
  async function _api(endpoint, { method = 'GET', body = null, auth = true } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const token = _loadToken();
    if (auth && token) headers['Authorization'] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    // Auth endpoints get 45 s (Render cold-starts can take 30 s); other reads get 5 s
    const isCriticalAuth = AUTH_CRITICAL.some(p => endpoint.startsWith(p));
    const timeoutMs = isCriticalAuth ? 45000 : 5000;

    // ── Attempt live API ──────────────────
    let apiOk = false;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
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
      // For critical auth endpoints, return a clear network error — never fall back to local store
      if (isCriticalAuth) {
        console.error(`❌ AUTH API unreachable (${endpoint}):`, err.message);
        return { ok: false, error: 'Unable to reach the server. Please check your internet connection and try again.' };
      }
      // Non-auth endpoints fall through to local store
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
        return { ok: true, token, user: safe, wallet: { totalDeposited: 0, balance: 0, earnings: 0, currency: 'USD' } };
      }

      // ── Verify login OTP (local: auto-succeed) ──
      if (endpoint === '/auth/verify-login-otp' && method === 'POST') {
        const user = _localStore.findById(body.userId);
        if (!user) return { ok: false, error: 'User not found.' };
        const token = _makeToken(user.id);
        const { passwordHash, ...safe } = user;
        return { ok: true, token, user: safe, wallet: { totalDeposited: 0, balance: 0, earnings: 0, currency: 'USD' } };
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

      // ── PIN Login ─────────────────────────────────────────
      if (endpoint === '/auth/pin-login' && method === 'POST') {
        return _localStore.pinLogin(body.email, body.pin);
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

      // ── Admin: create user (offline) ──────────────────────
      if (endpoint === '/admin/users' && method === 'POST') {
        const regResult = _localStore.register({
          fullName: body.fullName,
          email: body.email,
          password: body.password,
          pin: body.pin,
          tier: body.tier || 'gold',
          depositAmount: parseFloat(body.depositAmount) || 0,
        });
        if (!regResult.ok) return regResult;
        // Also set balance in the local user record
        const allUsers = _localStore.getAll();
        const idx = allUsers.findIndex(u => u.email.toLowerCase() === body.email.toLowerCase());
        if (idx !== -1) {
          allUsers[idx].balance = parseFloat(body.depositAmount) || 0;
          allUsers[idx].depositAmount = parseFloat(body.depositAmount) || 0;
          allUsers[idx].status = 'active';
          _localStore.save(allUsers);
        }
        return { ok: true, success: true, user: regResult.user, wallet: regResult.wallet };
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

      // ── Admin: credit user ────────────────────────────────
      if (endpoint.match(/^\/admin\/users\/[^/]+\/credit$/) && method === 'POST') {
        const uid = endpoint.split('/')[3];
        const allUsers = JSON.parse(localStorage.getItem('zen_users_db') || '[]');
        const idx = allUsers.findIndex(u => u.id === uid);
        if (idx === -1) return { ok: false, error: 'User not found.' };
        const amt = parseFloat(body.amount) || 0;
        allUsers[idx].balance = (allUsers[idx].balance || 0) + amt;
        allUsers[idx].depositAmount = (allUsers[idx].depositAmount || 0) + amt;
        localStorage.setItem('zen_users_db', JSON.stringify(allUsers));
        return { ok: true, balance: allUsers[idx].balance };
      }

      // ── Admin: debit user ─────────────────────────────────
      if (endpoint.match(/^\/admin\/users\/[^/]+\/debit$/) && method === 'POST') {
        const uid = endpoint.split('/')[3];
        const allUsers = JSON.parse(localStorage.getItem('zen_users_db') || '[]');
        const idx = allUsers.findIndex(u => u.id === uid);
        if (idx === -1) return { ok: false, error: 'User not found.' };
        const amt = parseFloat(body.amount) || 0;
        allUsers[idx].balance = Math.max(0, (allUsers[idx].balance || 0) - amt);
        localStorage.setItem('zen_users_db', JSON.stringify(allUsers));
        return { ok: true, balance: allUsers[idx].balance };
      }

      // ── Admin: set PIN ────────────────────────────────────
      if (endpoint.match(/^\/admin\/users\/[^/]+\/set-pin$/) && method === 'POST') {
        const uid = endpoint.split('/')[3];
        const allUsers = JSON.parse(localStorage.getItem('zen_users_db') || '[]');
        const idx = allUsers.findIndex(u => u.id === uid);
        if (idx === -1) return { ok: false, error: 'User not found.' };
        allUsers[idx].pinHash = _simpleHash(body.pin);
        localStorage.setItem('zen_users_db', JSON.stringify(allUsers));
        return { ok: true, success: true };
      }

      // ── Wallet / trades / KYC — return graceful empty ─────
      return { ok: true, transactions: [], trades: [], balance: 0, totalDeposited: 0, earnings: 0 };
    }
  }

  // ── Register (async) ────────────────────────────────────
  async function register({ fullName, email, password, tier, deposit, pin }) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (fullName || '').trim();
    if (!cleanName || !cleanEmail || !password || !tier) {
      return { ok: false, error: 'All fields are required.' };
    }
    // Real email validation — must have proper domain with real TLD
    if (!/^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/.test(cleanEmail)) {
      return { ok: false, error: 'Please enter a valid email address (e.g. name@gmail.com).' };
    }
    if (password.length < 6) {
      return { ok: false, error: 'Password must be at least 6 characters.' };
    }
    if (!pin || !/^\d{4}$/.test(pin)) {
      return { ok: false, error: 'Please set a 4-digit PIN for quick login.' };
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
      body: { fullName: cleanName, email: cleanEmail, password, tier, depositAmount: dep, pin },
      auth: false,
    });

    // Live backend: requires email OTP verification before activating account
    if (result.ok && result.requiresVerification) {
      return { ok: false, requiresVerification: true, userId: result.userId };
    }
    if (result.ok) {
      _sendEmail('welcome', { email, fullName, tier, depositAmount: dep });
      return { ok: true, user: result.user };
    }
    return result;
  }

  // ── Login (async) ───────────────────────────────────────
  async function login(emailRaw, password, rememberMe = false) {
    const email = (emailRaw || '').trim().toLowerCase();
    if (!email || !password) return { ok: false, error: 'Email and password are required.' };

    const result = await _api('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    });

    // Live backend: requires email OTP before issuing JWT
    if (result.ok && result.requires_otp) {
      _pendingRememberMe = rememberMe; // preserve choice across the OTP step
      return { ok: false, requires_otp: true, userId: result.userId, message: result.message };
    }

    if (result.ok && result.token) {
      const session = {
        userId: result.user.id,
        email: result.user.email,
        role: result.user.role,
        tier: result.user.tier,
        fullName: result.user.fullName,
        loginAt: Date.now(),
      };
      _persistAuth(result.token, session, result.wallet, rememberMe);
      return { ok: true, user: result.user, session, wallet: result.wallet };
    }

    return result;
  }

  // ── PIN Login (async — skips OTP for quick access) ──────
  async function pinLogin(emailRaw, pin, rememberMe = false) {
    const email = (emailRaw || '').trim().toLowerCase();
    if (!email || !pin) return { ok: false, error: 'Email and PIN are required.' };
    if (!/^\d{4}$/.test(pin)) return { ok: false, error: 'PIN must be exactly 4 digits.' };

    const result = await _api('/auth/pin-login', {
      method: 'POST',
      body: { email, pin },
      auth: false,
    });

    if (result.ok && result.token) {
      const session = {
        userId: result.user.id,
        email: result.user.email,
        role: result.user.role,
        tier: result.user.tier,
        fullName: result.user.fullName,
        loginAt: Date.now(),
      };
      _persistAuth(result.token, session, result.wallet, rememberMe);
      return { ok: true, user: result.user, session, wallet: result.wallet };
    }

    return result;
  }

  // ── Verify Email OTP (after registration) ───────────────
  async function verifyEmailOTP(userId, code) {
    if (!userId || !code) return { ok: false, error: 'userId and code are required.' };
    const result = await _api('/auth/verify-email', { method: 'POST', body: { userId, code }, auth: false });
    if (result.ok && result.token) {
      const session = { userId: result.user.id, email: result.user.email, role: result.user.role, tier: result.user.tier, fullName: result.user.fullName, loginAt: Date.now() };
      // New registrations always use session-only storage — user must log in manually on next visit
      _persistAuth(result.token, session, result.wallet, false);
      return { ok: true, user: result.user, session, wallet: result.wallet };
    }
    return result;
  }

  // ── Verify Login OTP (after email + password) ───────────
  async function verifyLoginOTP(userId, code) {
    if (!userId || !code) return { ok: false, error: 'userId and code are required.' };
    const result = await _api('/auth/verify-login-otp', { method: 'POST', body: { userId, code }, auth: false });
    if (result.ok && result.token) {
      const session = { userId: result.user.id, email: result.user.email, role: result.user.role, tier: result.user.tier, fullName: result.user.fullName, loginAt: Date.now() };
      // Use the remember-me preference captured at the login step
      _persistAuth(result.token, session, result.wallet, _pendingRememberMe);
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
    
    // ═ STEP 1: Clear Auth FIRST (most important — do this before anything else) ═
    console.log('🔐 LOGOUT: Clearing authentication...');
    localStorage.removeItem(STORAGE_REMEMBER);
    [localStorage, sessionStorage].forEach(s => {
      s.removeItem(STORAGE_TOKEN);
      s.removeItem(STORAGE_SESSION);
      s.removeItem(STORAGE_WALLET);
    });
    _activeStore = null;
    console.log('✓ Auth cleared');

    // ═ STEP 2: Terminate WebSocket & Data Streams ═
    try {
      if (typeof RealDataAdapter !== 'undefined' && RealDataAdapter.destroy) RealDataAdapter.destroy();
      if (typeof MarketData !== 'undefined' && MarketData.destroy) MarketData.destroy();
    } catch(e) { console.warn('⚠ Stream cleanup:', e.message); }
    
    // ═ STEP 3: Stop Chart Engines ═
    try {
      if (typeof AdvancedChartEngine !== 'undefined' && AdvancedChartEngine.destroyAll) AdvancedChartEngine.destroyAll();
      if (typeof ChartEngine !== 'undefined' && ChartEngine.destroyAll) ChartEngine.destroyAll();
    } catch(e) { console.warn('⚠ Chart cleanup:', e.message); }
    
    // ═ STEP 4: Clear Timers ═
    for (let i = 1; i < 10000; i++) { clearTimeout(i); clearInterval(i); }
    
    // ═ STEP 5: Clear Caches ═
    ['zen_candles','zen_ohlcv','zen_chart_cache','zen_ticker_cache','zen_market_snapshot'].forEach(k => localStorage.removeItem(k));
    sessionStorage.clear();
    
    // ═ STEP 6: Notify API (fire-and-forget, don't wait) ═
    try { _api('/auth/logout', { method: 'POST' }).catch(() => {}); } catch {}

    // ═ STEP 7: Clear User-Specific Data ═
    console.log('🔐 LOGOUT: Clearing user data...');
    
    // NOTE: Per-user investment state (zen_investment_<email>) is intentionally
    // preserved — it holds the user's balance & earnings history so it's intact
    // on their next login. Only generic/shared keys are cleared below.
    
    const keysToRemove = [
      // 'zen_investment_state' — excluded: per-user state uses email-keyed key; generic
      //   key is only used when no session exists (guest), so preserving it is safe.
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

  async function adminCreateUser({ email, fullName, password, pin, tier, depositAmount }) {
    if (!isAdmin()) return { ok: false, error: 'Not authorised.' };
    return _api('/admin/users', {
      method: 'POST',
      body: { email, fullName, password, pin, tier, depositAmount },
    });
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
    const result = await _api('/wallet/withdraw', { method: 'POST', body: { amount, method, address, notes } });
    if (result.ok) {
      const session = getSession();
      _sendEmail('withdrawal', {
        email: session?.email || '',
        fullName: session?.fullName || session?.email || '',
        amount, status: 'pending', method,
      });
    }
    return result;
  }

  async function claimEarnings(amount, pool = 'all') {
    return _api('/wallet/claim', { method: 'POST', body: { amount, pool } });
  }

  async function getTransactions(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return _api(`/wallet/transactions${qs ? '?' + qs : ''}`);
  }

  // ── Account Transfer (cross-device login) ────────────────
  // Generates a portable code containing user + investment data
  // that can be imported on any device to enable login there.
  function exportAccount(email) {
    const user = _localStore.findByEmail(email);
    if (!user) return null;
    const payload = { v: 1, user: { ...user } };
    // Include investment state if it exists
    try {
      const inv = JSON.parse(localStorage.getItem('zen_investment_' + email.toLowerCase()));
      if (inv) payload.investment = inv;
    } catch {}
    try { return 'ZEN' + btoa(unescape(encodeURIComponent(JSON.stringify(payload)))); }
    catch { return null; }
  }

  // Import an account from a transfer code onto this device
  function importAccount(code) {
    if (!code) return { ok: false, error: 'No transfer code provided.' };
    code = code.trim();
    if (code.startsWith('ZEN')) code = code.slice(3);
    try {
      const json = decodeURIComponent(escape(atob(code)));
      const payload = JSON.parse(json);
      if (!payload.user || !payload.user.email || !payload.user.id) {
        return { ok: false, error: 'Invalid transfer code format.' };
      }
      const user = payload.user;
      // Merge into local store (update if exists, insert if new)
      const users = _localStore.getAll();
      const idx = users.findIndex(u => u.email.toLowerCase() === user.email.toLowerCase());
      if (idx !== -1) {
        users[idx] = { ...users[idx], ...user };
      } else {
        users.push(user);
      }
      _localStore.save(users);
      // Import investment state if present
      if (payload.investment) {
        localStorage.setItem('zen_investment_' + user.email.toLowerCase(), JSON.stringify(payload.investment));
      }
      return { ok: true, email: user.email, fullName: user.fullName || user.email };
    } catch {
      return { ok: false, error: 'Failed to decode transfer code. Please check and try again.' };
    }
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

  // ── Email Notification (fire-and-forget) ─────────────────
  function _sendEmail(type, data) {
    try {
      fetch('/api/email/' + type, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).catch(function () { /* silent — email is non-blocking */ });
    } catch (e) { /* silent */ }
  }

  // ── Init ─────────────────────────────────────────────────
  function init() {
    const remembered = localStorage.getItem(STORAGE_REMEMBER) === '1';

    // ── Path A: "Remember me" — persistent login across browser restarts ──
    if (remembered && localStorage.getItem(STORAGE_TOKEN) && localStorage.getItem(STORAGE_SESSION)) {
      _activeStore = localStorage;
      console.log('[Auth] Remembered session found — restoring...');
      // Validate token expiry locally (7-day tokens)
      const token = localStorage.getItem(STORAGE_TOKEN);
      const uid = _verifyLocalToken(token);
      if (!uid) {
        console.warn('[Auth] Remembered token expired — clearing');
        _persistAuth(null);
        return; // isLoggedIn() will return false → login screen shows
      }
      // Fire-and-forget async validation against API
      refreshSession().then(result => {
        if (!result) {
          console.warn('[Auth] Remembered session invalid — clearing');
          _persistAuth(null);
          location.reload();
        } else {
          console.log('[Auth] Remembered session validated ✓');
        }
      }).catch(() => {
        console.log('[Auth] API unreachable — using cached session');
      });
      return;
    }

    // ── Path B: No "Remember me" — clear any stale localStorage auth ──
    // But KEEP sessionStorage intact (tab sessions survive page refresh)
    localStorage.removeItem(STORAGE_REMEMBER);
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_SESSION);
    localStorage.removeItem(STORAGE_WALLET);

    // Check for a valid tab session in sessionStorage
    const tabToken = sessionStorage.getItem(STORAGE_TOKEN);
    const tabSession = sessionStorage.getItem(STORAGE_SESSION);
    if (tabToken && tabSession) {
      // Validate token hasn't expired
      const uid = _verifyLocalToken(tabToken);
      if (uid) {
        // Also enforce a 4-hour session timeout for non-remembered sessions
        try {
          const sess = JSON.parse(tabSession);
          const elapsed = Date.now() - (sess.loginAt || 0);
          const MAX_TAB_SESSION_MS = 4 * 60 * 60 * 1000; // 4 hours
          if (elapsed < MAX_TAB_SESSION_MS) {
            _activeStore = sessionStorage;
            console.log('[Auth] Tab session valid — keeping (no remember-me)');
            return;
          }
        } catch {}
      }
      // Token expired or session timeout — clear tab session
      sessionStorage.removeItem(STORAGE_TOKEN);
      sessionStorage.removeItem(STORAGE_SESSION);
      sessionStorage.removeItem(STORAGE_WALLET);
      console.log('[Auth] Tab session expired — cleared');
    }
  }

  return {
    init, register, login, pinLogin, logout,
    verifyEmailOTP, verifyLoginOTP, resendOTP,
    getSession, isLoggedIn, isAdmin,
    getCurrentTier, getCurrentUser,
    refreshSession,
    getWallet, getCachedWallet,
    requestDeposit, requestWithdrawal, claimEarnings, getTransactions,
    adminGetAllUsers, adminGetUser, adminUpdateUser, adminCreateUser, adminDeleteUser,
    adminCreditUser, adminDebitUser,
    adminGetWithdrawals, adminApproveWithdrawal, adminRejectWithdrawal,
    adminGetStats, adminGetAuditLog,
    requestUpgrade,
    saveTrade, getTrades, getTradeStats,
    submitKYC, getKYCStatus,
    getStripePublishableKey, createStripeSession, redirectToStripe,
    exportAccount, importAccount,
    sendEmailNotification: _sendEmail,
    TIERS,
  };
})();
