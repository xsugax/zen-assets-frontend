/* ════════════════════════════════════════════════════════════
   copy-trade-config.js — Admin-assigned copy trading per user
════════════════════════════════════════════════════════════ */

const CopyTradeConfig = (() => {
  'use strict';

  const STORAGE_KEY = 'zen_copy_settings_';
  const ADMIN_CTRL_KEY = 'zen_admin_controls_';

  const MODES = {
    disabled:       { label: 'Disabled', desc: 'No copy trading' },
    scalping:       { label: 'Scalping', desc: 'SilverDelta — fast short-term entries' },
    mean_reversion: { label: 'Mean Reversion', desc: 'QuantEdge — range & reversion plays' },
    momentum:       { label: 'Momentum', desc: 'CryptoWolf — trend following' },
    breakout:       { label: 'Breakout', desc: 'IronAlpha — volatility breakouts' },
    multi:          { label: 'Multi-Strategy', desc: 'Blend of strategies up to user tier' },
    aggressive:     { label: 'Aggressive Elite', desc: 'IronAlpha + CryptoWolf combined' },
  };

  /** strategy field on copy trader cards → trader id */
  const STRATEGY_TO_TRADER = {
    Scalping: 'ct4',
    'Mean Reversion': 'ct2',
    Momentum: 'ct1',
    Breakout: 'ct3',
  };

  const MODE_TRADER_IDS = {
    disabled: [],
    scalping: ['ct4'],
    mean_reversion: ['ct2'],
    momentum: ['ct1'],
    breakout: ['ct3'],
    multi: ['ct4', 'ct2', 'ct1'],
    aggressive: ['ct3', 'ct1'],
  };

  const DEFAULTS = { enabled: false, mode: 'disabled', percent: 15 };

  function normalize(input) {
    const cfg = { ...DEFAULTS, ...(input && typeof input === 'object' ? input : {}) };
    if (!MODES[cfg.mode]) cfg.mode = 'disabled';
    cfg.percent = Math.max(0, Math.min(100, parseFloat(cfg.percent) || 0));
    if (cfg.mode === 'disabled') cfg.enabled = false;
    if (cfg.enabled && cfg.percent < 1) cfg.percent = DEFAULTS.percent;
    return cfg;
  }

  function _emailKey(email) {
    return (email || '').toLowerCase().trim();
  }

  function saveForEmail(email, cfg) {
    const key = _emailKey(email);
    if (!key) return;
    const norm = normalize(cfg);
    try {
      localStorage.setItem(STORAGE_KEY + key, JSON.stringify(norm));
      const ctrlRaw = localStorage.getItem(ADMIN_CTRL_KEY + key);
      const ctrl = ctrlRaw ? JSON.parse(ctrlRaw) : {};
      ctrl.copyTrade = norm;
      localStorage.setItem(ADMIN_CTRL_KEY + key, JSON.stringify(ctrl));
    } catch (e) { console.warn('CopyTradeConfig save failed', e); }
    return norm;
  }

  function getForEmail(email) {
    const key = _emailKey(email);
    if (!key) return { ...DEFAULTS };
    try {
      const raw = localStorage.getItem(STORAGE_KEY + key);
      if (raw) return normalize(JSON.parse(raw));
      const ctrlRaw = localStorage.getItem(ADMIN_CTRL_KEY + key);
      if (ctrlRaw) {
        const ctrl = JSON.parse(ctrlRaw);
        if (ctrl.copyTrade) return normalize(ctrl.copyTrade);
      }
    } catch { /* fall through */ }
    return { ...DEFAULTS };
  }

  function getForCurrentUser() {
    try {
      if (typeof UserAuth !== 'undefined' && UserAuth.getSession) {
        const s = UserAuth.getSession();
        if (s?.email) return getForEmail(s.email);
      }
    } catch { /* graceful */ }
    return { ...DEFAULTS };
  }

  function applyFromApiUser(user) {
    if (!user?.email) return DEFAULTS;
    const ct = user.copyTrade || user.settings?.copyTrade;
    if (ct) return saveForEmail(user.email, ct);
    return getForEmail(user.email);
  }

  function getTraderIdsForMode(mode, userTier) {
    const ids = MODE_TRADER_IDS[mode] || [];
    if (!ids.length) return [];
    const TIER_ORDER = { bronze: 0, silver: 1, gold: 2, platinum: 3, diamond: 4 };
    const rank = TIER_ORDER[userTier] ?? 0;
    const minTierByTrader = { ct4: 0, ct2: 1, ct1: 2, ct3: 3 };
    return ids.filter(id => rank >= (minTierByTrader[id] ?? 0));
  }

  function modeLabel(mode) {
    return MODES[mode]?.label || mode;
  }

  return {
    MODES,
    MODE_TRADER_IDS,
    STRATEGY_TO_TRADER,
    DEFAULTS,
    normalize,
    saveForEmail,
    getForEmail,
    getForCurrentUser,
    applyFromApiUser,
    getTraderIdsForMode,
    modeLabel,
  };
})();
