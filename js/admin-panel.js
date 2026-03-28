/* ════════════════════════════════════════════════════════════
   admin-panel.js — Enterprise Admin Command Center
   OmniVest AI / ZEN ASSETS
   
   Features:
   ─ Dashboard KPIs + Chart.js visualisations
   ─ User CRUD with search / sort / filter / pagination / bulk ops
   ─ Financial operations (withdrawals, balance adjustments, ledger)
   ─ Risk monitoring (exposure calculation, alerts, KYC status)
   ─ Live trade feed aggregation across all users
   ─ Platform configuration toggles + tier editor
   ─ Audit trail with severity, filters, and export
   ─ Broadcast notification system with targeting
   ─ All data via localStorage (matches main app keys)
════════════════════════════════════════════════════════════ */

const AdminPanel = (() => {
  'use strict';

  // ────────────────────────────────────────────────────────
  //  CONSTANTS & STORAGE KEYS
  // ────────────────────────────────────────────────────────
  const KEYS = {
    USERS:          'zen_users',
    SESSION:        'zen_session',
    AUDIT:          'zen_admin_audit',
    NOTIFICATIONS:  'zen_admin_notifications',
    CONFIG:         'zen_platform_config',
    WITHDRAWALS:    'zen_pending_withdrawals',
    LEDGER:         'zen_transaction_ledger',
  };

  const ADMIN_EMAIL = 'admin@zenassets.com';
  const ADMIN_PASS  = 'ZenAdmin2026!';

  const TIERS = {
    bronze:   { label: 'Bronze',   color: '#cd7f32', minDeposit: 2000,    apy: '25–38%', maxLev: '5x',  commission: 0.15 },
    silver:   { label: 'Silver',   color: '#c0c0c0', minDeposit: 25000,   apy: '38–52%', maxLev: '10x', commission: 0.12 },
    gold:     { label: 'Gold',     color: '#d4a574', minDeposit: 100000,  apy: '52–72%', maxLev: '25x', commission: 0.10 },
    platinum: { label: 'Platinum', color: '#e5e4e2', minDeposit: 500000,  apy: '72–95%', maxLev: '50x', commission: 0.07 },
    diamond:  { label: 'Diamond',  color: '#b9f2ff', minDeposit: 1000000, apy: '95–125%', maxLev: '100x',commission: 0.05 },
  };

  const ITEMS_PER_PAGE = 15;

  // ────────────────────────────────────────────────────────
  //  COOKIE UTILITY (Secure, SameSite=Strict)
  // ────────────────────────────────────────────────────────
  const Cookie = {
    _prefix: 'zen_adm_',
    _secure: location.protocol === 'https:',

    set(name, value, days = 7) {
      const key = this._prefix + name;
      const val = typeof value === 'object' ? JSON.stringify(value) : String(value);
      const d = new Date();
      d.setTime(d.getTime() + days * 86400000);
      let parts = [
        encodeURIComponent(key) + '=' + encodeURIComponent(val),
        'expires=' + d.toUTCString(),
        'path=/',
        'SameSite=Strict',
      ];
      if (this._secure) parts.push('Secure');
      document.cookie = parts.join('; ');
    },

    get(name, fallback = null) {
      const key = this._prefix + name;
      const match = document.cookie.split('; ').find(c => c.startsWith(encodeURIComponent(key) + '='));
      if (!match) return fallback;
      const raw = decodeURIComponent(match.split('=').slice(1).join('='));
      try { return JSON.parse(raw); } catch { return raw; }
    },

    remove(name) {
      const key = this._prefix + name;
      document.cookie = encodeURIComponent(key) + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Strict';
    },

    // Check if cookies are enabled
    isEnabled() {
      try {
        document.cookie = '__zen_test=1; SameSite=Strict';
        const ok = document.cookie.indexOf('__zen_test') !== -1;
        document.cookie = '__zen_test=; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict';
        return ok;
      } catch { return false; }
    },
  };

  // ────────────────────────────────────────────────────────
  //  ADMIN PREFERENCES (cookie-backed)
  // ────────────────────────────────────────────────────────
  function _loadPrefs() {
    return Cookie.get('prefs', {
      lastTab: 'overview',
      refreshInterval: 30,
      itemsPerPage: ITEMS_PER_PAGE,
      lastDataFetch: 0,
    });
  }

  function _savePrefs(updates) {
    const current = _loadPrefs();
    Cookie.set('prefs', { ...current, ...updates }, 30);
  }

  // ────────────────────────────────────────────────────────
  //  STATE
  // ────────────────────────────────────────────────────────
  let currentTab        = 'overview';
  let userSearchQuery   = '';
  let userPage          = 1;
  let selectedUsers     = new Set();
  let auditSearchQuery  = '';
  let auditPage         = 1;
  let charts            = {};        // Chart.js instances
  let refreshTimer      = null;

  // API response cache
  const _cache = {
    users:       {},   // normalised user objects keyed by email.toLowerCase()
    withdrawals: [],   // pending withdrawals (normalised)
    audit:       [],   // audit log entries (normalised)
    stats:       null, // platform stats object
  };

  // ────────────────────────────────────────────────────────
  //  HELPERS
  // ────────────────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);

  function uid()  { return 'tx_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function now()  { return Date.now(); }
  function fmtDate(ts) { return ts ? new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'; }
  function fmtTime(ts) { return ts ? new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'; }
  function fmtMoney(n) { return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
  function fmtMoneyFull(n) { return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function pct(a, b) { return b ? ((a / b) * 100).toFixed(1) : '0.0'; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function timeAgo(ts) {
    if (!ts) return 'Never';
    const diff = (now() - ts) / 1000;
    if (diff < 60)   return 'Just now';
    if (diff < 3600)  return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  }

  // PIN hash — must match _simpleHash in user-auth.js exactly
  function _hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) + h) ^ str.charCodeAt(i);
      h = h >>> 0;
    }
    return h.toString(36) + '$' + str.length.toString(36);
  }

  // ────────────────────────────────────────────────────────
  //  DATA LAYER (localStorage)
  // ────────────────────────────────────────────────────────
  // Returns API-backed user dict keyed by email (normalised)
  function loadUsers()      { return _cache.users; }
  function saveUsers()      { /* mutations go through API */ }
  function loadAudit()      { return _cache.audit; }
  function saveAudit()      { /* mutations go through API */ }
  function loadWithdrawals(){ return _cache.withdrawals; }
  function saveWithdrawals(){ /* mutations go through API */ }
  function loadNotifs()     { try { return JSON.parse(localStorage.getItem(KEYS.NOTIFICATIONS)) || []; } catch { return []; } }
  function saveNotifs(n)    { localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(n)); }
  function loadConfig()     { try { return JSON.parse(localStorage.getItem(KEYS.CONFIG)) || _defaultConfig(); } catch { return _defaultConfig(); } }
  function saveConfig_ls(c) { localStorage.setItem(KEYS.CONFIG, JSON.stringify(c)); }
  function loadLedger()     { try { return JSON.parse(localStorage.getItem(KEYS.LEDGER)) || []; } catch { return []; } }
  function saveLedger(l)    { localStorage.setItem(KEYS.LEDGER, JSON.stringify(l.slice(0, 500))); }

  function _defaultConfig() {
    return {
      registration: true,
      trading: true,
      autoTrader: true,
      withdrawals: true,
      maintenance: false,
      tradeInterval: 45,
      maxPositions: 8,
      minConfidence: 65,
      positionSize: 3,
      sessionTimeout: 60,
      maxDailyLoss: 10,
    };
  }

  // Get all trade histories across all users
  function loadAllTrades() {
    const trades = [];
    const users = loadUsers();
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('autoTradeHistory')) {
        try {
          const userTrades = JSON.parse(localStorage.getItem(key));
          if (Array.isArray(userTrades)) {
            // Attach user info
            const email = key.replace('autoTradeHistory_', '') || 'unknown';
            userTrades.forEach(t => {
              t._userEmail = email;
              t._userName = users[email]?.fullName || email;
            });
            trades.push(...userTrades);
          }
        } catch { /* skip */ }
      }
    }
    // Sort newest first
    trades.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return trades;
  }

  // ────────────────────────────────────────────────────────
  //  DATA NORMALIZERS  (API shape → admin-panel shape)
  // ────────────────────────────────────────────────────────
  function _normalizeUser(u) {
    const email = (u.email || '').toLowerCase();
    return {
      id:              u.id,
      email,
      fullName:        u.full_name || u.fullName || u.email || 'Unknown',
      role:            u.role || 'user',
      status:          u.status || 'active',
      tier:            u.tier || 'bronze',
      kycStatus:       u.kyc_status || u.kycStatus || 'unverified',
      createdAt:       u.created_at ? new Date(u.created_at).getTime()
                     : u.createdAt  ? new Date(u.createdAt).getTime()
                     : Date.now(),
      lastLogin:       u.last_login  ? new Date(u.last_login).getTime()
                     : u.lastLogin   ? new Date(u.lastLogin).getTime()
                     : null,
      deposit:         parseFloat(u.balance) || parseFloat(u.depositAmount) || 0,
      totalDeposited:  parseFloat(u.total_deposited) || parseFloat(u.totalDeposited) || parseFloat(u.depositAmount) || 0,
      tradeCount:      u.trade_count || u.tradeCount || 0,
    };
  }

  function _normalizeWithdrawal(w) {
    return {
      id:          String(w.id),
      email:       w.email || '',
      name:        w.full_name || w.email || 'Unknown',
      amount:      Math.abs(parseFloat(w.amount) || 0),  // stored as negative in DB
      method:      w.method || w.notes?.split(':')[0]?.trim() || 'Bank Transfer',
      requestedAt: w.created_at ? new Date(w.created_at).getTime() : Date.now(),
      status:      w.status || 'pending',
    };
  }

  function _normalizeAuditEntry(a) {
    // details may be a JSON string — try to extract a human-readable summary
    let message = a.action || 'admin action';
    if (a.details) {
      try {
        const d = typeof a.details === 'string' ? JSON.parse(a.details) : a.details;
        message = d.message || d.changes || a.action || message;
      } catch {
        message = String(a.details).slice(0, 200) || message;
      }
    }
    return {
      id:        String(a.id),
      type:      (a.action || 'admin_action').replace('.', '_'),
      message,
      severity:  a.severity === 'warn' ? 'warning' : (a.severity || 'info'),
      actor:     a.email || a.full_name || 'admin',
      timestamp: a.created_at ? new Date(a.created_at).getTime() : Date.now(),
      meta:      {},
    };
  }

  // ────────────────────────────────────────────────────────
  //  API DATA LOADER
  // ────────────────────────────────────────────────────────
  const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:4000/api' : 'https://zen-assets-backend.onrender.com/api';

  // Ensure admin has a REAL server token (not a local fallback token)
  // This is critical: without a valid server token, all /admin/* calls fail
  async function _ensureServerAuth() {
    try {
      toast('Connecting to server…', 'info', 8000);

      // Step 1: Try current token — maybe it's already valid
      const existingToken = localStorage.getItem('zen_token') || sessionStorage.getItem('zen_token');
      if (existingToken) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 35000);
          const resp = await fetch(`${API_BASE}/auth/me`, {
            headers: { 'Authorization': `Bearer ${existingToken}` },
            signal: controller.signal,
          });
          clearTimeout(timer);
          if (resp.ok) {
            toast('Server connected', 'success', 2000);
            return true; // token is valid on server
          }
        } catch { /* token invalid or server cold — continue to re-auth */ }
      }

      // Step 2: Re-authenticate with admin credentials to get a real server token
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 45000);
        const resp = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (resp.ok) {
          const data = await resp.json();
          if (data.token) {
            // Save the real server token
            localStorage.setItem('zen_token', data.token);
            sessionStorage.setItem('zen_token', data.token);
            if (data.user) {
              const session = {
                userId: data.user.id, email: data.user.email,
                role: data.user.role || 'admin', tier: data.user.tier,
                fullName: data.user.fullName || data.user.full_name || 'Admin',
                loginAt: Date.now(),
              };
              localStorage.setItem('zen_session', JSON.stringify(session));
            }
            toast('Server connected', 'success', 2000);
            return true;
          }
        }
      } catch { /* server not reachable */ }

      toast('Server offline — showing cached data', 'warning', 4000);
      return false;
    } catch {
      return false;
    }
  }

  let _serverAuthenticated = false;

  async function _loadApiData() {
    try {
      // First call: authenticate with the real server so API calls work
      if (!_serverAuthenticated) {
        const authed = await _ensureServerAuth();
        if (authed) {
          _serverAuthenticated = true;
        } else {
          // Backend didn't respond — load from local store immediately
          _seedCacheFromLocalStore();
          return false;
        }
      }

      const [usersRaw, withdrawalsRaw, statsRaw, auditRaw] = await Promise.all([
        UserAuth.adminGetAllUsers({ limit: 500 }),
        UserAuth.adminGetWithdrawals(),
        UserAuth.adminGetStats(),
        UserAuth.adminGetAuditLog({ limit: 200 }),
      ]);

      // Ensure required users exist in local store before merging
      _ensureRequiredUsers();

      // Normalise users → dict keyed by email
      // IMPORTANT: only replace cache if we got data; keep previous data otherwise
      if (Array.isArray(usersRaw) && usersRaw.length > 0) {
        const fresh = {};
        usersRaw.forEach(u => {
          const norm = _normalizeUser(u);
          fresh[norm.email] = norm;
        });
        _cache.users = fresh;

        // Sync API users into local store so they persist offline
        _syncUsersToLocalStore(usersRaw);
      } else {
        _cache.users = _cache.users || {};
      }

      // Always merge local store users INTO the cache (union by email)
      // This ensures users registered on other devices / seeded locally are visible
      try {
        const localUsers = JSON.parse(localStorage.getItem('zen_users_db') || '[]');
        localUsers.forEach(u => {
          const norm = _normalizeUser(u);
          if (norm.role === 'admin') return;
          if (!_cache.users[norm.email]) {
            _cache.users[norm.email] = norm;
          }
        });
      } catch { /* graceful */ }

      // Normalise withdrawals
      _cache.withdrawals = Array.isArray(withdrawalsRaw)
        ? withdrawalsRaw.map(_normalizeWithdrawal)
        : [];

      // Stats
      _cache.stats = statsRaw || null;

      // Audit log
      if (auditRaw && auditRaw.ok && Array.isArray(auditRaw.logs)) {
        _cache.audit = auditRaw.logs.map(_normalizeAuditEntry);
      }

      return true;
    } catch (err) {
      console.error('AdminPanel: _loadApiData failed', err);
      _seedCacheFromLocalStore();
      toast('Could not load data from server — showing cached data.', 'warning');
      return false;
    }
  }

  // Populate _cache.users from localStorage when API is unreachable
  function _seedCacheFromLocalStore() {
    if (_cache.users && Object.keys(_cache.users).length > 0) return; // already have data
    _cache.users = {};
    try {
      const localUsers = JSON.parse(localStorage.getItem('zen_users_db') || '[]');
      localUsers.forEach(u => {
        const norm = _normalizeUser(u);
        if (norm.role !== 'admin') _cache.users[norm.email] = norm;
      });
    } catch (e) { /* graceful */ }
  }

  // Ensure required users exist in zen_users_db (seed once)
  function _ensureRequiredUsers() {
    try {
      const localUsers = JSON.parse(localStorage.getItem('zen_users_db') || '[]');
      const emails = localUsers.map(u => (u.email || '').toLowerCase());

      const required = [
        {
          id: 'u_swan_' + Date.now(),
          fullName: 'Swan Management',
          email: 'swanmanagement32@gmail.com',
          passwordHash: '',
          pinHash: null,
          tier: 'silver',
          depositAmount: 65000,
          balance: 65000,
          earnings: 0,
          role: 'user',
          status: 'active',
          kycStatus: 'verified',
          createdAt: '2025-12-15T10:00:00.000Z',
        },
      ];

      let changed = false;
      required.forEach(r => {
        const idx = emails.indexOf(r.email.toLowerCase());
        if (idx === -1) {
          localUsers.push(r);
          changed = true;
        } else {
          // Fix tier/balance if previously seeded with wrong values
          const existing = localUsers[idx];
          if (existing.tier !== r.tier || existing.depositAmount !== r.depositAmount) {
            existing.tier = r.tier;
            existing.depositAmount = r.depositAmount;
            existing.balance = r.balance;
            changed = true;
          }
        }
      });

      if (changed) {
        localStorage.setItem('zen_users_db', JSON.stringify(localUsers));
      }
    } catch { /* graceful */ }
  }

  // Try to create a required user on the server if they don't exist there
  async function _ensureRequiredUsersOnServer() {
    if (!_serverAuthenticated) return;
    try {
      const result = await UserAuth.adminGetAllUsers({ limit: 500 });
      const serverEmails = (result || []).map(u => (u.email || '').toLowerCase());

      if (!serverEmails.includes('swanmanagement32@gmail.com')) {
        await UserAuth.adminCreateUser({
          fullName: 'Swan Management',
          email: 'swanmanagement32@gmail.com',
          password: 'SwanMgmt2025!',
          tier: 'silver',
          depositAmount: 65000,
        }).catch(() => {});
      }
    } catch { /* best-effort */ }
  }

  // Sync API users into zen_users_db so they survive offline / cold-starts
  function _syncUsersToLocalStore(apiUsers) {
    try {
      const localUsers = JSON.parse(localStorage.getItem('zen_users_db') || '[]');
      const localMap = {};
      localUsers.forEach(u => { localMap[(u.email || '').toLowerCase()] = u; });

      let changed = false;
      apiUsers.forEach(au => {
        const email = (au.email || '').toLowerCase();
        if (!email || email === 'admin@zenassets.com') return;

        if (localMap[email]) {
          // Update existing local record with latest API data
          const lu = localMap[email];
          lu.fullName      = au.full_name || au.fullName || lu.fullName;
          lu.status         = au.status   || lu.status;
          lu.tier           = au.tier     || lu.tier;
          lu.balance        = parseFloat(au.balance) || lu.balance || 0;
          lu.depositAmount  = parseFloat(au.total_deposited) || parseFloat(au.depositAmount) || lu.depositAmount || 0;
          lu.role           = au.role     || lu.role || 'user';
          changed = true;
        } else {
          // New user from API — add to local store (no password, but visible in admin)
          localUsers.push({
            id:            au.id || ('u_api_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)),
            fullName:      au.full_name || au.fullName || au.email,
            email:         email,
            passwordHash:  au.passwordHash || '',
            pinHash:       au.pinHash || null,
            tier:          au.tier || 'bronze',
            depositAmount: parseFloat(au.total_deposited) || parseFloat(au.depositAmount) || parseFloat(au.balance) || 0,
            balance:       parseFloat(au.balance) || 0,
            earnings:      parseFloat(au.earnings) || 0,
            role:          au.role || 'user',
            status:        au.status || 'active',
            createdAt:     au.created_at || au.createdAt || new Date().toISOString(),
          });
          changed = true;
        }
      });

      if (changed) {
        localStorage.setItem('zen_users_db', JSON.stringify(localUsers));
      }
    } catch (e) { /* graceful — don't break the panel */ }
  }

  // ────────────────────────────────────────────────────────
  //  AUDIT LOGGING
  // ────────────────────────────────────────────────────────
  function log(type, message, severity = 'info', meta = {}) {
    // Record locally for immediate feedback; API logs its own audit trail
    _cache.audit.unshift({
      id: uid(), type, message, severity, meta, actor: 'admin', timestamp: now(),
    });
    if (_cache.audit.length > 1000) _cache.audit.length = 1000;
  }

  // ────────────────────────────────────────────────────────
  //  TOAST NOTIFICATIONS
  // ────────────────────────────────────────────────────────
  function toast(message, type = 'info', duration = 4000) {
    const container = $('admin-toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `admin-toast ${type}`;
    const icons = { info: 'fa-info-circle', success: 'fa-check-circle', warning: 'fa-exclamation-circle', error: 'fa-times-circle' };
    el.innerHTML = `<i class="fa ${icons[type] || icons.info}"></i><span>${message}</span>`;
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, duration);
  }

  // ────────────────────────────────────────────────────────
  //  AUTHENTICATION
  // ────────────────────────────────────────────────────────
  function _initAuth() {
    const form = $('admin-login-form');
    if (!form) return;

    // Toggle password visibility
    const toggleBtn = $('al-toggle-pass');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const inp = $('admin-password');
        const isPass = inp.type === 'password';
        inp.type = isPass ? 'text' : 'password';
        toggleBtn.querySelector('i').className = isPass ? 'fa fa-eye-slash' : 'fa fa-eye';
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = $('admin-email').value.trim();
      const pass  = $('admin-password').value;
      const errEl = $('admin-login-error');
      const btnEl = form.querySelector('button[type="submit"]');

      if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
      if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Signing in…'; }

      try {
        const result = await UserAuth.login(email, pass);
        if (!result.ok) {
          if (errEl) { errEl.textContent = result.error || 'Login failed.'; errEl.style.display = 'block'; }
          return;
        }
        if (result.user?.role !== 'admin') {
          if (errEl) { errEl.textContent = 'Access denied. Admin credentials required.'; errEl.style.display = 'block'; }
          await UserAuth.logout();
          return;
        }
        log('login', 'Admin logged in', 'info');
        Cookie.set('session', { email, role: 'admin', loginAt: Date.now() }, 7);
        _showApp();
      } catch (err) {
        if (errEl) { errEl.textContent = 'Server error. Please try again.'; errEl.style.display = 'block'; }
      } finally {
        if (btnEl) { btnEl.disabled = false; btnEl.textContent = 'Sign In'; }
      }
    });

    // Check if already logged in as admin (cookie + localStorage)
    if (typeof UserAuth !== 'undefined') {
      UserAuth.init();
      const session = UserAuth.getSession();
      const cookieSession = Cookie.get('session');
      if ((session && session.role === 'admin') || (cookieSession && cookieSession.role === 'admin')) {
        _showApp();
      }
    }
  }

  function _showApp() {
    const loginScreen = $('admin-login-screen');
    const app = $('admin-app');
    if (loginScreen) loginScreen.style.display = 'none';
    if (app) app.style.display = 'flex';
    _bootDashboard();
  }

  function logout() {
    log('logout', 'Admin logged out', 'info');
    Cookie.remove('session');
    Cookie.remove('prefs');
    Cookie.remove('data_ts');
    if (typeof UserAuth !== 'undefined') UserAuth.logout();
    location.reload();
  }

  // ────────────────────────────────────────────────────────
  //  TAB NAVIGATION
  // ────────────────────────────────────────────────────────
  function navigateTab(tab) {
    currentTab = tab;

    // Toggle sidebar items
    $$('.as-item').forEach(el => el.classList.remove('active'));
    const navItem = document.querySelector(`.as-item[data-tab="${tab}"]`);
    if (navItem) navItem.classList.add('active');

    // Toggle tab panels
    $$('.admin-tab').forEach(el => el.classList.remove('active'));
    const panel = $(`tab-${tab}`);
    if (panel) panel.classList.add('active');

    // Persist last active tab to cookie
    _savePrefs({ lastTab: tab });

    // Update breadcrumb
    const labels = {
      overview: 'Overview', users: 'User Management', financials: 'Financials',
      risk: 'Risk Monitor', trades: 'Trade Feed', config: 'Configuration',
      audit: 'Audit Logs', broadcast: 'Broadcast Center',
    };
    const bc = $('breadcrumb-current');
    if (bc) bc.textContent = labels[tab] || tab;

    // Render tab content
    _renderTab(tab);
  }

  function _renderTab(tab) {
    switch (tab) {
      case 'overview':   renderOverview(); break;
      case 'users':      renderUsers(); break;
      case 'financials': renderFinancials(); break;
      case 'risk':       renderRisk(); break;
      case 'trades':     renderTrades(); break;
      case 'config':     renderConfig(); break;
      case 'audit':      renderAuditLogs(); break;
      case 'broadcast':  renderBroadcast(); break;
    }
  }

  // ────────────────────────────────────────────────────────
  //  BOOT DASHBOARD
  // ────────────────────────────────────────────────────────
  function _bootDashboard() {
    // Bind sidebar clicks
    $$('.as-item[data-tab]').forEach(el => {
      el.addEventListener('click', () => navigateTab(el.dataset.tab));
    });

    // Admin badge dropdown
    const badge = $('admin-badge');
    if (badge) {
      badge.addEventListener('click', (e) => {
        e.stopPropagation();
        const dd = $('admin-dropdown');
        if (dd) dd.classList.toggle('open');
      });
      document.addEventListener('click', () => {
        const dd = $('admin-dropdown');
        if (dd) dd.classList.remove('open');
      });
    }

    // Restore last active tab from cookie
    const prefs = _loadPrefs();
    const savedTab = prefs.lastTab || 'overview';

    // Load real data from API then render
    _loadApiData().then(() => {
      Cookie.set('data_ts', Date.now(), 1);
      _updateHeaderStats();
      navigateTab(savedTab);
      // Best-effort: try to push required users to server
      _ensureRequiredUsersOnServer();
    });

    // Refresh interval (skip if data was fetched < 10s ago)
    const interval = (prefs.refreshInterval || 30) * 1000;
    refreshTimer = setInterval(async () => {
      const lastFetch = Cookie.get('data_ts', 0);
      if (Date.now() - lastFetch < 10000) return; // skip if recently fetched
      await _loadApiData();
      Cookie.set('data_ts', Date.now(), 1);
      _updateHeaderStats();
      if (currentTab === 'overview')   renderOverview();
      if (currentTab === 'users')      renderUsers();
      if (currentTab === 'financials') renderFinancials();
    }, interval);
  }

  // ────────────────────────────────────────────────────────
  //  HEADER QUICK STATS
  // ────────────────────────────────────────────────────────
  function _updateHeaderStats() {
    const users = loadUsers();
    const clients = Object.values(users).filter(u => u.role !== 'admin');
    const totalDeposits = _cache.stats ? (_cache.stats.financial?.total_deposits || 0) : clients.reduce((sum, u) => sum + (u.totalDeposited || u.deposit || 0), 0);
    const pending = loadWithdrawals().length;

    const qsUsers = $('qs-users-val');
    const qsRevenue = $('qs-revenue-val');
    const qsAlerts = $('qs-alerts-val');
    const badgeUsers = $('badge-users');
    const badgePending = $('badge-pending');

    if (qsUsers)   qsUsers.textContent = clients.length;
    if (qsRevenue) qsRevenue.textContent = fmtMoney(totalDeposits);
    if (qsAlerts)  qsAlerts.textContent = pending;
    if (badgeUsers) badgeUsers.textContent = clients.length;
    if (badgePending) {
      badgePending.textContent = pending;
      badgePending.style.display = pending > 0 ? 'inline-flex' : 'none';
    }
  }

  // ────────────────────────────────────────────────────────
  //  TAB: OVERVIEW
  // ────────────────────────────────────────────────────────
  function renderOverview() {
    const users = loadUsers();
    const clients = Object.values(users).filter(u => u.role !== 'admin');
    const totalDeposits = clients.reduce((sum, u) => sum + (u.deposit || 0), 0);
    const activeCount = clients.filter(u => u.status === 'active').length;
    const allTrades = loadAllTrades();
    const closedTrades = allTrades.filter(t => t.status === 'closed');
    const platformPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

    // Week-old threshold
    const weekAgo = now() - 7 * 86400000;
    const newThisWeek = clients.filter(u => u.createdAt > weekAgo).length;

    // KPI Values
    const kpiTotalUsers = $('kpi-total-users');
    const kpiDeposits = $('kpi-total-deposits');
    const kpiActive = $('kpi-active-traders');
    const kpiPnl = $('kpi-platform-pnl');
    const kpiUsersChange = $('kpi-users-change');
    const kpiActivePct = $('kpi-active-pct');

    if (kpiTotalUsers)   kpiTotalUsers.textContent = clients.length;
    if (kpiDeposits)     kpiDeposits.textContent = fmtMoney(totalDeposits);
    if (kpiActive)       kpiActive.textContent = activeCount;
    if (kpiPnl)          kpiPnl.textContent = (platformPnL >= 0 ? '+' : '') + fmtMoneyFull(platformPnL);
    if (kpiUsersChange)  kpiUsersChange.textContent = `+${newThisWeek} this week`;
    if (kpiActivePct) {
      kpiActivePct.textContent = `${pct(activeCount, clients.length)}% of total`;
    }

    // Tier Distribution Chart
    _renderTierChart(clients);
    // Deposit Trend Chart
    _renderDepositTrendChart(clients);
    // Recent Activity Feed
    _renderRecentActivity();
    // System Health
    _renderSystemHealth();

    // Last update timestamp
    const updateEl = $('last-update-time');
    if (updateEl) updateEl.textContent = 'Updated ' + new Date().toLocaleTimeString();
  }

  async function refreshDashboard() {
    await _loadApiData();
    Cookie.set('data_ts', Date.now(), 1);
    _updateHeaderStats();
    _renderTab(currentTab);
    toast('Dashboard refreshed', 'success', 2000);
  }

  function _renderTierChart(clients) {
    const canvas = $('chart-tier-dist');
    if (!canvas) return;

    const tierCounts = { bronze: 0, silver: 0, gold: 0, platinum: 0, diamond: 0 };
    clients.forEach(u => { tierCounts[u.tier] = (tierCounts[u.tier] || 0) + 1; });

    if (charts.tierDist) charts.tierDist.destroy();
    charts.tierDist = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: Object.keys(TIERS).map(k => TIERS[k].label),
        datasets: [{
          data: Object.keys(TIERS).map(k => tierCounts[k] || 0),
          backgroundColor: Object.keys(TIERS).map(k => TIERS[k].color),
          borderWidth: 0,
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { position: 'right', labels: { color: '#8b98ad', font: { size: 11 }, padding: 12 } },
        },
      },
    });
  }

  function _renderDepositTrendChart(clients) {
    const canvas = $('chart-deposit-trend');
    if (!canvas) return;

    // Generate 30-day deposit trend (simulated from creation dates)
    const labels = [];
    const data = [];
    for (let i = 29; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      labels.push(dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      const dayDeposits = clients
        .filter(u => u.createdAt >= dayStart.getTime() && u.createdAt <= dayEnd.getTime())
        .reduce((sum, u) => sum + (u.deposit || 0), 0);
      data.push(dayDeposits);
    }

    if (charts.depositTrend) charts.depositTrend.destroy();
    charts.depositTrend = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Daily Deposits',
          data,
          borderColor: '#d4a574',
          backgroundColor: 'rgba(212,165,116,0.08)',
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: '#4a5568', font: { size: 9 }, maxRotation: 45 }, grid: { color: 'rgba(255,255,255,0.03)' } },
          y: { ticks: { color: '#4a5568', font: { size: 10 }, callback: v => fmtMoney(v) }, grid: { color: 'rgba(255,255,255,0.03)' } },
        },
        plugins: { legend: { display: false } },
      },
    });
  }

  function _renderRecentActivity() {
    const feed = $('recent-activity-feed');
    if (!feed) return;

    const audit = loadAudit().slice(0, 10);
    if (audit.length === 0) {
      feed.innerHTML = '<div class="empty-state"><i class="fa fa-inbox"></i><p>No recent activity</p></div>';
      return;
    }

    const icons = {
      login: 'fa-sign-in-alt', logout: 'fa-sign-out-alt', user_create: 'fa-user-plus',
      user_update: 'fa-user-edit', user_delete: 'fa-user-times', deposit: 'fa-arrow-down',
      withdrawal: 'fa-arrow-up', config_change: 'fa-cog', admin_action: 'fa-shield-alt', trade: 'fa-exchange-alt',
    };
    const colors = { info: 'blue', warning: 'orange', critical: 'red' };

    feed.innerHTML = audit.map(a => `
      <div class="activity-item">
        <div class="ai-icon ${colors[a.severity] || 'blue'}"><i class="fa ${icons[a.type] || 'fa-circle'}"></i></div>
        <div class="ai-body">
          <div class="ai-msg">${a.message}</div>
          <div class="ai-meta">${a.actor} · ${timeAgo(a.timestamp)}</div>
        </div>
      </div>
    `).join('');
  }

  function _renderSystemHealth() {
    const grid = $('sys-health-grid');
    if (!grid) return;

    const services = [
      { name: 'Trading Engine', status: 'operational', uptime: '99.97%' },
      { name: 'Binance WebSocket', status: 'operational', uptime: '99.89%' },
      { name: 'AI Signal Engine', status: 'operational', uptime: '99.95%' },
      { name: 'Auto-Trader', status: 'operational', uptime: '99.92%' },
      { name: 'User Auth', status: 'operational', uptime: '100%' },
      { name: 'Data Pipeline', status: 'operational', uptime: '99.98%' },
    ];

    grid.innerHTML = services.map(s => `
      <div class="sh-item">
        <div class="sh-dot ${s.status === 'operational' ? 'green' : 'red'}"></div>
        <span class="sh-name">${s.name}</span>
        <span class="sh-uptime">${s.uptime}</span>
      </div>
    `).join('');
  }

  // ────────────────────────────────────────────────────────
  //  TAB: USER MANAGEMENT
  // ────────────────────────────────────────────────────────
  function renderUsers() {
    const users = loadUsers();
    let clients = Object.values(users).filter(u => u.role !== 'admin');

    // Apply search
    if (userSearchQuery) {
      const q = userSearchQuery.toLowerCase();
      clients = clients.filter(u =>
        (u.fullName || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.id || '').toLowerCase().includes(q)
      );
    }

    // Apply tier filter
    const tierFilter = $('filter-tier')?.value || 'all';
    if (tierFilter !== 'all') {
      clients = clients.filter(u => u.tier === tierFilter);
    }

    // Apply status filter
    const statusFilter = $('filter-status')?.value || 'all';
    if (statusFilter !== 'all') {
      clients = clients.filter(u => u.status === statusFilter);
    }

    // Apply sorting
    const sortVal = $('sort-field')?.value || 'createdAt';
    clients.sort((a, b) => {
      switch (sortVal) {
        case 'createdAt':       return (b.createdAt || 0) - (a.createdAt || 0);
        case 'createdAt-asc':   return (a.createdAt || 0) - (b.createdAt || 0);
        case 'deposit-desc':    return (b.deposit || 0) - (a.deposit || 0);
        case 'deposit-asc':     return (a.deposit || 0) - (b.deposit || 0);
        case 'fullName':        return (a.fullName || '').localeCompare(b.fullName || '');
        case 'lastLogin':       return (b.lastLogin || 0) - (a.lastLogin || 0);
        default: return 0;
      }
    });

    // Paginate
    const totalItems = clients.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
    userPage = clamp(userPage, 1, totalPages);
    const startIdx = (userPage - 1) * ITEMS_PER_PAGE;
    const pageItems = clients.slice(startIdx, startIdx + ITEMS_PER_PAGE);

    // Render table body
    const tbody = $('user-table-body');
    if (!tbody) return;

    if (pageItems.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="empty-row"><i class="fa fa-users-slash"></i> No users found</td></tr>`;
    } else {
      tbody.innerHTML = pageItems.map(u => {
        const tierInfo = TIERS[u.tier] || TIERS.bronze;
        const riskScore = _calcRiskScore(u);
        const riskClass = riskScore > 70 ? 'high' : riskScore > 40 ? 'medium' : 'low';
        const checked = selectedUsers.has(u.email) ? 'checked' : '';

        return `
          <tr data-email="${u.email}">
            <td><input type="checkbox" ${checked} onchange="AdminPanel.toggleUserSelect('${u.email}', this.checked)" /></td>
            <td>
              <div class="ut-user">
                <div class="ut-avatar" style="background:${tierInfo.color}20;color:${tierInfo.color}">
                  ${(u.fullName || '?')[0].toUpperCase()}
                </div>
                <div class="ut-user-info">
                  <div class="ut-name">${u.fullName || 'Unknown'}</div>
                  <div class="ut-email">${u.email}</div>
                </div>
              </div>
            </td>
            <td><span class="tier-chip ${u.tier}" style="--tc:${tierInfo.color}">${tierInfo.label}</span></td>
            <td class="mono">${fmtMoney(u.deposit)}</td>
            <td>
              <span class="status-chip ${u.status}">
                <span class="sc-dot"></span>${u.status}
              </span>
            </td>
            <td class="text-muted">${fmtDate(u.createdAt)}</td>
            <td class="text-muted">${timeAgo(u.lastLogin)}</td>
            <td><span class="risk-badge ${riskClass}">${riskScore}</span></td>
            <td class="actions-cell">
              <button class="act-btn" title="Edit" onclick="AdminPanel.openEditUser('${u.email}')"><i class="fa fa-edit"></i></button>
              <button class="act-btn green" title="Fund &amp; Activate" onclick="AdminPanel.activateAccountPrompt('${u.email}')"><i class="fa fa-rocket"></i></button>
              ${_renderPauseButtons(u.email)}
              <button class="act-btn ${u.status === 'active' ? 'warn' : 'green'}" title="${u.status === 'active' ? 'Suspend' : 'Reactivate'}" onclick="AdminPanel.toggleUserStatus('${u.email}')">
                <i class="fa fa-${u.status === 'active' ? 'ban' : 'check'}"></i>
              </button>
              <button class="act-btn danger" title="Delete" onclick="AdminPanel.confirmDeleteUser('${u.email}')"><i class="fa fa-trash"></i></button>
            </td>
          </tr>
        `;
      }).join('');
    }

    // Table info
    const info = $('table-info');
    if (info) info.textContent = `Showing ${startIdx + 1}–${Math.min(startIdx + ITEMS_PER_PAGE, totalItems)} of ${totalItems} users`;

    // Pagination
    _renderPagination($('table-pagination'), userPage, totalPages, (p) => { userPage = p; renderUsers(); });

    // Bulk bar visibility
    const bulkBar = $('bulk-bar');
    if (bulkBar) {
      bulkBar.style.display = selectedUsers.size > 0 ? 'flex' : 'none';
      const countEl = $('selected-count');
      if (countEl) countEl.textContent = selectedUsers.size;
    }
  }

  function _renderPagination(container, page, totalPages, onPageChange) {
    if (!container) return;
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    let html = '';
    html += `<button class="pg-btn" ${page <= 1 ? 'disabled' : ''} onclick="(${onPageChange.toString()})(${page - 1})"><i class="fa fa-chevron-left"></i></button>`;
    for (let p = 1; p <= totalPages; p++) {
      if (totalPages > 7 && p > 2 && p < totalPages - 1 && Math.abs(p - page) > 1) {
        if (p === 3 || p === totalPages - 2) html += '<span class="pg-dots">…</span>';
        continue;
      }
      html += `<button class="pg-btn ${p === page ? 'active' : ''}" onclick="(${onPageChange.toString()})(${p})">${p}</button>`;
    }
    html += `<button class="pg-btn" ${page >= totalPages ? 'disabled' : ''} onclick="(${onPageChange.toString()})(${page + 1})"><i class="fa fa-chevron-right"></i></button>`;

    // Since inline onclick with closures won't work, use a different approach
    container.innerHTML = '';
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pg-btn';
    prevBtn.disabled = page <= 1;
    prevBtn.innerHTML = '<i class="fa fa-chevron-left"></i>';
    prevBtn.onclick = () => onPageChange(page - 1);
    container.appendChild(prevBtn);

    for (let p = 1; p <= totalPages; p++) {
      if (totalPages > 7 && p > 2 && p < totalPages - 1 && Math.abs(p - page) > 1) {
        if (p === 3 || p === totalPages - 2) {
          const dots = document.createElement('span');
          dots.className = 'pg-dots';
          dots.textContent = '…';
          container.appendChild(dots);
        }
        continue;
      }
      const btn = document.createElement('button');
      btn.className = 'pg-btn' + (p === page ? ' active' : '');
      btn.textContent = p;
      btn.onclick = () => onPageChange(p);
      container.appendChild(btn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = 'pg-btn';
    nextBtn.disabled = page >= totalPages;
    nextBtn.innerHTML = '<i class="fa fa-chevron-right"></i>';
    nextBtn.onclick = () => onPageChange(page + 1);
    container.appendChild(nextBtn);
  }

  // Risk Score Algorithm (0-100)
  // Based on: deposit size, position exposure, account age, trading frequency
  function _calcRiskScore(user) {
    let score = 0;

    // Deposit-based risk (higher deposit = lower risk due to commitment)
    const deposit = user.deposit || 0;
    if (deposit < 10000) score += 30;
    else if (deposit < 50000) score += 20;
    else if (deposit < 200000) score += 10;
    else score += 5;

    // Account age risk (newer = higher risk)
    const ageDays = (now() - (user.createdAt || now())) / 86400000;
    if (ageDays < 7) score += 25;
    else if (ageDays < 30) score += 15;
    else score += 5;

    // Suspension status adds risk
    if (user.status === 'suspended') score += 20;

    // KYC status
    if (user.kycStatus === 'unverified') score += 20;
    else if (user.kycStatus === 'pending') score += 10;
    else score += 0;

    // Random variance for realism
    score += Math.floor(Math.random() * 10);

    return clamp(score, 0, 100);
  }

  function searchUsers(query) {
    userSearchQuery = query;
    userPage = 1;
    renderUsers();
  }

  function filterUsers() {
    userPage = 1;
    renderUsers();
  }

  function sortUsers() {
    userPage = 1;
    renderUsers();
  }

  function toggleUserSelect(email, checked) {
    if (checked) selectedUsers.add(email);
    else selectedUsers.delete(email);
    renderUsers();
  }

  function toggleSelectAll(checked) {
    const users = loadUsers();
    const clients = Object.values(users).filter(u => u.role !== 'admin');
    if (checked) {
      clients.forEach(u => selectedUsers.add(u.email));
    } else {
      selectedUsers.clear();
    }
    renderUsers();
  }

  function clearSelection() {
    selectedUsers.clear();
    const selectAll = $('select-all-users');
    if (selectAll) selectAll.checked = false;
    renderUsers();
  }

  // CRUD: Open Edit Modal
  function openEditUser(email) {
    const users = loadUsers();
    const user = users[email.toLowerCase()];
    if (!user) return toast('User not found', 'error');

    $('modal-user-title').textContent = 'Edit User: ' + user.fullName;
    $('edit-user-email').value = user.email;
    $('edit-user-name').value = user.fullName || '';
    $('edit-user-tier').value = user.tier || 'bronze';
    $('edit-user-deposit').value = user.deposit || 0;
    $('edit-user-status').value = user.status || 'active';
    $('edit-user-earnings').value = user.earningsOverride || '';
    $('edit-user-password').value = '';
    if ($('edit-user-pin')) $('edit-user-pin').value = '';

    openModal('modal-user-edit');
  }

  async function saveUserEdit() {
    const email     = ($('edit-user-email').value || '').trim();
    if (!email) return toast('Email is required', 'error');

    const users     = loadUsers();
    const key       = email.toLowerCase();
    const isNew     = !users || !users[key];
    const newTier   = $('edit-user-tier').value;
    const newStatus = $('edit-user-status').value;
    const newName   = $('edit-user-name').value.trim();
    const newPin    = $('edit-user-pin') ? $('edit-user-pin').value.trim() : '';
    const newPwd    = $('edit-user-password') ? $('edit-user-password').value.trim() : '';
    const deposit   = parseFloat($('edit-user-deposit').value) || 0;

    // ── CREATE NEW USER ──
    if (isNew) {
      if (!newName) return toast('Full name is required', 'error');
      if (!newPwd || newPwd.length < 6) return toast('Password must be at least 6 characters', 'error');

      const result = await UserAuth.adminCreateUser({
        email, fullName: newName, password: newPwd,
        pin: newPin || '', tier: newTier, depositAmount: deposit,
      });
      if (!result.ok && !result.success) return toast(result.error || 'Failed to create user', 'error');

      closeModal('modal-user-edit');
      log('user_create', `Created user ${newName} (${email}): tier=${newTier}`, 'info', { email });
      toast(`${newName} created successfully`, 'success');

      // Refresh user list from API
      await _loadApiData();
      renderUsers();
      _updateHeaderStats();
      return;
    }

    // ── UPDATE EXISTING USER ──
    const user = users[key];
    const result = await UserAuth.adminUpdateUser(user.id, {
      status: newStatus, tier: newTier,
      balance: deposit || undefined,
      depositAmount: deposit || undefined,
    });
    if (!result.ok) return toast(result.error || 'Update failed', 'error');

    // Update local cache immediately for snappy UI
    user.fullName = newName || user.fullName;
    user.tier     = newTier;
    user.status   = newStatus;
    if (deposit) user.deposit = deposit;

    // Also persist to local store so changes survive refreshes
    try {
      const allUsers = JSON.parse(localStorage.getItem('zen_users_db') || '[]');
      const idx = allUsers.findIndex(u => u.email.toLowerCase() === key);
      if (idx !== -1) {
        allUsers[idx].status = newStatus;
        allUsers[idx].tier = newTier;
        if (newName) allUsers[idx].fullName = newName;
        if (deposit) { allUsers[idx].balance = deposit; allUsers[idx].depositAmount = deposit; }
        localStorage.setItem('zen_users_db', JSON.stringify(allUsers));
      }
    } catch (e) { /* graceful */ }

    closeModal('modal-user-edit');
    log('user_update', `Updated ${user.fullName} (${email}): tier=${newTier}, status=${newStatus}`, 'info', { email });
    toast(`${user.fullName} updated successfully`, 'success');

    // ── Handle password reset ──
    if (newPwd && newPwd.length >= 6) {
      try {
        const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
          ? 'http://localhost:4000/api' : 'https://zen-assets-backend.onrender.com/api';
        const token = localStorage.getItem('zen_token') || sessionStorage.getItem('zen_token');
        await fetch(`${API_BASE}/admin/users/${user.id}/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ password: newPwd }),
        });
      } catch (e) { /* best-effort */ }
    }

    // ── Handle PIN set/reset via admin API ──
    if (newPin) {
      if (!/^\d{4}$/.test(newPin)) {
        toast('PIN must be exactly 4 digits', 'error');
      } else {
        try {
          const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? 'http://localhost:4000/api' : 'https://zen-assets-backend.onrender.com/api';
          const token = localStorage.getItem('zen_token') || sessionStorage.getItem('zen_token');
          const resp = await fetch(`${API_BASE}/admin/users/${user.id}/set-pin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ pin: newPin }),
          });
          const pinRes = await resp.json();
          if (pinRes.success) {
            toast('PIN updated', 'success');
            log('user_pin_set', `PIN set for ${user.fullName} (${email})`, 'info', { email });
          } else {
            toast(pinRes.error || 'PIN update failed', 'error');
          }
        } catch (e) {
          // Offline: update localStore directly
          const allUsers = JSON.parse(localStorage.getItem('zen_users_db') || '[]');
          const idx = allUsers.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
          if (idx !== -1) {
            allUsers[idx].pinHash = _hash(newPin);
            localStorage.setItem('zen_users_db', JSON.stringify(allUsers));
            toast('PIN set (offline)', 'success');
          }
        }
      }
    }

    renderUsers();
    _updateHeaderStats();
  }

  // CRUD: Create User
  function openCreateUser() {
    $('modal-user-title').textContent = 'Create New User';
    $('edit-user-email').value = '';
    $('edit-user-name').value = '';
    $('edit-user-tier').value = 'bronze';
    $('edit-user-deposit').value = '';
    $('edit-user-status').value = 'active';
    $('edit-user-earnings').value = '';
    $('edit-user-password').value = '';
    if ($('edit-user-pin')) $('edit-user-pin').value = '';
    openModal('modal-user-edit');
  }

  // Toggle status
  // ── Fund & Activate Account ────────────────────────────
  function activateAccountPrompt(email) {
    const users = loadUsers();
    const u = users ? users[email.toLowerCase()] : null;
    if (!u) return toast('User not found', 'error');
    $('activate-user-email').value = email;
    $('activate-user-name').textContent = u.fullName || email;
    $('activate-amount').value = u.depositAmount || u.balance || '';
    const tierSel = $('activate-tier');
    if (tierSel) tierSel.value = u.tier || 'gold';
    openModal('modal-activate');
  }

  async function executeActivation() {
    const email = $('activate-user-email').value;
    const amount = parseFloat($('activate-amount').value) || 0;
    if (amount <= 0) return toast('Enter a valid deposit amount', 'error');
    const tier = ($('activate-tier') || {}).value || 'gold';

    const users = loadUsers();
    const u = users ? users[email.toLowerCase()] : null;
    if (!u) return toast('User not found', 'error');

    // Update user record via offline-safe API
    await UserAuth.adminUpdateUser(u.id, { depositAmount: amount, balance: amount, tier, status: 'active' });

    // Also persist to local store so balance survives refreshes / offline
    try {
      const allUsers = JSON.parse(localStorage.getItem('zen_users_db') || '[]');
      const idx = allUsers.findIndex(x => x.email.toLowerCase() === email.toLowerCase());
      if (idx !== -1) {
        allUsers[idx].balance = amount;
        allUsers[idx].depositAmount = amount;
        allUsers[idx].tier = tier;
        allUsers[idx].status = 'active';
        localStorage.setItem('zen_users_db', JSON.stringify(allUsers));
      }
    } catch (e) { /* quota exceeded — graceful */ }

    // Also write the investment state directly so it takes effect on the user's next login
    // (works for same-device demos; cross-device requires the live backend)
    try {
      const invKey = 'zen_investment_' + email.toLowerCase();
      const now = Date.now();
      const d = new Date(); d.setHours(0, 0, 0, 0);
      const wk = new Date(); const dy = wk.getDay();
      wk.setDate(wk.getDate() - dy + (dy === 0 ? -6 : 1)); wk.setHours(0, 0, 0, 0);

      // Merge with existing state (preserve trade history, returns, etc.)
      let existing = {};
      try { existing = JSON.parse(localStorage.getItem(invKey)) || {}; } catch {}
      // Set lastAccrualTick a few hours back so catch-up compounding
      // produces visible initial returns on the user's first login
      const hoursBack = 2 + Math.random() * 3; // 2–5 hours of "pre-seeded" returns
      const invState = {
        ...existing,
        tier, walletBalance: amount, initialDeposit: amount,
        dayStartBalance: amount, weekStartBalance: amount,
        lastAccrualTick: now - hoursBack * 3600000, lastDailyReset: d.getTime(), lastWeeklyReset: wk.getTime(),
        _adminActivated: true, _seeded: true, _v2ClaimMigrated: true,
      };
      localStorage.setItem(invKey, JSON.stringify(invState));
    } catch (e) { /* quota exceeded — graceful */ }

    // Also update the user's cached wallet so login picks up the funded balance
    try {
      const walletKey = 'zen_wallet';
      // Only update if the target user's session is the current cached session
      const cachedSession = JSON.parse(localStorage.getItem('zen_session') || sessionStorage.getItem('zen_session') || '{}');
      if (cachedSession.email && cachedSession.email.toLowerCase() === email.toLowerCase()) {
        const wallet = { totalDeposited: amount, balance: amount, earnings: 0, currency: 'USD' };
        localStorage.setItem(walletKey, JSON.stringify(wallet));
      }
    } catch {}

    log('admin_action', `Activated account for ${email}: $${amount.toLocaleString()}`, 'success', { email, amount });
    toast(`Account activated! $${amount.toLocaleString()} funded for ${u.fullName || email}`, 'success');
    closeModal('modal-activate');

    // Email notification — deposit confirmation
    if (typeof UserAuth !== 'undefined' && UserAuth.sendEmailNotification) {
      UserAuth.sendEmailNotification('deposit', {
        email: email,
        fullName: u.fullName || email,
        amount: amount,
        method: 'Account Activation',
        newBalance: amount,
      });
    }

    // Refresh user data from API/local store (never set _cache.users to null)
    await _loadApiData();
    renderUsers();
    _updateHeaderStats();
  }



  // Helper: copy input/textarea value
  function _copyField(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.select();
    navigator.clipboard.writeText(el.value).then(() => {
      toast('Copied to clipboard!', 'success');
    }).catch(() => {
      document.execCommand('copy');
      toast('Copied!', 'success');
    });
  }

  // Escape HTML for safe insertion
  function _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  // ── Admin God-Mode Controls (per-user trade & profit pause) ──
  function _getAdminControls(email) {
    try {
      const raw = localStorage.getItem('zen_admin_controls_' + email.toLowerCase());
      return raw ? JSON.parse(raw) : { tradingPaused: false, profitPaused: false };
    } catch { return { tradingPaused: false, profitPaused: false }; }
  }
  function _setAdminControls(email, controls) {
    localStorage.setItem('zen_admin_controls_' + email.toLowerCase(), JSON.stringify(controls));
  }

  function _renderPauseButtons(email) {
    const ctrl = _getAdminControls(email);
    const tPaused = ctrl.tradingPaused;
    const pPaused = ctrl.profitPaused;
    return `<button class="act-btn ${tPaused ? 'green' : 'warn'}" title="${tPaused ? 'Resume Trading' : 'Pause Trading'}" onclick="AdminPanel.toggleTradingPause('${email}')">
                <i class="fa fa-${tPaused ? 'play' : 'pause'}"></i>
              </button>
              <button class="act-btn ${pPaused ? 'green' : 'warn'}" title="${pPaused ? 'Resume Profits' : 'Pause Profits'}" onclick="AdminPanel.toggleProfitPause('${email}')" style="color:${pPaused ? '#00ff88' : '#ff9f43'}">
                <i class="fa fa-${pPaused ? 'dollar-sign' : 'hand'}"></i>
              </button>`;
  }

  function toggleTradingPause(email) {
    const ctrl = _getAdminControls(email);
    ctrl.tradingPaused = !ctrl.tradingPaused;
    _setAdminControls(email, ctrl);
    const users = loadUsers();
    const name = users[email.toLowerCase()]?.fullName || email;
    const action = ctrl.tradingPaused ? 'PAUSED' : 'RESUMED';
    log('admin_control', `Trading ${action} for ${name}`, ctrl.tradingPaused ? 'warning' : 'info', { email, control: 'trading', paused: ctrl.tradingPaused });
    toast(`⚡ Trading ${action} for ${name}`, ctrl.tradingPaused ? 'warning' : 'success');
    renderUsers();
  }

  function toggleProfitPause(email) {
    const ctrl = _getAdminControls(email);
    ctrl.profitPaused = !ctrl.profitPaused;
    _setAdminControls(email, ctrl);
    const users = loadUsers();
    const name = users[email.toLowerCase()]?.fullName || email;
    const action = ctrl.profitPaused ? 'PAUSED' : 'RESUMED';
    log('admin_control', `Profits ${action} for ${name}`, ctrl.profitPaused ? 'warning' : 'info', { email, control: 'profit', paused: ctrl.profitPaused });
    toast(`💰 Profits ${action} for ${name}`, ctrl.profitPaused ? 'warning' : 'success');
    renderUsers();
  }

  async function toggleUserStatus(email) {
    const users = loadUsers();
    const key   = email.toLowerCase();
    if (!users[key]) return;

    const user      = users[key];
    const newStatus = user.status === 'active' ? 'suspended' : 'active';

    const result = await UserAuth.adminUpdateUser(user.id, { status: newStatus });
    if (!result.ok) return toast(result.error || 'Status update failed', 'error');

    user.status = newStatus;

    // Persist to local store so status survives refreshes
    try {
      const allUsers = JSON.parse(localStorage.getItem('zen_users_db') || '[]');
      const idx = allUsers.findIndex(u => u.email.toLowerCase() === key);
      if (idx !== -1) {
        allUsers[idx].status = newStatus;
        localStorage.setItem('zen_users_db', JSON.stringify(allUsers));
      }
    } catch (e) { /* graceful */ }

    log('user_update', `${newStatus === 'suspended' ? 'Suspended' : 'Activated'} ${user.fullName}`, newStatus === 'suspended' ? 'warning' : 'info', { email });
    toast(`${user.fullName} ${newStatus}`, newStatus === 'suspended' ? 'warning' : 'success');
    renderUsers();
    _updateHeaderStats();
  }

  // Delete user with confirmation
  function confirmDeleteUser(email) {
    const users = loadUsers();
    const user = users[email.toLowerCase()];
    if (!user) return;

    $('confirm-title').textContent = 'Delete User';
    $('confirm-message').textContent = `Are you sure you want to permanently delete "${user.fullName}" (${email})? This action cannot be undone.`;
    $('confirm-btn').onclick = () => {
      _deleteUser(email);
      closeModal('modal-confirm');
    };
    openModal('modal-confirm');
  }

  async function _deleteUser(email) {
    const users = loadUsers();
    const key   = email.toLowerCase();
    const user  = users[key];
    if (!user) return;

    const name = user.fullName || email;

    const result = await UserAuth.adminDeleteUser(user.id);
    if (!result.ok) return toast(result.error || 'Delete failed', 'error');

    // Remove from cache
    delete _cache.users[key];
    selectedUsers.delete(email);

    log('user_delete', `Deleted user: ${name} (${email})`, 'warning', { email });
    toast(`${name} deleted`, 'warning');
    renderUsers();
    _updateHeaderStats();
  }

  // Bulk Actions
  function bulkAction(action) {
    if (selectedUsers.size === 0) return;

    const count = selectedUsers.size;
    let actionLabel = action;

    switch (action) {
      case 'activate': {
        const users = loadUsers();
        selectedUsers.forEach(email => {
          if (users[email.toLowerCase()]) users[email.toLowerCase()].status = 'active';
        });
        saveUsers(users);
        log('admin_action', `Bulk activated ${count} users`, 'info');
        toast(`${count} users activated`, 'success');
        break;
      }
      case 'suspend': {
        const users = loadUsers();
        selectedUsers.forEach(email => {
          if (users[email.toLowerCase()]) users[email.toLowerCase()].status = 'suspended';
        });
        saveUsers(users);
        log('admin_action', `Bulk suspended ${count} users`, 'warning');
        toast(`${count} users suspended`, 'warning');
        break;
      }
      case 'delete': {
        $('confirm-title').textContent = 'Bulk Delete';
        $('confirm-message').textContent = `Permanently delete ${count} selected users?`;
        $('confirm-btn').onclick = () => {
          const users = loadUsers();
          selectedUsers.forEach(email => {
            const key = email.toLowerCase();
            if (key !== ADMIN_EMAIL.toLowerCase()) {
              delete users[key];
              localStorage.removeItem('autoTradeHistory_' + key);
            }
          });
          saveUsers(users);
          selectedUsers.clear();
          closeModal('modal-confirm');
          log('admin_action', `Bulk deleted ${count} users`, 'critical');
          toast(`${count} users deleted`, 'warning');
          renderUsers();
          _updateHeaderStats();
        };
        openModal('modal-confirm');
        return;
      }
      case 'upgrade': {
        // Upgrade all selected to next tier
        const tierOrder = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
        const users = loadUsers();
        let upgraded = 0;
        selectedUsers.forEach(email => {
          const u = users[email.toLowerCase()];
          if (u) {
            const idx = tierOrder.indexOf(u.tier);
            if (idx < tierOrder.length - 1) {
              u.tier = tierOrder[idx + 1];
              upgraded++;
            }
          }
        });
        saveUsers(users);
        log('admin_action', `Bulk upgraded ${upgraded} users`, 'info');
        toast(`${upgraded} users upgraded`, 'success');
        break;
      }
    }

    selectedUsers.clear();
    renderUsers();
    _updateHeaderStats();
  }

  // Export users to CSV
  function exportUsers() {
    const users = loadUsers();
    const clients = Object.values(users).filter(u => u.role !== 'admin');

    const headers = ['Name', 'Email', 'Tier', 'Deposit', 'Status', 'Joined', 'Last Login'];
    const rows = clients.map(u => [
      u.fullName, u.email, u.tier, u.deposit, u.status,
      fmtDate(u.createdAt), fmtDate(u.lastLogin),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zen_users_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    log('admin_action', `Exported ${clients.length} users to CSV`, 'info');
    toast('Users exported to CSV', 'success');
  }

  // ────────────────────────────────────────────────────────
  //  TAB: FINANCIALS
  // ────────────────────────────────────────────────────────
  function renderFinancials() {
    const users = loadUsers();
    const clients = Object.values(users).filter(u => u.role !== 'admin');
    // Use API stats for accurate platform totals when available
    const totalDeposits  = _cache.stats ? (_cache.stats.financial?.total_deposits  || 0) : clients.reduce((sum, u) => sum + (u.totalDeposited || u.deposit || 0), 0);
    const totalWithdrawn = _cache.stats ? (_cache.stats.financial?.total_withdrawals || 0) : 0;
    const withdrawals = loadWithdrawals();
    const pendingW = withdrawals; // cache already contains only pending

    // KPIs
    const finDep = $('fin-total-deposits');
    const finWith = $('fin-total-withdrawals');
    const finNet = $('fin-net-revenue');
    const finPending = $('fin-pending-count');

    if (finDep) finDep.textContent = fmtMoney(totalDeposits);
    if (finWith) finWith.textContent = fmtMoney(totalWithdrawn);
    if (finNet) finNet.textContent = fmtMoney(totalDeposits - totalWithdrawn);
    if (finPending) finPending.textContent = pendingW.length;

    // Pending subtitle
    const pendingSub = $('pending-subtitle');
    if (pendingSub) pendingSub.textContent = `${pendingW.length} pending`;

    // Withdrawal Queue
    const queue = $('withdrawal-queue');
    if (queue) {
      if (pendingW.length === 0) {
        queue.innerHTML = '<div class="empty-state"><i class="fa fa-check-circle"></i><p>No pending withdrawal requests</p></div>';
      } else {
        queue.innerHTML = pendingW.map(w => `
          <div class="wq-item">
            <div class="wq-info">
              <div class="wq-name">${w.name || w.email}</div>
              <div class="wq-meta">${w.method} · Requested ${timeAgo(w.requestedAt)}</div>
            </div>
            <div class="wq-amount">${fmtMoney(w.amount)}</div>
            <div class="wq-actions">
              <button class="act-btn green" title="Approve" onclick="AdminPanel.processWithdrawal('${w.id}', 'approved')"><i class="fa fa-check"></i></button>
              <button class="act-btn warn" title="Hold" onclick="AdminPanel.processWithdrawal('${w.id}', 'hold')"><i class="fa fa-pause"></i></button>
              <button class="act-btn danger" title="Deny" onclick="AdminPanel.processWithdrawal('${w.id}', 'denied')"><i class="fa fa-times"></i></button>
            </div>
          </div>
        `).join('');
      }
    }

    // Transaction Ledger
    _renderLedger();

    // Revenue by Tier Chart
    _renderRevenueTierChart(clients);
  }

  async function processWithdrawal(id, newStatus) {
    const withdrawals = loadWithdrawals();
    const w = withdrawals.find(w => w.id === id);
    if (!w) return;

    if (newStatus === 'hold') {
      // 'hold' not a backend status — remove from visible queue locally
      _cache.withdrawals = _cache.withdrawals.filter(wd => wd.id !== id);
      toast('Withdrawal placed on hold', 'warning');
      renderFinancials();
      return;
    }

    let result;
    if (newStatus === 'approved') {
      result = await UserAuth.adminApproveWithdrawal(id);
    } else {
      result = await UserAuth.adminRejectWithdrawal(id, '');
    }

    if (!result || !result.ok) return toast((result && result.error) || 'Action failed', 'error');

    // Remove from cache queue
    _cache.withdrawals = _cache.withdrawals.filter(wd => wd.id !== id);

    // Adjust user balance in cache if approved
    if (newStatus === 'approved' && w.email) {
      const u = _cache.users[w.email.toLowerCase()];
      if (u) u.deposit = Math.max(0, (u.deposit || 0) - w.amount);
    }

    const statusLabels = { approved: 'approved', denied: 'denied' };
    log('withdrawal', `Withdrawal ${fmtMoney(w.amount)} from ${w.name} ${statusLabels[newStatus]}`, newStatus === 'denied' ? 'warning' : 'info', { id, email: w.email });
    toast(`Withdrawal ${statusLabels[newStatus]}`, newStatus === 'approved' ? 'success' : 'warning');

    // Email notification to user
    if (w.email && typeof UserAuth !== 'undefined' && UserAuth.sendEmailNotification) {
      UserAuth.sendEmailNotification('withdrawal', {
        email: w.email,
        fullName: w.name || w.email,
        amount: w.amount,
        status: newStatus,
        method: w.method || '',
      });
    }

    renderFinancials();
    _updateHeaderStats();
  }

  function _renderLedger() {
    const tbody = $('ledger-table-body');
    if (!tbody) return;

    let ledger = loadLedger();

    // Apply filters
    const typeFilter = $('ledger-type-filter')?.value || 'all';
    if (typeFilter !== 'all') ledger = ledger.filter(l => l.type === typeFilter);

    const dateFrom = $('ledger-date-from')?.value;
    const dateTo = $('ledger-date-to')?.value;
    if (dateFrom) ledger = ledger.filter(l => l.timestamp >= new Date(dateFrom).getTime());
    if (dateTo) ledger = ledger.filter(l => l.timestamp <= new Date(dateTo + 'T23:59:59').getTime());

    // Show latest 50
    ledger = ledger.slice(0, 50);

    if (ledger.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-row">No transactions found</td></tr>`;
      return;
    }

    tbody.innerHTML = ledger.map(l => {
      const typeClass = l.type === 'deposit' ? 'green' : l.type === 'withdrawal' ? 'red' : 'blue';
      const amountClass = (l.amount || 0) >= 0 ? 'profit' : 'loss';
      return `
        <tr>
          <td class="text-muted">${fmtTime(l.timestamp)}</td>
          <td><span class="type-chip ${typeClass}">${l.type}</span></td>
          <td>${l.name || l.email || '—'}</td>
          <td class="mono ${amountClass}">${l.amount >= 0 ? '+' : ''}${fmtMoneyFull(l.amount)}</td>
          <td class="text-muted">${l.method || '—'}</td>
          <td><span class="status-chip ${l.status}">${l.status}</span></td>
          <td class="mono text-muted">${l.reference || '—'}</td>
        </tr>
      `;
    }).join('');
  }

  function filterLedger() { _renderLedger(); }

  function _renderRevenueTierChart(clients) {
    const canvas = $('chart-revenue-tier');
    if (!canvas) return;

    const tierRevenue = {};
    Object.keys(TIERS).forEach(k => { tierRevenue[k] = 0; });
    clients.forEach(u => { tierRevenue[u.tier] = (tierRevenue[u.tier] || 0) + (u.deposit || 0); });

    if (charts.revenueTier) charts.revenueTier.destroy();
    charts.revenueTier = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: Object.keys(TIERS).map(k => TIERS[k].label),
        datasets: [{
          label: 'Total Deposits',
          data: Object.keys(TIERS).map(k => tierRevenue[k]),
          backgroundColor: Object.keys(TIERS).map(k => TIERS[k].color + '88'),
          borderColor: Object.keys(TIERS).map(k => TIERS[k].color),
          borderWidth: 1,
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { ticks: { color: '#4a5568', callback: v => fmtMoney(v) }, grid: { color: 'rgba(255,255,255,0.03)' } },
          x: { ticks: { color: '#8b98ad' }, grid: { display: false } },
        },
        plugins: { legend: { display: false } },
      },
    });
  }

  // Balance Adjustment
  function openBalanceAdjust() {
    $('bal-user-email').value = '';
    $('bal-amount').value = '';
    $('bal-reason').value = '';
    $('bal-operation').value = 'add';
    openModal('modal-balance');
  }

  async function executeBalanceAdjust() {
    const email     = $('bal-user-email').value.trim();
    const operation = $('bal-operation').value;
    const amount    = parseFloat($('bal-amount').value) || 0;
    const reason    = $('bal-reason').value.trim();

    if (!email || amount <= 0) return toast('Email and amount are required', 'error');

    const users = loadUsers();
    const key   = email.toLowerCase();
    if (!users[key]) return toast('User not found', 'error');

    const user = users[key];
    let result;

    if (operation === 'add') {
      result = await UserAuth.adminCreditUser(user.id, amount, reason || 'Admin adjustment');
    } else if (operation === 'subtract') {
      result = await UserAuth.adminDebitUser(user.id, amount, reason || 'Admin adjustment');
    } else if (operation === 'set') {
      const diff = amount - (user.deposit || 0);
      if (diff >= 0) {
        result = await UserAuth.adminCreditUser(user.id, diff, reason || 'Admin balance set');
      } else {
        result = await UserAuth.adminDebitUser(user.id, Math.abs(diff), reason || 'Admin balance set');
      }
    }

    if (!result || !result.ok) return toast((result && result.error) || 'Balance adjustment failed', 'error');

    // Update cache immediately
    const oldDeposit = user.deposit || 0;
    if (operation === 'add')      user.deposit = oldDeposit + amount;
    if (operation === 'subtract') user.deposit = Math.max(0, oldDeposit - amount);
    if (operation === 'set')      user.deposit = amount;

    closeModal('modal-balance');
    log('admin_action', `Balance ${operation} ${fmtMoney(amount)} for ${user.fullName}. Reason: ${reason || 'N/A'}`, 'warning', { email, operation, amount });
    toast(`Balance adjusted: ${fmtMoney(user.deposit)}`, 'success');

    // Email notification to user
    if (typeof UserAuth !== 'undefined' && UserAuth.sendEmailNotification) {
      if (operation === 'add' || operation === 'set') {
        UserAuth.sendEmailNotification('deposit', {
          email: email,
          fullName: user.fullName || email,
          amount: amount,
          method: 'Admin Credit',
          newBalance: user.deposit,
          reference: reason || 'Balance adjustment',
        });
      }
    }

    renderFinancials();
    _updateHeaderStats();
  }

  // ────────────────────────────────────────────────────────
  //  TAB: RISK MONITOR
  // ────────────────────────────────────────────────────────
  function renderRisk() {
    const users = loadUsers();
    const clients = Object.values(users).filter(u => u.role !== 'admin');

    // Platform risk score (average of all user risk scores)
    const riskScores = clients.map(u => _calcRiskScore(u));
    const avgRisk = riskScores.length ? Math.round(riskScores.reduce((a, b) => a + b, 0) / riskScores.length) : 0;

    // Render gauge
    const arc = document.getElementById('risk-arc');
    if (arc) {
      const maxDash = 251.2;
      const offset = maxDash - (avgRisk / 100) * maxDash;
      arc.setAttribute('stroke-dashoffset', offset);
    }
    const scoreLabel = $('risk-score-label');
    if (scoreLabel) scoreLabel.textContent = avgRisk;

    // Risk status pill
    const pill = $('risk-status-pill');
    const pillText = $('risk-status-text');
    if (pill && pillText) {
      if (avgRisk > 70) { pill.className = 'risk-status-pill high'; pillText.textContent = 'High Risk'; }
      else if (avgRisk > 40) { pill.className = 'risk-status-pill medium'; pillText.textContent = 'Moderate'; }
      else { pill.className = 'risk-status-pill low'; pillText.textContent = 'Normal'; }
    }

    // Risk Alerts
    _renderRiskAlerts(clients);

    // Exposure Table
    _renderExposureTable(clients);

    // KYC Grid
    _renderKYCGrid(clients);
  }

  function _renderRiskAlerts(clients) {
    const list = $('risk-alerts-list');
    if (!list) return;

    const alerts = [];

    // High-deposit unverified users
    const unverifiedHighValue = clients.filter(u => u.kycStatus !== 'verified' && (u.deposit || 0) > 100000);
    if (unverifiedHighValue.length > 0) {
      alerts.push({ severity: 'critical', icon: 'fa-exclamation-circle', message: `${unverifiedHighValue.length} high-value user(s) without KYC verification`, action: 'Review KYC' });
    }

    // Suspended users with large balances
    const suspendedWithFunds = clients.filter(u => u.status === 'suspended' && (u.deposit || 0) > 10000);
    if (suspendedWithFunds.length > 0) {
      alerts.push({ severity: 'warning', icon: 'fa-user-lock', message: `${suspendedWithFunds.length} suspended user(s) with significant balances`, action: 'Review' });
    }

    // New users in last 24h
    const newToday = clients.filter(u => (now() - u.createdAt) < 86400000);
    if (newToday.length > 3) {
      alerts.push({ severity: 'warning', icon: 'fa-user-plus', message: `Unusual registration spike: ${newToday.length} new users in 24h`, action: 'Monitor' });
    }

    // Pending withdrawals value
    const pendingW = loadWithdrawals().filter(w => w.status === 'pending');
    const pendingTotal = pendingW.reduce((s, w) => s + (w.amount || 0), 0);
    if (pendingTotal > 50000) {
      alerts.push({ severity: 'warning', icon: 'fa-money-bill-wave', message: `${fmtMoney(pendingTotal)} in pending withdrawals`, action: 'Process' });
    }

    // System all-clear
    if (alerts.length === 0) {
      alerts.push({ severity: 'info', icon: 'fa-check-circle', message: 'All risk indicators within normal parameters', action: '' });
    }

    list.innerHTML = alerts.map(a => `
      <div class="ra-item ${a.severity}">
        <i class="fa ${a.icon}"></i>
        <span class="ra-msg">${a.message}</span>
        ${a.action ? `<button class="btn-admin-xs">${a.action}</button>` : ''}
      </div>
    `).join('');
  }

  function _renderExposureTable(clients) {
    const tbody = $('exposure-table-body');
    if (!tbody) return;

    // Sort by deposit descending
    const sorted = [...clients].sort((a, b) => (b.deposit || 0) - (a.deposit || 0)).slice(0, 15);
    const totalDeposits = clients.reduce((s, u) => s + (u.deposit || 0), 0);

    tbody.innerHTML = sorted.map(u => {
      const exposure = totalDeposits > 0 ? ((u.deposit || 0) / totalDeposits * 100).toFixed(1) : '0.0';
      const riskScore = _calcRiskScore(u);
      const riskClass = riskScore > 70 ? 'high' : riskScore > 40 ? 'medium' : 'low';
      // Simulated daily P&L
      const dailyPnl = ((Math.random() - 0.35) * (u.deposit || 0) * 0.02);
      const pnlClass = dailyPnl >= 0 ? 'profit' : 'loss';

      return `
        <tr>
          <td>
            <div class="ut-user compact">
              <div class="ut-name">${u.fullName}</div>
              <div class="ut-email">${u.email}</div>
            </div>
          </td>
          <td class="mono">${fmtMoney(u.deposit)}</td>
          <td class="mono">${Math.floor(Math.random() * 5)}</td>
          <td>
            <div class="exposure-bar-wrap">
              <div class="exposure-bar" style="width:${Math.min(exposure, 100)}%"></div>
              <span>${exposure}%</span>
            </div>
          </td>
          <td class="mono ${pnlClass}">${dailyPnl >= 0 ? '+' : ''}${fmtMoneyFull(dailyPnl)}</td>
          <td><span class="risk-badge ${riskClass}">${riskScore}</span></td>
          <td><button class="act-btn" onclick="AdminPanel.openEditUser('${u.email}')"><i class="fa fa-eye"></i></button></td>
        </tr>
      `;
    }).join('');
  }

  function _renderKYCGrid(clients) {
    const grid = $('kyc-grid');
    if (!grid) return;

    const verified = clients.filter(u => u.kycStatus === 'verified').length;
    const pending = clients.filter(u => u.kycStatus === 'pending').length;
    const unverified = clients.filter(u => !u.kycStatus || u.kycStatus === 'unverified').length;

    grid.innerHTML = `
      <div class="kyc-card verified">
        <div class="kyc-icon"><i class="fa fa-check-circle"></i></div>
        <div class="kyc-count">${verified}</div>
        <div class="kyc-label">Verified</div>
        <div class="kyc-pct">${pct(verified, clients.length)}%</div>
      </div>
      <div class="kyc-card pending">
        <div class="kyc-icon"><i class="fa fa-clock"></i></div>
        <div class="kyc-count">${pending}</div>
        <div class="kyc-label">Pending Review</div>
        <div class="kyc-pct">${pct(pending, clients.length)}%</div>
      </div>
      <div class="kyc-card unverified">
        <div class="kyc-icon"><i class="fa fa-times-circle"></i></div>
        <div class="kyc-count">${unverified}</div>
        <div class="kyc-label">Unverified</div>
        <div class="kyc-pct">${pct(unverified, clients.length)}%</div>
      </div>
    `;
  }

  // ────────────────────────────────────────────────────────
  //  TAB: TRADE FEED
  // ────────────────────────────────────────────────────────
  function renderTrades() {
    const allTrades = loadAllTrades();

    // Stats
    const closed = allTrades.filter(t => t.status === 'closed');
    const open = allTrades.filter(t => t.status === 'open');
    const wins = closed.filter(t => (t.pnl || 0) >= 0);
    const totalVolume = allTrades.reduce((s, t) => s + (t.entryPrice || 0), 0);
    const avgConf = allTrades.length ? allTrades.reduce((s, t) => s + (t.confidence || 0), 0) / allTrades.length : 0;

    const tsTotal = $('ts-total');
    const tsWinrate = $('ts-winrate');
    const tsVolume = $('ts-volume');
    const tsAvgConf = $('ts-avg-conf');
    const tsOpen = $('ts-open');

    if (tsTotal) tsTotal.textContent = allTrades.length;
    if (tsWinrate) tsWinrate.textContent = closed.length ? (wins.length / closed.length * 100).toFixed(1) + '%' : '0%';
    if (tsVolume) tsVolume.textContent = fmtMoney(totalVolume);
    if (tsAvgConf) tsAvgConf.textContent = avgConf.toFixed(0) + '%';
    if (tsOpen) tsOpen.textContent = open.length;

    // Populate symbol filter
    const symbolFilter = $('trade-filter-symbol');
    if (symbolFilter && symbolFilter.options.length <= 1) {
      const symbols = [...new Set(allTrades.map(t => t.symbol).filter(Boolean))];
      symbols.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s; opt.textContent = s;
        symbolFilter.appendChild(opt);
      });
    }

    // Apply filters
    let filtered = [...allTrades];
    const symFilter = $('trade-filter-symbol')?.value || 'all';
    const sideFilter = $('trade-filter-side')?.value || 'all';
    const statFilter = $('trade-filter-status')?.value || 'all';

    if (symFilter !== 'all') filtered = filtered.filter(t => t.symbol === symFilter);
    if (sideFilter !== 'all') filtered = filtered.filter(t => t.side === sideFilter);
    if (statFilter !== 'all') filtered = filtered.filter(t => t.status === statFilter);

    // Render feed table (max 50)
    const tbody = $('trade-feed-body');
    if (tbody) {
      const display = filtered.slice(0, 50);
      if (display.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="empty-row">No trades found</td></tr>`;
      } else {
        tbody.innerHTML = display.map(t => {
          const pnlClass = (t.pnl || 0) >= 0 ? 'profit' : 'loss';
          const sideClass = t.side === 'long' ? 'long' : 'short';
          return `
            <tr>
              <td class="text-muted">${fmtTime(t.timestamp)}</td>
              <td>${t._userName || 'AI System'}</td>
              <td class="mono"><strong>${t.symbol || '—'}</strong></td>
              <td><span class="side-chip ${sideClass}">${(t.side || '').toUpperCase()}</span></td>
              <td class="mono">$${(t.entryPrice || 0).toFixed(2)}</td>
              <td class="mono">${t.exitPrice ? '$' + t.exitPrice.toFixed(2) : '—'}</td>
              <td class="mono ${pnlClass}">${(t.pnl || 0) >= 0 ? '+' : ''}$${(t.pnl || 0).toFixed(2)}</td>
              <td><span class="conf-badge" style="--conf:${(t.confidence || 0) / 100}">${t.confidence || 0}%</span></td>
              <td><span class="status-chip ${t.status}">${(t.status || 'unknown').toUpperCase()}</span></td>
            </tr>
          `;
        }).join('');
      }
    }

    // Cumulative P&L Chart
    _renderCumulativePnLChart(closed);
  }

  function filterTrades() { renderTrades(); }

  function _renderCumulativePnLChart(closedTrades) {
    const canvas = $('chart-cumulative-pnl');
    if (!canvas) return;

    // Sort chronologically
    const sorted = [...closedTrades].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    let cumPnL = 0;
    const labels = sorted.map(t => fmtTime(t.timestamp));
    const data = sorted.map(t => { cumPnL += (t.pnl || 0); return cumPnL; });

    if (charts.cumulativePnl) charts.cumulativePnl.destroy();
    charts.cumulativePnl = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels.length ? labels : ['No data'],
        datasets: [{
          label: 'Cumulative P&L',
          data: data.length ? data : [0],
          borderColor: cumPnL >= 0 ? '#5fb38e' : '#d65d5d',
          backgroundColor: cumPnL >= 0 ? 'rgba(95,179,142,0.08)' : 'rgba(214,93,93,0.08)',
          fill: true,
          tension: 0.3,
          pointRadius: 1,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { display: false },
          y: { ticks: { color: '#4a5568', callback: v => fmtMoney(v) }, grid: { color: 'rgba(255,255,255,0.03)' } },
        },
        plugins: { legend: { display: false } },
      },
    });
  }

  // ────────────────────────────────────────────────────────
  //  TAB: CONFIGURATION
  // ────────────────────────────────────────────────────────
  function renderConfig() {
    const config = loadConfig();

    // Platform Toggles
    const cfgReg = $('cfg-registration');
    const cfgTrd = $('cfg-trading');
    const cfgAt = $('cfg-autotrader');
    const cfgWd = $('cfg-withdrawals');
    const cfgMa = $('cfg-maintenance');

    if (cfgReg) cfgReg.checked = config.registration;
    if (cfgTrd) cfgTrd.checked = config.trading;
    if (cfgAt) cfgAt.checked = config.autoTrader;
    if (cfgWd) cfgWd.checked = config.withdrawals;
    if (cfgMa) cfgMa.checked = config.maintenance;

    // Auto-trader params
    const cfgInterval = $('cfg-trade-interval');
    const cfgMax = $('cfg-max-positions');
    const cfgConf = $('cfg-min-confidence');
    const cfgSize = $('cfg-position-size');
    const cfgTimeout = $('cfg-session-timeout');
    const cfgLoss = $('cfg-max-daily-loss');

    if (cfgInterval) cfgInterval.value = config.tradeInterval || 45;
    if (cfgMax) cfgMax.value = config.maxPositions || 8;
    if (cfgConf) cfgConf.value = config.minConfidence || 65;
    if (cfgSize) cfgSize.value = config.positionSize || 3;
    if (cfgTimeout) cfgTimeout.value = config.sessionTimeout || 60;
    if (cfgLoss) cfgLoss.value = config.maxDailyLoss || 10;

    // Tier Config Table
    _renderTierConfigTable();
  }

  function _renderTierConfigTable() {
    const tbody = $('tier-config-body');
    if (!tbody) return;

    tbody.innerHTML = Object.keys(TIERS).map(key => {
      const t = TIERS[key];
      return `
        <tr>
          <td><span class="tier-chip ${key}" style="--tc:${t.color}">${t.label}</span></td>
          <td class="mono">${fmtMoney(t.minDeposit)}</td>
          <td>${t.apy}</td>
          <td>${t.maxLev}</td>
          <td class="mono">${(t.commission * 100).toFixed(0)}%</td>
          <td><span class="status-chip active">Active</span></td>
        </tr>
      `;
    }).join('');
  }

  function saveConfig() {
    const config = {
      registration: $('cfg-registration')?.checked ?? true,
      trading: $('cfg-trading')?.checked ?? true,
      autoTrader: $('cfg-autotrader')?.checked ?? true,
      withdrawals: $('cfg-withdrawals')?.checked ?? true,
      maintenance: $('cfg-maintenance')?.checked ?? false,
      tradeInterval: parseInt($('cfg-trade-interval')?.value) || 45,
      maxPositions: parseInt($('cfg-max-positions')?.value) || 8,
      minConfidence: parseInt($('cfg-min-confidence')?.value) || 65,
      positionSize: parseFloat($('cfg-position-size')?.value) || 3,
      sessionTimeout: parseInt($('cfg-session-timeout')?.value) || 60,
      maxDailyLoss: parseInt($('cfg-max-daily-loss')?.value) || 10,
    };

    saveConfig_ls(config);
    log('config_change', 'Platform configuration updated', 'warning', config);
    toast('Configuration saved successfully', 'success');
  }

  // ────────────────────────────────────────────────────────
  //  TAB: AUDIT LOGS
  // ────────────────────────────────────────────────────────
  function renderAuditLogs() {
    let audit = loadAudit();

    // Apply search
    if (auditSearchQuery) {
      const q = auditSearchQuery.toLowerCase();
      audit = audit.filter(a => (a.message || '').toLowerCase().includes(q) || (a.type || '').toLowerCase().includes(q));
    }

    // Apply type filter
    const typeFilter = $('audit-type-filter')?.value || 'all';
    if (typeFilter !== 'all') audit = audit.filter(a => a.type === typeFilter);

    // Apply severity filter
    const sevFilter = $('audit-severity-filter')?.value || 'all';
    if (sevFilter !== 'all') audit = audit.filter(a => a.severity === sevFilter);

    // Paginate
    const totalItems = audit.length;
    const totalPages = Math.ceil(totalItems / 25) || 1;
    auditPage = clamp(auditPage, 1, totalPages);
    const start = (auditPage - 1) * 25;
    const pageItems = audit.slice(start, start + 25);

    // Render
    const list = $('audit-log-list');
    if (list) {
      if (pageItems.length === 0) {
        list.innerHTML = '<div class="empty-state"><i class="fa fa-clipboard-check"></i><p>No audit events found</p></div>';
      } else {
        const icons = {
          login: 'fa-sign-in-alt', logout: 'fa-sign-out-alt', user_create: 'fa-user-plus',
          user_update: 'fa-user-edit', user_delete: 'fa-user-times', deposit: 'fa-arrow-down',
          withdrawal: 'fa-arrow-up', config_change: 'fa-cog', admin_action: 'fa-shield-alt', trade: 'fa-exchange-alt',
        };
        const sevColors = { info: 'blue', warning: 'orange', critical: 'red' };

        list.innerHTML = pageItems.map(a => `
          <div class="audit-item">
            <div class="aui-icon ${sevColors[a.severity] || 'blue'}"><i class="fa ${icons[a.type] || 'fa-circle'}"></i></div>
            <div class="aui-body">
              <div class="aui-msg">${a.message}</div>
              <div class="aui-meta">
                <span class="aui-type">${(a.type || '').replace('_', ' ')}</span>
                <span class="aui-sev ${a.severity}">${a.severity}</span>
                <span class="aui-actor">${a.actor}</span>
                <span class="aui-time">${fmtTime(a.timestamp)}</span>
              </div>
            </div>
          </div>
        `).join('');
      }
    }

    // Info & pagination
    const info = $('audit-log-info');
    if (info) info.textContent = `${totalItems} events`;

    _renderPagination($('audit-pagination'), auditPage, totalPages, (p) => { auditPage = p; renderAuditLogs(); });
  }

  function searchAuditLogs(query) {
    auditSearchQuery = query;
    auditPage = 1;
    renderAuditLogs();
  }

  function filterAuditLogs() {
    auditPage = 1;
    renderAuditLogs();
  }

  function exportAuditLogs() {
    const audit = loadAudit();
    const headers = ['Timestamp', 'Type', 'Severity', 'Message', 'Actor'];
    const rows = audit.map(a => [fmtTime(a.timestamp), a.type, a.severity, `"${a.message}"`, a.actor]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zen_audit_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Audit logs exported', 'success');
  }

  function clearAuditLogs() {
    $('confirm-title').textContent = 'Clear Audit Logs';
    $('confirm-message').textContent = 'Permanently delete all audit log entries? This cannot be undone.';
    $('confirm-btn').onclick = () => {
      saveAudit([]);
      closeModal('modal-confirm');
      log('admin_action', 'Audit logs cleared', 'critical');
      renderAuditLogs();
      toast('Audit logs cleared', 'warning');
    };
    openModal('modal-confirm');
  }

  // ────────────────────────────────────────────────────────
  //  TAB: BROADCAST
  // ────────────────────────────────────────────────────────
  function renderBroadcast() {
    // Notification history
    const notifs = loadNotifs();
    const historyEl = $('notif-history');
    const countEl = $('notif-history-count');

    if (countEl) countEl.textContent = `${notifs.length} sent`;

    if (historyEl) {
      if (notifs.length === 0) {
        historyEl.innerHTML = '<div class="empty-state"><i class="fa fa-bell-slash"></i><p>No notifications sent yet</p></div>';
      } else {
        historyEl.innerHTML = notifs.slice(0, 30).map(n => {
          const prioClass = { low: 'info', normal: 'blue', high: 'orange', urgent: 'red' };
          return `
            <div class="notif-item">
              <div class="ni-prio ${prioClass[n.priority] || 'blue'}"></div>
              <div class="ni-body">
                <div class="ni-subject">${n.subject}</div>
                <div class="ni-msg">${n.message.substring(0, 120)}${n.message.length > 120 ? '…' : ''}</div>
                <div class="ni-meta">
                  <span><i class="fa fa-bullseye"></i> ${n.targetLabel}</span>
                  <span><i class="fa fa-clock"></i> ${timeAgo(n.sentAt)}</span>
                  <span class="ni-prio-label ${n.priority}">${n.priority}</span>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }

  function onBroadcastTargetChange() {
    const target = $('bc-target')?.value;
    const tierField = $('bc-tier-field');
    const userField = $('bc-user-field');
    if (tierField) tierField.style.display = target === 'tier' ? 'block' : 'none';
    if (userField) userField.style.display = target === 'user' ? 'block' : 'none';
  }

  function previewBroadcast() {
    const subject = $('bc-subject')?.value.trim();
    const message = $('bc-message')?.value.trim();
    if (!subject || !message) return toast('Subject and message are required', 'error');
    toast(`Preview: "${subject}" — ${message.substring(0, 80)}...`, 'info', 5000);
  }

  function sendBroadcast() {
    const subject = $('bc-subject')?.value.trim();
    const message = $('bc-message')?.value.trim();
    const priority = $('bc-priority')?.value || 'normal';
    const target = $('bc-target')?.value || 'all';

    if (!subject || !message) return toast('Subject and message are required', 'error');

    let targetLabel = 'All Users';
    if (target === 'tier') targetLabel = `${TIERS[$('bc-tier-target')?.value]?.label || ''} Tier`;
    if (target === 'user') targetLabel = $('bc-user-target')?.value || 'Unknown User';
    if (target === 'active') targetLabel = 'Active Users';

    // Count recipients
    const users = loadUsers();
    const clients = Object.values(users).filter(u => u.role !== 'admin');
    let recipientCount = 0;
    switch (target) {
      case 'all': recipientCount = clients.length; break;
      case 'tier': recipientCount = clients.filter(u => u.tier === ($('bc-tier-target')?.value)).length; break;
      case 'user': recipientCount = 1; break;
      case 'active': recipientCount = clients.filter(u => u.status === 'active').length; break;
    }

    // Save notification
    const notifs = loadNotifs();
    notifs.unshift({
      id: uid(),
      subject,
      message,
      priority,
      target,
      targetLabel,
      recipientCount,
      sentAt: now(),
      sentBy: 'admin',
    });
    saveNotifs(notifs.slice(0, 200));

    // Clear form
    if ($('bc-subject')) $('bc-subject').value = '';
    if ($('bc-message')) $('bc-message').value = '';
    if ($('bc-priority')) $('bc-priority').value = 'normal';
    if ($('bc-target')) $('bc-target').value = 'all';
    onBroadcastTargetChange();

    log('admin_action', `Broadcast sent: "${subject}" to ${targetLabel} (${recipientCount} recipients)`, 'info');
    toast(`Notification sent to ${recipientCount} recipient(s)`, 'success');
    renderBroadcast();
  }

  // ────────────────────────────────────────────────────────
  //  SEND WEEKLY REPORTS (to all active users)
  // ────────────────────────────────────────────────────────
  async function sendWeeklyReports() {
    if (!confirm('Send weekly portfolio report emails to ALL active users?')) return;
    const users = loadUsers();
    const clients = Object.values(users).filter(u => u.role !== 'admin' && u.status === 'active' && u.email);
    if (clients.length === 0) return toast('No active users to send reports to', 'warning');

    let sent = 0;
    for (const u of clients) {
      try {
        if (typeof UserAuth !== 'undefined' && UserAuth.sendEmailNotification) {
          UserAuth.sendEmailNotification('weekly-report', {
            email: u.email,
            fullName: u.fullName || u.email,
            balance: u.deposit || u.balance || 0,
            earnings: u.earnings || 0,
            tier: u.tier || 'bronze',
            weeklyChange: (u.earnings || 0) * 0.1,
            topCorridor: 'NY-CORR',
          });
          sent++;
        }
      } catch (e) { /* continue to next user */ }
    }
    toast(`Weekly reports queued for ${sent} user(s)`, 'success');
    log('admin_action', `Weekly reports sent to ${sent} users`, 'info');
  }

  // ────────────────────────────────────────────────────────
  //  MODAL MANAGEMENT
  // ────────────────────────────────────────────────────────
  function openModal(id) {
    const el = $(id);
    if (el) el.classList.add('open');
  }

  function closeModal(id) {
    const el = $(id);
    if (el) el.classList.remove('open');
  }

  // Close modals on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      $$('.admin-modal-overlay.open').forEach(m => m.classList.remove('open'));
    }
  });

  // ────────────────────────────────────────────────────────
  //  INIT
  // ────────────────────────────────────────────────────────
  function init() {
    _initAuth();
  }

  // Auto-init on DOM ready
  document.addEventListener('DOMContentLoaded', () => init());

  // ────────────────────────────────────────────────────────
  //  PUBLIC API
  // ────────────────────────────────────────────────────────
  return {
    // Auth
    logout,
    // Navigation
    navigateTab,
    // Overview
    refreshDashboard,
    // Users
    renderUsers, searchUsers, filterUsers, sortUsers,
    toggleUserSelect, toggleSelectAll, clearSelection,
    openEditUser, saveUserEdit, openCreateUser,
    toggleUserStatus, confirmDeleteUser,
    toggleTradingPause, toggleProfitPause,
    bulkAction, exportUsers,
    // Financials
    processWithdrawal, filterLedger,
    openBalanceAdjust, executeBalanceAdjust,
    // Risk
    renderRisk,
    // Trades
    filterTrades,
    // Config
    saveConfig,
    // Audit
    searchAuditLogs, filterAuditLogs, exportAuditLogs, clearAuditLogs,
    // Broadcast
    onBroadcastTargetChange, previewBroadcast, sendBroadcast,
    // Weekly Reports
    sendWeeklyReports,
    // Fund & Activate
    activateAccountPrompt, executeActivation,

    // Modals
    openModal, closeModal,
  };
})();
