/* ════════════════════════════════════════════════════════════
   app.js — Main Application Controller
   OmniVest AI / ZEN ASSETS
════════════════════════════════════════════════════════════ */

const App = (() => {
  'use strict';

  // ── Utils ─────────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);
  const fmt = (n, decimals = 2) => n === undefined || n === null ? '—' : parseFloat(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
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
  let _confThreshold = 75;
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
    if (loading) { loading.style.opacity = '0'; setTimeout(() => loading.style.display = 'none', 600); }
    const app = $('app');
    if (app) app.classList.add('app-visible');
    // startCursorTrail(); // Removed — clean professional UI
    startClock();
    initData();
    initCharts();
    initAllSections();
    startLiveFeed();
  }

  // ── Boot Canvas Particles ─────────────────────────────────
  function initBootCanvas() {
    const c = $('boot-canvas'); if (!c) return;
    const ctx = c.getContext('2d');
    c.width = window.innerWidth; c.height = window.innerHeight;
    const ptcls = Array.from({ length: 80 }, () => ({ x: Math.random() * c.width, y: Math.random() * c.height, vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4, r: Math.random() * 1.5 + .5, a: Math.random() }));
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
    const stopBoot = () => { running = false; };
    setTimeout(stopBoot, 5000);
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
    
    // Initialize auto-trader (autonomous trading system)
    if (typeof AutoTrader !== 'undefined') {
      AutoTrader.init();
      // Immediately render trade history (don't wait for interval)
      AutoTrader.updateTradeHistoryDisplay();
      console.log('🤖 Autonomous trading system ACTIVE');
      
      // Update auto-trader UI every 2 seconds
      setInterval(() => {
        if (typeof AutoTrader !== 'undefined') {
          AutoTrader.updatePositionsList();
          AutoTrader.updateTradeHistoryDisplay();
        }
      }, 2000);
    }
    
    // Initialize investment returns engine (wallet + tier compounding)
    if (typeof InvestmentReturns !== 'undefined') {
      InvestmentReturns.init();
      console.log('💰 Investment returns engine ACTIVE');
      
      // Update returns UI every 5 seconds
      setInterval(() => {
        updateReturnsUI();
      }, 5000);
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
      el.querySelector('.mpb-price').textContent = fmtPx(a.price);
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
    $$('.nav-item[data-section]').forEach(item => {
      item.addEventListener('click', () => navigate(item.dataset.section));
    });
    const sidebarToggle = $('sidebar-toggle');
    const sidebar       = $('sidebar');
    if (sidebarToggle && sidebar) {
      sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
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
    // Section-specific re-renders
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
    // Admin panel is now standalone (admin.html)
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
    // Show loading indicator
    if (typeof ChartDataIndicator !== 'undefined') {
      ChartDataIndicator.showLoading('main-price-chart');
    }
    
    // Main price chart — use AdvancedChartEngine for proper real-time updates
    const symbol = _sym;
    if (typeof AdvancedChartEngine !== 'undefined') {
      await AdvancedChartEngine.createLightweightChart('main-price-chart', symbol, _activeTimeframe);
    } else {
      await ChartEngine.createCandlestickChart('main-price-chart', [], symbol, _activeTimeframe);
    }
    
    // Update indicator based on whether we got real data
    if (typeof ChartDataIndicator !== 'undefined' && typeof RealDataAdapter !== 'undefined') {
      const isReal = RealDataAdapter.isRealDataEnabled();
      ChartDataIndicator.updateStatus('main-price-chart', isReal, symbol, _activeTimeframe);
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
    renderWhaleAlerts();
    renderSignalsMini(AIEngine.getSignals().slice(0, 6));
    renderAssetClassGrid();
    updateChartStats(_sym);
  }

  // ── All Sections Init ────────────────────────────────────
  function initAllSections() {
    initNav();
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
    // Use InvestmentReturns wallet balance if available, else portfolio value
    let displayValue = m.totalValue;
    let dailyPnL = m.totalPnL * 0.03;
    let dailySub = "Today's return";
    
    if (typeof InvestmentReturns !== 'undefined') {
      const snap = InvestmentReturns.getSnapshot();
      displayValue = snap.walletBalance;
      dailyPnL = snap.todayPnL;
      dailySub = `${snap.tierIcon} ${snap.tierLabel} · ${snap.tierAPY} APY`;
      
      // Wallet balance KPI
      setText('kpi-wallet-balance', `$${fmt(snap.walletBalance, 2)}`);
      setText('kpi-wallet-tier', `${snap.tierIcon} ${snap.tierLabel} Tier · ${snap.tierAPY}`);
    }
    
    setText('kpi-port-value', `$${fmt(displayValue, 0)}`);
    setText('kpi-port-pnl',   `${signPnl(m.totalPnL)}$${fmt(Math.abs(m.totalPnL), 0)} (${signPnl(m.totalPct)}${m.totalPct}%)`);
    setText('kpi-win-rate',   '73.2%');
    setText('kpi-ai-signals', `${AIEngine.getSignals().length}`);
    setText('kpi-sharpe',     m.sharpe.toFixed(2));
    setText('kpi-max-dd',     `Max DD: -${m.maxDD}%`);
    setText('kpi-daily-pnl',  `${signPnl(dailyPnL)}$${fmt(Math.abs(dailyPnL), 2)}`);
    setText('kpi-daily-sub',  dailySub);
    setClass('kpi-port-pnl', clsPnl(m.totalPnL));
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
    setText('alloc-total', `$${fmt(totalValue, 0)}`);
  }

  // ── Investment Returns UI Update ─────────────────────────
  function updateReturnsUI() {
    if (typeof InvestmentReturns === 'undefined') return;
    const s = InvestmentReturns.getSnapshot();

    // Returns summary panel
    setText('ret-wallet-bal', `$${fmt(s.walletBalance, 2)}`);

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

  function fmtVolume(n) {
    if (!n) return '—';
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
    // Analytics charts
    const hist = MarketData.getPriceHistory(id, 80);
    ChartEngine.createMainChart('ai-main-chart', hist);
    const rsi = Array.from({ length: 50 }, (_, i) => Math.max(20, Math.min(80, 50 + Math.sin(i * 0.3) * 20 + (Math.random() - 0.5) * 8)));
    ChartEngine.createRSIChart('ai-rsi-chart', rsi);
    const macdLine = Array.from({ length: 50 }, (_, i) => Math.sin(i * 0.2) * 200 + (Math.random() - 0.5) * 40);
    const signalLine = macdLine.map(v => v * 0.85 + (Math.random() - 0.5) * 20);
    const histLine = macdLine.map((v, i) => v - signalLine[i]);
    ChartEngine.createMACDChart('ai-macd-chart', macdLine, signalLine, histLine);
  }

  function renderAILayers(id) {
    const quant = AIEngine.computeQuantModels(id);
    const lstm  = AIEngine.computeLSTMPrediction(id);
    const bhv   = AIEngine.computeBehavioral(id);
    const macro = AIEngine.getMacroScore();

    // L1 Quant
    setText('l1-rsi',   quant.rsi);
    setText('l1-macd',  quant.macd);
    setText('l1-bb',    quant.bbPos + '%');
    setText('l1-vol',   quant.volatility);

    // L2 LSTM
    setText('l2-pred',   (quant.rsi > 50 ? '+' : '') + lstm.nextBar.toFixed(2) + '%');
    setText('l2-conf',   lstm.confidence.toFixed(1) + '%');
    setText('l2-bull',   lstm.regimeProb.Bull + '%');
    setText('l2-attn',   lstm.attention.toFixed(3));

    // L3 Behavioral
    const fg = bhv.fearGreed;
    setText('l3-fg',    `${fg.value} — ${fg.label}`);
    setText('l3-whale', (bhv.whaleRatio * 100).toFixed(0) + '%');
    setText('l3-fund',  bhv.fundingRate);
    setText('l3-oi',    bhv.openInterestChg);

    // L4 Macro
    setText('l4-vix',   macro.vix.toFixed(2));
    setText('l4-dxy',   macro.dxy.toFixed(2));
    setText('l4-corr',  macro.sp500Corr.toFixed(2));
    setText('l4-rate',  macro.rateExpect);
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
    
    // Use InvestmentReturns wallet balance for total value display
    let displayValue = m.totalValue;
    if (typeof InvestmentReturns !== 'undefined') {
      const snap = InvestmentReturns.getSnapshot();
      displayValue = snap.walletBalance;
    }
    
    // KPI row
    setText('port-total-value', `$${fmt(displayValue, 0)}`);
    setText('port-total-pnl',   `${signPnl(m.totalPnL)}$${fmt(Math.abs(m.totalPnL), 0)}`);
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
  }

  // ── Trading Section ───────────────────────────────────────
  async function renderTrading() {
    // Positions
    renderPositions();
    // Copy traders
    renderCopyTraders();
    // Strategies
    renderStrategies();
    // Terminal chart — candlesticks with real data + proper timeframe
    const termSymbol = _termSym.split('/')[0];
    const termTF = _chartTF.toLowerCase() || '5m';
    if (typeof AdvancedChartEngine !== 'undefined') {
      AdvancedChartEngine.createLightweightChart('terminal-chart', termSymbol, termTF);
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
      const btnTxt = t.active ? 'Unfollow' : 'Copy';
      const btnCls = t.active ? 'btn-danger' : 'btn-primary';
      return `<div class="ct-card">
        <div class="ct-avatar">${t.avatar}</div>
        <div class="ct-info"><b>${t.name}</b><span>${t.subscribers.toLocaleString()} followers · WR ${t.winRate}</span></div>
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
        const balance = 100000;
        const pxEl = $('order-entry');
        if (pxEl) pxEl.value = ((balance * qslider.value / 100) / (MarketData.getAsset(_termSym)?.price || 1)).toFixed(6);
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
    const qtyEl  = $('order-qty');     const qty  = qtyEl  ? qtyEl.value  : '0.01';
    const priceEl = $('order-entry');   const price = priceEl ? priceEl.value : '';
    const a      = MarketData.getAllAssets().find(x => x.sym === sym || x.id === sym);
    const order  = Trading.placeOrder({ sym: sym || 'BTC/USD', side, type: _activeOrderType, qty: parseFloat(qty) || 0.01, price: a ? a.price : parseFloat(price) });
    showToast(`${side === 'long' ? 'BUY' : 'SELL'} ${qty} ${sym} @ $${fmtPx(order.price)} — FILLED`, 'success');
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
    const sigs  = AIEngine.getSignals().filter(s => s.conf >= _confThreshold);
    if (cnt) cnt.textContent = sigs.length;
    grid.innerHTML = sigs.map(s => {
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
    const ACTIONS = ['TRADE', 'DEPOSIT', 'WITHDRAW', 'SIGNAL', 'HEDGE', 'REBALANCE'];
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
        <div class="por-item"><span>Withdrawal</span><b class="mono">$1.50 flat</b></div>
      `;
    }
  }

  // ── Security Section ──────────────────────────────────────
  function renderSecurity() {
    const keyStream = $('key-stream');
    if (keyStream) {
      const chars = '0123456789ABCDEFabcdef';
      const gen = () => Array.from({ length: 64 }, () => chars[Math.floor(Math.random() * chars.length)]).join(' ');
      keyStream.textContent = gen();
      setInterval(() => { keyStream.textContent = gen(); }, 2500);
    }
  }

  // ── Live Feed ─────────────────────────────────────────────
  function startLiveFeed() {
    MarketData.on('tick', () => {
      updateMarketPulseBar();
      updateFearGreed();
      if (_section === 'dashboard') {
        // Do NOT recreate candlestick chart on every tick!
        // AdvancedChartEngine / ChartEngine handle their own real-time updates.
        // Only update KPIs and lightweight charts.
        updateChartStats(_sym);
        const m = Portfolio.computeMetrics();
        updateDashKPIs(m);
        updateAllocTotal(m.totalValue);
        ChartEngine.createAllocationChart('alloc-donut', m.alloc);
      }
      if (_section === 'trading') { updateTerminalPrice(); renderPositions(); }
      if (_section === 'markets') { renderMarketsTable(); }
      if (_section === 'ai-engine') {
        updateCrisisBanner();
        renderAILayers($('ai-asset-filter')?.value || 'BTC');
      }
      updateAIOrb();
    });

    AIEngine.on('signals', sigs => {
      renderSignalsMini(sigs.slice(0, 6));
      if (_section === 'signals') renderSignals();
      if (_section === 'ai-engine') renderAISetups();
    });

    AIEngine.on('regime', r => {
      const el = $('dash-market-regime');
      if (el) el.textContent = r;
    });

    // Price flash on main chart
    MarketData.on(`price:BTC`, d => {
      const priceEl = $('main-price-display');
      if (!priceEl) return;
      priceEl.classList.remove('flash-up', 'flash-down');
      void priceEl.offsetWidth;
      priceEl.classList.add(d.price > d.prev ? 'flash-up' : 'flash-down');
    });
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
        
        // Get selected timeframe
        const timeframe = btn.dataset.tf;
        _activeTimeframe = timeframe;
        
        // Show loading
        if (typeof ChartDataIndicator !== 'undefined') {
          ChartDataIndicator.showLoading('main-price-chart');
        }
        
        // Reload chart with new timeframe using AdvancedChartEngine
        const symbol = _sym;
        if (typeof AdvancedChartEngine !== 'undefined') {
          AdvancedChartEngine.changeTimeframe('main-price-chart', symbol, timeframe);
        } else {
          await ChartEngine.createCandlestickChart('main-price-chart', [], symbol, timeframe);
        }
        
        // Update indicator
        if (typeof ChartDataIndicator !== 'undefined' && typeof RealDataAdapter !== 'undefined') {
          const isReal = RealDataAdapter.isRealDataEnabled();
          ChartDataIndicator.updateStatus('main-price-chart', isReal, symbol, timeframe);
        }
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
  function closePosition(posId){ Trading.closePosition(posId); renderPositions(); showToast('Position closed', 'success'); }
  function toggleCopyTrader(id){ Trading.toggleCopyTrader(id); renderCopyTraders(); }
  function navigatePublic(s)  { navigate(s); }

  // ── Entry Point ───────────────────────────────────────────
  function init() {
    // Initialize auth system first
    if (typeof UserAuth !== 'undefined') UserAuth.init();

    // ── Session Restore: skip login if already authenticated ──
    if (typeof UserAuth !== 'undefined' && UserAuth.isLoggedIn()) {
      const loginScreen = $('login-screen');
      if (loginScreen) loginScreen.style.display = 'none';
      initRegisterScreen();
      initModalHandlers();
      proceedAfterLogin();
      return;
    }

    initLoginScreen();
    initRegisterScreen();
    initModalHandlers();
  }

  function initLoginScreen() {
    const loginForm = $('login-form');
    if (!loginForm) { proceedAfterLogin(); return; }
    
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = $('login-email').value.trim();
      const password = $('login-password').value;

      if (!email || !password) {
        _showLoginError('Please enter your email and password.');
        return;
      }

      if (typeof UserAuth === 'undefined') {
        _showLoginError('Authentication system unavailable. Please refresh.');
        return;
      }

      const result = UserAuth.login(email, password);
      if (result.ok) {
        _dismissLoginScreen();
      } else {
        _showLoginError(result.error);
      }
    });

    // "Create Account" link
    const regLink = $('show-register-link');
    if (regLink) {
      regLink.addEventListener('click', (e) => {
        e.preventDefault();
        const overlay = $('register-overlay');
        if (overlay) overlay.classList.add('visible');
      });
    }
  }

  function _showLoginError(msg) {
    // Reuse a toast or inline
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
      setTimeout(() => { loginScreen.style.display = 'none'; proceedAfterLogin(); }, 600);
    }
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

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const errBox = $('register-error');
      errBox.classList.remove('visible');

      const fullName = $('reg-name').value;
      const email    = $('reg-email').value;
      const password = $('reg-password').value;
      const tierRadio = document.querySelector('input[name="reg-tier"]:checked');
      const tier     = tierRadio ? tierRadio.value : 'gold';
      const deposit  = $('reg-deposit').value;

      if (typeof UserAuth === 'undefined') {
        errBox.textContent = 'Registration system unavailable. Please refresh the page.';
        errBox.classList.add('visible');
        return;
      }

      const result = UserAuth.register({ fullName, email, password, tier, deposit });
      if (result.ok) {
        _dismissRegisterScreen();
        _dismissLoginScreen();
      } else {
        errBox.textContent = result.error;
        errBox.classList.add('visible');
      }
    });

    // "Back to Login" link
    const backLink = $('back-to-login-link');
    if (backLink) {
      backLink.addEventListener('click', (e) => {
        e.preventDefault();
        _dismissRegisterScreen();
      });
    }
  }

  function _dismissRegisterScreen() {
    const overlay = $('register-overlay');
    if (overlay) overlay.classList.remove('visible');
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
    // Smartsupp automatically stores conversation history per visitor
    // so clients can see their full chat history when they return.
    window.openSmartsuppChat = () => {
      if (typeof smartsupp !== 'undefined') {
        // Pass user identity so Smartsupp links history to this user
        if (typeof UserAuth !== 'undefined' && UserAuth.isLoggedIn()) {
          const session = UserAuth.getSession();
          if (session) {
            smartsupp('name', session.fullName || 'Trader');
            smartsupp('email', session.email);
            smartsupp('variables', [
              { key: 'tier', label: 'Membership Tier', value: (session.tier || 'bronze').toUpperCase() },
              { key: 'account_type', label: 'Account Type', value: 'Investment Client' }
            ]);
          }
        }
        smartsupp('chat:open');
      } else {
        showToast('Live chat is connecting... Please try again in a moment.', 'info');
        setTimeout(() => {
          if (typeof smartsupp !== 'undefined') smartsupp('chat:open');
        }, 2000);
      }
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

    // Sync tier with InvestmentReturns engine
    if (typeof InvestmentReturns !== 'undefined' && InvestmentReturns.setTier) {
      InvestmentReturns.setTier(session.tier);
    }

    // If admin has funded this user, sync the deposit as wallet balance
    if (typeof UserAuth !== 'undefined' && typeof InvestmentReturns !== 'undefined') {
      const fullUser = UserAuth.getCurrentUser();
      if (fullUser && fullUser.deposit > 0) {
        const snap = InvestmentReturns.getSnapshot();
        // Only deposit if wallet hasn't been funded yet (avoid re-depositing)
        if (snap.walletBalance === 0 && snap.initialDeposit === 0) {
          InvestmentReturns.deposit(fullUser.deposit);
        }
      }
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
      logoutBtn.addEventListener('click', () => {
        // Save trade history for current user before logging out
        if (typeof AutoTrader !== 'undefined') {
          AutoTrader.saveHistory();
          AutoTrader.stop();
        }
        // Reset investment state so next user starts clean
        if (typeof InvestmentReturns !== 'undefined') InvestmentReturns.resetState();
        if (typeof UserAuth !== 'undefined') UserAuth.logout();
        location.reload();
      });
    }
  }

  // ── Admin Panel (moved to standalone admin.html) ───────

  return {
    init, navigate,
    // Public
    quickTrade, togglePlugin, installPlugin, uninstallPlugin,
    closePosition, toggleCopyTrader, navigatePublic, showToast,
  };
})();

// ── Kick-off ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => App.init());

