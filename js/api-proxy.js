/* ════════════════════════════════════════════════════════════
   api-proxy.js — Multi-Source API Proxy
   OmniVest AI / ZEN ASSETS

   Reliable live data with automatic failover:
   ─ Binance REST  (5 mirror hosts, preference caching)
   ─ CryptoCompare (free tier, CORS-enabled)
   ─ CoinGecko     (free, CORS-enabled)
   All requests abort at 6 s for fast failover.
════════════════════════════════════════════════════════════ */

const APIProxy = (() => {
  'use strict';

  const TIMEOUT_MS = 6000;
  const MARKET_API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:4000/api/market'
    : 'https://zen-assets-backend.onrender.com/api/market';

  // Binance public REST — all mirrors support CORS for GET
  const BINANCE_HOSTS = [
    'https://data-api.binance.vision',
    'https://api1.binance.com',
    'https://api2.binance.com',
    'https://api3.binance.com',
    'https://api.binance.com',
  ];

  let _preferred = null;
  let _preferredExpiry = 0;

  function _timedFetch(url, ms = TIMEOUT_MS) {
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(tid));
  }

  // ── Binance (auto-failover across 5 mirrors) ──────────────
  async function fetchBinance(endpoint) {
    // Fast path: reuse a host that worked recently (60 s cache)
    if (_preferred && Date.now() < _preferredExpiry) {
      try {
        const r = await _timedFetch(`${_preferred}/api/v3${endpoint}`);
        if (r.ok) return r;
      } catch {}
      _preferred = null;
    }

    for (const host of BINANCE_HOSTS) {
      try {
        const r = await _timedFetch(`${host}/api/v3${endpoint}`);
        if (r.ok) {
          _preferred = host;
          _preferredExpiry = Date.now() + 60000;
          console.log(`✅ Binance via ${host}`);
          return r;
        }
      } catch {}
    }
    throw new Error(`Binance: all ${BINANCE_HOSTS.length} hosts failed for ${endpoint}`);
  }

  // ── CryptoCompare (free, CORS-enabled) ─────────────────────
  async function fetchCryptoCompare(endpoint) {
    const r = await _timedFetch(`https://min-api.cryptocompare.com${endpoint}`);
    if (!r.ok) throw new Error(`CryptoCompare HTTP ${r.status}`);
    return r;
  }

  // ── CoinGecko (free, CORS-enabled) ─────────────────────────
  async function fetchCoinGecko(endpoint) {
    const r = await _timedFetch(`https://api.coingecko.com/api/v3${endpoint}`);
    if (!r.ok) throw new Error(`CoinGecko HTTP ${r.status}`);
    return r;
  }

  // ── ZEN backend market proxy (primary — no browser CORS issues) ──
  async function fetchMarketKlines(symbol, interval = '1h', limit = 120) {
    const q = new URLSearchParams({
      symbol: String(symbol).toUpperCase(),
      interval,
      limit: String(limit),
    });
    const r = await _timedFetch(`${MARKET_API_BASE}/klines?${q}`, 10000);
    if (!r.ok) throw new Error(`Market API HTTP ${r.status}`);
    const data = await r.json();
    if (!data.ok || !Array.isArray(data.candles) || data.candles.length < 5) {
      throw new Error('Market API returned insufficient candles');
    }
    return data.candles;
  }

  return { fetchBinance, fetchCryptoCompare, fetchCoinGecko, fetchMarketKlines, _timedFetch };
})();
