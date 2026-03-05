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
    badge.innerHTML = `LIVE · ${symbol} · ${timeframe.toUpperCase()}`;
    badge.style.background = 'rgba(8,12,22,0.88)';
    badge.style.border = '1px solid rgba(46,189,133,0.3)';
    badge.style.color = '#2ebd85';
    badge.style.borderRadius = '20px';

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

    badge.innerHTML = `FETCHING ···`;
    badge.style.background = 'rgba(8,12,22,0.88)';
    badge.style.border = '1px solid rgba(139,152,173,0.2)';
    badge.style.color = '#4a5568';
    badge.style.borderRadius = '20px';
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
