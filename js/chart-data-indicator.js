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

  function _styleBadge(badge, variant) {
    badge.style.background = 'rgba(8,12,22,0.88)';
    badge.style.borderRadius = '20px';
    badge.style.display = 'inline-flex';
    badge.classList.remove('feel-calibrating', 'feel-live', 'feel-loading');
    if (variant === 'live') {
      badge.classList.add('feel-live');
      badge.style.border = '1px solid rgba(46,189,133,0.3)';
      badge.style.color = '#2ebd85';
    } else if (variant === 'calibrating') {
      badge.classList.add('feel-calibrating');
      badge.style.border = '1px solid rgba(201,162,39,0.35)';
      badge.style.color = '#c9a227';
    } else {
      badge.classList.add('feel-loading');
      badge.style.border = '1px solid rgba(122,143,168,0.25)';
      badge.style.color = '#7a8fa8';
    }
  }

  // ── Update Badge Status ──────────────────────────────────
  function updateStatus(chartContainerId, isRealData, symbol = '', timeframe = '1h') {
    const badge = createBadge(chartContainerId);
    if (!badge) return;

    if (isRealData) {
      const text = typeof ZenCopy !== 'undefined'
        ? ZenCopy.chart.live(symbol, timeframe)
        : `Live · ${symbol} · ${timeframe.toUpperCase()}`;
      badge.innerHTML = text;
      _styleBadge(badge, 'live');
    } else {
      badge.innerHTML = typeof ZenCopy !== 'undefined' ? ZenCopy.chart.calibrating : 'Calibrating feed…';
      _styleBadge(badge, 'calibrating');
    }
  }

  function setCalibrating(chartContainerId, symbol = '', timeframe = '1h') {
    const badge = createBadge(chartContainerId);
    if (!badge) return;
    badge.innerHTML = typeof ZenCopy !== 'undefined' ? ZenCopy.chart.calibrating : 'Calibrating feed…';
    _styleBadge(badge, 'calibrating');
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
    badge.innerHTML = typeof ZenCopy !== 'undefined' ? ZenCopy.chart.loading : 'Updating live data…';
    _styleBadge(badge, 'loading');
  }

  // ── Public API ───────────────────────────────────────────
  return {
    createBadge,
    updateStatus,
    setCalibrating,
    hide,
    showLoading,
  };
})();
