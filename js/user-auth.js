/* ════════════════════════════════════════════════════════════
   user-auth.js — User Authentication & Admin Control System
   OmniVest AI / ZEN ASSETS

   Features:
   ─ Registration with tier selection
   ─ Login with credential validation
   ─ User profile management (tier-locked)
   ─ Admin panel: user CRUD, tier override, earnings view
   ─ All state persisted via localStorage
════════════════════════════════════════════════════════════ */

const UserAuth = (() => {
  'use strict';

  // ── Constants ────────────────────────────────────────────
  const STORAGE_USERS   = 'zen_users';
  const STORAGE_SESSION = 'zen_session';
  const ADMIN_EMAIL     = 'admin@zenassets.com';
  const ADMIN_PASS      = 'ZenAdmin2026!';

  const TIERS = {
    bronze:   { label: 'Bronze',   minDeposit: 5000,    apyRange: '15–22%',  color: '#cd7f32', icon: 'fa-medal'          },
    silver:   { label: 'Silver',   minDeposit: 25000,   apyRange: '22–32%',  color: '#c0c0c0', icon: 'fa-award'          },
    gold:     { label: 'Gold',     minDeposit: 100000,  apyRange: '32–45%',  color: '#d4a574', icon: 'fa-trophy'         },
    platinum: { label: 'Platinum', minDeposit: 500000,  apyRange: '45–65%',  color: '#e5e4e2', icon: 'fa-gem'            },
    diamond:  { label: 'Diamond',  minDeposit: 1000000, apyRange: '65–85%',  color: '#b9f2ff', icon: 'fa-crown'          },
  };

  // ── Helpers ──────────────────────────────────────────────
  function _uid() { return 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function _hash(str) {
    // Simple hash (NOT production crypto — demo only)
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return 'h$' + Math.abs(h).toString(16);
  }

  function _loadUsers() {
    try { return JSON.parse(localStorage.getItem(STORAGE_USERS)) || {}; } catch { return {}; }
  }
  function _saveUsers(users) { localStorage.setItem(STORAGE_USERS, JSON.stringify(users)); }

  function _loadSession() {
    try { return JSON.parse(localStorage.getItem(STORAGE_SESSION)) || null; } catch { return null; }
  }
  function _saveSession(sess) {
    if (sess) localStorage.setItem(STORAGE_SESSION, JSON.stringify(sess));
    else localStorage.removeItem(STORAGE_SESSION);
  }

  // ── Ensure Admin Exists ──────────────────────────────────
  function _ensureAdmin() {
    const users = _loadUsers();
    const adminKey = ADMIN_EMAIL.toLowerCase();
    if (!users[adminKey]) {
      users[adminKey] = {
        id: 'u_admin',
        email: ADMIN_EMAIL,
        password: _hash(ADMIN_PASS),
        fullName: 'ZEN Administrator',
        tier: 'diamond',
        role: 'admin',
        deposit: 0,
        createdAt: Date.now(),
        status: 'active',
        lastLogin: null,
        earningsOverride: null,
      };
      _saveUsers(users);
    }
  }

  // ── Register ─────────────────────────────────────────────
  function register({ fullName, email, password, tier, deposit }) {
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
    const dep    = parseFloat(deposit) || 0;
    if (dep < minDep) {
      return { ok: false, error: `${TIERS[tier].label} tier requires a minimum deposit of $${minDep.toLocaleString()}.` };
    }

    const users = _loadUsers();
    const key   = email.toLowerCase().trim();
    if (users[key]) {
      return { ok: false, error: 'An account with this email already exists.' };
    }

    const user = {
      id: _uid(),
      email: key,
      password: _hash(password),
      fullName: fullName.trim(),
      tier,
      role: 'client',
      deposit: dep,
      createdAt: Date.now(),
      status: 'active',
      lastLogin: Date.now(),
      earningsOverride: null,
    };

    users[key] = user;
    _saveUsers(users);

    // Auto-login after registration
    const session = { userId: user.id, email: key, role: 'client', tier, fullName: user.fullName, loginAt: Date.now() };
    _saveSession(session);

    return { ok: true, user, session };
  }

  // ── Login ────────────────────────────────────────────────
  function login(email, password) {
    if (!email || !password) return { ok: false, error: 'Email and password are required.' };

    const users = _loadUsers();
    const key   = email.toLowerCase().trim();
    const user  = users[key];

    if (!user) return { ok: false, error: 'No account found with this email.' };
    if (user.password !== _hash(password)) return { ok: false, error: 'Incorrect password.' };
    if (user.status === 'suspended') return { ok: false, error: 'Your account has been suspended. Contact support.' };

    user.lastLogin = Date.now();
    _saveUsers(users);

    const session = { userId: user.id, email: key, role: user.role, tier: user.tier, fullName: user.fullName, loginAt: Date.now() };
    _saveSession(session);

    return { ok: true, user, session };
  }

  // ── Session ──────────────────────────────────────────────
  function getSession()   { return _loadSession(); }
  function isLoggedIn()   { return !!_loadSession(); }
  function isAdmin()      { const s = _loadSession(); return s && s.role === 'admin'; }
  function getCurrentTier() { const s = _loadSession(); return s ? s.tier : 'bronze'; }
  function getCurrentUser() {
    const s = _loadSession();
    if (!s) return null;
    const users = _loadUsers();
    return users[s.email] || null;
  }

  function logout() {
    _saveSession(null);
  }

  // ── Admin: User Management ───────────────────────────────
  function adminGetAllUsers() {
    if (!isAdmin()) return [];
    const users = _loadUsers();
    return Object.values(users).map(u => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      tier: u.tier,
      role: u.role,
      deposit: u.deposit,
      status: u.status,
      createdAt: u.createdAt,
      lastLogin: u.lastLogin,
      earningsOverride: u.earningsOverride,
    }));
  }

  function adminUpdateUser(email, updates) {
    if (!isAdmin()) return { ok: false, error: 'Not authorised.' };
    const users = _loadUsers();
    const key   = email.toLowerCase().trim();
    if (!users[key]) return { ok: false, error: 'User not found.' };

    // Apply safe updates
    if (updates.tier && TIERS[updates.tier]) users[key].tier = updates.tier;
    if (updates.status) users[key].status = updates.status;
    if (updates.deposit !== undefined) users[key].deposit = parseFloat(updates.deposit) || 0;
    if (updates.fullName) users[key].fullName = updates.fullName;
    if (updates.earningsOverride !== undefined) users[key].earningsOverride = updates.earningsOverride;

    _saveUsers(users);
    return { ok: true };
  }

  function adminDeleteUser(email) {
    if (!isAdmin()) return { ok: false, error: 'Not authorised.' };
    const users = _loadUsers();
    const key   = email.toLowerCase().trim();
    if (key === ADMIN_EMAIL.toLowerCase()) return { ok: false, error: 'Cannot delete admin account.' };
    delete users[key];
    _saveUsers(users);
    return { ok: true };
  }

  function adminGetStats() {
    if (!isAdmin()) return null;
    const users = Object.values(_loadUsers());
    const clients = users.filter(u => u.role === 'client');
    const tierCounts = {};
    let totalDeposits = 0;
    for (const u of clients) {
      tierCounts[u.tier] = (tierCounts[u.tier] || 0) + 1;
      totalDeposits += u.deposit || 0;
    }
    return {
      totalUsers: clients.length,
      activeUsers: clients.filter(u => u.status === 'active').length,
      suspendedUsers: clients.filter(u => u.status === 'suspended').length,
      tierCounts,
      totalDeposits,
      avgDeposit: clients.length ? totalDeposits / clients.length : 0,
    };
  }

  // ── Tier Upgrade Request ─────────────────────────────────
  function requestUpgrade(newTier) {
    const s = _loadSession();
    if (!s) return { ok: false, error: 'Not logged in.' };
    if (!TIERS[newTier]) return { ok: false, error: 'Invalid tier.' };

    const tierOrder = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
    const curIdx = tierOrder.indexOf(s.tier);
    const newIdx = tierOrder.indexOf(newTier);
    if (newIdx <= curIdx) return { ok: false, error: 'You can only upgrade to a higher tier.' };

    // In production, this would create a pending request for admin approval
    // For now, store as a flag on the user
    const users = _loadUsers();
    if (users[s.email]) {
      users[s.email].upgradeRequest = { tier: newTier, requestedAt: Date.now() };
      _saveUsers(users);
    }
    return { ok: true, message: `Upgrade request to ${TIERS[newTier].label} submitted. An admin will review your request.` };
  }

  // ── Init ─────────────────────────────────────────────────
  function init() {
    _ensureAdmin();
  }

  return {
    init, register, login, logout,
    getSession, isLoggedIn, isAdmin,
    getCurrentTier, getCurrentUser,
    requestUpgrade,
    adminGetAllUsers, adminUpdateUser, adminDeleteUser, adminGetStats,
    TIERS,
  };
})();
