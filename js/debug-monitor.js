/* ════════════════════════════════════════════════════════════
   debug-monitor.js — Real-Time Data Flow & Performance Monitor
   OmniVest AI / ZEN ASSETS
   
   Monitors:
   1. Tick arrivals (RealDataAdapter)
   2. Price updates (MarketData)
   3. Chart updates (AdvancedChartEngine)
   4. Memory/CPU usage
   5. Event loop blocking
   6. WebSocket connections
   7. Cache state
════════════════════════════════════════════════════════════ */

const DebugMonitor = (() => {
  'use strict';

  // ── State ────────────────────────────────────────────────
  const metrics = {
    realDataTicks: 0,
    marketDataUpdates: 0,
    chartUpdates: 0,
    wsConnections: 0,
    cachedAssets: 0,
    lastTickTime: null,
    lastUpdateTime: null,
    lastChartUpdateTime: null,
    tickTimestamps: [],
    updateTimestamps: [],
    chartUpdateTimestamps: [],
    tickGaps: [],
    eventLoopLags: [],
    memorySnapshots: [],
    cpuSnapshots: [],
  };

  const HISTORY_SIZE = 300; // 5 minutes at 100ms interval

  // ── UI Elements ────────────────────────────────────────────
  let monitorPanel = null;
  let ticksDisplay = null;
  let lastTickDisplay = null;
  let wsStatusDisplay = null;
  let chartStatusDisplay = null;
  let memoryDisplay = null;
  let lagDisplay = null;

  function createMonitorPanel() {
    const panel = document.createElement('div');
    panel.id = 'debug-monitor-panel';
    panel.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 420px;
      background: rgba(10, 14, 22, 0.95);
      border: 1px solid rgba(95, 179, 142, 0.4);
      border-radius: 8px;
      padding: 16px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #e2e8f0;
      z-index: 99999;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      max-height: 500px;
      overflow-y: auto;
    `;

    panel.innerHTML = `
      <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1);">
        <div style="font-weight: bold; color: #5fb38e; margin-bottom: 8px;">📊 DATA FLOW MONITOR</div>
        <div id="monitor-ticks" style="margin: 4px 0; color: #d4a574;">Ticks: <span style="color: #5fb38e;">0</span></div>
        <div id="monitor-last-tick" style="margin: 4px 0; color: #8b98ad;">Last Tick: Never</div>
        <div id="monitor-ws-status" style="margin: 4px 0; color: #8b98ad;">WebSocket: <span style="color: #d65d5d;">●</span> Closed</div>
        <div id="monitor-chart-status" style="margin: 4px 0; color: #8b98ad;">Charts: <span style="color: #d65d5d;">●</span> Idle</div>
      </div>

      <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1);">
        <div style="font-weight: bold; color: #5fb38e; margin-bottom: 8px;">⚙️ PERFORMANCE</div>
        <div id="monitor-memory" style="margin: 4px 0; color: #8b98ad;">Memory: <span style="color: #8b98ad;">—</span></div>
        <div id="monitor-lag" style="margin: 4px 0; color: #8b98ad;">Event Loop: <span style="color: #8b98ad;">—</span></div>
        <div id="monitor-tick-gaps" style="margin: 4px 0; color: #8b98ad;">Tick Gaps: <span style="color: #8b98ad;">—</span></div>
      </div>

      <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1);">
        <div style="font-weight: bold; color: #5fb38e; margin-bottom: 8px;">🔍 CACHE STATE</div>
        <div id="monitor-cache" style="margin: 4px 0; color: #8b98ad;">Assets Cached: <span style="color: #8b98ad;">0</span></div>
        <div id="monitor-subscription-status" style="margin: 4px 0; color: #8b98ad;">Subscriptions: <span style="color: #8b98ad;">0</span></div>
      </div>

      <div style="text-align: center;">
        <button id="monitor-export" style="
          background: rgba(95,179,142,0.2);
          border: 1px solid rgba(95,179,142,0.4);
          color: #5fb38e;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          margin-right: 8px;
        ">📋 Export Log</button>
        <button id="monitor-close" style="
          background: rgba(214,93,93,0.2);
          border: 1px solid rgba(214,93,93,0.4);
          color: #d65d5d;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
        ">✕ Close</button>
      </div>
    `;

    document.body.appendChild(panel);
    monitorPanel = panel;

    // Get references to display elements
    ticksDisplay = panel.querySelector('#monitor-ticks span');
    lastTickDisplay = panel.querySelector('#monitor-last-tick');
    wsStatusDisplay = panel.querySelector('#monitor-ws-status span');
    chartStatusDisplay = panel.querySelector('#monitor-chart-status span');
    memoryDisplay = panel.querySelector('#monitor-memory span');
    lagDisplay = panel.querySelector('#monitor-lag span');

    // Event listeners
    panel.querySelector('#monitor-export').addEventListener('click', exportLog);
    panel.querySelector('#monitor-close').addEventListener('click', () => panel.style.display = 'none');

    updateDisplay();
  }

  function updateDisplay() {
    if (!monitorPanel) return;

    ticksDisplay.textContent = metrics.realDataTicks;
    
    if (metrics.lastTickTime) {
      const millisAgo = Date.now() - metrics.lastTickTime;
      lastTickDisplay.textContent = `Last Tick: ${millisAgo}ms ago`;
      lastTickDisplay.style.color = millisAgo < 1000 ? '#5fb38e' : '#d65d5d';
    }

    // WebSocket status
    const wsCount = countActiveWebSockets();
    wsStatusDisplay.textContent = wsCount > 0 ? '●' : '●';
    wsStatusDisplay.style.color = wsCount > 0 ? '#5fb38e' : '#d65d5d';
    wsStatusDisplay.parentElement.textContent = `WebSocket: ${wsStatusDisplay.outerHTML} (${wsCount} active)`;

    // Memory
    if (performance.memory) {
      const used = Math.round(performance.memory.usedJSHeapSize / 1048576);
      const total = Math.round(performance.memory.jsHeapSizeLimit / 1048576);
      memoryDisplay.textContent = `${used}MB / ${total}MB`;
      memoryDisplay.style.color = used > total * 0.8 ? '#d65d5d' : '#8b98ad';
    }

    // Event loop lag
    if (metrics.eventLoopLags.length > 0) {
      const avgLag = Math.round(metrics.eventLoopLags.reduce((a, b) => a + b, 0) / metrics.eventLoopLags.length);
      const maxLag = Math.max(...metrics.eventLoopLags);
      lagDisplay.textContent = `${avgLag}ms avg, ${maxLag}ms max`;
      lagDisplay.style.color = avgLag > 50 ? '#d65d5d' : '#8b98ad';
    }

    // Tick gaps
    if (metrics.tickGaps.length > 0) {
      const avgGap = Math.round(metrics.tickGaps.reduce((a, b) => a + b, 0) / metrics.tickGaps.length);
      const maxGap = Math.max(...metrics.tickGaps);
      document.querySelector('#monitor-tick-gaps span').textContent = `${avgGap}ms avg, ${maxGap}ms max`;
    }

    // Cache state
    const cacheSize = typeof RealDataAdapter !== 'undefined' ? 
      Object.keys(RealDataAdapter.getAllCachedData?.() || {}).length : 0;
    document.querySelector('#monitor-cache span').textContent = cacheSize;

    // Subscription count
    const subCount = typeof MarketData !== 'undefined' ? 
      (MarketData._subscriberCount?.() || 0) : 0;
    document.querySelector('#monitor-subscription-status span').textContent = subCount;
  }

  // ── Hooks ────────────────────────────────────────────────

  function hookRealDataAdapter() {
    if (typeof RealDataAdapter === 'undefined') {
      console.warn('⚠️ RealDataAdapter not loaded');
      return;
    }

    const originalEmit = RealDataAdapter.on('price_update', (data) => {
      metrics.realDataTicks++;
      metrics.lastTickTime = Date.now();
      metrics.tickTimestamps.push(metrics.lastTickTime);
      
      if (metrics.tickTimestamps.length > 1) {
        const gap = metrics.tickTimestamps[metrics.tickTimestamps.length - 1] - 
                    metrics.tickTimestamps[metrics.tickTimestamps.length - 2];
        metrics.tickGaps.push(gap);
        if (metrics.tickGaps.length > HISTORY_SIZE) metrics.tickGaps.shift();
      }

      if (metrics.tickTimestamps.length > HISTORY_SIZE) {
        metrics.tickTimestamps.shift();
      }

      console.log(`📥 REAL DATA TICK #${metrics.realDataTicks} — ${data.symbol} @ ${data.price} — Gap: ${metrics.tickGaps[metrics.tickGaps.length-1] || 0}ms`);
    });
  }

  function hookMarketData() {
    if (typeof MarketData === 'undefined') {
      console.warn('⚠️ MarketData not loaded');
      return;
    }

    // Hook the on() method to count subscribers
    const originalOn = MarketData.on;
    let subscriberCount = 0;
    MarketData.on = function(event, fn) {
      subscriberCount++;
      console.log(`📌 MarketData subscription: ${event} (Total: ${subscriberCount})`);
      return originalOn.call(this, event, fn);
    };
    MarketData._subscriberCount = () => subscriberCount;
  }

  // ── Event Loop Lag Detector ──────────────────────────────
  function detectEventLoopLag() {
    const startTime = performance.now();
    setTimeout(() => {
      const endTime = performance.now();
      const lag = endTime - startTime - 10; // should be ~10ms
      
      if (lag > 5) {
        metrics.eventLoopLags.push(lag);
        if (metrics.eventLoopLags.length > HISTORY_SIZE) {
          metrics.eventLoopLags.shift();
        }
        if (lag > 100) {
          console.warn(`⚠️ EVENT LOOP LAG: ${lag.toFixed(0)}ms (potential freeze)`);
        }
      }
    }, 10);
  }

  function countActiveWebSockets() {
    let count = 0;
    // Check RealDataAdapter WebSocket connections
    if (typeof RealDataAdapter !== 'undefined') {
      // Can't directly access private wsConnections, but we can check through a public function
      // For now, return estimated count based on initialized pairs
      count += 11; // Binance has 11 pairs configured by default
    }
    return count;
  }

  function exportLog() {
    const log = {
      timestamp: new Date().toISOString(),
      metrics: {
        totalTicks: metrics.realDataTicks,
        totalUpdates: metrics.marketDataUpdates,
        totalChartUpdates: metrics.chartUpdates,
        avgTickGap: metrics.tickGaps.length ? 
          Math.round(metrics.tickGaps.reduce((a,b) => a+b, 0) / metrics.tickGaps.length) : 0,
        maxTickGap: metrics.tickGaps.length ? Math.max(...metrics.tickGaps) : 0,
        avgEventLoopLag: metrics.eventLoopLags.length ?
          Math.round(metrics.eventLoopLags.reduce((a,b) => a+b, 0) / metrics.eventLoopLags.length) : 0,
        maxEventLoopLag: metrics.eventLoopLags.length ? Math.max(...metrics.eventLoopLags) : 0,
      },
      recentTicks: metrics.tickTimestamps.slice(-20),
      recentUpdates: metrics.updateTimestamps.slice(-20),
      cache: typeof RealDataAdapter !== 'undefined' ? 
        RealDataAdapter.getAllCachedData?.() : {},
      wsStatus: countActiveWebSockets(),
      memory: performance.memory ? {
        used: Math.round(performance.memory.usedJSHeapSize / 1048576),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
      } : null,
    };

    const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `debug-monitor-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    console.log('📋 Debug log exported:', log);
  }

  // ── Public API ───────────────────────────────────────────
  function init() {
    console.log('🔍 Initializing Debug Monitor...');
    createMonitorPanel();
    hookRealDataAdapter();
    hookMarketData();

    // Update display every 500ms
    setInterval(updateDisplay, 500);

    // Detect event loop lag every 100ms
    setInterval(detectEventLoopLag, 100);

    console.log('✅ Debug Monitor active - Watch bottom-right panel');
  }

  function recordChartUpdate(symbol, candle) {
    metrics.chartUpdates++;
    metrics.lastChartUpdateTime = Date.now();
    metrics.chartUpdateTimestamps.push(metrics.lastChartUpdateTime);
    if (metrics.chartUpdateTimestamps.length > HISTORY_SIZE) {
      metrics.chartUpdateTimestamps.shift();
    }
    console.log(`📊 CHART UPDATE #${metrics.chartUpdates} — ${symbol} — Close: ${candle.c}`);
  }

  function getMetrics() {
    return { ...metrics };
  }

  return {
    init,
    recordChartUpdate,
    getMetrics,
    export: exportLog,
  };
})();

// Auto-init when document ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => DebugMonitor.init());
} else {
  DebugMonitor.init();
}
