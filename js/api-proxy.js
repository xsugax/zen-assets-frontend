/* ════════════════════════════════════════════════════════════
   api-proxy.js — CORS Proxy Wrapper for External APIs
   OmniVest AI / ZEN ASSETS

   Strategy:
   1. Try direct Binance REST (they have CORS headers for public endpoints)
   2. Try corsproxy.io (reliable, maintained)
   3. Try allorigins.win (public fallback)
   All requests have a 6-second abort timeout so failures are fast.
════════════════════════════════════════════════════════════ */

const APIProxy = (() => {
  'use strict';

  const TIMEOUT_MS = 6000;

  // Abort-signal timeout helper
  function _timeoutFetch(url, options = {}) {
    const ctrl = new AbortController();
    const id   = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    return fetch(url, { ...options, signal: ctrl.signal })
      .finally(() => clearTimeout(id));
  }

  // ── Binance REST (public endpoints support CORS directly) ──
  async function fetchBinance(endpoint) {
    const direct = `https://api.binance.com/api/v3${endpoint}`;

    // 1. Direct fetch — works for Binance public REST in most browsers
    try {
      const r = await _timeoutFetch(direct);
      if (r.ok) return r;
    } catch (e) {
      console.warn(`⚡ Binance direct failed, trying proxy: ${e.message}`);
    }

    // 2. corsproxy.io  (free, reliable, actively maintained)
    try {
      const r = await _timeoutFetch(`https://corsproxy.io/?url=${encodeURIComponent(direct)}`);
      if (r.ok) return r;
    } catch (e) {
      console.warn(`⚡ corsproxy.io failed, trying allorigins: ${e.message}`);
    }

    // 3. allorigins (wraps in {contents})
    try {
      const r = await _timeoutFetch(
        `https://api.allorigins.win/raw?url=${encodeURIComponent(direct)}`
      );
      if (r.ok) return r;
    } catch (e) {
      console.warn(`⚡ allorigins failed: ${e.message}`);
    }

    throw new Error(`All proxies failed for: ${endpoint}`);
  }

  // ── Yahoo Finance (needs proxy, no CORS headers) ───────────
  async function fetchYahoo(endpoint) {
    const direct = `https://query1.finance.yahoo.com/v8/finance/chart${endpoint}`;

    // 1. corsproxy.io
    try {
      const r = await _timeoutFetch(`https://corsproxy.io/?url=${encodeURIComponent(direct)}`);
      if (r.ok) return r;
    } catch (e) {
      console.warn(`⚡ Yahoo corsproxy failed, trying allorigins: ${e.message}`);
    }

    // 2. allorigins
    try {
      const r = await _timeoutFetch(
        `https://api.allorigins.win/raw?url=${encodeURIComponent(direct)}`
      );
      if (r.ok) return r;
    } catch {}

    // 3. query2 mirror
    try {
      const mirror = `https://query2.finance.yahoo.com/v8/finance/chart${endpoint}`;
      const r = await _timeoutFetch(`https://corsproxy.io/?url=${encodeURIComponent(mirror)}`);
      if (r.ok) return r;
    } catch {}

    throw new Error(`Yahoo proxy failed: ${endpoint}`);
  }

  // Generic CORS-wrapped fetch (for any URL)
  async function fetchWithCORS(url, options = {}) {
    try {
      const r = await _timeoutFetch(url, options);
      if (r.ok) return r;
    } catch {}
    try {
      const r = await _timeoutFetch(
        `https://corsproxy.io/?url=${encodeURIComponent(url)}`, options
      );
      if (r.ok) return r;
    } catch {}
    throw new Error(`fetchWithCORS failed: ${url}`);
  }

  return { fetchWithCORS, fetchBinance, fetchYahoo };
})();
