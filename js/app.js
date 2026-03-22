/* ════════════════════════════════════════════════════════════
   app.js — Main Application Controller
   OmniVest AI / ZEN ASSETS
════════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════
   AUTHMANAGER — Dedicated Authentication Flow Manager
   Handles login/register view switching with strong logic
════════════════════════════════════════════════════════════ */
const AuthManager = (() => {
  'use strict';

  let currentView = 'login'; // Track which view is active

  /**
   * Switch between login and register views
   * @param {string} viewName - 'login' or 'register'
   */
  function switchView(viewName) {
    const loginScreen    = document.getElementById('login-screen');
    const registerOverlay = document.getElementById('register-overlay');
    const topNav         = document.querySelector('.login-top-nav');

    // ── Reset both modals ──
    if (loginScreen)     loginScreen.classList.remove('show-login-modal');
    if (registerOverlay) {
      registerOverlay.classList.remove('visible');
      // Clear any legacy inline styles from old code
      registerOverlay.removeAttribute('style');
    }
    if (topNav) topNav.classList.remove('view-login', 'view-register');

    currentView = viewName;

    if (viewName === 'register') {
      // ── Open Register Modal ──
      if (registerOverlay) registerOverlay.classList.add('visible');
      if (topNav) topNav.classList.add('view-register');
      // Focus first field
      setTimeout(() => {
        const f = document.getElementById('reg-name');
        if (f) f.focus();
      }, 120);
      console.log('📝 AUTH: Register modal opened');
    } else {
      // ── Open Auth Portal (full-page, separate from landing) ──
      if (loginScreen) loginScreen.classList.add('auth-mode');
      if (topNav) topNav.classList.add('view-login');
      // Focus email
      setTimeout(() => {
        const f = document.getElementById('login-email');
        if (f) f.focus();
      }, 120);
      console.log('🔐 AUTH: Auth portal opened');
    }

    // Keep inline tabs in sync
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.authView === viewName);
    });
  }

  function closeAllModals() {
    const loginScreen = document.getElementById('login-screen');
    const registerOverlay = document.getElementById('register-overlay');
    if (loginScreen) {
      loginScreen.classList.remove('auth-mode');
      loginScreen.classList.remove('show-login-modal'); // legacy safety
    }
    if (registerOverlay) {
      registerOverlay.classList.remove('visible');
      registerOverlay.removeAttribute('style');
    }
    currentView = null;
    const topNav = document.querySelector('.login-top-nav');
    if (topNav) topNav.classList.remove('view-login', 'view-register');
  }

  /**
   * Get current active view
   */
  function getCurrentView() {
    return currentView;
  }

  /**
   * Initialize AuthManager on page load
   */
  function init() {
    // Set up tab click handlers
    const tabs = document.querySelectorAll('.auth-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const view = tab.dataset.authView;
        switchView(view);
      });
    });
    
    console.log('✅ AuthManager initialized with view switching');
  }

  // Public API
  return {
    switchView,
    closeAllModals,
    getCurrentView,
    init,
  };
})();


// ── Login mode toggle (password vs PIN) ──────────────────
let _loginMode = 'password'; // 'password' | 'pin'
function switchLoginMode(mode) {
  _loginMode = mode;
  const pwGroup  = document.getElementById('login-password-group');
  const pinGroup = document.getElementById('login-pin-group');
  const tabPw    = document.getElementById('tab-password');
  const tabPin   = document.getElementById('tab-pin');
  const pwInput  = document.getElementById('login-password');
  const pinInput = document.getElementById('login-pin');

  if (mode === 'pin') {
    if (pwGroup)  pwGroup.style.display  = 'none';
    if (pinGroup) pinGroup.style.display = '';
    if (tabPw)  tabPw.classList.remove('active');
    if (tabPin) tabPin.classList.add('active');
    if (pwInput)  { pwInput.required = false; pwInput.value = ''; }
    if (pinInput) { pinInput.required = true; pinInput.focus(); }
  } else {
    if (pwGroup)  pwGroup.style.display  = '';
    if (pinGroup) pinGroup.style.display = 'none';
    if (tabPw)  tabPw.classList.add('active');
    if (tabPin) tabPin.classList.remove('active');
    if (pwInput) pwInput.required = true;
    if (pinInput) { pinInput.required = false; pinInput.value = ''; }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { AuthManager.init(); });
} else {
  AuthManager.init();
}

const App = (() => {
  'use strict';

  // ── Utils ─────────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);
  const fmt = (n, decimals = 2) => { const v = parseFloat(n); return isNaN(v) ? '0.00' : v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }); };
  const fmtPx = px => px > 1000 ? fmt(px, 2) : px > 1 ? fmt(px, 4) : fmt(px, 6);
  const clsPnl = v => v >= 0 ? 'up' : 'down';
  const signPnl = v => v >= 0 ? '+' : '';
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  // ── State ─────────────────────────────────────────────────
  let _sym     = 'BTC';
  let _section = 'dashboard';
  let _termSym = 'BTC';
  let _anlSym  = 'ETH';
  let _chartTF = '5m';
  let _marketFilter = 'all';
  let _confThreshold = 60;
  let _activeOrderType = 'market';

  // ── Boot Screen ───────────────────────────────────────────
  function runBoot() {
    const progress = $('loader-fill');
    const status   = $('loader-label');
    let pct = 0;

    const MSGS = [
      'INITIALIZING QUANTUM CORE...',
      'CONNECTING NEURAL NETWORKS...',
      'LOADING MARKET DATA FEEDS...',
      'CALIBRATING AI MODELS...',
      'ESTABLISHING SECURE TUNNEL...',
      'MOUNTING ASSET UNIVERSE...',
      'SYSTEM READY — WELCOME TO ZEN',
    ];

    animBootCounter('bm-nodes',  0, 2048,   1800);
    animBootCounter('bm-lat',    0, 12,     1600, 'ms');
    animBootCounter('bm-ai',     0, 4,      1200);
    animBootCounter('bm-mkt',    0, 27,     1400);

    const iv = setInterval(() => {
      pct += (100 - pct) * 0.035 + 0.8;
      if (pct >= 100) pct = 100;
      if (progress) progress.style.width = pct + '%';
      const idx = Math.min(MSGS.length - 1, Math.floor((pct / 100) * MSGS.length));
      if (status) status.textContent = MSGS[idx];
      if (pct >= 100) {
        clearInterval(iv);
        setTimeout(showApp, 600);
      }
    }, 80);
  }

  function animBootCounter(id, from, to, dur, suffix = '') {
    const el = $(id); if (!el) return;
    const start = performance.now();
    const raf = ts => {
      const p = Math.min(1, (ts - start) / dur);
      el.textContent = Math.floor(from + (to - from) * p) + suffix;
      if (p < 1) requestAnimationFrame(raf);
      else el.textContent = to + suffix;
    };
    requestAnimationFrame(raf);
  }

  function showApp() {
    const loading = $('loading-screen');
    if (loading) {
      loading.style.opacity = '0';
      loading.style.pointerEvents = 'none';
      setTimeout(() => { loading.style.display = 'none'; }, 600);
    }
    const app = $('app');
    if (app) app.classList.add('app-visible');
    startClock();
    try { initData(); } catch(e) { console.error('initData error:', e); }
    initCharts();
    try { initAllSections(); } catch(e) { console.error('initAllSections error:', e); }
    try { startLiveFeed(); } catch(e) { console.error('startLiveFeed error:', e); }
    try { startLiveNotifications(); } catch(e) { console.error('startLiveNotifications error:', e); }
  }

  // ── Boot Canvas Particles ─────────────────────────────────
  const _isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth < 768;
  function initBootCanvas() {
    // Skip particles entirely on mobile — saves GPU during boot
    if (_isMobile) return;
    const c = $('boot-canvas'); if (!c) return;
    const ctx = c.getContext('2d');
    c.width = window.innerWidth; c.height = window.innerHeight;
    const ptcls = Array.from({ length: 30 }, () => ({ x: Math.random() * c.width, y: Math.random() * c.height, vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4, r: Math.random() * 1.5 + .5, a: Math.random() }));
    let running = true;
    const draw = () => {
      if (!running) return;
      ctx.clearRect(0, 0, c.width, c.height);
      ptcls.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.a = 0.4 + Math.sin(Date.now() * 0.002 + p.r) * 0.3;
        if (p.x < 0) p.x = c.width; if (p.x > c.width) p.x = 0;
        if (p.y < 0) p.y = c.height; if (p.y > c.height) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,212,255,${p.a})`; ctx.fill();
      });
      requestAnimationFrame(draw);
    };
    draw();
    const stopBoot = () => { running = false; ctx.clearRect(0, 0, c.width, c.height); };
    setTimeout(stopBoot, 3000);
  }

  // ── Cursor Trail — DISABLED (clean professional UI) ───
  // function startCursorTrail() { /* removed */ }

  // ── Clock ─────────────────────────────────────────────────
  function startClock() {
    const updateClock = () => {
      const now = new Date();
      const timeEl = $('hdr-time'); const dateEl = $('hdr-date');
      if (timeEl) timeEl.textContent = now.toLocaleTimeString('en-US', { hour12: false });
      if (dateEl) dateEl.textContent = now.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
    };
    updateClock();
    setInterval(updateClock, 1000);
  }

  // ── Init Data Engines ─────────────────────────────────────
  function initData() {
    MarketData.init();
    
    // Initialize real data integration (WebSocket + REST)
    if (typeof RealDataAdapter !== 'undefined') {
      RealDataAdapter.init();
      console.log('🔥 Real market data integration ACTIVE');
    }
    
    // Initialize smart exit engine
    if (typeof SmartExitEngine !== 'undefined') {
      SmartExitEngine.init();
      console.log('🎯 Smart profit-taking engine ACTIVE');
    }
    
    // Initialize investment returns engine FIRST (wallet + tier compounding)
    // Must be before AutoTrader so balance checks work on first evaluation
    if (typeof InvestmentReturns !== 'undefined') {
      InvestmentReturns.init();
      console.log('💰 Investment returns engine ACTIVE');
      
      // Update returns UI every 5 seconds
      setInterval(() => {
        updateReturnsUI();
        updateFundManagerUI();
      }, 5000);

      // Periodically re-read localStorage to pick up admin funding changes
      setInterval(() => {
        if (InvestmentReturns.reloadFromStorage && InvestmentReturns.reloadFromStorage()) {
          updateReturnsUI();
          updateFundManagerUI();
        }
      }, 4000);

      // Also re-sync when window regains focus (user switches back from admin tab)
      window.addEventListener('focus', () => {
        if (typeof InvestmentReturns !== 'undefined' && InvestmentReturns.reloadFromStorage) {
          if (InvestmentReturns.reloadFromStorage()) {
            updateReturnsUI();
            updateFundManagerUI();
            console.log('🔄 Balance synced on window focus');
          }
        }
      });

      // When admin funds an account (balance $0 → funded), immediately kick-start AutoTrader
      InvestmentReturns.on('reload', (snapshot) => {
        if (typeof AutoTrader === 'undefined') return;
        if (snapshot && snapshot.walletBalance > 0) {
          if (!AutoTrader.isRunning()) {
            console.log('🚀 Balance funded — starting AutoTrader immediately');
            AutoTrader.start();
          }
          // Fire an immediate trade evaluation so first trade happens within seconds
          setTimeout(() => AutoTrader.evaluateAndTrade(), 1500);
        }
      });
    }

    // Initialize auto-trader (autonomous trading system)
    // Runs AFTER InvestmentReturns so balance is available on first trade check
    if (typeof AutoTrader !== 'undefined') {
      AutoTrader.init();
      // Immediately render trade history (don't wait for interval)
      AutoTrader.updateTradeHistoryDisplay();
      console.log('🤖 Autonomous trading system ACTIVE');
      // Gamification: track auto-trader activation
      if (typeof Gamification !== 'undefined') Gamification.trackAutoTrader();
    }

    // Initialize gamification engine (streaks, XP, achievements)
    if (typeof Gamification !== 'undefined') {
      Gamification.init();
      console.log('🎮 Gamification engine ACTIVE');

      // Listen for level-ups
      Gamification.on('levelUp', (data) => {
        Gamification.launchConfetti({ count: 120, duration: 3000 });
        Gamification.showCelebration(`LEVEL ${data.level}!`, data.title, data.icon, data.color);
        if (typeof App !== 'undefined' && App.addNotification) {
          App.addNotification('fa-star', 'ai', 'Level Up!', ` You reached Level ${data.level}: ${data.title} ${data.icon}`);
        }
      });

      // Listen for achievements
      Gamification.on('achievement', (a) => {
        Gamification.launchConfetti({ count: 50, duration: 1800, colors: ['#ffd700', '#ff4081', '#00e676'] });
        Gamification.showCelebration('Achievement Unlocked!', `${a.title} — ${a.desc}`, a.icon, '#ffd700');
        if (typeof App !== 'undefined' && App.addNotification) {
          App.addNotification('fa-trophy', 'ai', 'Achievement:', ` ${a.icon} ${a.title} — +${a.xp} XP`);
        }
      });

      // Listen for daily bonus
      Gamification.on('dailyBonus', (data) => {
        Gamification.launchConfetti({ count: 60, duration: 2000 });
        Gamification.showCelebration('Daily Bonus!', `You earned ${data.reward.label}!`, '🎁', data.reward.color);
      });

      // Update gamification UI every 3 seconds
      setInterval(updateGamificationUI, 3000);
      updateGamificationUI();
    }
    
    AIEngine.init();
    buildTicker();
    updateMarketPulseBar();
    updateFearGreed();
  }

  // ── Ticker ────────────────────────────────────────────────
  function buildTicker() {
    const track = $('ticker-track'); if (!track) return;
    const snap = MarketData.getTickerSnapshot();
    const html = snap.map(t => {
      const cls = t.pct >= 0 ? 'up' : 'down';
      return `<span class="ticker-item ${cls}"><b>${t.sym}</b><span>${t.pct >= 0 ? '+' : ''}${t.pct.toFixed(2)}%</span></span>`;
    }).join('');
    track.innerHTML = html + html; // duplicate for seamless scroll
  }

  // ── Market Pulse Bar ──────────────────────────────────────
  function updateMarketPulseBar() {
    const IDS = { BTC: 'mpb-btc', ETH: 'mpb-eth', SPX: 'mpb-spx', GOLD: 'mpb-gold' };
    Object.entries(IDS).forEach(([id, elId]) => {
      const el = $(elId); if (!el) return;
      const a = MarketData.getAsset(id);
      if (!a) return;
      const chgCls = a.pct24h >= 0 ? 'up' : 'down';
      el.querySelector('.mpb-price').textContent = `$${fmtPx(a.price)}`;
      const chgEl = el.querySelector('.mpb-chg');
      if (chgEl) { chgEl.textContent = `${signPnl(a.pct24h)}${a.pct24h.toFixed(2)}%`; chgEl.className = `mpb-chg ${chgCls}`; }
    });
  }

  // ── Fear & Greed ──────────────────────────────────────────
  function updateFearGreed() {
    const el = $('fg-val'); if (!el) return;
    const fg = MarketData.getFearGreed();
    el.textContent = `${fg.value} ${fg.label}`;
    el.className = fg.value > 60 ? 'up' : fg.value < 40 ? 'down' : '';
  }

  // ── Sidebar Nav ───────────────────────────────────────────
  function initNav() {
    // Direct click handlers on each nav item
    $$('.nav-item[data-section]').forEach(item => {
      item.addEventListener('click', () => navigate(item.dataset.section));
    });
    const sidebarToggle = $('sidebar-toggle');
    const sidebar       = $('sidebar');
    if (sidebarToggle && sidebar) {
      sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
    }

    // BULLETPROOF: Event delegation on sidebar (catches clicks even if direct handlers fail)
    const sidebarNav = document.querySelector('#sidebar .sidebar-nav');
    if (sidebarNav && !sidebarNav._zenDelegated) {
      sidebarNav._zenDelegated = true;
      sidebarNav.addEventListener('click', (e) => {
        const navItem = e.target.closest('.nav-item[data-section]');
        if (navItem && navItem.dataset.section) {
          navigate(navItem.dataset.section);
        }
      });
    }
  }

  function navigate(name) {
    _section = name;
    $$('.content-section').forEach(s => s.classList.remove('active'));
    $$('.nav-item').forEach(i  => i.classList.remove('active'));
    const sec = $(`section-${name}`);
    if (sec) sec.classList.add('active');
    const nav = document.querySelector(`.nav-item[data-section="${name}"]`);
    if (nav) nav.classList.add('active');

    // Scroll main content area to top
    const mc = $('main-content');
    if (mc) mc.scrollTop = 0;

    // Section-specific re-renders (try-catch each to prevent cascade failure)
    try {
      if (name === 'markets')      renderMarketsTable();
      if (name === 'ai-engine')    renderAIEngine();
      if (name === 'portfolio')    renderPortfolio();
      if (name === 'trading')      renderTrading();
      if (name === 'analytics')    renderAnalytics();
      if (name === 'signals')      renderSignals();
      if (name === 'plugins')      renderPlugins();
      if (name === 'transparency') renderTransparency();
      if (name === 'security')     renderSecurity();
      if (name === 'buy-crypto')   initBuyCryptoAnimations();
      if (name === 'dashboard')    { refreshDashboardCharts(); renderDashCopyTraders(); }
    } catch(e) { console.error('Section render error:', e); }

    // Update mobile bottom nav active state
    _updateMobileNavActive(name);
  }

  // ── Mobile Bottom Navigation ─────────────────────────────
  function initMobileNav() {
    // Bottom nav items
    $$('.mbn-item[data-section]').forEach(item => {
      item.addEventListener('click', () => navigate(item.dataset.section));
    });

    // "More" button opens slide-up menu
    const moreBtn = $('mbn-more-btn');
    const moreMenu = $('mobile-more-menu');
    if (moreBtn && moreMenu) {
      moreBtn.addEventListener('click', () => moreMenu.classList.add('open'));
    }

    // More menu items navigate & close menu
    $$('.mmm-item[data-section]').forEach(item => {
      item.addEventListener('click', () => {
        navigate(item.dataset.section);
        const moreMenu = $('mobile-more-menu');
        if (moreMenu) moreMenu.classList.remove('open');
      });
    });
  }

  function _updateMobileNavActive(section) {
    $$('.mbn-item').forEach(item => {
      item.classList.toggle('active', item.dataset.section === section);
    });
  }

  // ── Buy Crypto Hub ───────────────────────────────────────
  function initBuyCryptoAnimations() {
    // Stagger card entrance
    const cards = document.querySelectorAll('.bch-card');
    cards.forEach((c, i) => {
      c.style.opacity = '0'; c.style.transform = 'translateY(20px)';
      setTimeout(() => {
        c.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        c.style.opacity = '1'; c.style.transform = 'translateY(0)';
      }, 80 * i);
    });
  }

  window.filterBuyCrypto = (cat, btn) => {
    document.querySelectorAll('.bch-filter').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    document.querySelectorAll('.bch-card').forEach(card => {
      if (cat === 'all') { card.style.display = ''; return; }
      const cats = (card.dataset.bchCat || '').split(' ');
      card.style.display = cats.includes(cat) ? '' : 'none';
    });
  };

  // ── Current active timeframe tracker ─────────────────────
  let _activeTimeframe = '5m';

  // ── Init Charts ───────────────────────────────────────────
  async function initCharts() {
    const symbol = _sym;

    // ── Destroy any stale chart instance first ──────────────
    if (typeof AdvancedChartEngine !== 'undefined') {
      try { AdvancedChartEngine.destroy('main-price-chart'); } catch {}
    }

    // ── Wait for two animation frames ──────────────────────
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    // ── Create chart (renders simulated data instantly, upgrades to real in background) ──
    try {
      if (typeof AdvancedChartEngine !== 'undefined') {
        await AdvancedChartEngine.createLightweightChart('main-price-chart', symbol, _activeTimeframe);
      } else {
        await ChartEngine.createCandlestickChart('main-price-chart', [], symbol, _activeTimeframe);
      }
    } catch (e) {
      console.error('[initCharts] chart creation failed:', e.message);
    }

    // Sentiment gauge
    ChartEngine.createSentimentGauge('sentiment-gauge', 67);

    // Allocation donut
    const portMetrics = Portfolio.computeMetrics();
    ChartEngine.createAllocationChart('alloc-donut', portMetrics.alloc);
    updateAllocTotal(portMetrics.totalValue);

    // Dash KPIs
    updateDashKPIs(portMetrics);
    updateReturnsUI();
    updateFundManagerUI();
    renderWhaleAlerts();
    renderSignalsMini(AIEngine.getSignals().slice(0, 6));
    renderAssetClassGrid();
    renderDashCopyTraders();
    updateChartStats(_sym);
  }

  // ── All Sections Init ────────────────────────────────────
  function initAllSections() {
    initNav();
    initMobileNav();
    initSearchOverlay();
    initNotifPanel();
    initOrderForm();
    initMarketControls();
    initTerminalControls();
    initAnalyticsControls();
    initSignalControls();
    initHeader();
    updateAIOrb();
  }

  // ── Dashboard KPIs ────────────────────────────────────────
  function updateDashKPIs(m) {
    // Portfolio value & PnL now wallet-anchored from computeMetrics()
    let dailyPnL = m.todayPnL || m.totalPnL * 0.03;
    let dailySub = "Today's return";
    
    if (typeof InvestmentReturns !== 'undefined') {
      const snap = InvestmentReturns.getSnapshot();
      dailyPnL = snap.todayPnL;
      dailySub = `${snap.tierIcon} ${snap.tierLabel} · ${snap.tierAPY} APY`;
      
      // Wallet balance KPI (claimed funds only)
      setText('kpi-wallet-balance', `$${fmt(snap.walletBalance, 2)}`);
      setText('kpi-wallet-tier', `${snap.tierIcon} ${snap.tierLabel} Tier · ${snap.tierAPY}`);
    }
    
    setText('kpi-port-value', `$${fmt(m.totalValue, 0)}`);
    setText('kpi-port-pnl',   `${signPnl(m.totalPnL)}$${fmt(Math.abs(m.totalPnL), 0)} (${signPnl(m.totalPct)}${m.totalPct}%)`);
    setClass('kpi-port-pnl', clsPnl(m.totalPnL));

    // Portfolio Health Score
    const health = Portfolio.getHealthScore(m);
    setText('kpi-health-score', `${health.grade}`);
    setText('kpi-health-value', `${health.score}/100`);
    const healthEl = $('kpi-health-score');
    if (healthEl) healthEl.style.color = health.color;

    // Live win rate from AutoTrader
    let winRateStr = '73.2%';
    let tradeCountStr = '';
    let sessionPnLStr = '';
    if (typeof AutoTrader !== 'undefined') {
      const atStats = AutoTrader.getStatistics();
      if (atStats.totalTrades > 0) {
        winRateStr = `${atStats.winRate.toFixed(1)}%`;
        tradeCountStr = `${atStats.totalTrades} trades`;
        sessionPnLStr = `${atStats.totalPnL >= 0 ? '+' : ''}$${fmt(Math.abs(atStats.totalPnL), 2)}`;
      }
    }
    setText('kpi-win-rate',   winRateStr);
    setText('kpi-ai-signals', `${AIEngine.getSignals().length}`);
    setText('kpi-sharpe',     m.sharpe.toFixed(2));
    setText('kpi-max-dd',     `Max DD: -${m.maxDD}%`);
    setText('kpi-daily-pnl',  `${signPnl(dailyPnL)}$${fmt(Math.abs(dailyPnL), 2)}`);
    setText('kpi-daily-sub',  dailySub);
    
    // Session trading performance (under win rate KPI)
    setText('kpi-trade-count', tradeCountStr);
    setText('kpi-session-pnl', sessionPnLStr);
    if (sessionPnLStr) setClass('kpi-session-pnl', sessionPnLStr.startsWith('+') ? 'up' : 'down');
    setClass('kpi-daily-pnl', clsPnl(dailyPnL));
    const regime = AIEngine.getRegime();
    const regEl = $('dash-market-regime');
    if (regEl) {
      regEl.textContent = regime;
      regEl.className = 'regime-badge';
    }
    updateAIOrb(AIEngine.getConfidence());
  }

  function updateAllocTotal(totalValue) {
    setText('alloc-total',      `$${fmt(totalValue, 0)}`);
    setText('port-alloc-total', `$${fmt(totalValue, 0)}`);
  }

  // ── Investment Returns UI Update ─────────────────────────
  let _lastWalletBal = 0;
  function updateReturnsUI() {
    if (typeof InvestmentReturns === 'undefined') return;
    const s = InvestmentReturns.getSnapshot();

    // Animated wallet balance counter (shows claimed balance)
    const walletEl = $('ret-wallet-bal');
    if (walletEl && typeof Gamification !== 'undefined' && Math.abs(s.walletBalance - _lastWalletBal) > 0.01 && _lastWalletBal > 0) {
      Gamification.animateCounter(walletEl, _lastWalletBal, s.walletBalance, 1200, '$', 2);
      if (s.walletBalance > _lastWalletBal) walletEl.classList.add('gm-value-pulse');
      setTimeout(() => walletEl.classList.remove('gm-value-pulse'), 700);
    } else {
      setText('ret-wallet-bal', `$${fmt(s.walletBalance, 2)}`);
    }
    _lastWalletBal = s.walletBalance;

    const setRetVal = (id, val, pct) => {
      const el = $(id);
      if (!el) return;
      const sign = val >= 0 ? '+' : '';
      el.textContent = `${sign}$${fmt(Math.abs(val), 2)}`;
      el.className = `ret-value ${val >= 0 ? 'up' : 'down'}`;
    };

    setRetVal('ret-today-earn', s.todayPnL);
    setRetVal('ret-week-earn',  s.weekPnL);
    setRetVal('ret-trade-profit', s.totalTradingProfit);
    setRetVal('ret-tier-credit', s.totalReturnCredit);
    setRetVal('ret-all-time', s.totalReturn);

    setText('ret-today-pct', `${s.todayPct >= 0 ? '+' : ''}${s.todayPct.toFixed(3)}%`);
    setText('ret-week-pct',  `${s.weekPct >= 0 ? '+' : ''}${s.weekPct.toFixed(3)}%`);
    setText('ret-all-time-pct', `${s.totalReturnPct >= 0 ? '+' : ''}${s.totalReturnPct.toFixed(2)}%`);

    // Tier badge
    setText('inv-tier-badge', s.tierLabel.toUpperCase());
    const badgeEl = $('inv-tier-badge');
    if (badgeEl) badgeEl.style.color = s.tierColor;
    setText('inv-apy-range', `APY: ${s.tierAPY}`);

    // Recent feed
    const feed = $('returns-feed');
    if (feed && s.recentHistory.length > 0) {
      feed.innerHTML = s.recentHistory.slice(0, 8).map(e => {
        const time = new Date(e.ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        const isProfit = e.amount >= 0;
        const icon = e.type === 'trading_profit' ? '📈' : e.type === 'trading_loss' ? '📉' : e.type === 'deposit' ? '💳' : '💰';
        const label = e.type === 'trading_profit' ? `Trade ${e.symbol}` : e.type === 'trading_loss' ? `Trade ${e.symbol}` : e.type === 'deposit' ? 'Deposit' : 'Tier Return';
        return `<div class="ret-feed-item">
          <span class="rfi-icon">${icon}</span>
          <span class="rfi-label">${label}</span>
          <span class="rfi-amount ${isProfit ? 'up' : 'down'}">${isProfit ? '+' : ''}$${fmt(Math.abs(e.amount), 2)}</span>
          <span class="rfi-bal">Bal: $${fmt(e.balance, 2)}</span>
          <span class="rfi-time">${time}</span>
        </div>`;
      }).join('');
    }
  }

  // ── Fund Manager UI Update ─────────────────────────────
  function updateFundManagerUI() {
    if (typeof InvestmentReturns === 'undefined' || !InvestmentReturns.getFundManagerSnapshot) return;
    const fm = InvestmentReturns.getFundManagerSnapshot();

    setText('fm-daily-amount',    `$${fmt(fm.unclaimedDaily, 2)}`);
    setText('fm-weekly-amount',   `$${fmt(fm.unclaimedWeekly, 2)}`);
    setText('fm-trading-amount',  `$${fmt(fm.unclaimedTrading, 2)}`);
    setText('fm-interest-amount', `$${fmt(fm.unclaimedInterest, 2)}`);
    setText('fm-total-unclaimed', `Pending: $${fmt(fm.totalUnclaimed, 2)}`);
    setText('fm-lifetime-total',  `$${fmt(fm.totalClaimed, 2)}`);

    // Color-code amounts: green glow if > 0
    ['fm-daily-amount', 'fm-weekly-amount', 'fm-trading-amount', 'fm-interest-amount'].forEach(id => {
      const el = $(id);
      if (el) el.className = 'fm-pool-amount' + (parseFloat(el.textContent.replace(/[^0-9.]/g, '')) > 0 ? ' fm-has-funds' : '');
    });

    // Pulse total if pending
    const totalEl = $('fm-total-unclaimed');
    if (totalEl) totalEl.classList.toggle('fm-pending-pulse', fm.totalUnclaimed > 0.5);

    // Enable/disable claim buttons
    const pools = { daily: fm.unclaimedDaily, weekly: fm.unclaimedWeekly, trading: fm.unclaimedTrading, interest: fm.unclaimedInterest };
    Object.entries(pools).forEach(([key, val]) => {
      const btn = $(`fm-claim-${key}`);
      if (btn) { btn.disabled = val <= 0; btn.classList.toggle('fm-btn-active', val > 0); }
    });
    const allBtn = $('fm-claim-all');
    if (allBtn) { allBtn.disabled = fm.totalUnclaimed <= 0; allBtn.classList.toggle('fm-btn-active', fm.totalUnclaimed > 0); }

    // Transfer log
    const logList = $('fm-log-list');
    if (logList && fm.transferLog.length > 0) {
      logList.innerHTML = fm.transferLog.map(entry => {
        const time = new Date(entry.ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const icons = { daily: 'fa-gift', weekly: 'fa-trophy', trading: 'fa-chart-line', interest: 'fa-coins' };
        const balInfo = entry.balanceBefore != null ? ` ($${fmt(entry.balanceBefore, 2)} → $${fmt(entry.balanceAfter, 2)})` : '';
        return `<div class="fm-log-item">
          <i class="fa ${icons[entry.type] || 'fa-arrow-right'}"></i>
          <span class="fm-log-label">${entry.label}</span>
          <span class="fm-log-amount">+$${fmt(entry.amount, 2)}</span>
          <span class="fm-log-arrow">→ Wallet${balInfo}</span>
          <span class="fm-log-time">${time}</span>
        </div>`;
      }).join('');
    } else if (logList) {
      logList.innerHTML = '<div class="fm-log-empty">No transfers yet. Claim your earnings above.</div>';
    }
  }

  // ── Fund Claim Processing Animation ─────────────────────
  function _showClaimProcessing(amount, label, callback) {
    const overlay = $('fm-claim-overlay');
    if (!overlay) { callback(); return; }

    const steps = [
      { text: 'Verifying pool balance...', icon: 'fa-shield-halved', delay: 600 },
      { text: 'Calculating compound interest...', icon: 'fa-calculator', delay: 800 },
      { text: 'Transferring to main wallet...', icon: 'fa-arrow-right-arrow-left', delay: 700 },
      { text: 'Confirming transaction...', icon: 'fa-circle-check', delay: 500 },
    ];

    overlay.style.display = 'flex';
    overlay.classList.add('fm-overlay-active');
    const statusEl = overlay.querySelector('.fm-process-status');
    const iconEl = overlay.querySelector('.fm-process-icon i');
    const amtEl = overlay.querySelector('.fm-process-amount');
    const barEl = overlay.querySelector('.fm-process-bar-fill');

    if (amtEl) amtEl.textContent = `+$${fmt(amount, 2)}`;
    if (barEl) barEl.style.width = '0%';

    let stepIdx = 0;
    function runStep() {
      if (stepIdx >= steps.length) {
        // Final success state
        if (statusEl) statusEl.textContent = 'Transfer Complete!';
        if (iconEl) { iconEl.className = 'fa fa-check-circle'; }
        if (barEl) barEl.style.width = '100%';
        overlay.classList.add('fm-process-success');

        setTimeout(() => {
          overlay.style.display = 'none';
          overlay.classList.remove('fm-overlay-active', 'fm-process-success');
          callback();
        }, 1200);
        return;
      }

      const step = steps[stepIdx];
      if (statusEl) statusEl.textContent = step.text;
      if (iconEl) iconEl.className = `fa ${step.icon}`;
      if (barEl) barEl.style.width = `${((stepIdx + 1) / steps.length * 85)}%`;

      stepIdx++;
      setTimeout(runStep, step.delay);
    }

    runStep();
  }

  // ── Fund Manager: Claim Pool ─────────────────────────────
  function claimFundPool(pool) {
    if (typeof InvestmentReturns === 'undefined') return;
    // Pre-check if there's anything to claim
    const fm = InvestmentReturns.getFundManagerSnapshot();
    const poolAmounts = { daily: fm.unclaimedDaily, weekly: fm.unclaimedWeekly, trading: fm.unclaimedTrading, interest: fm.unclaimedInterest };
    const amount = poolAmounts[pool] || 0;
    if (amount <= 0) { showToast('No pending funds in this pool', 'info'); return; }

    const labels = { daily: 'Daily Bonus', weekly: 'Weekly Bonus', trading: 'Trading Profits', interest: 'Compound Interest' };

    // Show processing animation then execute claim
    _showClaimProcessing(amount, labels[pool] || pool, () => {
      const result = InvestmentReturns.claimEarnings(pool);
      if (result.success) {
        // Animate wallet balance counting up
        const walletEl = $('ret-wallet-bal');
        if (walletEl && typeof Gamification !== 'undefined') {
          Gamification.animateCounter(walletEl, result.balanceBefore, result.balanceAfter, 1500, '$', 2);
          walletEl.classList.add('gm-value-pulse');
          setTimeout(() => walletEl.classList.remove('gm-value-pulse'), 1500);
        }

        showToast(`✅ ${result.label}: +$${fmt(result.amount, 2)} transferred to wallet!`, 'success');
        if (typeof App !== 'undefined' && App.addNotification) {
          App.addNotification('💰 Fund Transfer', `${result.label}: $${fmt(result.amount, 2)} → Main Wallet (Balance: $${fmt(result.balanceAfter, 2)})`, 'success');
        }
        // Flash the pool card
        const card = document.querySelector(`.fm-pool-card[data-pool="${pool}"]`);
        if (card) { card.classList.add('fm-claimed-flash'); setTimeout(() => card.classList.remove('fm-claimed-flash'), 1200); }
        // Streak notification
        if (result.streak > 1) {
          setTimeout(() => showToast(`🔥 ${result.streak}-day claim streak! Keep it up!`, 'info'), 1800);
        }
        if (typeof Gamification !== 'undefined') Gamification.trackClaim();
        updateFundManagerUI();
        updateReturnsUI();
        updateDashKPIs(Portfolio.computeMetrics());
        updateGamificationUI();
      }
    });
  }

  function claimAllFunds() {
    if (typeof InvestmentReturns === 'undefined') return;
    const fm = InvestmentReturns.getFundManagerSnapshot();
    if (fm.totalUnclaimed <= 0) { showToast('No pending funds to claim', 'info'); return; }

    _showClaimProcessing(fm.totalUnclaimed, 'All Earnings', () => {
      const result = InvestmentReturns.claimAll();
      if (result.success) {
        // Animate wallet balance
        const snap = InvestmentReturns.getSnapshot();
        const walletEl = $('ret-wallet-bal');
        if (walletEl && typeof Gamification !== 'undefined') {
          const before = snap.walletBalance - result.totalClaimed;
          Gamification.animateCounter(walletEl, before, snap.walletBalance, 2000, '$', 2);
          walletEl.classList.add('gm-value-pulse');
          setTimeout(() => walletEl.classList.remove('gm-value-pulse'), 2000);
        }

        showToast(`✅ All earnings claimed: +$${fmt(result.totalClaimed, 2)} → Wallet!`, 'success');
        if (typeof App !== 'undefined' && App.addNotification) {
          App.addNotification('💰 Bulk Transfer', `$${fmt(result.totalClaimed, 2)} from ${result.claimed.length} pools → Main Wallet`, 'success');
        }
        // Flash all pool cards
        document.querySelectorAll('.fm-pool-card').forEach(card => {
          card.classList.add('fm-claimed-flash');
          setTimeout(() => card.classList.remove('fm-claimed-flash'), 1200);
        });
        if (typeof Gamification !== 'undefined') Gamification.trackClaimAll();
        updateFundManagerUI();
        updateReturnsUI();
        updateDashKPIs(Portfolio.computeMetrics());
        updateGamificationUI();
      }
    });
  }

  function updateChartStats(rawId) {
    const id = rawId.split('/')[0];
    const a = MarketData.getAsset(id); if (!a) return;
    setText('cs-open',   `$${fmtPx(a.open)}`);
    setText('cs-high',   `$${fmtPx(a.high24h)}`);
    setText('cs-low',    `$${fmtPx(a.low24h)}`);
    setText('cs-vol',    fmtVolume(a.vol24h));
    setText('cs-mktcap', a.mc ? fmtVolume(a.mc) : '—');
    setText('main-price-display', `$${fmtPx(a.price)}`);
    const chgEl = $('main-change-display');
    if (chgEl) { chgEl.textContent = `${signPnl(a.pct24h)}${a.pct24h.toFixed(2)}%`; chgEl.className = `main-change-hdr ${clsPnl(a.pct24h)}`; }
  }

  // ── Gamification UI Update ────────────────────────────────
  function updateGamificationUI() {
    if (typeof Gamification === 'undefined') return;
    const g = Gamification.getSnapshot();

    // Level badge
    const levelIcon = $('gm-level-icon');
    if (levelIcon) levelIcon.textContent = g.icon;
    setText('gm-level-num', g.level);
    setText('gm-level-title', g.title);
    const levelBadge = $('gm-level-badge');
    if (levelBadge) levelBadge.style.borderColor = g.color;

    // XP bar
    const xpFill = $('gm-xp-fill');
    if (xpFill) {
      xpFill.style.width = g.progressPct.toFixed(1) + '%';
      xpFill.style.background = `linear-gradient(90deg, ${g.color}, ${g.color}88)`;
    }
    if (g.nextLevel) {
      setText('gm-xp-text', `${fmtNum(g.xpInLevel)} / ${fmtNum(g.xpForNext)} XP`);
      setText('gm-xp-sub', `Next: ${g.nextLevel.title} ${g.nextLevel.icon}`);
    } else {
      setText('gm-xp-text', `${fmtNum(g.xp)} XP — MAX LEVEL`);
      setText('gm-xp-sub', '👑 Legendary status achieved');
    }

    // Streak
    setText('gm-streak-num', g.streak);
    setText('gm-streak-mult', g.streakMultiplier.toFixed(1) + 'x XP Multiplier');
    setText('gm-streak-best', g.longestStreak);
    const flame = $('gm-streak-flame');
    if (flame) {
      flame.className = 'gm-streak-flame' + (g.streak >= 7 ? ' gm-fire-mega' : g.streak >= 3 ? ' gm-fire-hot' : '');
    }

    // Daily bonus
    const dailyBtn = $('gm-daily-btn');
    const dailyStatus = $('gm-daily-status');
    if (dailyBtn && dailyStatus) {
      if (g.canClaimDaily) {
        dailyBtn.classList.add('gm-daily-available');
        dailyBtn.classList.remove('gm-daily-claimed');
        dailyStatus.textContent = 'CLAIM!';
      } else {
        dailyBtn.classList.remove('gm-daily-available');
        dailyBtn.classList.add('gm-daily-claimed');
        dailyStatus.textContent = 'CLAIMED ✓';
      }
    }

    // Stats
    setText('gm-total-xp', fmtNum(g.totalXpEarned));
    setText('gm-trades-count', g.tradeCount);
    setText('gm-badge-count', `${g.achievementCount}/${g.totalAchievements}`);
    setText('gm-badges-prog', `${g.achievementCount}/${g.totalAchievements} Unlocked`);

    // Achievement badges grid
    const grid = $('gm-badges-grid');
    if (grid) {
      const allAch = Object.values(Gamification.ACHIEVEMENTS);
      grid.innerHTML = allAch.map(a => {
        const unlocked = g.achievements.some(ua => ua.id === a.id);
        return `<div class="gm-badge-item ${unlocked ? 'gm-badge-unlocked' : 'gm-badge-locked'}" title="${a.title}: ${a.desc}">
          <span class="gm-badge-icon">${unlocked ? a.icon : '🔒'}</span>
          <span class="gm-badge-name">${a.title}</span>
        </div>`;
      }).join('');
    }

    // Check balance achievements
    if (typeof InvestmentReturns !== 'undefined') {
      const snap = InvestmentReturns.getSnapshot();
      Gamification.checkBalanceAchievements(snap.walletBalance);
    }
  }

  function fmtNum(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  }

  // ── Daily Bonus Claim Handler ─────────────────────────────
  function claimDailyBonus() {
    if (typeof Gamification === 'undefined') return;
    const result = Gamification.claimDailyBonus();
    if (result.success) {
      showToast(`🎁 Daily Bonus: ${result.reward.label}!`, 'success');
      updateGamificationUI();
    } else {
      showToast('Already claimed today — come back tomorrow!', 'info');
    }
  }

  function fmtVolume(n) {
    if (!n) return '$0';
    if (n >= 1e12) return `$${(n/1e12).toFixed(2)}T`;
    if (n >= 1e9)  return `$${(n/1e9).toFixed(2)}B`;
    if (n >= 1e6)  return `$${(n/1e6).toFixed(2)}M`;
    return `$${fmt(n, 0)}`;
  }

  // ── Whale Alerts ──────────────────────────────────────────
  function renderWhaleAlerts() {
    const feed = $('whale-feed'); if (!feed) return;
    const WHALE_DATA = [
      { symbol: 'BTC/USD', side: 'buy',  sizeUSD: 48000000, exchange: 'Binance',  ts: Date.now() - 12000 },
      { symbol: 'ETH/USD', side: 'sell', sizeUSD: 22000000, exchange: 'Coinbase', ts: Date.now() - 80000 },
      { symbol: 'SOL/USD', side: 'buy',  sizeUSD: 9500000,  exchange: 'OKX',      ts: Date.now() - 130000 },
      { symbol: 'BNB/USD', side: 'buy',  sizeUSD: 14000000, exchange: 'Bybit',    ts: Date.now() - 200000 },
      { symbol: 'AAPL',    side: 'buy',  sizeUSD: 55000000, exchange: 'NYSE',     ts: Date.now() - 400000 },
    ];
    feed.innerHTML = WHALE_DATA.map(w => {
      const min = Math.floor((Date.now() - w.ts) / 60000);
      const sign = w.side === 'buy' ? '▲' : '▼';
      const cls  = w.side === 'buy' ? 'buy' : 'sell';
      return `<div class="whale-item"><div class="whale-icon ${cls}">${sign}</div><div class="whale-info"><b class="whale-symbol">${w.symbol}</b><span class="whale-detail">${w.side.toUpperCase()} $${(w.sizeUSD/1e6).toFixed(1)}M on ${w.exchange}</span></div><span class="whale-time">${min}m ago</span></div>`;
    }).join('');
    MarketData.on('whale', w => {
      const min = 0;
      const sign = w.side === 'buy' ? '▲' : '▼';
      const div = document.createElement('div');
      div.className = `whale-item`; div.style.animation = 'whale-slide-in .4s ease';
      div.innerHTML = `<div class="whale-icon ${w.side}">${sign}</div><div class="whale-info"><b class="whale-symbol">${w.symbol}</b><span class="whale-detail">${w.side.toUpperCase()} $${(w.sizeUSD/1e6).toFixed(1)}M on ${w.exchange}</span></div><span class="whale-time">just now</span>`;
      feed.prepend(div);
      while (feed.children.length > 8) feed.lastChild.remove();
    });
  }

  // ── Signals Mini ──────────────────────────────────────────
  function renderSignalsMini(sigs) {
    const list = $('dash-signals-list'); if (!list) return;
    list.innerHTML = sigs.map(s => `<div class="signal-row"><span class="sig-symbol">${s.symbol.replace('/USD','')}</span><span class="sig-dir-badge ${s.dir}">${s.dir.toUpperCase()}</span><span class="sig-pattern">${s.pattern}</span><span class="sig-conf">${s.conf}%</span></div>`).join('');
  }

  // ── Asset Class Grid ──────────────────────────────────────
  function renderAssetClassGrid() {
    const grid = $('asset-class-grid'); if (!grid) return;
    const cats = [
      { label: 'Crypto',      icon: 'fa-bitcoin-sign',   id:'BTC' },
      { label: 'Stocks',      icon: 'fa-chart-line',     id:'AAPL' },
      { label: 'Forex',       icon: 'fa-money-bill-wave',id:'EURUSD' },
      { label: 'Commodities', icon: 'fa-gem',            id:'GOLD' },
      { label: 'Indices',     icon: 'fa-flag',           id:'SPX' },
      { label: 'DeFi',        icon: 'fa-cube',           id:'UNI' },
    ];
    grid.innerHTML = cats.map(c => {
      const a = MarketData.getAsset(c.id);
      const pct = a ? a.pct24h : 0;
      const cls = pct >= 0 ? 'up' : 'down';
      return `<div class="asset-class-card" onclick="App.navigatePublic('markets')"><i class="fa-solid ${c.icon} ${cls}" style="color:${pct>=0?'#00ff88':'#ff4757'}"></i><span class="ac-name">${c.label}</span><span class="ac-change ${cls}">${signPnl(pct)}${pct.toFixed(2)}%</span></div>`;
    }).join('');
  }

  // ── Refresh Dashboard Charts on Navigate Back ─────────────
  async function refreshDashboardCharts() {
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    const symbol = _sym;
    if (typeof AdvancedChartEngine !== 'undefined') {
      try { AdvancedChartEngine.destroy('main-price-chart'); } catch {}
      try {
        await AdvancedChartEngine.createLightweightChart('main-price-chart', symbol, _activeTimeframe);
      } catch (e) { console.error('[refreshDash] chart failed:', e.message); }
    }
    // Refresh supporting charts
    ChartEngine.createSentimentGauge('sentiment-gauge', MarketData.getFearGreed().value);
    const m = Portfolio.computeMetrics();
    ChartEngine.createAllocationChart('alloc-donut', m.alloc);
    updateDashKPIs(m);
    updateChartStats(symbol);
    updateReturnsUI();
    updateFundManagerUI();
    renderWhaleAlerts();
    renderSignalsMini(AIEngine.getSignals().slice(0, 6));
  }

  // ── Dashboard Copy Traders ────────────────────────────────
  function renderDashCopyTraders() {
    const list = $('dash-copy-trade-list'); if (!list) return;
    const traders = Trading.getCopyTraders();
    list.innerHTML = traders.map(t => {
      const btnTxt = t.active ? '⏹ Stop' : '▶ Copy';
      const btnCls = t.active ? 'btn-danger' : 'btn-primary';
      const liveTag = t.active ? '<span class="ct-live-badge">● LIVE</span>' : '';
      const tradesInfo = t.active && t.tradesExecuted > 0 ? `<span class="ct-trades">${t.tradesExecuted} trades · ${t.copiedBal >= 0 ? '+' : ''}$${Math.abs(t.copiedBal).toFixed(2)}</span>` : '';
      return `<div class="ct-card ${t.active ? 'ct-active' : ''}">
        <div class="ct-avatar">${t.avatar}</div>
        <div class="ct-info">
          <b>${t.name}</b> ${liveTag}
          <span>${t.subscribers.toLocaleString()} followers · WR ${t.winRate} · ${t.strategy}</span>
          ${tradesInfo}
        </div>
        <div class="ct-stats">
          <span class="${clsPnl(parseFloat(t.pnl30d))}">${t.pnl30d}</span>
          <small>30d PnL</small>
        </div>
        <button class="btn ${btnCls} btn-xs" onclick="App.toggleCopyTrader('${t.id}')">${btnTxt}</button>
      </div>`;
    }).join('');
  }

  // ── AI Orb ────────────────────────────────────────────────
  function updateAIOrb(conf) {
    const val = conf || AIEngine.getConfidence();
    setText('ai-confidence-value', `${Math.round(val)}%`);
    const innerRing = document.querySelector('.ai-orb-ring.inner');
    if (innerRing) {
      const color = val > 75 ? '#00ff88' : val > 60 ? '#f59e0b' : '#ff4757';
      innerRing.style.borderColor = color;
    }
  }

  // ── Markets Section ───────────────────────────────────────
  function renderMarketsTable() {
    const tbody = $('market-table-body'); if (!tbody) return;
    const q     = ($('market-search-input') || {}).value || '';
    let assets  = MarketData.getAllAssets();
    if (_marketFilter !== 'all') assets = assets.filter(a => a.cat === _marketFilter);
    if (q) assets = assets.filter(a => a.sym.toLowerCase().includes(q.toLowerCase()) || a.name.toLowerCase().includes(q.toLowerCase()));
    tbody.innerHTML = assets.map((a, idx) => {
      const pctCls = a.pct24h >= 0 ? 'up' : 'down';
      const sig = AIEngine.getSignals().find(s => s.assetId === a.id);
      const sigBadge = sig ? `<span class="sig-dir-badge ${sig.dir}" style="font-size:9px">${sig.dir.toUpperCase()} ${sig.conf}%</span>` : '<span style="color:#2a3a52;font-size:10px;font-family:monospace">—</span>';
      const spark = `<canvas id="spark-${a.id}" width="60" height="24" style="display:block"></canvas>`;
      const mcStr = a.mc ? fmtVolume(a.mc) : '—';
      return `<tr>
        <td class="mono" style="color:#64748b">${idx + 1}</td>
        <td style="cursor:pointer" onclick="App.quickTrade('${a.id}')"><b>${a.sym}</b><small>${a.name}</small></td>
        <td class="mono">$${fmtPx(a.price)}</td>
        <td class="mono ${pctCls}">${signPnl(a.pct24h)}${a.pct24h.toFixed(2)}%</td>
        <td class="mono">$${fmtPx(a.high24h)}</td>
        <td class="mono">$${fmtPx(a.low24h)}</td>
        <td class="mono">${fmtVolume(a.vol24h)}</td>
        <td class="mono">${mcStr}</td>
        <td>${spark}</td>
        <td>${sigBadge}</td>
        <td><button class="btn btn-primary btn-xs" onclick="App.quickTrade('${a.id}')">Trade</button></td>
      </tr>`;
    }).join('');
    // Sparklines
    setTimeout(() => {
      assets.forEach(a => {
        const hist = MarketData.getPriceHistory(a.id, 30);
        ChartEngine.createSparkline(`spark-${a.id}`, hist, a.pct24h >= 0 ? '#00ff88' : '#ff4757');
      });
    }, 80);

    // Capital Flow by Asset Class
    const flowData = [
      { vol: 42 + Math.random() * 16, up: true  },   // Crypto
      { vol: 28 + Math.random() * 12, up: false },   // Equities
      { vol: 18 + Math.random() * 8,  up: true  },   // Forex
      { vol: 12 + Math.random() * 6,  up: true  },   // Commodities
    ];
    ChartEngine.createVolumeChart('capital-flow-chart', flowData);

    // Liquidity Heatmap
    const heatEl = $('liquidity-heatmap');
    if (heatEl) {
      const hmAssets = MarketData.getAllAssets().slice(0, 8);
      heatEl.innerHTML = hmAssets.map(a => {
        const intensity = Math.min(0.75, 0.15 + Math.abs(a.pct24h) / 12);
        const bg     = a.pct24h >= 0 ? `rgba(46,189,133,${intensity})` : `rgba(246,70,93,${intensity})`;
        const border = a.pct24h >= 0 ? 'rgba(46,189,133,.4)' : 'rgba(246,70,93,.4)';
        return `<div class="hm-cell" style="background:${bg};border-color:${border}">` +
          `<span>${a.sym}</span>` +
          `<span class="${a.pct24h >= 0 ? 'up' : 'down'}">${a.pct24h >= 0 ? '+' : ''}${a.pct24h.toFixed(2)}%</span>` +
          `</div>`;
      }).join('');
    }

    renderOrderBook('BTC');
  }

  function renderOrderBook(id) {
    const ob = MarketData.getOrderBook(id, 10);
    const askContainer = $('ob-asks');
    const bidContainer = $('ob-bids');
    const midEl = $('ob-mid-price'); const spreadEl = $('ob-spread-pct');
    if (midEl) midEl.textContent = `$${fmtPx(ob.mid)}`;
    if (spreadEl) spreadEl.textContent = ob.spreadPct + '%';
    const maxVol = Math.max(...ob.asks.map(r=>r.cumVol), ...ob.bids.map(r=>r.cumVol));
    if (askContainer) askContainer.innerHTML = ob.asks.map(r => `<div class="ob-row ask"><div class="ob-depth-bar" style="width:${(r.cumVol/maxVol*100).toFixed(1)}%"></div><span class="ob-price">$${fmtPx(r.price)}</span><span>${r.vol.toFixed(3)}</span><span>${r.cumVol.toFixed(3)}</span></div>`).join('');
    if (bidContainer) bidContainer.innerHTML = ob.bids.map(r => `<div class="ob-row bid"><div class="ob-depth-bar" style="width:${(r.cumVol/maxVol*100).toFixed(1)}%"></div><span class="ob-price">$${fmtPx(r.price)}</span><span>${r.vol.toFixed(3)}</span><span>${r.cumVol.toFixed(3)}</span></div>`).join('');
  }

  function initMarketControls() {
    $$('.filter-btn[data-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.filter-btn[data-cat]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _marketFilter = btn.dataset.cat;
        renderMarketsTable();
      });
    });
    const searchInput = $('market-search-input');
    if (searchInput) searchInput.addEventListener('input', renderMarketsTable);
  }

  // ── AI Engine Section ─────────────────────────────────────
  function renderAIEngine() {
    const id = ($('ai-asset-filter') || {}).value || 'BTC';
    renderAILayers(id);
    renderAISetups();
    updateCrisisBanner();
    setText('setup-count-badge', AIEngine.getSignals().length);
    // AI Charts — LSTM Forecast · Monte Carlo · Volatility Cone
    const hist = MarketData.getPriceHistory(id, 80);
    const lstmPred = AIEngine.computeLSTMPrediction(id);

    // LSTM Forecast — historical prices extended with predicted trajectory
    const forecastTail = Array.from({ length: 20 }, (_, i) => {
      const last = hist[hist.length - 1];
      const drift = lstmPred.nextBar * 0.01 * (i + 1) / 20;
      return last * (1 + drift + (Math.random() - 0.5) * 0.004);
    });
    ChartEngine.createEquityCurve('lstm-forecast-chart', [...hist, ...forecastTail]);

    // Monte Carlo — randomised price simulation paths averaged into one series
    const mcBase = hist[hist.length - 1];
    const mcSim = Array.from({ length: 50 }, (_, i) => {
      let p = mcBase;
      for (let j = 0; j < i; j++) p *= (1 + (Math.random() - 0.48) * 0.018);
      return p;
    });
    ChartEngine.createMainChart('monte-carlo-chart', mcSim);

    // Volatility Cone — rolling realised volatility profile
    const volCone = Array.from({ length: 50 }, (_, i) =>
      Math.max(5, Math.min(80, 20 + Math.sin(i * 0.25) * 14 + (Math.random() - 0.5) * 6)));
    ChartEngine.createRSIChart('vol-cone-chart', volCone);
  }

  function renderAILayers(id) {
    const quant = AIEngine.computeQuantModels(id);
    const lstm  = AIEngine.computeLSTMPrediction(id);
    const bhv   = AIEngine.computeBehavioral(id);
    const macro = AIEngine.getMacroScore();
    const fg    = bhv.fearGreed;

    const row = (name, val, sig = '', sigCls = '') =>
      `<div class="indicator-row">` +
      `<span class="ind-name">${name}</span>` +
      `<span class="ind-value">${val}</span>` +
      (sig ? `<span class="ind-signal ${sigCls}">${sig}</span>` : '') +
      `</div>`;

    // L1 — Technical Analysis
    const techEl = $('tech-indicators');
    if (techEl) techEl.innerHTML =
      row('RSI',        quant.rsi,        quant.rsi > 70 ? 'OVB' : quant.rsi < 30 ? 'OVS' : '', quant.rsi > 70 ? 'down' : 'up') +
      row('MACD',       quant.macd) +
      row('BB Pos',     quant.bbPos + '%', quant.bbPos > 75 ? 'UB' : quant.bbPos < 25 ? 'LB' : '', quant.bbPos > 75 ? 'up' : 'down') +
      row('Volatility', quant.volatility);

    // L2 — Quantitative Models
    const quantEl = $('quant-models');
    if (quantEl) quantEl.innerHTML =
      row('Prediction',  (lstm.nextBar >= 0 ? '+' : '') + lstm.nextBar.toFixed(2) + '%', lstm.nextBar >= 0 ? '▲' : '▼', lstm.nextBar >= 0 ? 'up' : 'down') +
      row('Confidence',  lstm.confidence.toFixed(1) + '%') +
      row('Bull Prob',   lstm.regimeProb.Bull + '%', lstm.regimeProb.Bull > 55 ? 'BULL' : 'BEAR', lstm.regimeProb.Bull > 55 ? 'up' : 'down') +
      row('Attention',   lstm.attention.toFixed(3));

    // L3 — Behavioral Finance
    const bhvEl = $('behavioral-analytics');
    if (bhvEl) bhvEl.innerHTML =
      row('Fear/Greed',   `${fg.value} — ${fg.label}`, fg.value > 60 ? 'GREED' : fg.value < 40 ? 'FEAR' : 'NEUT', fg.value > 60 ? 'up' : fg.value < 40 ? 'down' : '') +
      row('Whale Ratio',  (bhv.whaleRatio * 100).toFixed(0) + '%') +
      row('Funding Rate', bhv.fundingRate) +
      row('OI Change',    bhv.openInterestChg);

    // L4 — Macro / LSTM Summary
    const lstmEl = $('lstm-summary');
    if (lstmEl) lstmEl.innerHTML =
      row('VIX',          macro.vix.toFixed(2),       macro.vix > 25 ? 'HIGH' : 'LOW', macro.vix > 25 ? 'down' : 'up') +
      row('DXY',          macro.dxy.toFixed(2)) +
      row('SP500 Corr',   macro.sp500Corr.toFixed(2)) +
      row('Rate Outlook', macro.rateExpect);
  }

  function renderAISetups() {
    const grid = $('ai-setups-grid'); if (!grid) return;
    const sigs = AIEngine.getSignals().slice(0, 12);
    grid.innerHTML = sigs.map(s => `<div class="ai-setup-card">
      <div class="asc-header">
        <span class="asc-symbol">${s.symbol}</span>
        <span class="sig-dir-badge ${s.dir}">${s.dir.toUpperCase()}</span>
        <span class="badge-ai" style="margin-left:auto">${s.conf}%</span>
      </div>
      <div class="asc-pattern">${s.pattern}</div>
      <div class="asc-metrics">
        <span>TF: <b>${s.timeframe}</b></span>
        <span>R:R <b>${s.rr}</b></span>
        <span>RSI <b>${s.rsi}</b></span>
      </div>
      <div class="asc-reasoning">${s.reasoning}</div>
      <div class="asc-targets">
        <span>TP1: <b>$${fmtPx(s.tp1)}</b></span>
        <span>TP2: <b>$${fmtPx(s.tp2)}</b></span>
        <span>SL: <b>$${fmtPx(s.sl)}</b></span>
      </div>
    </div>`).join('');
  }

  function updateCrisisBanner() {
    const banner = $('crisis-mode-banner'); if (!banner) return;
    const isCrisis = AIEngine.isCrisisMode();
    banner.classList.toggle('hidden', !isCrisis);
  }

  // ── Portfolio Section ──────────────────────────────────────
  function renderPortfolio() {
    const m = Portfolio.computeMetrics();
    
    // KPI row — totalValue now comes wallet-anchored from computeMetrics
    setText('port-total-value', `$${fmt(m.totalValue, 0)}`);
    setText('port-total-pnl',   `${signPnl(m.totalPnL)}$${fmt(Math.abs(m.totalPnL), 0)} (${signPnl(m.totalPct)}${m.totalPct}%)`);
    setClassOnEl($('port-total-pnl'), clsPnl(m.totalPnL));
    setText('port-sharpe',  m.sharpe.toFixed(2));
    setText('port-sortino', m.sortino.toFixed(2));
    setText('port-max-dd',  `-${m.maxDD}%`);
    setText('port-alpha',   `+${m.alpha}%`);
    setText('port-beta',    m.beta.toFixed(2));
    setText('port-divers',  `${m.diversification}%`);

    // Holdings table
    const tbody = $('holdings-tbody'); if (tbody) {
      tbody.innerHTML = m.enriched.map(h => {
        const pnlCls = clsPnl(h.pnl);
        const pct24Cls = clsPnl(h.pct24h);
        return `<tr>
          <td><b>${h.sym}</b><small>${h.name}</small></td>
          <td class="mono">${h.qty}</td>
          <td class="mono">$${fmtPx(h.price)}</td>
          <td class="mono">$${fmtPx(h.avgEntry)}</td>
          <td class="mono">$${fmt(h.value, 0)}</td>
          <td class="mono ${pnlCls}">${signPnl(h.pnl)}$${fmt(Math.abs(h.pnl), 0)} (${signPnl(parseFloat(h.pct))}${h.pct}%)</td>
          <td class="mono ${pct24Cls}">${signPnl(h.pct24h)}${h.pct24h.toFixed(2)}%</td>
          <td><span class="ai-score" style="color:${h.aiScore>75?'#00ff88':h.aiScore>55?'#f59e0b':'#ff4757'}">${h.aiScore}</span></td>
          <td><span class="risk-badge ${h.risk}">${h.risk.toUpperCase()}</span></td>
        </tr>`;
      }).join('');
    }

    // Equity curve
    ChartEngine.createEquityCurve('port-perf-chart', m.equityHistory);
    // Allocation donut update
    ChartEngine.createAllocationChart('port-alloc-donut', m.alloc);
    // Risk radar
    ChartEngine.createRiskRadar('drawdown-chart', [67, m.beta*50, 100-m.maxDD*3, 80, m.diversification, AIEngine.getConfidence()]);

    // Risk heatmap
    const hmap = $('risk-heatmap'); if (hmap) {
      const cells = Portfolio.riskHeatmap();
      hmap.innerHTML = cells.map(c => {
        const color = c.risk === 'high' ? '#ff4757' : c.risk === 'med' ? '#f59e0b' : '#00ff88';
        const bg    = c.risk === 'high' ? 'rgba(255,71,87,.06)' : c.risk === 'med' ? 'rgba(245,158,11,.06)' : 'rgba(0,255,136,.06)';
        return `<div class="risk-cell" style="border-color:${color}40;background:${bg}"><span>${c.sym}</span><span style="color:${color}">${c.risk.toUpperCase()}</span></div>`;
      }).join('');
    }

    setText('holdings-count', m.enriched.length);

    // ── Portfolio Health Score ────────────────────────────
    const health = Portfolio.getHealthScore(m);
    const healthEl = $('port-health-score');
    if (healthEl) {
      healthEl.innerHTML = `
        <div class="health-ring" style="--score:${health.score};--color:${health.color}">
          <div class="health-ring-inner">
            <span class="health-grade" style="color:${health.color}">${health.grade}</span>
            <span class="health-num">${health.score}/100</span>
          </div>
        </div>
        <div class="health-label" style="color:${health.color}">${health.label}</div>`;
    }

    // ── Performance Attribution ──────────────────────────
    const attr = Portfolio.getPerformanceAttribution(m);
    const attrEl = $('port-attribution');
    if (attrEl) {
      attrEl.innerHTML = attr.map(a => {
        const pnlCls = a.pnl >= 0 ? 'up' : 'down';
        const sign   = a.pnl >= 0 ? '+' : '';
        return `<div class="attr-row">
          <span class="attr-cat">${a.icon} ${a.label}</span>
          <span class="attr-val mono ${pnlCls}">${sign}$${fmt(Math.abs(a.pnl), 0)}</span>
          <span class="attr-pct mono ${pnlCls}">${sign}${a.returnPct}%</span>
          <div class="attr-bar"><div class="attr-bar-fill ${pnlCls}" style="width:${Math.min(Math.abs(a.contribution), 100)}%"></div></div>
        </div>`;
      }).join('');
    }

    // ── AI Portfolio Insights ────────────────────────────
    const insights = Portfolio.getInsights(m);
    const insEl = $('port-insights');
    if (insEl) {
      insEl.innerHTML = insights.map(i => {
        const cls = i.type === 'success' ? 'insight-success' : i.type === 'warning' ? 'insight-warning' : 'insight-info';
        return `<div class="insight-item ${cls}"><span class="insight-icon">${i.icon}</span><span class="insight-text">${i.text}</span></div>`;
      }).join('');
    }
  }

  // ── Trading Section ───────────────────────────────────────
  async function renderTrading() {
    // Positions
    renderPositions();
    // Copy traders
    renderCopyTraders();
    // Strategies
    renderStrategies();

    // Wait for section to be visible + painted before creating chart
    // (container needs real dimensions after display:none → block transition)
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    // Terminal chart — candlesticks with real data + proper timeframe
    const termSymbol = _termSym.split('/')[0];
    const termTF = _chartTF.toLowerCase() || '5m';
    if (typeof AdvancedChartEngine !== 'undefined') {
      try { AdvancedChartEngine.destroy('terminal-chart'); } catch {}
      await AdvancedChartEngine.createLightweightChart('terminal-chart', termSymbol, termTF);
    } else {
      await ChartEngine.createCandlestickChart('terminal-chart', [], termSymbol, termTF);
    }
    updateTerminalPrice();
  }

  function renderPositions() {
    const { totalPnL, positions } = Trading.computePnL();
    const container = $('open-positions'); if (!container) return;
    setText('pos-total-pnl', `${signPnl(totalPnL)}$${fmt(Math.abs(totalPnL), 2)}`);
    setClass('pos-total-pnl', clsPnl(totalPnL));
    setText('pos-count-badge', positions.length);

    if (positions.length === 0) {
      container.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:32px 16px;color:#4a6080;font-size:12px">` +
        `<i class="fa fa-inbox" style="font-size:28px;opacity:.35"></i>` +
        `<span>No open positions</span>` +
        `<span style="font-size:10px;opacity:.6">Use the order form below to open a trade</span></div>`;
      return;
    }

    container.innerHTML = positions.map(p => {
      const pnlCls = clsPnl(p.pnl);
      const sideColor = p.side === 'long' ? '#00ff88' : '#ff4757';
      return `<div class="position-row">
        <span class="pos-symbol">${p.sym}</span>
        <span class="sig-dir-badge ${p.side === 'long' ? 'buy' : 'sell'}" style="background:${p.side==='long'?'rgba(0,255,136,.12)':'rgba(255,71,87,.12)'};color:${sideColor}">${p.side.toUpperCase()}</span>
        <span class="pos-qty">${p.qty}</span>
        <span class="pos-entry">@$${fmtPx(p.entry)}</span>
        <span class="pos-cur">$${fmtPx(p.cur)}</span>
        <span class="pos-pnl ${pnlCls}">${signPnl(p.pnl || 0)}$${fmt(Math.abs(p.pnl || 0), 2)}</span>
        <button class="btn btn-danger btn-xs" onclick="App.closePosition('${p.id}')">Close</button>
      </div>`;
    }).join('');
  }

  function renderCopyTraders() {
    const list = $('copy-trade-list'); if (!list) return;
    list.innerHTML = Trading.getCopyTraders().map(t => {
      const btnTxt = t.active ? '⏹ Stop' : '▶ Copy';
      const btnCls = t.active ? 'btn-danger' : 'btn-primary';
      const pnlClass = t.copiedBal >= 0 ? 'up' : 'down';
      const liveTag = t.active ? '<span class="ct-live-badge">● LIVE</span>' : '';
      const tradesInfo = t.active && t.tradesExecuted > 0 ? `<span class="ct-trades">${t.tradesExecuted} trades · ${t.copiedBal >= 0 ? '+' : ''}$${Math.abs(t.copiedBal).toFixed(2)}</span>` : '';
      return `<div class="ct-card ${t.active ? 'ct-active' : ''}">
        <div class="ct-avatar">${t.avatar}</div>
        <div class="ct-info">
          <b>${t.name}</b> ${liveTag}
          <span>${t.subscribers.toLocaleString()} followers · WR ${t.winRate} · ${t.strategy}</span>
          ${tradesInfo}
        </div>
        <div class="ct-stats">
          <span class="${clsPnl(parseFloat(t.pnl30d))}">${t.pnl30d}</span>
          <small>30d PnL</small>
        </div>
        <button class="btn ${btnCls} btn-xs" onclick="App.toggleCopyTrader('${t.id}')">${btnTxt}</button>
      </div>`;
    }).join('');
  }

  function renderStrategies() {
    const sc = $('strategy-cards'); if (!sc) return;
    sc.innerHTML = Trading.getStrategies().map(s => `<div class="strat-card">
      <div class="sc-header"><span class="sc-name">${s.name}</span><span class="sc-price">${s.price}</span></div>
      <div class="sc-desc">${s.desc}</div>
      <div class="sc-stats">
        <span>WR: <b>${s.winRate}%</b></span>
        <span>Trades: <b>${s.trades.toLocaleString()}</b></span>
        <span>Returns: <b class="up">${s.pnl}</b></span>
      </div>
    </div>`).join('');
  }

  function updateTerminalPrice() {
    const a = MarketData.getAsset(_termSym); if (!a) return;
    setText('terminal-live-price', `$${fmtPx(a.price)}`);
    const chgEl = $('terminal-live-chg');
    if (chgEl) { chgEl.textContent = `${signPnl(a.pct24h)}${a.pct24h.toFixed(2)}%`; chgEl.className = `terminal-live-chg ${clsPnl(a.pct24h)}`; }
    // Auto-update entry price field
    const entryEl = $('order-entry');
    if (entryEl && !entryEl.dataset.manual) entryEl.value = fmtPx(a.price);
  }

  function initTerminalControls() {
    // Order type tabs
    $$('.ot-btn[data-ot]').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.ot-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _activeOrderType = btn.dataset.ot;
      });
    });

    // Qty slider
    const qslider = $('qty-slider');
    const qval    = $('qty-slider-pct');
    if (qslider && qval) {
      qslider.addEventListener('input', () => {
        qval.textContent = qslider.value + '%';
        // Use wallet balance for position sizing
        let balance = 100000;
        if (typeof InvestmentReturns !== 'undefined') {
          const snap = InvestmentReturns.getSnapshot();
          if (snap.walletBalance > 0) balance = snap.walletBalance;
        }
        const price = MarketData.getAsset(_termSym)?.price || 1;
        const qty = ((balance * qslider.value / 100) / price);
        const qtyEl = $('order-qty');
        if (qtyEl) qtyEl.value = qty.toFixed(6);
        const entryEl = $('order-entry');
        if (entryEl) entryEl.value = price.toFixed(2);
      });
    }

    // Buy / Sell buttons
    const buyBtn  = $('btn-buy');
    const sellBtn = $('btn-sell');
    if (buyBtn)  buyBtn.addEventListener('click',  () => executeTrade('long'));
    if (sellBtn) sellBtn.addEventListener('click', () => executeTrade('short'));

    // Terminal sym select
    const termSel = $('terminal-sym-select');
    if (termSel) {
      termSel.addEventListener('change', async () => {
        _termSym = termSel.value;
        const termSymbol = _termSym.split('/')[0];
        const termTF = _chartTF.toLowerCase() || '5m';
        if (typeof AdvancedChartEngine !== 'undefined') {
          AdvancedChartEngine.changeTimeframe('terminal-chart', termSymbol, termTF);
        } else {
          await ChartEngine.createCandlestickChart('terminal-chart', [], termSymbol, termTF);
        }
        updateTerminalPrice();
      });
    }

    // Chart TF buttons (terminal only — scoped to #terminal-tf-btns)
    $$('#terminal-tf-btns .tf-btn[data-tf]').forEach(btn => {
      btn.addEventListener('click', async () => {
        $$('#terminal-tf-btns .tf-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _chartTF = btn.dataset.tf;
        const termSymbol = _termSym.split('/')[0];
        const termTF = _chartTF.toLowerCase() || '5m';
        if (typeof AdvancedChartEngine !== 'undefined') {
          AdvancedChartEngine.changeTimeframe('terminal-chart', termSymbol, termTF);
        } else {
          await ChartEngine.createCandlestickChart('terminal-chart', [], termSymbol, termTF);
        }
      });
    });
  }

  function executeTrade(side) {
    const symEl  = $('order-symbol');  const sym  = symEl  ? symEl.value  : 'BTC/USD';
    const qtyEl  = $('order-qty');     const qty  = qtyEl  ? parseFloat(qtyEl.value) || 0.01 : 0.01;
    const slEl   = $('order-sl');      const sl   = slEl   ? parseFloat(slEl.value)  : undefined;
    const tpEl   = $('order-tp');      const tp   = tpEl   ? parseFloat(tpEl.value)  : undefined;
    const a      = MarketData.getAllAssets().find(x => x.sym === sym || x.id === sym);
    const price  = a ? a.price : 100;
    const value  = (qty * price).toFixed(2);

    const order = Trading.placeOrder({
      sym: sym || 'BTC/USD', side,
      type: _activeOrderType,
      qty, price,
      sl: sl || price * (side === 'long' ? 0.97 : 1.03),
      tp: tp || price * (side === 'long' ? 1.04 : 0.96),
    });

    // Auto-fill entry price display
    const entryEl = $('order-entry');
    if (entryEl) entryEl.value = price.toFixed(2);

    // Update AI risk panel
    const arpText = $('arp-text');
    if (arpText) {
      const rr = ((tp || price * 1.04) - price) / (price - (sl || price * 0.97));
      arpText.textContent = `${side === 'long' ? 'LONG' : 'SHORT'} ${sym} — Position value: $${value} — AI-suggested SL/TP applied — Risk managed.`;
      const rrEl = $('rr-display');
      if (rrEl) rrEl.textContent = Math.abs(rr).toFixed(1) + ':1';
    }

    showToast(`✅ ${side === 'long' ? 'BUY' : 'SELL'} ${qty} ${sym} @ $${fmtPx(order.price)} ($${value}) — FILLED`, 'success');
    addNotification('fa-check-circle', 'ai', 'Trade Executed:', ` ${side.toUpperCase()} ${qty} ${sym} @ $${fmtPx(order.price)}`);
    // Gamification: track trade
    if (typeof Gamification !== 'undefined') Gamification.trackTrade();
    renderPositions();
  }

  // ── Analytics Section ──────────────────────────────────────
  function renderAnalytics() {
    const id = _anlSym;
    const hist = MarketData.getPriceHistory(id, 80);
    ChartEngine.createMainChart('analytics-main-chart', hist);

    const rsiArr = Array.from({ length: 60 }, () => {
      const base = MarketData.computeRSI(id);
      return Math.max(10, Math.min(90, base + (Math.random() - 0.5) * 12));
    });
    ChartEngine.createRSIChart('rsi-chart', rsiArr);

    const macdLine   = Array.from({ length: 60 }, (_, i) => Math.sin(i * 0.18) * 150 + (Math.random() - 0.5) * 30);
    const signalLine = macdLine.map(v => v * 0.88 + (Math.random() - 0.5) * 15);
    const histLine   = macdLine.map((v, i) => v - signalLine[i]);
    ChartEngine.createMACDChart('macd-chart', macdLine, signalLine, histLine);

    const volData = Array.from({ length: 60 }, (_, i) => {
      const up = Math.random() > 0.45;
      return { vol: (Math.random() * 900 + 100), up };
    });
    ChartEngine.createVolumeChart('vol-delta-chart', volData);

    // Equity for analytics
    ChartEngine.createEquityCurve('analytics-dd-chart', Portfolio.getEquityHistory().slice(-60));

    // Bollinger Bands — midline history with band context
    const bb = MarketData.computeBB(id);
    const bbHistory = Array.from({ length: 40 }, (_, i) =>
      bb.middle * (1 + Math.sin(i * 0.22) * 0.008 + (Math.random() - 0.5) * 0.006));
    ChartEngine.createEquityCurve('bb-chart', bbHistory);

    // Market Regime — bars showing regime strength over time
    const regimeData = Array.from({ length: 30 }, (_, i) => ({
      vol: Math.max(5, 40 + Math.sin(i * 0.28) * 22 + (Math.random() - 0.5) * 10),
      up: i % 5 !== 0,
    }));
    ChartEngine.createVolumeChart('regime-chart', regimeData);

    // Correlation
    const { syms, matrix } = Portfolio.correlationMatrix();
    renderCorrelationTable(syms, matrix);
  }

  function renderCorrelationTable(syms, matrix) {
    const container = $('correlation-matrix'); if (!container) return;
    const head = `<tr><th></th>${syms.map(s=>`<th>${s}</th>`).join('')}</tr>`;
    const rows = syms.map((r, ri) => `<tr><th>${r}</th>${syms.map((c, ci) => {
      const v = matrix[ri][ci];
      const bg = v > 0.5 ? `rgba(0,255,136,${v*.5})` : v < -0.3 ? `rgba(255,71,87,${Math.abs(v)*.5})` : 'rgba(255,255,255,.04)';
      const color = v >= 0 ? '#00ff88' : '#ff4757';
      return `<td style="background:${bg};color:${v===1?'#fff':color}">${v.toFixed(2)}</td>`;
    }).join('')}</tr>`).join('');
    container.innerHTML = `<table class="corr-table"><thead>${head}</thead><tbody>${rows}</tbody></table>`;
  }

  function initAnalyticsControls() {
    const sel = $('analytics-sym-select');
    if (sel) {
      sel.addEventListener('change', () => {
        _anlSym = sel.value;
        renderAnalytics();
      });
    }
  }

  // ── Signals Section ───────────────────────────────────────
  function renderSignals() {
    const grid  = $('signals-full-grid'); if (!grid) return;
    const cnt   = $('signals-live-count');
    let sigs  = AIEngine.getSignals().filter(s => s.conf >= _confThreshold);

    // Direction filter (long/short)
    if (_sigDirFilter !== 'all') {
      sigs = sigs.filter(s => s.dir === _sigDirFilter);
    }
    // Asset class filter (crypto/stocks/forex)
    if (_sigClassFilter !== 'all') {
      sigs = sigs.filter(s => {
        const asset = MarketData.getAsset(s.assetId);
        if (!asset) return true;
        if (_sigClassFilter === 'crypto') return asset.cat === 'crypto' || asset.cat === 'defi';
        if (_sigClassFilter === 'stocks') return asset.cat === 'stocks';
        if (_sigClassFilter === 'forex') return asset.cat === 'forex';
        return true;
      });
    }

    if (cnt) cnt.textContent = sigs.length;
    grid.innerHTML = sigs.length === 0
      ? `<div style="grid-column:1/-1;text-align:center;padding:48px 16px;color:#4a6080"><i class="fa fa-satellite-dish" style="font-size:28px;opacity:.3;display:block;margin-bottom:12px"></i>No signals match current filters<br><small style="opacity:.5">Try lowering the confidence threshold or changing the filter</small></div>`
      : sigs.map(s => {
      const confColor = s.conf > 85 ? '#00ff88' : s.conf > 70 ? '#f59e0b' : '#ff4757';
      const confPct   = s.conf + '%';
      return `<div class="signal-card ${s.dir}">
        <div class="sc-top">
          <span class="sc-sym">${s.symbol}</span>
          <span class="sig-dir-badge ${s.dir}">${s.dir.toUpperCase()}</span>
          <span class="badge-ai" style="margin-left:auto;color:${confColor}">${s.conf}%</span>
        </div>
        <div class="sc-pattern">${s.pattern}</div>
        <div class="sc-conf-bar"><div style="width:${confPct};background:${confColor}"></div></div>
        <div class="sc-meta">
          <span>TF: <b>${s.timeframe}</b></span>
          <span>R:R <b>${s.rr}</b></span>
          <span>RSI <b>${s.rsi}</b></span>
          <span>BB <b>${s.bbPos}%</b></span>
        </div>
        <div class="sc-reasoning">${s.reasoning}</div>
        <div class="sc-levels">
          <span>TP1 <b>$${fmtPx(s.tp1)}</b></span>
          <span>TP2 <b>$${fmtPx(s.tp2)}</b></span>
          <span>SL <b>$${fmtPx(s.sl)}</b></span>
        </div>
      </div>`;
    }).join('');
  }

  let _sigDirFilter = 'all';
  let _sigClassFilter = 'all';

  function initSignalControls() {
    const slider = $('conf-slider');
    const valEl  = $('conf-slider-val');
    if (slider) {
      slider.addEventListener('input', () => {
        _confThreshold = parseFloat(slider.value);
        if (valEl) valEl.textContent = slider.value + '%';
        if (_section === 'signals') renderSignals();
      });
    }

    // Signal direction & class filter buttons
    $$('.filter-btn[data-sig-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.sigFilter;
        // Determine if this is a direction or class filter
        if (val === 'all') {
          _sigDirFilter = 'all';
          _sigClassFilter = 'all';
          $$('.filter-btn[data-sig-filter]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        } else if (val === 'long' || val === 'short') {
          _sigDirFilter = val;
          // Remove active from dir buttons + all button
          $$('.filter-btn[data-sig-filter="all"]').forEach(b => b.classList.remove('active'));
          $$('.filter-btn[data-sig-filter="long"]').forEach(b => b.classList.remove('active'));
          $$('.filter-btn[data-sig-filter="short"]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        } else {
          _sigClassFilter = val;
          $$('.filter-btn[data-sig-filter="all"]').forEach(b => b.classList.remove('active'));
          $$('.filter-btn[data-sig-filter="crypto"]').forEach(b => b.classList.remove('active'));
          $$('.filter-btn[data-sig-filter="stocks"]').forEach(b => b.classList.remove('active'));
          $$('.filter-btn[data-sig-filter="forex"]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        }
        if (_section === 'signals') renderSignals();
      });
    });
  }

  // ── Plugins Section ────────────────────────────────────────
  function renderPlugins() {
    const activeGrid = $('active-plugins-grid');
    const storeGrid  = $('store-plugins-grid');
    setText('active-plugin-count', Plugins.getEnabledCount());
    setText('store-plugin-count',  Plugins.getStoreCount());
    if (activeGrid) {
      activeGrid.innerHTML = Plugins.getActive().map(p => `<div class="plugin-card ${p.enabled ? 'active' : 'inactive'}">
        <div class="plg-header">
          <div class="plg-icon" style="background:${p.iconBg};color:${p.iconColor};font-size:18px">${p.icon}</div>
          <div class="plg-title"><b>${p.name}</b><small>${p.category} · v${p.version}</small></div>
          <label class="toggle-switch" title="${p.enabled ? 'Disable' : 'Enable'}">
            <input type="checkbox" ${p.enabled ? 'checked' : ''} onchange="App.togglePlugin('${p.id}')">
            <span class="ts-slider"></span>
          </label>
        </div>
        <div class="plg-desc">${p.desc}</div>
        <div class="plg-stats"><span>★ <b>${p.rating}</b></span><span><b>${p.users}</b> users</span><span>Plan: <b>${p.plan}</b></span></div>
        <div class="plg-footer"><button class="btn btn-danger btn-xs" onclick="App.uninstallPlugin('${p.id}')">Remove</button></div>
      </div>`).join('');
    }
    if (storeGrid) {
      storeGrid.innerHTML = Plugins.getStore().map(p => `<div class="plugin-card store">
        <div class="plg-header">
          <div class="plg-icon" style="background:${p.iconBg};color:${p.iconColor};font-size:18px">${p.icon}</div>
          <div class="plg-title"><b>${p.name}</b><small>${p.category} · v${p.version}</small></div>
        </div>
        <div class="plg-desc">${p.desc}</div>
        <div class="plg-stats"><span>★ <b>${p.rating}</b></span><span><b>${p.users}</b> users</span></div>
        <div class="plg-footer"><span class="plg-price">${p.price}</span><button class="btn btn-primary btn-xs" onclick="App.installPlugin('${p.id}')">${p.installed ? 'Installed ✓' : 'Install'}</button></div>
      </div>`).join('');
    }
  }

  // ── Transparency Section ───────────────────────────────────
  function renderTransparency() {
    // Realtime PnL Chart
    const pnlHist = Portfolio.getEquityHistory().slice(-100);
    ChartEngine.createEquityCurve('realtime-pnl-chart', pnlHist);

    const tbody = $('audit-tbody'); if (!tbody) return;
    const log = Trading.getAuditLog(30);
    const ACTIONS = ['TRADE', 'DEPOSIT', 'TRANSFER', 'SIGNAL', 'HEDGE', 'REBALANCE'];
    const SYMS = ['BTC/USD','ETH/USD','AAPL','GOLD','EUR/USD','SOL/USD'];
    tbody.innerHTML = log.map(l => {
      const action = l.msg.includes('Buy') || l.msg.includes('long') ? 'BUY' : l.msg.includes('Sell') || l.msg.includes('short') ? 'SELL' : pick(ACTIONS);
      const sym = SYMS.find(s => l.msg.includes(s.split('/')[0])) || pick(SYMS);
      const amt = '$' + fmt(Math.random() * 50000 + 1000, 2);
      const block = Math.floor(Math.random() * 900000 + 18000000);
      return `<tr>
        <td class="mono" style="color:#4a6070;font-size:11px">${new Date(l.ts).toLocaleTimeString()}</td>
        <td><span class="sig-dir-badge ${action==='BUY'?'buy':'sell'}" style="font-size:9px">${action}</span></td>
        <td class="mono">${sym}</td>
        <td class="mono ${action==='BUY'?'up':'down'}">${amt}</td>
        <td class="mono hash-short" style="font-size:10px;color:#00d4ff">${l.hash}</td>
        <td class="mono" style="font-size:10px;color:#4a6070">${block.toLocaleString()}</td>
        <td><span class="badge-verified" style="color:#00ff88;font-size:10px">✓ CONF</span></td>
      </tr>`;
    }).join('');

    const porGrid = $('por-grid');
    if (porGrid) {
      const assets = ['BTC','ETH','USDT','USDC'];
      porGrid.innerHTML = assets.map(id => {
        const a = MarketData.getAsset(id);
        const bal = (Math.random() * 500 + 100).toFixed(4);
        const val = a ? `$${fmt(parseFloat(bal) * a.price, 0)}` : '$—';
        return `<div class="por-item"><span>${id}</span><div><b class="mono">${bal}</b> <span style="color:#4a6080;font-size:10px">(${val})</span></div></div>`;
      }).join('');
    }

    // Fee breakdown
    const feeContainer = $('fee-breakdown-full');
    if (feeContainer) {
      feeContainer.innerHTML = `
        <div class="por-item"><span>Maker Fee</span><b class="mono">0.10%</b></div>
        <div class="por-item"><span>Taker Fee</span><b class="mono">0.18%</b></div>
        <div class="por-item"><span>Spread</span><b class="mono">0.02%</b></div>
        <div class="por-item"><span>Overnight</span><b class="mono">0.01%/day</b></div>
        <div class="por-item"><span>Fund Transfer</span><b class="mono">Free</b></div>
      `;
    }
  }

  // ── Security Section ──────────────────────────────────────
  let _keyStreamTimer = null;
  function renderSecurity() {
    const keyStream = $('key-stream');
    if (keyStream) {
      const chars = '0123456789ABCDEFabcdef';
      const gen = () => Array.from({ length: 64 }, () => chars[Math.floor(Math.random() * chars.length)]).join(' ');
      keyStream.textContent = gen();
      // Only run when security section is active, and clear previous timer
      if (_keyStreamTimer) clearInterval(_keyStreamTimer);
      if (_section === 'security') {
        _keyStreamTimer = setInterval(() => {
          if (_section !== 'security') { clearInterval(_keyStreamTimer); _keyStreamTimer = null; return; }
          keyStream.textContent = gen();
        }, 5000);
      }
    }

    // Active Sessions List
    const sessionsList = $('sessions-list');
    if (sessionsList) {
      const sessions = [
        { icon: 'fa-desktop',    device: 'Windows · Chrome 120',    ip: '192.168.x.x',   location: 'Current Device',  time: 'Active now', current: true  },
        { icon: 'fa-mobile-alt', device: 'iPhone · Safari 17',      ip: '31.xxx.xx.x',   location: 'London, UK',      time: '2h ago',     current: false },
        { icon: 'fa-laptop',     device: 'MacBook · Firefox 121',   ip: '82.xxx.xx.x',   location: 'New York, US',    time: '1d ago',     current: false },
        { icon: 'fa-tablet-alt', device: 'iPad · Chrome Mobile',    ip: '5.xx.xxx.xx',   location: 'Berlin, DE',      time: '3d ago',     current: false },
      ];
      sessionsList.innerHTML = sessions.map(s => `
        <div class="session-row${s.current ? ' current' : ''}">
          <i class="fa ${s.icon}"></i>
          <div class="sess-info">
            <b>${s.device}</b>
            <span>${s.ip} · ${s.location}</span>
          </div>
          <span class="sess-time">${s.time}</span>
          ${s.current
            ? '<span class="badge-current">CURRENT</span>'
            : '<button class="btn btn-danger btn-xs" onclick="App.revokeSession && App.revokeSession(this)">Revoke</button>'}
        </div>`).join('');
    }
  }

  // ── Live Feed ─────────────────────────────────────────────
  let _lastAllocData = null;
  function startLiveFeed() {
    MarketData.on('tick', () => {
      // Skip if page/tab is hidden (saves CPU when user switches apps)
      if (document.hidden) return;

      updateMarketPulseBar();
      updateFearGreed();
      if (_section === 'dashboard') {
        updateChartStats(_sym);
        const m = Portfolio.computeMetrics();
        updateDashKPIs(m);
        updateAllocTotal(m.totalValue);
        renderDashCopyTraders();
        // Only recreate allocation chart if data actually changed
        const allocKey = JSON.stringify(m.alloc);
        if (allocKey !== _lastAllocData) {
          _lastAllocData = allocKey;
          ChartEngine.createAllocationChart('alloc-donut', m.alloc);
        }
      }
      if (_section === 'trading') { updateTerminalPrice(); renderPositions(); renderCopyTraders(); }
      if (_section === 'markets') { renderMarketsTable(); }
      if (_section === 'ai-engine') {
        updateCrisisBanner();
        renderAILayers($('ai-asset-filter')?.value || 'BTC');
      }

      // ── Sentiment panel (dashboard) ───────────────────────
      if (_section === 'dashboard') {
        const fg2 = MarketData.getFearGreed();
        const sentLabelEl = $('sent-label');
        const sentValueEl = $('sent-value');
        const sentBrkEl   = $('sentiment-breakdown');
        if (sentLabelEl) {
          sentLabelEl.textContent = fg2.label;
          sentLabelEl.className   = `sent-label ${fg2.value > 60 ? 'up' : fg2.value < 40 ? 'down' : ''}`;
        }
        if (sentValueEl) sentValueEl.textContent = fg2.value;
        if (sentBrkEl) {
          const mkBar = (lbl, pct, color) =>
            `<div class="sb-row"><span style="min-width:52px">${lbl}</span>` +
            `<div class="sb-bar"><div style="width:${Math.min(100,pct)}%;height:100%;background:${color};border-radius:2px;transition:width .6s ease"></div></div>` +
            `<span style="min-width:28px;text-align:right">${Math.min(100,pct)}%</span></div>`;
          const bullPct = fg2.value;
          const bearPct = 100 - fg2.value;
          const neutPct = Math.round(50 - Math.abs(fg2.value - 50) * 0.5);
          sentBrkEl.innerHTML =
            mkBar('Bullish', bullPct, '#2ebd85') +
            mkBar('Bearish', bearPct, '#f6465d') +
            mkBar('Neutral', neutPct, '#f0a500');
        }
      }

      // ── Execution speed (topbar) ─────────────────────────
      const execEl = $('exec-speed');
      if (execEl) execEl.textContent = (0.2 + Math.random() * 1.3).toFixed(1) + 'ms';

      updateAIOrb();
    });

    AIEngine.on('signals', sigs => {
      renderSignalsMini(sigs.slice(0, 6));
      if (_section === 'signals') renderSignals();
      if (_section === 'ai-engine') renderAISetups();

      // ── AI Alert Panel ───────────────────────────────────
      const alertList = $('alert-list');
      if (alertList) {
        const top = sigs.slice(0, 10);
        alertList.innerHTML = top.length > 0
          ? top.map(s => {
              const clr  = s.dir === 'buy' ? '#2ebd85' : '#f6465d';
              const icon = s.dir === 'buy' ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down';
              return `<div class="np-item unread">` +
                `<div class="np-icon" style="background:${clr}1a;color:${clr}"><i class="fa ${icon}"></i></div>` +
                `<div><b>${s.symbol} ${s.dir.toUpperCase()}</b> — ${s.pattern}` +
                `<small>${s.conf}% confidence · ${s.timeframe} · R:R ${s.rr}</small></div></div>`;
            }).join('')
          : `<div class="np-item"><div class="np-icon ai"><i class="fa fa-circle-notch fa-spin"></i></div>` +
            `<div><b>Scanning markets…</b><small>AI is analysing ${MarketData.getAllAssets().length} assets</small></div></div>`;
      }
    });

    AIEngine.on('regime', r => {
      const el = $('dash-market-regime');
      if (el) el.textContent = r;
    });

    // Price flash on main chart header — tracks active symbol, not just BTC
    let _flashHandler = null;
    let _flashSymbol  = null;
    function _attachPriceFlash(sym) {
      if (_flashHandler && _flashSymbol) {
        try { MarketData.off(`price:${_flashSymbol}`, _flashHandler); } catch {}
      }
      _flashSymbol = sym;
      _flashHandler = d => {
        const priceEl = $('main-price-display');
        if (!priceEl) return;
        priceEl.classList.remove('flash-up', 'flash-down');
        void priceEl.offsetWidth; // force reflow so animation restarts
        priceEl.classList.add(d.price >= (d.prev || d.price) ? 'flash-up' : 'flash-down');
        setTimeout(() => priceEl.classList.remove('flash-up', 'flash-down'), 400);
      };
      MarketData.on(`price:${sym}`, _flashHandler);
    }
    _attachPriceFlash(_sym);
    // Re-attach when symbol changes
    const _origUpdateChart = updateChartStats;
    const _patchedUpdateChart = (id) => { _origUpdateChart(id); _attachPriceFlash(id); };
    // Expose so symbol-switch handler can call it
  }

  // ── Symbol Selector (Dashboard) ──────────────────────────
  function initHeader() {
    $$('.sym-btn[data-sym]').forEach(btn => {
      btn.addEventListener('click', async () => {
        $$('.sym-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _sym = btn.dataset.sym;
        const symbol = _sym;
        if (typeof AdvancedChartEngine !== 'undefined') {
          AdvancedChartEngine.changeTimeframe('main-price-chart', symbol, _activeTimeframe);
        } else {
          await ChartEngine.createCandlestickChart('main-price-chart', [], symbol, _activeTimeframe);
        }
        updateChartStats(_sym);
      });
    });

    // Chart TF buttons on dashboard
    $$('.chart-tf-btns .tf-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const parent = btn.closest('.chart-tf-btns');
        parent.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const timeframe = btn.dataset.tf;
        _activeTimeframe = timeframe;
        
        const symbol = _sym;
        try {
          if (typeof AdvancedChartEngine !== 'undefined') {
            AdvancedChartEngine.changeTimeframe('main-price-chart', symbol, timeframe);
          } else {
            await ChartEngine.createCandlestickChart('main-price-chart', [], symbol, timeframe);
          }
        } catch (e) { console.error('[TF change] failed:', e.message); }
      });
    });

    // AI asset filter
    const aiFilter = $('ai-asset-filter');
    if (aiFilter) aiFilter.addEventListener('change', () => renderAIEngine());
  }

  // ── Notification Panel ─────────────────────────────────────
  function initNotifPanel() {
    const notifBtn  = $('notif-btn');
    const notifPanel = $('notif-panel');
    const alertBtn  = $('alert-btn');
    const alertPanel = $('alert-panel');

    if (notifBtn && notifPanel) {
      notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifPanel.classList.toggle('open');
        if (alertPanel) alertPanel.classList.remove('open');
      });
    }
    if (alertBtn && alertPanel) {
      alertBtn.addEventListener('click', e => {
        e.stopPropagation();
        alertPanel.classList.toggle('open');
        if (notifPanel) notifPanel.classList.remove('open');
      });
    }
    document.addEventListener('click', () => {
      if (notifPanel) notifPanel.classList.remove('open');
      if (alertPanel) alertPanel.classList.remove('open');
    });
  }

  // ── Search Overlay ────────────────────────────────────────
  function initSearchOverlay() {
    const searchBtn = $('search-btn');
    const overlay   = $('search-overlay');
    const input     = $('search-input');
    const results   = $('search-results');

    const openSearch = () => { if (overlay) overlay.classList.add('open'); if (input) input.focus(); };
    const closeSearch = () => { if (overlay) overlay.classList.remove('open'); };

    if (searchBtn) searchBtn.addEventListener('click', e => { e.stopPropagation(); openSearch(); });
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
      if (e.key === 'Escape') closeSearch();
    });
    if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) closeSearch(); });

    if (input && results) {
      input.addEventListener('input', () => {
        const q = input.value.toLowerCase();
        if (!q) { results.innerHTML = ''; return; }
        const assets = MarketData.getAllAssets().filter(a => a.sym.toLowerCase().includes(q) || a.name.toLowerCase().includes(q));
        results.innerHTML = assets.slice(0, 8).map(a => {
          const cls = a.pct24h >= 0 ? 'up' : 'down';
          return `<div class="search-result-item" onclick="App.navigatePublic('markets')"><span class="sri-symbol">${a.sym}</span><span class="sri-name">${a.name}</span><span class="sri-price ${cls}">$${fmtPx(a.price)}</span></div>`;
        }).join('') || '<div class="search-no-result">No assets found</div>';
      });
    }
  }

  // ── Order Form Order Type ────────────────────────────────
  function initOrderForm() {
    $$('.order-type-tabs .ot-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.order-type-tabs .ot-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  // ── Toast System ─────────────────────────────────────────
  function showToast(msg, type = 'info', duration = 4000) {
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    const container = $('toast-container');
    if (!container) return;
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${msg}</span>`;
    container.prepend(t);
    requestAnimationFrame(() => { t.style.animation = 'toast-in .3s ease forwards'; t.style.opacity = '1'; });
    setTimeout(() => {
      t.style.animation = 'toast-out .3s ease forwards';
      setTimeout(() => t.remove(), 300);
    }, duration);
  }

  // ── Forgot Password ──────────────────────────────────────
  window.showForgotPassword = function() {
    const email = prompt('Enter your registered email address and we will send you a password reset link:');
    if (!email) return;
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }
    // Offline: acknowledge the request — real reset requires backend
    showToast('If that email is registered, a reset link has been sent. Check your inbox.', 'success', 6000);
    console.info('[ZEN] Password reset requested for:', trimmed);
  };

  // ── Enterprise SSO ───────────────────────────────────────
  window.showSSOInfo = function() {
    showToast('Enterprise SSO is available for institutional accounts. Contact support@zenassets.com to get started.', 'info', 7000);
  };

  // ── Live Notification Engine ──────────────────────────────
  const _notifications = [];
  const _maxNotifs = 25;
  let _notifTimer = null;

  function addNotification(icon, iconClass, title, detail) {
    const ago = 'Just now';
    _notifications.unshift({ icon, iconClass, title, detail, ts: Date.now(), ago });
    if (_notifications.length > _maxNotifs) _notifications.pop();
    _renderNotifications();
    // Update badge
    const badge = $('notif-badge');
    if (badge) { badge.textContent = Math.min(9, _notifications.filter(n => Date.now() - n.ts < 120000).length); badge.style.display = 'flex'; }
  }

  function _renderNotifications() {
    const list = $('notif-list'); if (!list) return;
    if (_notifications.length === 0) {
      list.innerHTML = '<div class="np-item"><i class="fa fa-check-circle np-icon ai"></i><div><b>All caught up</b><small>No new notifications</small></div></div>';
      return;
    }
    list.innerHTML = _notifications.map(n => {
      const ago = _timeAgo(n.ts);
      const unread = (Date.now() - n.ts < 120000) ? ' unread' : '';
      return `<div class="np-item${unread}"><i class="fa ${n.icon} np-icon ${n.iconClass}"></i><div><b>${n.title}</b>${n.detail}<small>${ago}</small></div></div>`;
    }).join('');
  }

  function _timeAgo(ts) {
    const sec = Math.floor((Date.now() - ts) / 1000);
    if (sec < 10) return 'Just now';
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    return `${hr}h ago`;
  }

  function startLiveNotifications() {
    // Initial notifications
    addNotification('fa-shield', 'sec', 'Security:', ' Session secured with 256-bit encryption');
    addNotification('fa-robot', 'ai', 'AI Engine:', ' All neural models loaded and calibrated');

    // Generate periodic live notifications
    const _notifTypes = [
      () => {
        const assets = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'AVAX'];
        const a = assets[Math.floor(Math.random() * assets.length)];
        const asset = MarketData.getAsset(a);
        if (!asset) return;
        const dir = asset.pct24h >= 0 ? 'bullish' : 'bearish';
        const conf = (70 + Math.random() * 25).toFixed(0);
        addNotification('fa-brain', 'ai', 'AI Signal:', ` ${a} ${dir} setup detected — ${conf}% confidence`);
      },
      () => {
        const amounts = ['1,200', '3,400', '5,800', '2,100', '8,500', '12,000'];
        const coins = ['BTC', 'ETH', 'BTC', 'SOL', 'BTC', 'ETH'];
        const i = Math.floor(Math.random() * amounts.length);
        const dest = ['Coinbase', 'Binance', 'unknown wallet', 'Kraken', 'cold storage'][Math.floor(Math.random() * 5)];
        addNotification('fa-water', 'whale', 'Whale Alert:', ` ${amounts[i]} ${coins[i]} moved to ${dest}`);
      },
      () => {
        if (typeof AutoTrader === 'undefined') return;
        const stats = AutoTrader.getStatistics();
        if (stats.totalTrades > 0) {
          addNotification('fa-chart-line', 'ai', 'Auto Trader:', ` ${stats.totalTrades} trades — WR ${stats.winRate.toFixed(1)}% — Net ${stats.totalPnL >= 0 ? '+' : ''}$${Math.abs(stats.totalPnL).toFixed(2)}`);
        }
      },
      () => {
        const regimes = ['Trending Bullish 📈', 'High Volatility ⚡', 'Accumulation Phase 🔄', 'Momentum Building 🚀', 'Range-Bound 📊'];
        const r = regimes[Math.floor(Math.random() * regimes.length)];
        addNotification('fa-globe', 'sec', 'Market Regime:', ` ${r}`);
      },
      () => {
        if (typeof InvestmentReturns === 'undefined') return;
        const snap = InvestmentReturns.getSnapshot();
        if (snap.walletBalance > 0) {
          addNotification('fa-coins', 'ai', 'Compound Interest:', ` +$${snap.todayPnL.toFixed(2)} earned today at ${snap.tierAPY} APY`);
        }
      },
    ];

    _notifTimer = setInterval(() => {
      const fn = _notifTypes[Math.floor(Math.random() * _notifTypes.length)];
      fn();
    }, 25000 + Math.random() * 15000); // Every 25-40 seconds
  }

  function clearNotifications() {
    _notifications.length = 0;
    _renderNotifications();
    const badge = $('notif-badge');
    if (badge) badge.style.display = 'none';
  }
  // expose globally for onclick
  window.clearNotifications = clearNotifications;

  // ── Helpers ──────────────────────────────────────────────
  function setText(id, val) { const el = $(id); if (el) el.textContent = val; }
  function setClass(id, cls) { const el = $(id); if (el) { el.classList.remove('up','down'); if (cls) el.classList.add(cls); } }
  function setClassOnEl(el, cls) { if (!el) return; el.classList.remove('up','down'); if (cls) el.classList.add(cls); }

  // ── Public Proxy Actions ──────────────────────────────────
  function quickTrade(assetId) {
    // Switch main chart to this asset then navigate to dashboard
    _sym = assetId;
    // Update sym-btn active state
    $$('.sym-btn[data-sym]').forEach(b => {
      b.classList.toggle('active', b.dataset.sym === assetId);
    });
    navigate('dashboard');
    // Load the chart for this asset
    if (typeof AdvancedChartEngine !== 'undefined') {
      AdvancedChartEngine.changeTimeframe('main-price-chart', assetId, _activeTimeframe);
    }
    updateChartStats(assetId);
  }
  function togglePlugin(id)   { Plugins.toggleActive(id); renderPlugins(); }
  function installPlugin(id)  { Plugins.installPlugin(id); renderPlugins(); showToast('Plugin installed!', 'success'); }
  function uninstallPlugin(id){ Plugins.uninstallPlugin(id); renderPlugins(); showToast('Plugin removed', 'info'); }
  function closePosition(posId){
    const pos = Trading.closePosition(posId);
    renderPositions();
    if (pos) {
      const pnlStr = `${pos.pnl >= 0 ? '+' : ''}$${Math.abs(pos.pnl).toFixed(2)}`;
      showToast(`Position closed: ${pos.sym} ${pos.side.toUpperCase()} → P&L: ${pnlStr}`, pos.pnl >= 0 ? 'success' : 'warning');
      addNotification(pos.pnl >= 0 ? 'fa-arrow-up' : 'fa-arrow-down', pos.pnl >= 0 ? 'ai' : 'whale', 'Position Closed:', ` ${pos.sym} ${pnlStr}`);
      // Gamification: track profit
      if (typeof Gamification !== 'undefined' && pos.pnl > 0) Gamification.trackProfit(pos.pnl);
    }
  }
  function toggleCopyTrader(id){ Trading.toggleCopyTrader(id); renderCopyTraders(); renderDashCopyTraders(); }
  function navigatePublic(s)  { navigate(s); }

  // ── Entry Point ───────────────────────────────────────────
  function init() {
    console.log('🔄 App init starting...');
    
    // Initialize auth system first
    if (typeof UserAuth !== 'undefined') UserAuth.init();
    
    // Get DOM elements
    const loginScreen = $('login-screen');
    const appDiv = $('app');

    // Check if user has a remembered session ("Remember me" was checked)
    if (typeof UserAuth !== 'undefined' && UserAuth.isLoggedIn()) {
      console.log('🔓 Remembered session found — skipping login screen');
      if (loginScreen) loginScreen.style.display = 'none';
      proceedAfterLogin();
      return; // skip login/register screen setup
    }

    // No active session — show login screen
    console.log('🔒 No active session - showing login screen');
    if (loginScreen) loginScreen.style.display = 'flex';
    if (appDiv) appDiv.classList.remove('app-visible');
    document.body.style.overflow = 'auto';
    // Keep the full login screen layout visible (including FOMO banner).
    // Do not force modal mode on load.
    if (typeof AuthManager !== 'undefined' && AuthManager.closeAllModals) AuthManager.closeAllModals();
    
    initLoginScreen();
    initRegisterScreen();
    initModalHandlers();
  }

  function initLoginScreen() {
    const loginForm = $('login-form');
    if (!loginForm) { proceedAfterLogin(); return; }
    
    // ── Addictive Login Enhancements (wrapped for safety) ──
    const _safeInit = fn => { try { fn(); } catch(e) { console.warn('Login init error:', e.message); } };
    _safeInit(_initLoginParticles);
    _safeInit(_initInflationCounter);
    _safeInit(_initTestimonialCarousel);
    _safeInit(_initLiveCounterAnimation);
    _safeInit(_initFOMOBanner);
    _safeInit(_initTimeHorizonButtons);
    _safeInit(_initAITradeFeed);
    _safeInit(_initMarketPulse);
    _safeInit(_initProofWall);
    _safeInit(_initSocialProofPopups);
    _safeInit(_initSinceArrived);

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = $('login-email').value.trim();
      const rememberMe = $('login-remember') ? $('login-remember').checked : false;

      if (!email) {
        _showLoginError('Please enter your email address.');
        return;
      }

      if (typeof UserAuth === 'undefined') {
        _showLoginError('Authentication system unavailable. Please refresh.');
        return;
      }

      // Show loading state
      const btn = document.querySelector('.btn-login');
      const origHTML = btn ? btn.innerHTML : '';
      if (btn) { btn.innerHTML = '<i class="fa fa-circle-notch fa-spin"></i> Signing in...'; btn.disabled = true; }

      let result;
      if (typeof _loginMode !== 'undefined' && _loginMode === 'pin') {
        // ── PIN login ──
        const pin = $('login-pin') ? $('login-pin').value.trim() : '';
        if (!pin) {
          _showLoginError('Please enter your 4-digit PIN.');
          if (btn) { btn.innerHTML = origHTML; btn.disabled = false; }
          return;
        }
        result = await UserAuth.pinLogin(email, pin, rememberMe);
      } else {
        // ── Password login ──
        const password = $('login-password').value;
        if (!password) {
          _showLoginError('Please enter your password.');
          if (btn) { btn.innerHTML = origHTML; btn.disabled = false; }
          return;
        }
        result = await UserAuth.login(email, password, rememberMe);
      }

      if (result.ok) {
        _dismissLoginScreen();
      } else if (result.requires_otp) {
        if (btn) { btn.innerHTML = origHTML; btn.disabled = false; }
        _showLoginOTPStep(email, result.userId, result.message);
        return;
      } else {
        _showLoginError(result.error || 'Login failed.');
      }
      if (btn) { btn.innerHTML = origHTML; btn.disabled = false; }
    });
  }

  // ── Login OTP Step ──────────────────────────────────────────
  function _showLoginOTPStep(email, userId, message) {
    const loginForm = $('login-form');
    const otpStep   = $('login-otp-step');
    if (!loginForm || !otpStep) return;

    loginForm.style.display = 'none';
    otpStep.style.display   = 'block';
    const emailLabel = $('login-otp-email');
    if (emailLabel) emailLabel.textContent = email;

    setTimeout(() => { const inp = $('login-otp-code'); if (inp) inp.focus(); }, 100);
    _startOTPTimer('login-otp-timer', 'login-otp-resend');

    // OTP form submit
    const otpForm = $('login-otp-form');
    if (otpForm) {
      otpForm.onsubmit = async (ev) => {
        ev.preventDefault();
        const code = ($('login-otp-code') || {}).value || '';
        const btn  = otpForm.querySelector('button[type="submit"]');
        const orig = btn ? btn.innerHTML : '';
        if (btn) { btn.innerHTML = '<span>Verifying...</span>'; btn.disabled = true; }

        const res = await UserAuth.verifyLoginOTP(userId, code.trim());
        if (res.ok) {
          _dismissLoginScreen();
        } else {
          _showLoginError(res.error || 'Invalid code. Please try again.');
          if (btn) { btn.innerHTML = orig; btn.disabled = false; }
        }
      };
    }

    // Resend button
    const resendBtn = $('login-otp-resend');
    if (resendBtn) {
      resendBtn.onclick = async (ev) => {
        ev.preventDefault();
        if (resendBtn.style.pointerEvents === 'none') return;
        await UserAuth.resendOTP(userId, 'login_otp');
        _startOTPTimer('login-otp-timer', 'login-otp-resend');
      };
    }

    // Back link
    const backBtn = $('login-otp-back');
    if (backBtn) {
      backBtn.onclick = (ev) => {
        ev.preventDefault();
        otpStep.style.display  = 'none';
        loginForm.style.display = '';
        const codeInp = $('login-otp-code');
        if (codeInp) codeInp.value = '';
      };
    }
  }

  // ═══ ADDICTIVE LOGIN ENGINES ═══════════════════════════════

  // Floating particle canvas
  function _initLoginParticles() {
    const canvas = document.getElementById('login-particles');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, particles = [];

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() * 2 + 0.5,
        dx: (Math.random() - 0.5) * 0.4,
        dy: (Math.random() - 0.5) * 0.3,
        a: Math.random() * 0.5 + 0.1,
        color: Math.random() > 0.6 ? 'rgba(212,165,116,' : 'rgba(0,255,136,'
      });
    }

    function draw() {
      if (!document.getElementById('login-particles')) return; // stop after login
      ctx.clearRect(0, 0, w, h);
      particles.forEach(p => {
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0 || p.x > w) p.dx *= -1;
        if (p.y < 0 || p.y > h) p.dy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + p.a + ')';
        ctx.fill();
      });
      // Draw faint connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = 'rgba(212,165,116,' + (0.06 * (1 - dist / 120)) + ')';
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(draw);
    }
    draw();
  }

  // Inflation counter — shows how much money user is losing per second
  function _initInflationCounter() {
    const el = document.getElementById('inflation-counter');
    if (!el) return;
    const startTime = Date.now();
    const lossPerSecond = 0.23; // ~$7.25M/year ÷ 365 ÷ 86400 for avg American
    function tick() {
      if (!document.getElementById('inflation-counter')) return;
      const elapsed = (Date.now() - startTime) / 1000;
      const lost = (elapsed * lossPerSecond).toFixed(2);
      el.textContent = '$' + parseFloat(lost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      requestAnimationFrame(tick);
    }
    tick();
  }

  // Testimonial carousel with auto-rotation
  function _initTestimonialCarousel() {
    const cards = document.querySelectorAll('.lt-card');
    const dots = document.querySelectorAll('.lt-dot');
    if (!cards.length) return;
    let current = 0;

    function showTestimonial(idx) {
      cards.forEach(c => c.classList.remove('active'));
      dots.forEach(d => d.classList.remove('active'));
      cards[idx].classList.add('active');
      if (dots[idx]) dots[idx].classList.add('active');
      current = idx;
    }

    // Make switchTestimonial globally available for onclick
    window.switchTestimonial = function(idx) { showTestimonial(idx); };

    // Auto-rotate every 5s
    setInterval(() => {
      if (!document.querySelector('.lt-card')) return;
      showTestimonial((current + 1) % cards.length);
    }, 5000);
  }

  // Live counter number animation (AUM, profit, investors)
  function _initLiveCounterAnimation() {
    const aumEl = document.getElementById('llc-aum');
    const profitEl = document.getElementById('llc-profit');
    const investorsEl = document.getElementById('llc-users');
    if (!aumEl) return;

    let aum = 97293847412;
    let profit = 284729100;
    let investors = 18427;

    setInterval(() => {
      if (!document.getElementById('llc-aum')) return;
      // Small random increments — scaled to $97B platform
      aum += Math.floor(Math.random() * 250000 + 50000);
      profit += Math.floor(Math.random() * 80000 + 20000);
      investors += Math.floor(Math.random() * 3);

      aumEl.textContent = '$' + aum.toLocaleString();
      profitEl.textContent = '+$' + profit.toLocaleString();
      investorsEl.textContent = investors.toLocaleString();
    }, 3000);
  }

  // FOMO banner — dynamic urgency feed with seamless marquee
  function _initFOMOBanner() {
    const banner = document.querySelector('.fomo-banner');
    const scroll = document.querySelector('.fomo-scroll');
    if (!banner || !scroll) return;

    if (window.__fomoTicker) clearInterval(window.__fomoTicker);

    // Institutional-grade personas
    const names = ['M. Krause', 'S. Thornton', 'D. Rowe', 'J. Whitfield', 'O. Mercer', 'E. Jensen', 'C. Hadley', 'R. Ashford', 'L. Beaumont', 'T. Vance'];

    // Live state — mutates across renders
    let liveCount    = 18427;
    let totalFlow    = 4812000;
    let diamondLeft  = 11;
    let platinumLeft = 34;
    let cycleMin     = 14;
    let harvestMin   = 9;

    const pick  = arr => arr[Math.floor(Math.random() * arr.length)];
    const money = n   => '$' + Math.round(n).toLocaleString();
    const flowStr = () => totalFlow >= 1e6
      ? '$' + (totalFlow / 1e6).toFixed(2) + 'M'
      : money(totalFlow);

    // HOOK 1 — LIFE MOMENTUM ("The activity effect")
    // Every second, somewhere, money is moving. The platform never sleeps.
    const momentumEvents = () => {
      const deposit = 50000 + Math.random() * 950000;
      const gain    = (2.8 + Math.random() * 9.4).toFixed(2);
      return pick([
        `<span class="fomo-item"><i class="fa fa-circle-check fomo-green"></i> ${pick(names)} entered position — <strong>${money(deposit)}</strong> deployed. Capital working <em>right now</em>.</span>`,
        `<span class="fomo-item"><i class="fa fa-arrow-trend-up fomo-green"></i> ${pick(names)} portfolio up <strong>+${gain}%</strong> this week. Compounding in progress. No action taken.</span>`,
        `<span class="fomo-item"><i class="fa fa-bolt fomo-gold"></i> ${pick(names)} reinvested <strong>${money(1200 + Math.random() * 48000)}</strong> in returns. Cycle extended. Clock restarted.</span>`,
        `<span class="fomo-item"><i class="fa fa-signal fomo-green"></i> ${pick(names)} upgraded position. New tier locked. Compound rate adjusted upward — automatically.</span>`,
      ]);
    };

    // HOOK 2 — PRIVATE ACCESS ("The inner-circle effect")
    // You are watching a room you are not yet inside.
    const innerCircleEvents = () => {
      const insiders = 3 + Math.floor(Math.random() * 9);
      return pick([
        `<span class="fomo-item"><i class="fa fa-crown fomo-gold"></i> <strong>Diamond Tier — ${diamondLeft} of 50</strong> quarterly positions unfilled. Not open to the public.</span>`,
        `<span class="fomo-item"><i class="fa fa-lock fomo-gold"></i> Platinum inner-circle: <strong>${platinumLeft} slots active.</strong> Priority reserved for referred &amp; returning capital only.</span>`,
        `<span class="fomo-item"><i class="fa fa-user-secret fomo-slate"></i> Private yield-lock session: <strong>${pick(names)} and ${insiders} others</strong> are inside right now. Closed to new entries.</span>`,
        `<span class="fomo-item"><i class="fa fa-shield-halved fomo-gold"></i> <strong>Closed cycle in progress.</strong> Top-tier holders executing. Standard queue resumes Monday.</span>`,
      ]);
    };

    // HOOK 3 — ANTICIPATION ("The next-move effect")
    // Something is always about to happen. Miss it and you wait another full cycle.
    const anticipationEvents = () => {
      cycleMin   = Math.max(2, cycleMin   - (Math.random() > 0.55 ? 1 : 0));
      harvestMin = Math.max(1, harvestMin - (Math.random() > 0.5  ? 1 : 0));
      const closeHrs = 2 + Math.floor(Math.random() * 10);
      return pick([
        `<span class="fomo-item"><i class="fa fa-stopwatch fomo-amber"></i> Next AI execution cycle: <strong>${cycleMin} min.</strong> Accounts not yet funded will miss this window entirely.</span>`,
        `<span class="fomo-item"><i class="fa fa-clock fomo-amber"></i> Yield-harvest window opens in <strong>${harvestMin} min.</strong> Active positions qualify automatically. Idle capital does not.</span>`,
        `<span class="fomo-item"><i class="fa fa-calendar-check fomo-gold"></i> Weekly compound lock-in closes in <strong>${closeHrs} hours.</strong> Returns that miss this window roll to next cycle — not your pocket.</span>`,
        `<span class="fomo-item"><i class="fa fa-rocket fomo-green"></i> Portfolio rebalance at next market bell. <strong>Diamond holders pre-queued.</strong> Everyone else waits.</span>`,
      ]);
    };

    // HOOK 4 — STATUS &amp; CONTROL ("Sovereign capital" language)
    // Your money obeys you. You own the outcome.
    const statusEvents = () => {
      const portfolio = money(180000 + Math.random() * 4600000);
      return pick([
        `<span class="fomo-item"><i class="fa fa-gem fomo-gold"></i> ${pick(names)} — Diamond Tier. <strong>${portfolio}</strong> under sovereign-grade AI management. Full liquidity retained.</span>`,
        `<span class="fomo-item"><i class="fa fa-chess-king fomo-gold"></i> ${pick(names)}: elite position held. Capital compounds autonomously. Zero manual intervention required.</span>`,
        `<span class="fomo-item"><i class="fa fa-infinity fomo-green"></i> ${pick(names)}: <strong>"The AI executed 47 trades while I slept. I woke up richer."</strong></span>`,
        `<span class="fomo-item"><i class="fa fa-trophy fomo-gold"></i> Top 3% return this week — all Diamond holders. <strong>The gap between tiers widens every single cycle.</strong></span>`,
      ]);
    };

    // HOOK 5 — MICRO SIGNALS ("The alive-page effect")
    // Tiny, real-time numbers that signal constant motion.
    const microEvents = () => {
      liveCount += Math.floor(Math.random() * 4);
      totalFlow += 14000 + Math.random() * 39000;
      const signals = 820 + Math.floor(Math.random() * 80);
      const secs    = 8  + Math.floor(Math.random() * 40);
      return pick([
        `<span class="fomo-item"><i class="fa fa-signal fomo-green"></i> <strong>${liveCount.toLocaleString()}</strong> investors online. Capital compounding in real time. No pause.</span>`,
        `<span class="fomo-item"><i class="fa fa-chart-line fomo-green"></i> <strong>${flowStr()}</strong> deployed this hour. AI systems operating at full capacity.</span>`,
        `<span class="fomo-item"><i class="fa fa-wifi fomo-green"></i> AI heartbeat: <strong>${signals} signals processed</strong> in the last 90 seconds. Zero downtime recorded.</span>`,
        `<span class="fomo-item"><i class="fa fa-circle fomo-live"></i> <strong>${pick(names)}</strong> position updated <strong>${secs}s ago.</strong> Return logged. Balance adjusted.</span>`,
      ]);
    };

    // HOOK 6 — DISCIPLINE · TIMING · MONEY LOGIC
    // The cold arithmetic that makes inaction feel criminal.
    const disciplineEvents = () => {
      const claimed = money(3800 + Math.random() * 96000);
      const days    = 60 + Math.floor(Math.random() * 120);
      return pick([
        `<span class="fomo-item"><i class="fa fa-calculator fomo-slate"></i> <strong>Money logic:</strong> capital not deployed today is money gifted to inflation tomorrow. There are no neutral positions.</span>`,
        `<span class="fomo-item"><i class="fa fa-hourglass-half fomo-amber"></i> ${pick(names)} collected <strong>${claimed}</strong> in scheduled returns. Entry date: <strong>${days} days ago.</strong> Discipline paid.</span>`,
        `<span class="fomo-item"><i class="fa fa-coins fomo-gold"></i> Every <strong>24-hour delay</strong> on a $250K account costs <strong>$178.08</strong> in compound growth. Every. Single. Day.</span>`,
        `<span class="fomo-item"><i class="fa fa-scale-balanced fomo-slate"></i> <strong>The math:</strong> $500K at Diamond tier (75% annual) = <strong>$875,000 Year 1.</strong> Your bank offers 0.5%. You decide.</span>`,
      ]);
    };

    // HOOK 7 — TOP-TIER SCARCITY ("Minimum to remaining Diamond / Platinum")
    // The gap between tiers is structural. So is the countdown.
    const scarcityEvents = () => {
      diamondLeft  = Math.max(4, diamondLeft  - (Math.random() > 0.78 ? 1 : 0));
      platinumLeft = Math.max(9, platinumLeft - (Math.random() > 0.82 ? 1 : 0));
      return pick([
        `<span class="fomo-item"><i class="fa fa-fire fomo-amber"></i> <strong>Diamond Tier:</strong> ${diamondLeft} of 50 Q1 positions open. Min. entry <strong>$500,000.</strong> Acceptance not guaranteed.</span>`,
        `<span class="fomo-item"><i class="fa fa-hourglass-end fomo-amber"></i> <strong>Platinum:</strong> ${platinumLeft} slots. Min. <strong>$150,000.</strong> Q1 allocation window closes <strong>March 31.</strong></span>`,
        `<span class="fomo-item"><i class="fa fa-arrow-up-right-dots fomo-green"></i> Top-tier distribution: Diamond accounts generating <strong>6.2× more</strong> than Silver this quarter alone.</span>`,
        `<span class="fomo-item"><i class="fa fa-triangle-exclamation fomo-amber"></i> <strong>Bronze &amp; Silver: FULL.</strong> Gold ($50K+) · Platinum ($150K+) · Diamond ($500K+) — only tiers accepting capital this cycle.</span>`,
      ]);
    };

    // Build one full ticker line — all 7 hooks in sequence
    function buildFeedLine() {
      const items = [
        momentumEvents(),
        innerCircleEvents(),
        anticipationEvents(),
        statusEvents(),
        microEvents(),
        disciplineEvents(),
        scarcityEvents(),
        momentumEvents(),  // repeat for seamless -50% CSS loop
      ];
      return items.join('<span class="fomo-sep">  ⚡  </span>');
    }

    function renderFeed() {
      const line = buildFeedLine();
      scroll.style.opacity = '0.2';
      setTimeout(() => {
        scroll.innerHTML = line + '<span class="fomo-sep">  ⚡  </span>' + line;
        scroll.style.opacity = '1';
      }, 180);
    }

    renderFeed();
    window.__fomoTicker = setInterval(renderFeed, 10000);

    banner.onmouseenter = () => { scroll.style.animationPlayState = 'paused'; };
    banner.onmouseleave = () => { scroll.style.animationPlayState = 'running'; };
  }

  function _showLoginError(msg) {
    // Use the dedicated error box if available, otherwise inline
    const errBox = $('login-error');
    if (errBox) {
      errBox.textContent = msg;
      errBox.classList.add('visible');
      setTimeout(() => errBox.classList.remove('visible'), 6000);
      return;
    }
    const btn = document.querySelector('.btn-login');
    if (!btn) return;
    const prev = btn.parentElement.querySelector('.login-inline-err');
    if (prev) prev.remove();
    const div = document.createElement('div');
    div.className = 'login-inline-err';
    div.style.cssText = 'color:#d65d5d;font-size:13px;margin-top:8px;text-align:center;';
    div.textContent = msg;
    btn.parentElement.appendChild(div);
    setTimeout(() => div.remove(), 5000);
  }

  function _dismissLoginScreen() {
    const loginScreen = $('login-screen');
    if (loginScreen) {
      loginScreen.style.opacity = '0';
      loginScreen.style.transition = 'opacity 600ms ease';
      document.body.style.overflow = 'hidden'; // Lock scroll for app view
      setTimeout(() => { loginScreen.style.display = 'none'; proceedAfterLogin(); }, 600);
    }
  }

  // ── Time Horizon Buttons (performance-timeline selector) ──
  function _initTimeHorizonButtons() {
    const btns = document.querySelectorAll('.pt-btn');
    const scenarios = document.querySelectorAll('.pt-scenario');
    if (!btns.length) return;
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const years = btn.dataset.years;
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        scenarios.forEach(s => {
          s.style.display = s.dataset.years === years ? 'block' : 'none';
        });
      });
    });
  }

  // ── AI Trade Feed — simulated live executions ─────────────
  function _initAITradeFeed() {
    const list = document.getElementById('atf-list');
    const countEl = document.getElementById('atf-count');
    const dailyEl = document.getElementById('atf-daily-profit');
    if (!list) return;

    const syms = ['BTC/USD','ETH/USD','BNB/USD','SOL/USD','NVDA','AAPL','TSLA','MSFT','AMZN','XRP/USD','ADA/USD'];
    const dirs = [['▲ LONG','up'],['▲ BUY','up'],['▼ SHORT','dn'],['▲ BUY','up'],['▲ BUY','up'],['▲ LONG','up']];
    let tradeCount = 847;
    let dailyProfit = 284729100;

    function addTrade() {
      if (!document.getElementById('atf-list')) return;
      const sym = syms[Math.floor(Math.random() * syms.length)];
      const [dirText, dirClass] = dirs[Math.floor(Math.random() * dirs.length)];
      const isWin = dirClass === 'up' || Math.random() > 0.07;
      const pl = isWin
        ? '+$' + Math.floor(800 + Math.random() * 18000).toLocaleString()
        : '-$' + Math.floor(200 + Math.random() * 1200).toLocaleString();
      const row = document.createElement('div');
      row.className = 'atf-row ' + (isWin ? 'win' : 'loss');
      row.innerHTML = `<span class="atf-sym">${sym}</span><span class="atf-dir ${dirClass}">${dirText}</span><span class="atf-pl">${pl}</span><span class="atf-time">just now</span>`;
      row.style.opacity = '0';
      list.insertBefore(row, list.firstChild);
      requestAnimationFrame(() => { row.style.transition = 'opacity 0.4s'; row.style.opacity = '1'; });
      // Remove oldest if more than 8 rows
      while (list.children.length > 8) list.removeChild(list.lastChild);
      // Update age of existing rows
      list.querySelectorAll('.atf-time').forEach((el, i) => {
        if (i === 0) return;
        const secs = (i * 14) + Math.floor(Math.random() * 8);
        el.textContent = secs < 60 ? secs + 's ago' : Math.floor(secs/60) + 'm ago';
      });
      tradeCount += Math.floor(Math.random() * 3) + 1;
      if (isWin) dailyProfit += Math.floor(800 + Math.random() * 8000);
      if (countEl) countEl.textContent = tradeCount.toLocaleString() + ' trades today';
      if (dailyEl) dailyEl.textContent = '$' + dailyProfit.toLocaleString();
    }

    setInterval(() => { if (document.getElementById('atf-list')) addTrade(); }, 4500);
  }

  // ── Market Pulse — ticking prices ────────────────────────
  function _initMarketPulse() {
    if (!document.getElementById('mp-btc')) return;
    const assets = [
      { id:'mp-btc', chId:'mp-btc-ch', price:97241, vol:180 },
      { id:'mp-eth', chId:'mp-eth-ch', price:3847,  vol:12 },
      { id:'mp-bnb', chId:'mp-bnb-ch', price:684,   vol:4 },
      { id:'mp-nvda', chId:'mp-nvda-ch', price:142.80, vol:1.2 },
      { id:'mp-aapl', chId:'mp-aapl-ch', price:217.64, vol:0.9 },
      { id:'mp-sol',  chId:'mp-sol-ch',  price:189.30,  vol:3.2 },
    ];
    const signals = [
      'STRONG BUY — 94.2% confidence on BTC/ETH',
      'AI REBALANCING — Rotating into large-cap crypto',
      'HIGH MOMENTUM — 7 long positions opened last 5 min',
      'BULL SIGNAL — All 5 major indicators aligned',
      'COMPOUND CYCLE — Profits auto-reinvesting now',
    ];
    let sigIdx = 0;
    const sigEl = document.getElementById('mp-signal');

    setInterval(() => {
      assets.forEach(a => {
        const el = document.getElementById(a.id);
        const chEl = document.getElementById(a.chId);
        if (!el) return;
        const delta = (Math.random() - 0.48) * a.vol * 0.008;
        a.price = Math.max(a.price * (1 + delta), 0.01);
        const chPct = ((delta / (a.price / (1 + delta))) * 100);
        const chStr = (chPct >= 0 ? '+' : '') + chPct.toFixed(2) + '%';
        el.textContent = a.price > 1000 ? '$' + Math.round(a.price).toLocaleString()
          : a.price > 10 ? '$' + a.price.toFixed(2)
          : '$' + a.price.toFixed(4);
        if (chEl) {
          chEl.textContent = chStr;
          chEl.className = 'mp-change ' + (chPct >= 0 ? 'up' : 'dn');
        }
      });
      sigIdx = (sigIdx + 1) % signals.length;
      if (sigEl && Math.random() > 0.7) sigEl.textContent = signals[sigIdx];
    }, 2200);
  }

  // ── Proof Wall — occasionally adds a new withdrawal ──────
  function _initProofWall() {
    const totalEl = document.getElementById('pw-total-paid');
    const latestEl = document.getElementById('pw-latest');
    const latestAmtEl = document.getElementById('pw-latest-amount');
    if (!totalEl) return;
    const names = ['A██████ J.','R██████ N.','C██████ V.','E██████ S.','T██████ H.','P██████ L.'];
    const tiers = [['gold','Gold'],['silver','Silver'],['platinum','Platinum'],['diamond','💎 Diamond']];
    let totalPaid = 47284130;
    let ticker = 0;

    setInterval(() => {
      if (!document.getElementById('pw-total-paid')) return;
      totalPaid += Math.floor(5000 + Math.random() * 95000);
      if (totalEl) totalEl.textContent = '$' + totalPaid.toLocaleString();
      ticker++;
      if (ticker % 4 === 0 && latestEl && latestAmtEl) {
        const amt = Math.floor(8000 + Math.random() * 140000);
        const name = names[Math.floor(Math.random() * names.length)];
        const [tc, tl] = tiers[Math.floor(Math.random() * tiers.length)];
        latestAmtEl.textContent = '$' + amt.toLocaleString();
        latestEl.querySelector('.pw-name').textContent = name;
        latestEl.querySelector('.pw-tier').className = 'pw-tier ' + tc;
        latestEl.querySelector('.pw-tier').textContent = tl;
        latestEl.style.animation = 'none';
        requestAnimationFrame(() => { latestEl.style.animation = ''; });
      }
    }, 7000);
  }

  // ── Social Proof Popups ───────────────────────────────────
  function _initSocialProofPopups() {
    if (!document.querySelector('.login-brand-section')) return;
    const events = [
      { init:'MK', name:'Michael K.', action:'deposited <strong>$250,000</strong> — Gold Tier', time:'2 min ago' },
      { init:'ST', name:'Sarah T.', action:'withdrew <strong>$47,283</strong> in returns', time:'5 min ago' },
      { init:'JW', name:'James W.', action:'upgraded to <strong>Diamond Tier</strong>', time:'8 min ago' },
      { init:'DR', name:'David R.', action:'just earned <strong>$127,480</strong> this week', time:'just now' },
      { init:'OM', name:'Olivia M.', action:'started <strong>Platinum</strong> with $500K', time:'11 min ago' },
      { init:'RN', name:'Robert N.', action:'reinvested <strong>$84,200</strong> in profits', time:'3 min ago' },
      { init:'EJ', name:'Emily J.', action:'referred 3 friends — earned <strong>$8,400</strong>', time:'6 min ago' },
      { init:'TH', name:'Thomas H.', action:'portfolio up <strong>+63%</strong> in 14 months', time:'just now' },
      { init:'J\u2588', name:'Celebrity member', action:'quietly added <strong>$2,500,000</strong> — Diamond', time:'1 min ago' },
      { init:'A\u2588', name:'A-list investor', action:'withdrew <strong>$1,840,000</strong> in returns', time:'4 min ago' },
    ];
    let idx = Math.floor(Math.random() * events.length);

    function showPopup() {
      if (!document.querySelector('.login-brand-section')) return;
      if (document.querySelector('.login-screen.auth-mode')) return; // not during auth
      const ev = events[idx % events.length];
      idx++;
      const el = document.createElement('div');
      el.className = 'social-proof-popup';
      el.innerHTML = `<div class="spp-inner"><div class="spp-avatar">${ev.init}</div><div class="spp-body"><div class="spp-name">${ev.name}</div><div class="spp-action">${ev.action}</div><div class="spp-time"><i class="fa fa-clock" style="margin-right:4px"></i>${ev.time}</div></div></div>`;
      document.body.appendChild(el);
      setTimeout(() => {
        el.classList.add('sp-hiding');
        setTimeout(() => el.remove(), 350);
      }, 5500);
    }

    setTimeout(showPopup, 4000);
    setInterval(showPopup, 22000);
  }

  // ── Since You Arrived Counter ────────────────────────────────
  function _initSinceArrived() {
    const earnedEl    = document.getElementById('sa-earned');
    const tradesEl    = document.getElementById('sa-trades');
    const membersEl   = document.getElementById('sa-new-members');
    const barEl       = document.getElementById('sa-bar');
    if (!earnedEl) return;

    const pageLoadTime = Date.now();
    // Platform earns ~$284M/day = ~$3,287/second across all investors
    const earnPerSec   = 3287;
    const tradesPerSec = 0.98; // ~1 trade/sec
    const membersPerMin = 0.18; // ~11/hour

    let maxBarSec = 300; // bar fills over 5 minutes

    setInterval(() => {
      const elapsed = (Date.now() - pageLoadTime) / 1000;
      const earned  = Math.floor(elapsed * earnPerSec);
      const trades  = Math.floor(elapsed * tradesPerSec);
      const members = Math.floor(elapsed / 60 * membersPerMin * 60); // per minute calc

      if (earnedEl) earnedEl.textContent = '$' + earned.toLocaleString();
      if (tradesEl) tradesEl.textContent = trades.toLocaleString();
      if (membersEl) membersEl.textContent = members.toLocaleString();
      if (barEl) {
        const pct = Math.min((elapsed / maxBarSec) * 100, 100);
        barEl.style.width = pct + '%';
      }
    }, 1000);
  }

  // ── Registration ─────────────────────────────────────────
  function initRegisterScreen() {
    const form = $('register-form');
    if (!form) return;

    // Tier selection
    window.selectRegTier = (el) => {
      document.querySelectorAll('.tier-opt').forEach(o => o.classList.remove('selected'));
      el.classList.add('selected');
      el.querySelector('input[type="radio"]').checked = true;
      // Update min deposit hint
      const minMap = { bronze: 5000, silver: 25000, gold: 100000, platinum: 500000, diamond: 1000000 };
      const tier = el.dataset.tier;
      const depInput = $('reg-deposit');
      if (depInput) { depInput.min = minMap[tier] || 5000; depInput.placeholder = (minMap[tier] || 5000).toLocaleString(); }
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errBox = $('register-error');
      errBox.classList.remove('visible');

      const fullName = $('reg-name').value;
      const email    = $('reg-email').value;
      const password = $('reg-password').value;
      const pin      = ($('reg-pin') || {}).value || '';
      const tierRadio = document.querySelector('input[name="reg-tier"]:checked');
      const tier     = tierRadio ? tierRadio.value : 'gold';
      const deposit  = $('reg-deposit').value;

      if (typeof UserAuth === 'undefined') {
        errBox.textContent = 'Registration system unavailable. Please refresh the page.';
        errBox.classList.add('visible');
        return;
      }

      // Show loading state
      const btn = form.querySelector('button[type="submit"]');
      const origHTML = btn ? btn.innerHTML : '';
      if (btn) { btn.innerHTML = '<i class="fa fa-circle-notch fa-spin"></i> Creating account...'; btn.disabled = true; }

      const result = await UserAuth.register({ fullName, email, password, tier, deposit, pin });
      if (result.ok) {
        _dismissRegisterScreen();
        _showRegistrationSuccess(fullName);
      } else if (result.requiresVerification) {
        if (btn) { btn.innerHTML = origHTML; btn.disabled = false; }
        _showRegisterOTPStep(email, result.userId);
        return;
      } else {
        errBox.textContent = result.error;
        errBox.classList.add('visible');
      }
      if (btn) { btn.innerHTML = origHTML; btn.disabled = false; }
    });
  }

  // ── Register OTP Step ───────────────────────────────────────
  function _showRegisterOTPStep(email, userId) {
    const regForm  = $('register-form');
    const otpStep  = $('register-otp-step');
    if (!regForm || !otpStep) return;

    regForm.style.display  = 'none';
    otpStep.style.display  = 'block';
    const emailLabel = $('reg-otp-email');
    if (emailLabel) emailLabel.textContent = email;

    setTimeout(() => { const inp = $('register-otp-code'); if (inp) inp.focus(); }, 100);
    _startOTPTimer('reg-otp-timer', 'reg-otp-resend');

    // OTP form submit
    const otpForm = $('register-otp-form');
    if (otpForm) {
      otpForm.onsubmit = async (ev) => {
        ev.preventDefault();
        const code = ($('register-otp-code') || {}).value || '';
        const btn  = otpForm.querySelector('button[type="submit"]');
        const orig = btn ? btn.innerHTML : '';
        if (btn) { btn.innerHTML = '<i class="fa fa-circle-notch fa-spin"></i> Verifying...'; btn.disabled = true; }

        const res = await UserAuth.verifyEmailOTP(userId, code.trim());
        if (res.ok) {
          _dismissRegisterScreen();
          _showRegistrationSuccess(res.user ? res.user.fullName : email);
        } else {
          const errBox = $('register-error');
          if (errBox) { errBox.textContent = res.error || 'Invalid code. Please try again.'; errBox.classList.add('visible'); }
          if (btn) { btn.innerHTML = orig; btn.disabled = false; }
        }
      };
    }

    // Resend button
    const resendBtn = $('reg-otp-resend');
    if (resendBtn) {
      resendBtn.onclick = async (ev) => {
        ev.preventDefault();
        if (resendBtn.style.pointerEvents === 'none') return;
        await UserAuth.resendOTP(userId, 'email_verify');
        _startOTPTimer('reg-otp-timer', 'reg-otp-resend');
      };
    }
  }

  // ── OTP Countdown Timer ─────────────────────────────────────
  function _startOTPTimer(timerId, resendId) {
    const timerEl  = $(timerId);
    const resendEl = $(resendId);
    if (resendEl) { resendEl.style.pointerEvents = 'none'; resendEl.style.opacity = '0.4'; }

    let seconds = 60;
    if (timerEl) timerEl.textContent = ` (${seconds}s)`;

    const interval = setInterval(() => {
      seconds--;
      if (timerEl) timerEl.textContent = seconds > 0 ? ` (${seconds}s)` : '';
      if (seconds <= 0) {
        clearInterval(interval);
        if (resendEl) { resendEl.style.pointerEvents = ''; resendEl.style.opacity = '1'; }
      }
    }, 1000);
  }

  function _dismissRegisterScreen() {
    AuthManager.switchView('login');
  }

  function _showRegistrationSuccess(name) {
    const firstName = (name || 'Investor').split(' ')[0];
    // Create success overlay on login screen
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:200000;padding:18px 24px;background:linear-gradient(135deg,#00ff88,#00cc6a);color:#0a0e16;font-size:15px;font-weight:700;text-align:center;animation:slideDown .4s ease;box-shadow:0 4px 20px rgba(0,255,136,0.4);';
    toast.innerHTML = `<i class="fa fa-circle-check" style="margin-right:8px"></i>Welcome ${firstName}! Your account is ready. Sign in below to access your wealth dashboard.`;
    document.body.appendChild(toast);
    // Auto-remove after 8s
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.5s'; setTimeout(() => toast.remove(), 500); }, 8000);
    // Pre-fill email in login form
    const emailField = $('login-email');
    if (emailField) {
      const regEmail = $('reg-email');
      if (regEmail) emailField.value = regEmail.value;
      emailField.focus();
    }
  }

  function initModalHandlers() {
    // Tier Modal
    window.showTierModal = (event) => {
      if (event) event.preventDefault();
      const modal = $('tier-modal');
      if (modal) modal.style.display = 'flex';
    };

    window.closeTierModal = () => {
      const modal = $('tier-modal');
      if (modal) modal.style.display = 'none';
    };

    window.selectTier = (tier) => {
      console.log(`Selected tier: ${tier.toUpperCase()}`);
      closeTierModal();
      // In production, this would initiate onboarding flow for selected tier
      alert(`You've selected the ${tier.toUpperCase()} tier! In production, this would start your onboarding process.`);
    };

    // ── Smartsupp Live Chat Integration ──
    window.openSmartsuppChat = () => {
      if (typeof smartsupp === 'function') {
        smartsupp('chat:open');
        return;
      }
      // Widget still loading — poll up to 10s
      let n = 0;
      const t = setInterval(() => {
        if (typeof smartsupp === 'function') {
          clearInterval(t);
          smartsupp('chat:open');
        } else if (++n >= 20) {
          clearInterval(t);
          showToast('Chat unavailable — please email support@zenassets.com', 'error');
        }
      }, 500);
    };
    // Copy wallet address function
    window.copyAddress = async (address, button) => {
      try {
        await navigator.clipboard.writeText(address);
        const icon = button.querySelector('i');
        const originalClass = icon.className;
        
        // Visual feedback
        button.classList.add('copied');
        icon.className = 'fa fa-check';
        
        setTimeout(() => {
          button.classList.remove('copied');
          icon.className = originalClass;
        }, 2000);
      } catch (err) {
        // Fallback for older browsers
        const input = button.previousElementSibling;
        input.select();
        document.execCommand('copy');
        
        button.classList.add('copied');
        setTimeout(() => button.classList.remove('copied'), 2000);
      }
    };

    // ── Funding Method Tab Switcher ────────────────────────
    window.switchFundingMethod = (method, btn) => {
      document.querySelectorAll('.fm-tab').forEach(t => t.classList.remove('active'));
      if (btn) btn.classList.add('active');
      document.querySelectorAll('.fund-panel').forEach(p => p.classList.remove('active'));
      const panel = document.getElementById('fm-' + method);
      if (panel) panel.classList.add('active');
    };

    // ── Card Form Helpers ──────────────────────────────────
    window.formatCardNumber = (input) => {
      let v = input.value.replace(/\D/g, '').substring(0, 16);
      input.value = v.replace(/(\d{4})/g, '$1 ').trim();
    };
    window.formatExpiry = (input) => {
      let v = input.value.replace(/\D/g, '').substring(0, 4);
      if (v.length >= 2) v = v.substring(0, 2) + '/' + v.substring(2);
      input.value = v;
    };
    window.submitCardDeposit = (e) => {
      e.preventDefault();
      showToast('Card payment is being processed. Funds will appear in your balance shortly.', 'success');
      e.target.reset();
    };

    // ── Ensure External Crypto Links Always Open ──────────
    // Some mobile browsers / webapp modes block target="_blank" on styled <a> cards.
    // This adds a robust click handler that forces window.open() as a fallback.
    document.querySelectorAll('.bch-card[href], .wtb-platform[href]').forEach(link => {
      link.addEventListener('click', function(e) {
        const url = this.getAttribute('href');
        if (url && url.startsWith('http')) {
          e.preventDefault();
          const win = window.open(url, '_blank', 'noopener,noreferrer');
          if (!win) {
            // Popup blocked — fallback to location change
            window.location.href = url;
          }
        }
      });
    });

    // Investment Calculator Tab Switching
    const calculatorTabs = $$('.ic-tab');
    if (calculatorTabs.length > 0) {
      calculatorTabs.forEach(tab => {
        tab.addEventListener('click', () => {
          // Remove active from all tabs
          calculatorTabs.forEach(t => t.classList.remove('active'));
          // Add active to clicked tab
          tab.classList.add('active');
          
          // Hide all strategy content
          const fixedContent = $('strategy-fixed');
          const continuousContent = $('strategy-continuous');
          if (fixedContent) fixedContent.style.display = 'none';
          if (continuousContent) continuousContent.style.display = 'none';
          
          // Show selected strategy
          const strategy = tab.dataset.strategy;
          const selectedContent = $(strategy + '-content') || $('strategy-' + strategy);
          if (selectedContent) selectedContent.style.display = 'block';
        });
      });
    }
  }

  function proceedAfterLogin() {
    const loadingScreen = $('loading-screen');
    if (loadingScreen) loadingScreen.style.display = 'flex';
    initBootCanvas();
    runBoot();
    window._App = { showToast, navigate };

    // SAFETY: Force-remove loading screen after 12s in case boot animation stalls
    setTimeout(() => {
      const ls = $('loading-screen');
      if (ls && ls.style.display !== 'none') {
        ls.style.display = 'none';
        ls.style.pointerEvents = 'none';
        console.warn('⚠️ Loading screen force-removed (safety timeout)');
      }
      // Also ensure login screen is truly gone
      const login = $('login-screen');
      if (login && login.style.display !== 'none') {
        login.style.display = 'none';
        login.style.pointerEvents = 'none';
      }
    }, 12000);

    // After boot completes, sync user state
    setTimeout(() => {
      _syncUserUI();
      _initUserDropdown();
    }, 200);
  }

  // ── Sync User Badge & Tier ───────────────────────────────
  function _syncUserUI() {
    if (typeof UserAuth === 'undefined') return;

    const session = UserAuth.getSession();
    if (!session) return;

    // Update header badge
    const nameEl  = $('user-display-name');
    const tierEl  = $('user-display-tier');
    const avatarEl = $('user-avatar-initial');
    const tierLabel = $('ud-tier-label');

    if (nameEl)   nameEl.textContent = session.fullName || 'Trader';
    if (avatarEl) avatarEl.textContent = (session.fullName || 'T').charAt(0).toUpperCase();
    if (tierEl) {
      const t = UserAuth.TIERS[session.tier];
      tierEl.textContent = t ? `${t.label.toUpperCase()} TIER` : 'MEMBER';
    }
    if (tierLabel) {
      const t = UserAuth.TIERS[session.tier];
      tierLabel.textContent = t ? `${t.label} Tier` : 'Member';
    }

    // Show admin panel nav link for admin users
    const adminNavLink = $('nav-admin-panel');
    if (adminNavLink) {
      adminNavLink.style.display = (typeof UserAuth !== 'undefined' && UserAuth.isAdmin()) ? 'flex' : 'none';
    }

    // Load per-user investment state (set tier + load saved compounding data)
    if (typeof InvestmentReturns !== 'undefined') {
      InvestmentReturns.setTier(session.tier);
      InvestmentReturns.loadForUser(); // catches up compounding from time away
      // Immediately update UI with loaded balance (don't wait for 5s interval)
      try { updateReturnsUI(); updateFundManagerUI(); } catch(e) {}
    }

    // Balance is ONLY funded via explicit admin credit from the backend.
    // Never auto-deposit from registration data or local cache.

    // Load per-user trade history & kick-start trading if account is funded
    if (typeof AutoTrader !== 'undefined') {
      AutoTrader.loadUserHistory();
      // If account already has balance, ensure auto-trader is running & fire immediate trade
      if (typeof InvestmentReturns !== 'undefined' && InvestmentReturns.isActivated()) {
        if (!AutoTrader.isRunning()) AutoTrader.start();
        setTimeout(() => AutoTrader.evaluateAndTrade(), 2000);
      }
    }

    // Load per-user gamification state
    if (typeof Gamification !== 'undefined') {
      Gamification.loadForUser();
      updateGamificationUI();
    }
  }

  // ── User Dropdown Toggle ─────────────────────────────────
  function _initUserDropdown() {
    const capsule = $('user-capsule');
    const dropdown = $('user-dropdown');
    if (!capsule || !dropdown) return;

    capsule.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });
    document.addEventListener('click', () => dropdown.classList.remove('open'));

    const logoutBtn = $('ud-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async (e) => {
        e.stopPropagation(); // prevent capsule toggle from interfering
        console.log('🔐 LOGOUT: Starting...');
        try {
          // ═ Save user state before clearing ═
          try { if (typeof InvestmentReturns !== 'undefined' && InvestmentReturns.saveAndDisconnect) InvestmentReturns.saveAndDisconnect(); } catch(e) {}
          try { if (typeof AutoTrader !== 'undefined' && AutoTrader.stop) AutoTrader.stop(); } catch(e) {}
          try { if (typeof Gamification !== 'undefined' && Gamification.saveAndDisconnect) Gamification.saveAndDisconnect(); } catch(e) {}
          try { if (typeof Portfolio !== 'undefined' && Portfolio.destroy) Portfolio.destroy(); } catch(e) {}
          try { if (typeof Trading !== 'undefined' && Trading.disconnect) Trading.disconnect(); } catch(e) {}

          // ═ Master Logout ─ Clears auth, storage, streams ═
          if (typeof UserAuth !== 'undefined') {
            await UserAuth.logout();
          }
          console.log('🔓 LOGOUT: Auth cleared');
        } catch(err) {
          console.warn('⚠ Logout error (forcing reload):', err.message);
        } finally {
          // ═ ALWAYS reload — guaranteed even if errors above ═
          window.location.href = window.location.pathname;
        }
      });
    }
  }

  // ── Admin Panel (moved to standalone admin.html) ───────

  return {
    init, navigate,
    // Public
    quickTrade, togglePlugin, installPlugin, uninstallPlugin,
    closePosition, toggleCopyTrader, navigatePublic, showToast, addNotification,
    claimFundPool, claimAllFunds, claimDailyBonus,
  };
})();

// ── Kick-off ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => App.init());

