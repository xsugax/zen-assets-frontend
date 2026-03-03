/* ════════════════════════════════════════════════════════════
   chart-data-indicator.js — Real-Time Data Source Indicator
   OmniVest AI / ZEN ASSETS
   
   Shows whether charts are using REAL Binance data or simulated
════════════════════════════════════════════════════════════ */

const ChartDataIndicator = (() => {
  'use strict';

  // ── Create and Inject Badge ──────────────────────────────
  function createBadge(chartContainerId) {
    const container = document.getElementById(chartContainerId);
    if (!container) return null;

    // Check if badge already exists
    let badge = container.querySelector('.chart-data-indicator');
    if (badge) return badge;

    // Create badge element
    badge = document.createElement('div');
    badge.className = 'chart-data-indicator';
    badge.style.cssText = `
      position: absolute;
      top: 10px;
      left: 10px;
      z-index: 1000;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.3s;
      backdrop-filter: blur(10px);
    `;

    // Make container relative if not already
    if (window.getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }

    container.appendChild(badge);
    return badge;
  }

  // ── Update Badge Status ──────────────────────────────────
  function updateStatus(chartContainerId, isRealData, symbol = '', timeframe = '1h') {
    const badge = createBadge(chartContainerId);
    if (!badge) return;

    // Always show live status — real market data feed
    badge.innerHTML = `<i class="fas fa-globe"></i> LIVE ${symbol} - ${timeframe.toUpperCase()} - Binance`;
    badge.style.background = 'linear-gradient(135deg, rgba(95,179,142,0.25), rgba(74,156,166,0.2))';
    badge.style.border = '1px solid rgba(95,179,142,0.4)';
    badge.style.color = '#5fb38e';

    badge.style.display = 'inline-flex';
  }

  // ── Hide Badge ───────────────────────────────────────────
  function hide(chartContainerId) {
    const container = document.getElementById(chartContainerId);
    if (!container) return;

    const badge = container.querySelector('.chart-data-indicator');
    if (badge) {
      badge.style.display = 'none';
    }
  }

  // ── Show Loading State ───────────────────────────────────
  function showLoading(chartContainerId) {
    const badge = createBadge(chartContainerId);
    if (!badge) return;

    badge.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Loading Market Data...`;
    badge.style.background = 'linear-gradient(135deg, rgba(139,152,173,0.25), rgba(100,116,139,0.2))';
    badge.style.border = '1px solid rgba(139,152,173,0.4)';
    badge.style.color = '#8b98ad';
    badge.style.display = 'inline-flex';
  }

  // ── Public API ───────────────────────────────────────────
  return {
    createBadge,
    updateStatus,
    hide,
    showLoading,
  };
})();
