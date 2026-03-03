/* ════════════════════════════════════════════════════════════
   gamification.js — Streak, XP, Levels, Achievements & Daily Bonus
   OmniVest AI / ZEN ASSETS

   Drives engagement via variable-ratio reward schedules,
   streak mechanics, achievement unlocks, and celebration effects.
════════════════════════════════════════════════════════════ */

const Gamification = (() => {
  'use strict';

  // ── Level Curve ──────────────────────────────────────────
  const LEVELS = [
    { level: 1,  title: 'Rookie Trader',        xpReq: 0,      icon: '🌱', color: '#78909c' },
    { level: 2,  title: 'Market Observer',       xpReq: 100,    icon: '👁️', color: '#66bb6a' },
    { level: 3,  title: 'Chart Reader',          xpReq: 300,    icon: '📊', color: '#42a5f5' },
    { level: 4,  title: 'Signal Hunter',         xpReq: 600,    icon: '🎯', color: '#ab47bc' },
    { level: 5,  title: 'Swing Trader',          xpReq: 1000,   icon: '🏄', color: '#26c6da' },
    { level: 6,  title: 'Alpha Seeker',          xpReq: 1600,   icon: '🐺', color: '#ff7043' },
    { level: 7,  title: 'Risk Master',           xpReq: 2400,   icon: '🛡️', color: '#ffd54f' },
    { level: 8,  title: 'Portfolio Architect',    xpReq: 3500,   icon: '🏗️', color: '#e0e0e0' },
    { level: 9,  title: 'Market Manipulator',     xpReq: 5000,   icon: '🎭', color: '#ef5350' },
    { level: 10, title: 'Quantum Strategist',     xpReq: 7000,   icon: '⚛️', color: '#7c4dff' },
    { level: 11, title: 'Neural Trader',          xpReq: 10000,  icon: '🧠', color: '#00e676' },
    { level: 12, title: 'Hedge Fund Elite',       xpReq: 14000,  icon: '💎', color: '#18ffff' },
    { level: 13, title: 'Market Oracle',          xpReq: 20000,  icon: '🔮', color: '#ea80fc' },
    { level: 14, title: 'Whale Tier',             xpReq: 30000,  icon: '🐋', color: '#448aff' },
    { level: 15, title: 'Legendary Investor',     xpReq: 50000,  icon: '👑', color: '#ffd700' },
  ];

  // ── Achievements ─────────────────────────────────────────
  const ACHIEVEMENTS = {
    first_login:     { id: 'first_login',     title: 'Welcome Aboard',       desc: 'Log in for the first time',           icon: '🚀', xp: 50 },
    first_trade:     { id: 'first_trade',     title: 'First Blood',          desc: 'Execute your first trade',            icon: '⚔️', xp: 75 },
    first_profit:    { id: 'first_profit',    title: 'Money Maker',          desc: 'Close your first profitable trade',   icon: '💵', xp: 100 },
    first_claim:     { id: 'first_claim',     title: 'Fund Controller',      desc: 'Claim earnings for the first time',   icon: '🏦', xp: 50 },
    streak_3:        { id: 'streak_3',        title: 'Getting Started',      desc: 'Maintain a 3-day login streak',       icon: '🔥', xp: 150 },
    streak_7:        { id: 'streak_7',        title: 'Dedicated Trader',     desc: '7-day login streak',                  icon: '🔥', xp: 300 },
    streak_14:       { id: 'streak_14',       title: 'Unstoppable',          desc: '14-day streak — you\'re on fire!',    icon: '🔥', xp: 600 },
    streak_30:       { id: 'streak_30',       title: 'Market Warrior',       desc: '30-day streak — legendary!',          icon: '⚡', xp: 1500 },
    profit_100:      { id: 'profit_100',      title: 'Century Club',         desc: 'Earn $100 in total profits',          icon: '💰', xp: 200 },
    profit_1000:     { id: 'profit_1000',     title: 'Four-Figure Earner',   desc: '$1,000 in total profits',             icon: '💰', xp: 500 },
    profit_10000:    { id: 'profit_10000',    title: 'Five-Figure Elite',    desc: '$10,000 in total profits',            icon: '🏆', xp: 1000 },
    trades_10:       { id: 'trades_10',       title: 'Active Trader',        desc: 'Execute 10 trades',                   icon: '📈', xp: 150 },
    trades_50:       { id: 'trades_50',       title: 'Trade Machine',        desc: '50 trades executed',                  icon: '🤖', xp: 400 },
    trades_100:      { id: 'trades_100',      title: 'Trading Addict',       desc: '100 trades — can\'t stop!',           icon: '🎰', xp: 750 },
    auto_trader:     { id: 'auto_trader',     title: 'AI Unleashed',         desc: 'Enable the Auto Trader',              icon: '🤖', xp: 100 },
    copy_trader:     { id: 'copy_trader',     title: 'Social Investor',      desc: 'Start copy trading',                  icon: '👥', xp: 100 },
    daily_bonus:     { id: 'daily_bonus',     title: 'Lucky Spin',           desc: 'Claim your daily bonus',              icon: '🎰', xp: 50 },
    night_owl:       { id: 'night_owl',       title: 'Night Owl',            desc: 'Trade between midnight and 5 AM',     icon: '🦉', xp: 100 },
    balance_10k:     { id: 'balance_10k',     title: 'Five Figures',         desc: 'Reach $10,000 wallet balance',        icon: '💎', xp: 500 },
    balance_100k:    { id: 'balance_100k',    title: 'Six Figures',          desc: 'Reach $100,000 wallet balance',       icon: '👑', xp: 2000 },
    claim_all:       { id: 'claim_all',       title: 'Sweep King',           desc: 'Use Claim All 5 times',               icon: '🧹', xp: 200 },
  };

  // ── Daily Bonus Rewards ──────────────────────────────────
  const DAILY_BONUSES = [
    { label: '25 XP',       xp: 25,  color: '#78909c' },
    { label: '50 XP',       xp: 50,  color: '#66bb6a' },
    { label: '100 XP',      xp: 100, color: '#42a5f5' },
    { label: '75 XP',       xp: 75,  color: '#ffb74d' },
    { label: '200 XP 🎉',   xp: 200, color: '#ab47bc' },
    { label: '150 XP',      xp: 150, color: '#26c6da' },
    { label: '50 XP',       xp: 50,  color: '#ef5350' },
    { label: '500 XP 🔥',   xp: 500, color: '#ffd700' },
  ];

  // ── State ────────────────────────────────────────────────
  let state = {
    xp: 0,
    level: 1,
    totalXpEarned: 0,
    streak: 0,
    longestStreak: 0,
    lastLoginDate: null,       // YYYY-MM-DD
    dailyBonusClaimed: false,
    dailyBonusDate: null,
    achievements: [],          // array of achievement ids
    tradeCount: 0,
    profitTotal: 0,
    claimAllCount: 0,
    createdAt: null,
  };

  let STORAGE_KEY = 'zen_gamification_state';
  const subscribers = {};

  // ── Per-User Storage ─────────────────────────────────────
  function _getUserKey() {
    try {
      if (typeof UserAuth !== 'undefined') {
        const session = UserAuth.getSession();
        if (session && session.email) return 'zen_gamification_' + session.email.toLowerCase();
      }
    } catch (e) { /* fallback */ }
    return 'zen_gamification_state';
  }

  // ── Initialize ───────────────────────────────────────────
  function init() {
    STORAGE_KEY = _getUserKey();
    loadState();

    if (!state.createdAt) state.createdAt = Date.now();

    // Check streak
    const today = _todayStr();
    if (state.lastLoginDate !== today) {
      const yesterday = _dateStr(new Date(Date.now() - 86400000));
      if (state.lastLoginDate === yesterday) {
        state.streak += 1;
      } else if (state.lastLoginDate) {
        state.streak = 1;
      } else {
        state.streak = 1;
      }
      if (state.streak > state.longestStreak) state.longestStreak = state.streak;
      state.lastLoginDate = today;
      state.dailyBonusClaimed = false;
      state.dailyBonusDate = null;
      saveState();

      // Streak achievements
      if (state.streak >= 3)  unlockAchievement('streak_3');
      if (state.streak >= 7)  unlockAchievement('streak_7');
      if (state.streak >= 14) unlockAchievement('streak_14');
      if (state.streak >= 30) unlockAchievement('streak_30');
    }

    // First login achievement
    unlockAchievement('first_login');

    // Night owl check
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5) unlockAchievement('night_owl');

    saveState();
    console.log(`🎮 Gamification loaded — Level ${state.level} | ${state.xp} XP | ${state.streak}-day streak`);
  }

  function loadForUser() {
    STORAGE_KEY = _getUserKey();
    loadState();
    init();
  }

  // ── XP System ────────────────────────────────────────────
  function addXP(amount, reason = '') {
    if (!amount || amount <= 0) return;

    // Streak multiplier: +10% per streak day (max 3x)
    const streakMultiplier = Math.min(3, 1 + (state.streak * 0.1));
    const baseXP = amount;
    const earnedXP = Math.round(amount * streakMultiplier);

    state.xp += earnedXP;
    state.totalXpEarned += earnedXP;
    saveState();

    // Check level up
    const oldLevel = state.level;
    const newLevel = _computeLevel(state.xp);
    if (newLevel > oldLevel) {
      state.level = newLevel;
      saveState();
      const lvl = LEVELS[newLevel - 1] || LEVELS[LEVELS.length - 1];
      emit('levelUp', { level: newLevel, title: lvl.title, icon: lvl.icon, color: lvl.color });
    }

    emit('xpGain', { base: baseXP, earned: earnedXP, multiplier: streakMultiplier, reason, total: state.xp });
    return earnedXP;
  }

  function _computeLevel(xp) {
    let lvl = 1;
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (xp >= LEVELS[i].xpReq) { lvl = LEVELS[i].level; break; }
    }
    return lvl;
  }

  // ── Achievements ─────────────────────────────────────────
  function unlockAchievement(id) {
    if (!ACHIEVEMENTS[id]) return;
    if (state.achievements.includes(id)) return;

    state.achievements.push(id);
    const a = ACHIEVEMENTS[id];
    addXP(a.xp, `Achievement: ${a.title}`);
    saveState();
    emit('achievement', a);
    return a;
  }

  function hasAchievement(id) {
    return state.achievements.includes(id);
  }

  // ── Trade Tracking (called from app.js) ──────────────────
  function trackTrade() {
    state.tradeCount += 1;
    addXP(15, 'Trade executed');
    if (state.tradeCount === 1)  unlockAchievement('first_trade');
    if (state.tradeCount >= 10)  unlockAchievement('trades_10');
    if (state.tradeCount >= 50)  unlockAchievement('trades_50');
    if (state.tradeCount >= 100) unlockAchievement('trades_100');
    saveState();
  }

  function trackProfit(amount) {
    if (amount <= 0) return;
    state.profitTotal += amount;
    addXP(Math.round(amount * 0.5), 'Trading profit');
    if (!hasAchievement('first_profit')) unlockAchievement('first_profit');
    if (state.profitTotal >= 100)   unlockAchievement('profit_100');
    if (state.profitTotal >= 1000)  unlockAchievement('profit_1000');
    if (state.profitTotal >= 10000) unlockAchievement('profit_10000');
    saveState();
  }

  function trackClaim() {
    if (!hasAchievement('first_claim')) unlockAchievement('first_claim');
    addXP(10, 'Fund claimed');
  }

  function trackClaimAll() {
    state.claimAllCount += 1;
    if (state.claimAllCount >= 5) unlockAchievement('claim_all');
    addXP(25, 'Claim All');
    saveState();
  }

  function trackAutoTrader() { unlockAchievement('auto_trader'); }
  function trackCopyTrader() { unlockAchievement('copy_trader'); }

  function checkBalanceAchievements(balance) {
    if (balance >= 10000)  unlockAchievement('balance_10k');
    if (balance >= 100000) unlockAchievement('balance_100k');
  }

  // ── Daily Bonus ──────────────────────────────────────────
  function claimDailyBonus() {
    const today = _todayStr();
    if (state.dailyBonusClaimed && state.dailyBonusDate === today) {
      return { success: false, reason: 'Already claimed today' };
    }

    // Weighted random — bigger rewards are rarer
    const weights = [25, 25, 15, 15, 5, 8, 5, 2]; // last one (500 XP) is 2% chance
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let rand = Math.random() * totalWeight;
    let rewardIdx = 0;
    for (let i = 0; i < weights.length; i++) {
      rand -= weights[i];
      if (rand <= 0) { rewardIdx = i; break; }
    }

    const reward = DAILY_BONUSES[rewardIdx];
    const earned = addXP(reward.xp, 'Daily Bonus');

    state.dailyBonusClaimed = true;
    state.dailyBonusDate = today;
    saveState();

    if (!hasAchievement('daily_bonus')) unlockAchievement('daily_bonus');

    emit('dailyBonus', { reward, earned });
    return { success: true, reward, earned };
  }

  function canClaimDailyBonus() {
    const today = _todayStr();
    return !(state.dailyBonusClaimed && state.dailyBonusDate === today);
  }

  // ── Snapshot for UI ──────────────────────────────────────
  function getSnapshot() {
    const lvl = LEVELS[state.level - 1] || LEVELS[0];
    const nextLvl = LEVELS[state.level] || null;
    const xpInLevel = state.xp - lvl.xpReq;
    const xpForNext = nextLvl ? (nextLvl.xpReq - lvl.xpReq) : 1;
    const progressPct = nextLvl ? Math.min(100, (xpInLevel / xpForNext) * 100) : 100;

    return {
      level: state.level,
      title: lvl.title,
      icon: lvl.icon,
      color: lvl.color,
      xp: state.xp,
      totalXpEarned: state.totalXpEarned,
      xpInLevel,
      xpForNext,
      progressPct,
      nextLevel: nextLvl ? { level: nextLvl.level, title: nextLvl.title, icon: nextLvl.icon, xpReq: nextLvl.xpReq } : null,
      streak: state.streak,
      longestStreak: state.longestStreak,
      streakMultiplier: Math.min(3, 1 + (state.streak * 0.1)),
      achievements: state.achievements.map(id => ACHIEVEMENTS[id]).filter(Boolean),
      achievementCount: state.achievements.length,
      totalAchievements: Object.keys(ACHIEVEMENTS).length,
      tradeCount: state.tradeCount,
      profitTotal: state.profitTotal,
      canClaimDaily: canClaimDailyBonus(),
    };
  }

  // ── Confetti Effect ──────────────────────────────────────
  function launchConfetti(options = {}) {
    const count = options.count || 80;
    const duration = options.duration || 2500;
    const colors = options.colors || ['#00e676', '#ffd700', '#ff4081', '#448aff', '#e040fb', '#00e5ff', '#ffab40'];

    const container = document.createElement('div');
    container.className = 'gm-confetti-container';
    container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999;overflow:hidden;';
    document.body.appendChild(container);

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 8 + 4;
      const startX = Math.random() * 100;
      const drift = (Math.random() - 0.5) * 200;
      const rotEnd = Math.random() * 720 - 360;
      const delay = Math.random() * 600;
      const shape = Math.random() > 0.5 ? '50%' : (Math.random() > 0.5 ? '0%' : '2px');

      particle.style.cssText = `
        position:absolute;top:-12px;left:${startX}%;
        width:${size}px;height:${size * 0.6}px;
        background:${color};border-radius:${shape};
        opacity:1;
        animation:gmConfettiFall ${duration}ms ${delay}ms ease-in forwards;
        --drift:${drift}px;--rot:${rotEnd}deg;
      `;
      container.appendChild(particle);
    }

    setTimeout(() => container.remove(), duration + 800);
  }

  // ── Celebration Toast ────────────────────────────────────
  function showCelebration(title, subtitle, icon, color) {
    const el = document.createElement('div');
    el.className = 'gm-celebration';
    el.innerHTML = `
      <div class="gm-celeb-icon" style="color:${color}">${icon}</div>
      <div class="gm-celeb-text">
        <div class="gm-celeb-title">${title}</div>
        <div class="gm-celeb-sub">${subtitle}</div>
      </div>
    `;
    document.body.appendChild(el);

    requestAnimationFrame(() => el.classList.add('gm-celeb-show'));
    setTimeout(() => {
      el.classList.remove('gm-celeb-show');
      el.classList.add('gm-celeb-hide');
      setTimeout(() => el.remove(), 500);
    }, 3500);
  }

  // ── Animated Counter ─────────────────────────────────────
  function animateCounter(el, from, to, duration = 1200, prefix = '$', decimals = 2) {
    if (!el) return;
    const start = performance.now();
    const diff = to - from;

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + diff * eased;
      el.textContent = prefix + current.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ── XP Floating Text ────────────────────────────────────
  function showFloatingXP(amount, x, y) {
    const el = document.createElement('div');
    el.className = 'gm-floating-xp';
    el.textContent = `+${amount} XP`;
    el.style.left = (x || (window.innerWidth / 2)) + 'px';
    el.style.top = (y || 100) + 'px';
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('gm-float-go'));
    setTimeout(() => el.remove(), 1500);
  }

  // ── Persistence ──────────────────────────────────────────
  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* */ }
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        state = { ...state, ...parsed };
        state.level = _computeLevel(state.xp);
      }
    } catch (e) { console.warn('Gamification load error:', e); }
  }

  // ── Date Helpers ─────────────────────────────────────────
  function _todayStr() { return _dateStr(new Date()); }
  function _dateStr(d) { return d.toISOString().slice(0, 10); }

  // ── Events ───────────────────────────────────────────────
  function on(event, fn) { if (!subscribers[event]) subscribers[event] = []; subscribers[event].push(fn); }
  function emit(event, data) { (subscribers[event] || []).forEach(fn => { try { fn(data); } catch (e) { console.error(e); } }); }

  function saveAndDisconnect() { saveState(); }

  // ── Public API ───────────────────────────────────────────
  return {
    init,
    loadForUser,
    saveAndDisconnect,
    getSnapshot,
    addXP,
    unlockAchievement,
    hasAchievement,
    trackTrade,
    trackProfit,
    trackClaim,
    trackClaimAll,
    trackAutoTrader,
    trackCopyTrader,
    checkBalanceAchievements,
    claimDailyBonus,
    canClaimDailyBonus,
    launchConfetti,
    showCelebration,
    animateCounter,
    showFloatingXP,
    on,
    ACHIEVEMENTS,
    LEVELS,
  };
})();
