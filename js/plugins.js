/* ════════════════════════════════════════════════════════════
   plugins.js — Plugin Ecosystem Manager
   OmniVest AI / ZEN ASSETS
════════════════════════════════════════════════════════════ */

const Plugins = (() => {
  'use strict';

  // ── Active Plugins ───────────────────────────────────────
  const active = [
    { id: 'p1',  name: 'ZEN Sentiment Pro',   category: 'Analytics', icon: '🧠', iconBg: 'rgba(139,92,246,.2)', iconColor: '#8b5cf6', desc: 'Real-time NLP sentiment from 500+ sources.', rating: 4.9, users: '24.2K', version: '3.2.1', enabled: true,  plan: 'Pro' },
    { id: 'p2',  name: 'Whale Tracker Ultra',  category: 'Market',    icon: '🐋', iconBg: 'rgba(0,212,255,.15)',  iconColor: '#00d4ff', desc: '24/7 on-chain whale wallet surveillance.',  rating: 4.8, users: '18.7K', version: '2.8.0', enabled: true,  plan: 'Pro' },
    { id: 'p3',  name: 'Quantum Grid Bot',     category: 'Strategy',  icon: '⚡', iconBg: 'rgba(0,255,136,.15)', iconColor: '#00ff88', desc: 'Self-calibrating grid with volatility scaling.',rating:4.7, users: '9.3K', version: '1.9.4', enabled: true,  plan: 'Elite' },
    { id: 'p4',  name: 'Tax Optimizer AI',     category: 'Finance',   icon: '💰', iconBg: 'rgba(245,158,11,.15)',iconColor: '#f59e0b', desc: 'Automatic tax-loss harvesting & reporting.', rating: 4.6, users: '15.1K', version: '4.1.0', enabled: false, plan: 'Free' },
  ];

  // ── Store Plugins ─────────────────────────────────────────
  const store = [
    { id: 's1', name: 'DeFi Yield Optimizer', category: 'DeFi',     icon: '🌱', iconBg: 'rgba(0,255,136,.1)', iconColor: '#00ff88', desc: 'Cross-chain yield optimization with auto-compound.', rating: 4.9, users: '42K', version: '2.4.0', price: '$29/mo', installed: false },
    { id: 's2', name: 'Macro Intelligence',    category: 'Research', icon: '🌐', iconBg: 'rgba(0,212,255,.1)', iconColor: '#00d4ff', desc: 'Fed calendar, macro events, central bank analysis.', rating: 4.7, users: '31K', version: '3.0.2', price: '$19/mo', installed: false },
    { id: 's3', name: 'Social Signal Engine',  category: 'Signals',  icon: '📡', iconBg: 'rgba(236,72,153,.1)',iconColor: '#ec4899', desc: 'Twitter/Reddit signal extraction with ML filtering.', rating: 4.5, users: '18K', version: '1.7.3', price: '$39/mo', installed: false },
    { id: 's4', name: 'NFT Market Tracker',    category: 'NFT',      icon: '🎨', iconBg: 'rgba(255,215,0,.1)', iconColor: '#ffd700', desc: 'Floor price alerts, volume & trading insights.',      rating: 4.3, users: '11K', version: '2.1.0', price: '$14/mo', installed: false },
    { id: 's5', name: 'Smart Contract Auditor',category: 'Security', icon: '🔒', iconBg: 'rgba(255,71,87,.1)', iconColor: '#ff4757', desc: 'Real-time exploit detection & rug-pull scanner.',     rating: 4.8, users: '29K', version: '4.0.1', price: '$25/mo', installed: false },
    { id: 's6', name: 'Futures & Options Pro', category: 'Trading',  icon: '📈', iconBg: 'rgba(139,92,246,.1)',iconColor: '#8b5cf6', desc: 'Greeks calculator, IV rank, multi-leg strategies.',   rating: 4.6, users: '22K', version: '5.2.0', price: '$49/mo', installed: false },
  ];

  function toggleActive(id)   { const p = active.find(a => a.id === id); if (p) p.enabled = !p.enabled; }
  function installPlugin(id)  { const s = store.find(a => a.id === id);  if (s) { s.installed = true; active.push({ ...s, enabled: true }); } }
  function uninstallPlugin(id){ const idx = active.findIndex(a => a.id === id); if (idx >= 0) active.splice(idx, 1); const s = store.find(a => a.id === id); if (s) s.installed = false; }

  function getActive() { return [...active]; }
  function getStore()  { return [...store]; }
  function getEnabledCount() { return active.filter(a => a.enabled).length; }
  function getStoreCount()   { return store.length; }

  return { toggleActive, installPlugin, uninstallPlugin, getActive, getStore, getEnabledCount, getStoreCount };
})();
