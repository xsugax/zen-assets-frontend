/* ════════════════════════════════════════════════════════════
   plugins.js — Plugin Ecosystem Manager
   OmniVest AI / ZEN ASSETS
════════════════════════════════════════════════════════════ */

const Plugins = (() => {
  'use strict';

  const DEFAULT_ACTIVE = [
    { id: 'p1',  name: 'ZEN Sentiment Pro',   category: 'Analytics', icon: '🧠', iconBg: 'rgba(139,92,246,.2)', iconColor: '#8b5cf6', desc: 'Real-time NLP sentiment from 500+ sources.', rating: 4.9, users: '24.2K', version: '3.2.1', enabled: true,  plan: 'Pro' },
    { id: 'p2',  name: 'Whale Tracker Ultra',  category: 'Market',    icon: '🐋', iconBg: 'rgba(0,212,255,.15)',  iconColor: '#00d4ff', desc: '24/7 on-chain whale wallet surveillance.',  rating: 4.8, users: '18.7K', version: '2.8.0', enabled: true,  plan: 'Pro' },
    { id: 'p3',  name: 'Quantum Grid Bot',     category: 'Strategy',  icon: '⚡', iconBg: 'rgba(0,255,136,.15)', iconColor: '#00ff88', desc: 'Self-calibrating grid with volatility scaling.',rating:4.7, users: '9.3K', version: '1.9.4', enabled: true,  plan: 'Elite' },
    { id: 'p4',  name: 'Tax Optimizer AI',     category: 'Finance',   icon: '💰', iconBg: 'rgba(245,158,11,.15)',iconColor: '#f59e0b', desc: 'Automatic tax-loss harvesting & reporting.', rating: 4.6, users: '15.1K', version: '4.1.0', enabled: false, plan: 'Free' },
  ];

  const DEFAULT_STORE = [
    { id: 's1', name: 'DeFi Yield Optimizer', category: 'DeFi',     icon: '🌱', iconBg: 'rgba(0,255,136,.1)', iconColor: '#00ff88', desc: 'Cross-chain yield optimization with auto-compound.', rating: 4.9, users: '42K', version: '2.4.0', price: '$29/mo', installed: false },
    { id: 's2', name: 'Macro Intelligence',    category: 'Research', icon: '🌐', iconBg: 'rgba(0,212,255,.1)', iconColor: '#00d4ff', desc: 'Fed calendar, macro events, central bank analysis.', rating: 4.7, users: '31K', version: '3.0.2', price: '$19/mo', installed: false },
    { id: 's3', name: 'Social Signal Engine',  category: 'Signals',  icon: '📡', iconBg: 'rgba(236,72,153,.1)',iconColor: '#ec4899', desc: 'Twitter/Reddit signal extraction with ML filtering.', rating: 4.5, users: '18K', version: '1.7.3', price: '$39/mo', installed: false },
    { id: 's4', name: 'NFT Market Tracker',    category: 'NFT',      icon: '🎨', iconBg: 'rgba(255,215,0,.1)', iconColor: '#ffd700', desc: 'Floor price alerts, volume & trading insights.',      rating: 4.3, users: '11K', version: '2.1.0', price: '$14/mo', installed: false },
    { id: 's5', name: 'Smart Contract Auditor',category: 'Security', icon: '🔒', iconBg: 'rgba(255,71,87,.1)', iconColor: '#ff4757', desc: 'Real-time exploit detection & rug-pull scanner.',     rating: 4.8, users: '29K', version: '4.0.1', price: '$25/mo', installed: false },
    { id: 's6', name: 'Futures & Options Pro', category: 'Trading',  icon: '📈', iconBg: 'rgba(139,92,246,.1)',iconColor: '#8b5cf6', desc: 'Greeks calculator, IV rank, multi-leg strategies.',   rating: 4.6, users: '22K', version: '5.2.0', price: '$49/mo', installed: false },
  ];

  let active = DEFAULT_ACTIVE.map(p => ({ ...p }));
  let store = DEFAULT_STORE.map(p => ({ ...p }));

  function _key() {
    try {
      const s = (typeof UserAuth !== 'undefined' && UserAuth.getSession) ? UserAuth.getSession() : null;
      return 'zen_plugins_' + ((s && s.email) || 'anon').toLowerCase();
    } catch {
      return 'zen_plugins_anon';
    }
  }

  function _persist() {
    try {
      localStorage.setItem(_key(), JSON.stringify({
        active: active.map(p => ({ id: p.id, enabled: !!p.enabled })),
        store: store.map(p => ({ id: p.id, installed: !!p.installed })),
      }));
    } catch { /* ignore */ }
  }

  function init() {
    active = DEFAULT_ACTIVE.map(p => ({ ...p }));
    store = DEFAULT_STORE.map(p => ({ ...p }));
    try {
      const raw = localStorage.getItem(_key());
      if (!raw) return applyEffects();
      const saved = JSON.parse(raw);
      (saved.active || []).forEach(row => {
        const p = active.find(a => a.id === row.id);
        if (p) p.enabled = !!row.enabled;
      });
      (saved.store || []).forEach(row => {
        const s = store.find(a => a.id === row.id);
        if (!s) return;
        s.installed = !!row.installed;
        if (s.installed && !active.some(a => a.id === s.id)) {
          const extra = saved.active && saved.active.find(a => a.id === s.id);
          active.push({ ...s, enabled: extra ? !!extra.enabled : true, plan: s.price || 'Store' });
        }
      });
    } catch { /* ignore */ }
    applyEffects();
  }

  function isEnabled(id) {
    const p = active.find(a => a.id === id);
    return !!(p && p.enabled);
  }

  function applyEffects() {
    try {
      document.body.classList.toggle('plugin-sentiment', isEnabled('p1'));
      document.body.classList.toggle('plugin-whale', isEnabled('p2'));
      document.body.classList.toggle('plugin-grid', isEnabled('p3'));
      document.body.classList.toggle('plugin-tax', isEnabled('p4'));
      document.body.classList.toggle('plugin-defi', isEnabled('s1'));
      document.body.classList.toggle('plugin-macro', isEnabled('s2'));
      document.body.classList.toggle('plugin-social', isEnabled('s3'));
      document.body.classList.toggle('plugin-nft', isEnabled('s4'));
      document.body.classList.toggle('plugin-audit', isEnabled('s5'));
      document.body.classList.toggle('plugin-futures', isEnabled('s6'));
    } catch { /* ignore */ }
  }

  function toggleActive(id) {
    const p = active.find(a => a.id === id);
    if (!p) return;
    p.enabled = !p.enabled;
    _persist();
    applyEffects();
  }

  function installPlugin(id) {
    const s = store.find(a => a.id === id);
    if (!s || s.installed) return;
    s.installed = true;
    if (!active.some(a => a.id === id)) {
      active.push({ ...s, enabled: true, plan: s.price || 'Store' });
    }
    _persist();
    applyEffects();
  }

  function uninstallPlugin(id) {
    const idx = active.findIndex(a => a.id === id);
    if (idx >= 0) active.splice(idx, 1);
    const s = store.find(a => a.id === id);
    if (s) s.installed = false;
    _persist();
    applyEffects();
  }

  function generateTaxReport() {
    const snap = (typeof InvestmentReturns !== 'undefined') ? InvestmentReturns.getSnapshot() : {};
    const trades = (typeof Trading !== 'undefined' && Trading.getOrderLog) ? Trading.getOrderLog(50) : [];
    const lines = [
      'ZEN ASSETS — Tax Optimizer Report',
      'Generated: ' + new Date().toISOString(),
      'Wallet balance: $' + Number(snap.walletBalance || 0).toFixed(2),
      'Trading profit: $' + Number(snap.totalTradingProfit || 0).toFixed(2),
      '',
      'Recent orders',
    ];
    trades.forEach(t => {
      lines.push([t.ts ? new Date(t.ts).toISOString() : '', t.sym || '', t.side || '', t.qty || '', t.pnl || 0].join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zen-tax-report.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return true;
  }

  function nextInsight() {
    const pool = [];
    if (isEnabled('p1')) pool.push({ id: 'p1', icon: 'fa-brain', kind: 'ai', title: 'Sentiment Pro:', text: ' Composite risk appetite is constructive across majors.' });
    if (isEnabled('p2')) pool.push({ id: 'p2', icon: 'fa-water', kind: 'whale', title: 'Whale Tracker:', text: ' Large wallet cluster accumulating BTC on-exchange.' });
    if (isEnabled('p3')) pool.push({ id: 'p3', icon: 'fa-th', kind: 'ai', title: 'Grid Bot:', text: ' Volatility bands recalibrated. Grid spacing tightened 4%.' });
    if (isEnabled('s1')) pool.push({ id: 's1', icon: 'fa-leaf', kind: 'ai', title: 'Yield Optimizer:', text: ' Best idle yield path: USDT money-market at 8.4% APY.' });
    if (isEnabled('s2')) pool.push({ id: 's2', icon: 'fa-globe', kind: 'sec', title: 'Macro Intelligence:', text: ' Next central-bank window is priced as hold, not cut.' });
    if (isEnabled('s3')) pool.push({ id: 's3', icon: 'fa-rss', kind: 'ai', title: 'Social Signals:', text: ' Mentions for SOL rising faster than 30-day baseline.' });
    if (isEnabled('s4')) pool.push({ id: 's4', icon: 'fa-gem', kind: 'ai', title: 'NFT Tracker:', text: ' Blue-chip floors stable. Volume still concentrated.' });
    if (isEnabled('s5')) pool.push({ id: 's5', icon: 'fa-shield', kind: 'sec', title: 'Contract Auditor:', text: ' No critical exploit signature in watched protocols.' });
    if (isEnabled('s6')) pool.push({ id: 's6', icon: 'fa-chart-line', kind: 'ai', title: 'Futures Pro:', text: ' BTC IV rank is mid-range. Defined-risk spreads favored.' });
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function getActive() { return [...active]; }
  function getStore()  { return [...store]; }
  function getEnabledCount() { return active.filter(a => a.enabled).length; }
  function getStoreCount()   { return store.length; }

  return {
    init,
    toggleActive,
    installPlugin,
    uninstallPlugin,
    getActive,
    getStore,
    getEnabledCount,
    getStoreCount,
    isEnabled,
    applyEffects,
    generateTaxReport,
    nextInsight,
  };
})();
