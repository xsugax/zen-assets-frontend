/* ════════════════════════════════════════════════════════════
   zen-markets.js — Multi-Market Trading System
   ZEN ASSETS v68.5

   Modular Architecture:
     • AssetRegistry  — 3 independent markets (PUBLIC, PRIVATE, LLC)
     • MarketEngine   — Per-market price simulation & volatility
     • TradeEngine    — Isolated trade execution per market/asset
     • PortfolioEngine — Per-market holdings & performance tracking
════════════════════════════════════════════════════════════ */

/* ── Asset Registry ─────────────────────────────────────────
   Structured asset catalog organized by market type.
   Each asset carries its market, type, and behavior profile.
────────────────────────────────────────────────────────────── */
const AssetRegistry = (() => {
  'use strict';

  const MARKETS = {
    PUBLIC:  { id: 'PUBLIC',  name: 'Public Markets',  icon: 'fa-globe',    color: '#00ff88', desc: 'Regulated crypto assets — live market data' },
    PRIVATE: { id: 'PRIVATE', name: 'Private Stocks',  icon: 'fa-lock',     color: '#e8b960', desc: 'Exclusive private equities — invitation only' },
    LLC:     { id: 'LLC',     name: 'LLC Assets',      icon: 'fa-building', color: '#7c6aef', desc: 'Production-based LLC holdings — yield-driven' },
  };

  const REGISTRY = {
    PUBLIC: [
      { id: 'BTC',  sym: 'BTC/USD',  name: 'Bitcoin',   market: 'PUBLIC', type: 'crypto', behavior: { volatility: 0.0025, drift: 0.10, trend: 'market-driven',  regime: 'adaptive' } },
      { id: 'ETH',  sym: 'ETH/USD',  name: 'Ethereum',  market: 'PUBLIC', type: 'crypto', behavior: { volatility: 0.0025, drift: 0.12, trend: 'market-driven',  regime: 'adaptive' } },
      { id: 'BNB',  sym: 'BNB/USD',  name: 'BNB',       market: 'PUBLIC', type: 'crypto', behavior: { volatility: 0.0020, drift: 0.08, trend: 'market-driven',  regime: 'adaptive' } },
    ],
    PRIVATE: [
      { id: 'BOYER', sym: 'BOYER', name: 'Boyer Industries',  market: 'PRIVATE', type: 'stock', behavior: { volatility: 0.0015, drift: 0.15, trend: 'bullish-bias',  regime: 'trending'  } },
      { id: 'NOVA',  sym: 'NOVA',  name: 'Nova Technologies', market: 'PRIVATE', type: 'stock', behavior: { volatility: 0.0022, drift: 0.20, trend: 'growth',        regime: 'momentum'  } },
      { id: 'AXIOM', sym: 'AXIOM', name: 'Axiom Capital',     market: 'PRIVATE', type: 'stock', behavior: { volatility: 0.0008, drift: 0.06, trend: 'stable',        regime: 'range'     } },
    ],
    LLC: [
      { id: 'ZENMINES', sym: 'ZENMINES', name: 'ZenMines LLC', market: 'LLC', type: 'production', behavior: { volatility: 0.0010, drift: 0.12, trend: 'production-driven',  regime: 'steady'    } },
      { id: 'ZENTECH',  sym: 'ZENTECH',  name: 'ZenTech LLC',  market: 'LLC', type: 'production', behavior: { volatility: 0.0012, drift: 0.14, trend: 'innovation-driven', regime: 'cycles'    } },
    ],
  };

  // Flat lookup cache
  const _allAssets = [];
  const _byId = {};
  const _byMarket = {};

  function _build() {
    _allAssets.length = 0;
    Object.keys(REGISTRY).forEach(mkt => {
      _byMarket[mkt] = [];
      REGISTRY[mkt].forEach(a => {
        _allAssets.push(a);
        _byId[a.id] = a;
        _byMarket[mkt].push(a);
      });
    });
  }
  _build();

  function getAsset(id)            { return _byId[id] || null; }
  function getByMarket(market)     { return _byMarket[market] || []; }
  function getAllAssets()           { return _allAssets; }
  function getMarkets()            { return MARKETS; }
  function getMarketInfo(market)   { return MARKETS[market] || null; }
  function getMarketForAsset(id)   { const a = _byId[id]; return a ? a.market : null; }

  return { getAsset, getByMarket, getAllAssets, getMarkets, getMarketInfo, getMarketForAsset };
})();


/* ── Market Engine ──────────────────────────────────────────
   Independent price simulation per market type.
   PUBLIC  → low vol, connected to real exchange data
   PRIVATE → medium vol, bullish bias, simulated
   LLC     → low-medium vol, production-driven, steady growth
────────────────────────────────────────────────────────────── */
const MarketEngine = (() => {
  'use strict';

  // Per-asset live state
  const _state = {};
  let _tickTimer = null;
  const _subscribers = {};

  // Volatility profiles per market (overrides asset-level as multiplier)
  const MARKET_VOL = {
    PUBLIC:  1.0,   // standard — relies on real data feeds
    PRIVATE: 1.2,   // medium — private markets are less liquid
    LLC:     0.7,   // low — production assets are stable
  };

  // Regime engine per asset: creates realistic price movement
  const _regimes = {};

  function _initRegime(id) {
    const asset = AssetRegistry.getAsset(id);
    if (!asset) return;
    const b = asset.behavior;
    let dir, strength, duration;

    switch (b.regime) {
      case 'trending':
        dir = 1; strength = 0.5 + Math.random() * 0.4; duration = 60 + Math.floor(Math.random() * 100);
        break;
      case 'momentum':
        dir = Math.random() < 0.65 ? 1 : -1; strength = 0.4 + Math.random() * 0.5; duration = 30 + Math.floor(Math.random() * 80);
        break;
      case 'range':
        dir = 0; strength = 0.2 + Math.random() * 0.3; duration = 80 + Math.floor(Math.random() * 60);
        break;
      case 'steady':
        dir = 0.5; strength = 0.3 + Math.random() * 0.2; duration = 100 + Math.floor(Math.random() * 80);
        break;
      case 'cycles':
        dir = Math.sin(Date.now() / 60000) > 0 ? 0.7 : -0.3; strength = 0.35 + Math.random() * 0.35; duration = 50 + Math.floor(Math.random() * 70);
        break;
      default: // adaptive
        dir = Math.random() < 0.5 ? 1 : Math.random() < 0.8 ? -1 : 0;
        strength = 0.3 + Math.random() * 0.5; duration = 40 + Math.floor(Math.random() * 120);
    }

    _regimes[id] = { dir, strength, remaining: duration, momentum: 0, volMult: 0.8 + Math.random() * 0.4 };
  }

  function _advanceRegime(id) {
    const reg = _regimes[id];
    if (!reg) return;
    reg.remaining--;
    if (reg.remaining > 0) return;

    const asset = AssetRegistry.getAsset(id);
    const b = asset ? asset.behavior : {};
    const prev = reg.dir;
    const r = Math.random();

    // Bias transitions based on behavior
    if (b.trend === 'bullish-bias') {
      reg.dir = r < 0.55 ? 1 : r < 0.80 ? 0 : -0.5;
    } else if (b.trend === 'growth') {
      reg.dir = r < 0.50 ? 1 : r < 0.75 ? 0.5 : r < 0.90 ? 0 : -0.5;
    } else if (b.trend === 'stable') {
      reg.dir = r < 0.20 ? 0.3 : r < 0.60 ? 0 : r < 0.80 ? -0.3 : prev;
    } else if (b.trend === 'production-driven') {
      reg.dir = r < 0.45 ? 0.5 : r < 0.75 ? 0.2 : r < 0.90 ? 0 : -0.3;
    } else if (b.trend === 'innovation-driven') {
      reg.dir = r < 0.40 ? 0.8 : r < 0.65 ? 0.3 : r < 0.85 ? 0 : -0.5;
    } else {
      reg.dir = r < 0.45 ? 1 : r < 0.75 ? -1 : 0;
    }

    reg.strength = 0.25 + Math.random() * 0.65;
    reg.remaining = 35 + Math.floor(Math.random() * 100);
    reg.volMult = reg.volMult * 0.6 + (0.75 + Math.random() * 0.45) * 0.4;
    reg.momentum *= 0.35;
  }

  function init() {
    // Initialize state for PRIVATE and LLC assets via MarketData injection
    AssetRegistry.getAllAssets().forEach(a => {
      if (a.market === 'PUBLIC') return; // PUBLIC assets already in MarketData

      const basePrice = _getBasePrice(a.id);
      _state[a.id] = {
        price: basePrice,
        open: basePrice,
        high24h: basePrice * 1.008,
        low24h: basePrice * 0.993,
        vol24h: a.type === 'production' ? (400e3 + Math.random() * 300e3) : (800e3 + Math.random() * 2e6),
        chg24h: 0,
        pct24h: 0,
        prevClose: basePrice * (1 - (Math.random() - 0.5) * 0.01),
      };
    });

    _startTicker();
  }

  function _getBasePrice(id) {
    const prices = {
      BOYER: 420.00, NOVA: 185.50, AXIOM: 92.80,
      ZENMINES: 340.00, ZENTECH: 275.00,
    };
    return prices[id] || 100;
  }

  function _startTicker() {
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth < 768;
    const TICK_RATE = isMobile ? 3000 : 800;

    _tickTimer = setInterval(() => {
      AssetRegistry.getAllAssets().forEach(a => {
        if (a.market === 'PUBLIC') return; // PUBLIC ticks via MarketData
        _tick(a.id);
      });
    }, TICK_RATE);
  }

  function _tick(id) {
    const asset = AssetRegistry.getAsset(id);
    if (!asset) return;
    const s = _state[id];
    if (!s) return;

    if (!_regimes[id]) _initRegime(id);
    const reg = _regimes[id];
    _advanceRegime(id);

    const b = asset.behavior;
    const vol = b.volatility * (MARKET_VOL[asset.market] || 1.0);

    // Price move: drift + noise + momentum
    const drift = reg.dir * reg.strength * vol * 0.5;
    const u = Math.random();
    const noiseScale = u < 0.03 ? 2.2 : u < 0.08 ? 1.5 : 1.0;
    const noise = (Math.random() - 0.5) * vol * 1.3 * noiseScale * reg.volMult;
    const carry = reg.momentum * 0.30;
    const totalMove = drift + noise + carry;
    reg.momentum = totalMove;

    const raw = s.price * (1 + totalMove);
    const seed = _getBasePrice(id);
    const ratio = raw / seed;
    const clamped = ratio > 1.25 ? raw * 0.9990 : ratio < 0.75 ? raw * 1.0010 : raw;
    const price = parseFloat(clamped.toFixed(raw > 100 ? 2 : raw > 1 ? 4 : 6));

    const prev = s.price;
    s.price = price;
    if (price > s.high24h) s.high24h = price;
    if (price < s.low24h) s.low24h = price;
    s.chg24h = parseFloat((price - s.prevClose).toFixed(4));
    s.pct24h = parseFloat(((s.chg24h / s.prevClose) * 100).toFixed(3));

    // Inject into MarketData so charts and everything downstream works
    if (typeof MarketData !== 'undefined' && MarketData._injectRealPrice) {
      MarketData._injectRealPrice(id, {
        price, ask: price * 1.0003, bid: price * 0.9997,
        high24h: s.high24h, low24h: s.low24h,
        vol24h: s.vol24h, chg24h: s.chg24h, pct24h: s.pct24h,
      });
    }

    _emit('tick', { id, price, prev, market: asset.market, chg: s.chg24h, pct: s.pct24h });
    _emit(`price:${id}`, { id, price, prev, market: asset.market });
  }

  function getPrice(id) {
    const asset = AssetRegistry.getAsset(id);
    if (!asset) return null;
    if (asset.market === 'PUBLIC') {
      // PUBLIC assets use MarketData
      const a = MarketData.getAsset(id);
      return a ? a.price : null;
    }
    return _state[id] ? _state[id].price : null;
  }

  function getState(id) {
    const asset = AssetRegistry.getAsset(id);
    if (!asset) return null;
    if (asset.market === 'PUBLIC') {
      return MarketData.getAsset(id);
    }
    return _state[id] ? { ...asset, ..._state[id] } : null;
  }

  function on(event, fn) { if (!_subscribers[event]) _subscribers[event] = []; _subscribers[event].push(fn); }
  function off(event, fn) { if (_subscribers[event]) _subscribers[event] = _subscribers[event].filter(f => f !== fn); }
  function _emit(event, data) { (_subscribers[event] || []).forEach(fn => { try { fn(data); } catch(e) {} }); }

  function destroy() { if (_tickTimer) { clearInterval(_tickTimer); _tickTimer = null; } }

  return { init, getPrice, getState, on, off, destroy };
})();


/* ── Trade Engine ───────────────────────────────────────────
   Market-isolated trade execution.
   Each trade is tagged with its market and asset.
   Balance validation against user wallet.
────────────────────────────────────────────────────────────── */
const TradeEngine = (() => {
  'use strict';

  // Per-market position arrays: { market: [ positions... ] }
  const _positions = { PUBLIC: [], PRIVATE: [], LLC: [] };
  const _tradeLog = [];
  const _maxLog = 500;

  function placeOrder({ market, assetId, side, type, qty, sl, tp }) {
    const asset = AssetRegistry.getAsset(assetId);
    if (!asset) return { error: 'Asset not found' };
    if (asset.market !== market) return { error: 'Asset does not belong to selected market' };

    const price = MarketEngine.getPrice(assetId);
    if (!price || price <= 0) return { error: 'Price unavailable' };

    qty = parseFloat(qty);
    if (isNaN(qty) || qty <= 0) return { error: 'Invalid quantity' };

    const value = qty * price;

    // Balance validation
    let walletBalance = 100000;
    if (typeof InvestmentReturns !== 'undefined') {
      const snap = InvestmentReturns.getSnapshot();
      if (snap && snap.walletBalance > 0) walletBalance = snap.walletBalance;
    }
    if (value > walletBalance * 0.95) {
      return { error: 'Insufficient balance for this position size' };
    }

    const position = {
      id: `ZT_${market[0]}${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).slice(2,6).toUpperCase()}`,
      market,
      assetId,
      sym: asset.sym,
      name: asset.name,
      side,
      type: type || 'market',
      qty,
      entry: price,
      cur: price,
      sl: sl || price * (side === 'long' ? 0.97 : 1.03),
      tp: tp || price * (side === 'long' ? 1.06 : 0.94),
      pnl: 0,
      pnlPct: 0,
      value,
      openedAt: Date.now(),
      status: 'OPEN',
    };

    _positions[market].unshift(position);
    _log('OPEN', position);

    // Also place in legacy Trading module for compatibility
    if (typeof Trading !== 'undefined') {
      Trading.placeOrder({ sym: asset.sym, side, type: type || 'market', qty, price, sl: position.sl, tp: position.tp });
    }

    return { success: true, position };
  }

  function closePosition(posId) {
    for (const market of Object.keys(_positions)) {
      const idx = _positions[market].findIndex(p => p.id === posId);
      if (idx < 0) continue;

      const pos = _positions[market].splice(idx, 1)[0];
      const exitPrice = MarketEngine.getPrice(pos.assetId) || pos.cur;

      pos.pnl = pos.side === 'long'
        ? (exitPrice - pos.entry) * pos.qty
        : (pos.entry - exitPrice) * pos.qty;
      pos.pnlPct = pos.entry > 0 ? ((pos.pnl / (pos.entry * pos.qty)) * 100) : 0;
      pos.status = 'CLOSED';
      pos.closedAt = Date.now();
      pos.exitPrice = exitPrice;

      // Credit/debit to wallet
      if (typeof InvestmentReturns !== 'undefined') {
        if (pos.pnl > 0.01) {
          InvestmentReturns.creditTradingProfit(pos.pnl, { symbol: pos.sym, side: pos.side, market: pos.market });
        } else if (pos.pnl < -0.01) {
          InvestmentReturns.debitTradingLoss(Math.abs(pos.pnl), { symbol: pos.sym, side: pos.side, market: pos.market });
        }
      }

      _log('CLOSE', pos);
      return pos;
    }
    return null;
  }

  function getPositions(market) {
    if (market && _positions[market]) return [..._positions[market]];
    // All markets
    return Object.values(_positions).flat();
  }

  function getPositionsByMarket() {
    return {
      PUBLIC: [..._positions.PUBLIC],
      PRIVATE: [..._positions.PRIVATE],
      LLC: [..._positions.LLC],
    };
  }

  function computePnL(market) {
    const positions = market ? (_positions[market] || []) : Object.values(_positions).flat();
    let totalPnL = 0;

    positions.forEach(p => {
      const cur = MarketEngine.getPrice(p.assetId) || p.cur;
      p.cur = cur;
      p.pnl = p.side === 'long' ? (cur - p.entry) * p.qty : (p.entry - cur) * p.qty;
      p.pnlPct = p.entry > 0 ? ((p.pnl / (p.entry * p.qty)) * 100) : 0;
      totalPnL += p.pnl;
    });

    return { totalPnL, positions };
  }

  function _log(action, pos) {
    _tradeLog.unshift({
      ts: new Date().toISOString(),
      action,
      market: pos.market,
      sym: pos.sym,
      side: pos.side,
      qty: pos.qty,
      price: action === 'CLOSE' ? pos.exitPrice : pos.entry,
      pnl: pos.pnl || 0,
      id: pos.id,
    });
    if (_tradeLog.length > _maxLog) _tradeLog.pop();
  }

  function getTradeLog(n) { return _tradeLog.slice(0, n || 100); }

  return { placeOrder, closePosition, getPositions, getPositionsByMarket, computePnL, getTradeLog };
})();


/* ── Portfolio Engine ───────────────────────────────────────
   Per-market holdings tracking with aggregate views.
   Tracks quantities, average cost, unrealized P&L per asset.
────────────────────────────────────────────────────────────── */
const PortfolioEngine = (() => {
  'use strict';

  // Holdings: { assetId: { qty, avgCost, market, totalInvested } }
  const _holdings = {};

  function addHolding(assetId, qty, costBasis) {
    const asset = AssetRegistry.getAsset(assetId);
    if (!asset) return;

    if (_holdings[assetId]) {
      const h = _holdings[assetId];
      const totalQty = h.qty + qty;
      h.avgCost = (h.avgCost * h.qty + costBasis * qty) / totalQty;
      h.qty = totalQty;
      h.totalInvested += costBasis * qty;
    } else {
      _holdings[assetId] = {
        assetId,
        sym: asset.sym,
        name: asset.name,
        market: asset.market,
        type: asset.type,
        qty,
        avgCost: costBasis,
        totalInvested: costBasis * qty,
      };
    }
  }

  function removeHolding(assetId, qty) {
    if (!_holdings[assetId]) return;
    _holdings[assetId].qty -= qty;
    if (_holdings[assetId].qty <= 0.000001) {
      delete _holdings[assetId];
    }
  }

  function getHoldings(market) {
    const all = Object.values(_holdings);
    if (!market) return all;
    return all.filter(h => h.market === market);
  }

  function getPortfolioSummary(market) {
    const holdings = getHoldings(market);
    let totalValue = 0;
    let totalCost = 0;
    const items = [];

    holdings.forEach(h => {
      const price = MarketEngine.getPrice(h.assetId) || h.avgCost;
      const currentValue = h.qty * price;
      const costValue = h.qty * h.avgCost;
      const pnl = currentValue - costValue;
      const pnlPct = costValue > 0 ? ((pnl / costValue) * 100) : 0;

      totalValue += currentValue;
      totalCost += costValue;

      items.push({
        ...h,
        price,
        currentValue,
        pnl,
        pnlPct,
        allocation: 0, // computed after totals
      });
    });

    // Compute allocation percentages
    items.forEach(item => {
      item.allocation = totalValue > 0 ? ((item.currentValue / totalValue) * 100) : 0;
    });

    return {
      items,
      totalValue,
      totalCost,
      totalPnL: totalValue - totalCost,
      totalPnLPct: totalCost > 0 ? (((totalValue - totalCost) / totalCost) * 100) : 0,
      holdingCount: items.length,
    };
  }

  function getMarketBreakdown() {
    return {
      PUBLIC:  getPortfolioSummary('PUBLIC'),
      PRIVATE: getPortfolioSummary('PRIVATE'),
      LLC:     getPortfolioSummary('LLC'),
      ALL:     getPortfolioSummary(),
    };
  }

  return { addHolding, removeHolding, getHoldings, getPortfolioSummary, getMarketBreakdown };
})();
