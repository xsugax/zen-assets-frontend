/* ════════════════════════════════════════════════════════════
   api-proxy.js — CORS Proxy Wrapper for External APIs
   OmniVest AI / ZEN ASSETS
   
   Handles CORS issues and provides fallback data sources
════════════════════════════════════════════════════════════ */

const APIProxy = (() => {
  'use strict';

  // ── Free CORS proxy services (use one at a time) ─────────────
  const CORS_PROXIES = [
    'https://cors.bridged.cc',      // ✅ Reliable, no auth needed
    'https://api.allorigins.win',   // ✅ Public, stable
    'https://cors-anywhere.herokuapp.com', // Requires header click (manual activation)
  ];

  const ACTIVE_PROXY = CORS_PROXIES[0]; // Use first one

  /**
   * Fetch with CORS proxy fallback
   * @param {string} url - Original URL
   * @param {object} options - Fetch options
   * @returns {Promise<Response>}
   */
  async function fetchWithCORS(url, options = {}) {
    try {
      // Try direct fetch first (might work depending on network)
      const r = await fetch(url, options);
      if (r.ok) return r;
    } catch (e) {
      console.warn(`⚠️ Direct fetch failed, trying CORS proxy:`, url);
    }

    // Fallback: use CORS proxy
    const proxiedUrl = `${ACTIVE_PROXY}/${encodeURIComponent(url)}`;
    try {
      const r = await fetch(proxiedUrl, {
        ...options,
        headers: {
          ...options.headers,
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      
      // apiallorigins returns {contents: data}
      if (proxiedUrl.includes('allorigins')) {
        const wrapper = await r.json();
        return new Response(wrapper.contents, { status: 200 });
      }
      return r;
    } catch (e) {
      console.error(`❌ CORS proxy failed for ${url}:`, e.message);
      throw e;
    }
  }

  /**
   * Fetch from Binance with proxy support
   */
  async function fetchBinance(endpoint) {
    const url = `https://api.binance.com/api/v3${endpoint}`;
    return fetchWithCORS(url);
  }

  /**
   * Fetch from Yahoo Finance with proxy support
   */
  async function fetchYahoo(endpoint) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart${endpoint}`;
    return fetchWithCORS(url);
  }

  return {
    fetchWithCORS,
    fetchBinance,
    fetchYahoo,
  };
})();
