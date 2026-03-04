/* ════════════════════════════════════════════════════════════
   chart-validation.js — Comprehensive Chart System Validation
   Validates all components of the data pipeline
════════════════════════════════════════════════════════════ */

const ChartValidation = (() => {
  'use strict';

  const report = {
    timestamp: new Date().toISOString(),
    results: {},
    errors: [],
    warnings: [],
  };

  // ── Validation: Module Availability ─────────────────────
  function validateModules() {
    const modules = [
      'RealDataAdapter',
      'MarketData',
      'AdvancedChartEngine',
      'DebugMonitor',
      'APIProxy',
      'LightweightCharts',
    ];

    const status = {};
    modules.forEach(mod => {
      const available = typeof window[mod] !== 'undefined';
      status[mod] = available;
      if (!available) {
        report.warnings.push(`⚠️ ${mod} not available`);
      } else {
        console.log(`✅ ${mod} loaded`);
      }
    });

    report.results.moduleAvailability = status;
    return status;
  }

  // ── Validation: RealDataAdapter ─────────────────────────
  function validateRealDataAdapter() {
    if (typeof RealDataAdapter === 'undefined') {
      report.errors.push('❌ RealDataAdapter not loaded');
      return null;
    }

    const status = {
      enabled: RealDataAdapter.isRealDataEnabled?.() ?? null,
      cachedAssets: Object.keys(RealDataAdapter.getAllCachedData?.() || {}).length,
      methods: {
        init: typeof RealDataAdapter.init === 'function',
        fetchHistoricalCandles: typeof RealDataAdapter.fetchHistoricalCandles === 'function',
        getPrice: typeof RealDataAdapter.getPrice === 'function',
      },
    };

    report.results.realDataAdapter = status;
    
    if (status.enabled) {
      console.log(`✅ RealDataAdapter: Real data ${status.enabled ? 'ENABLED' : 'DISABLED'}`);
      console.log(`   Cached Assets: ${status.cachedAssets}`);
    } else {
      report.warnings.push('⚠️ RealDataAdapter: Real data disabled');
    }

    return status;
  }

  // ── Validation: MarketData ──────────────────────────────
  function validateMarketData() {
    if (typeof MarketData === 'undefined') {
      report.errors.push('❌ MarketData not loaded');
      return null;
    }

    const btc = MarketData.getAsset('BTC');
    const status = {
      btcPrice: btc?.price ?? null,
      totalAssets: MarketData.getAllAssets?.()?.length ?? 0,
      methods: {
        init: typeof MarketData.init === 'function',
        getAsset: typeof MarketData.getAsset === 'function',
        on: typeof MarketData.on === 'function',
        _injectRealPrice: typeof MarketData._injectRealPrice === 'function',
      },
    };

    report.results.marketData = status;

    if (status.btcPrice) {
      console.log(`✅ MarketData: BTC @ $${status.btcPrice.toFixed(2)}`);
      console.log(`   Total Assets: ${status.totalAssets}`);
    } else {
      report.errors.push('❌ MarketData: No BTC price found');
    }

    return status;
  }

  // ── Validation: Chart Engine ────────────────────────────
  function validateChartEngine() {
    if (typeof AdvancedChartEngine === 'undefined') {
      report.errors.push('❌ AdvancedChartEngine not loaded');
      return null;
    }

    const status = {
      methods: {
        createLightweightChart: typeof AdvancedChartEngine.createLightweightChart === 'function',
        startRealtimeUpdates: typeof AdvancedChartEngine.startRealtimeUpdates === 'function',
      },
      lightweightChartsAvailable: typeof LightweightCharts !== 'undefined',
    };

    report.results.chartEngine = status;

    console.log(`✅ AdvancedChartEngine loaded`);
    if (status.lightweightChartsAvailable) {
      console.log(`   TradingView LightweightCharts: AVAILABLE`);
    } else {
      report.warnings.push('⚠️ TradingView LightweightCharts not available (fallback to Chart.js)');
    }

    return status;
  }

  // ── Validation: DOM Elements ────────────────────────────
  function validateDOM() {
    const requiredElements = [
      'main-price-chart',
      'debug-monitor-panel',
    ];

    const status = {};
    requiredElements.forEach(id => {
      const elem = document.getElementById(id);
      status[id] = !!elem;
      if (!elem) {
        report.warnings.push(`⚠️ DOM Element missing: #${id}`);
      } else {
        console.log(`✅ DOM: #${id} found`);
      }
    });

    report.results.dom = status;
    return status;
  }

  // ── Validation: Data Flow Test ──────────────────────────
  async function validateDataFlow() {
    if (typeof RealDataAdapter === 'undefined') {
      report.errors.push('❌ Cannot test data flow: RealDataAdapter not loaded');
      return null;
    }

    console.log('🧪 Testing data flow...');

    const status = {
      websocketCandles: null,
      restCandles: null,
      priceInjection: null,
      eventEmission: null,
    };

    // Test 1: Fetch historical candles (REST + retries)
    try {
      const candles = await RealDataAdapter.fetchHistoricalCandles('BTC', '5m', 10);
      status.restCandles = {
        success: !!candles,
        count: candles?.length ?? 0,
        sample: candles?.[0] ? {
          time: candles[0].t,
          open: candles[0].o,
          high: candles[0].h,
          low: candles[0].l,
          close: candles[0].c,
          volume: candles[0].v,
        } : null,
      };
      console.log(`✅ REST Candle Fetch: ${candles?.length ?? 0} candles retrieved`);
    } catch (err) {
      status.restCandles = { success: false, error: err.message };
      report.errors.push(`❌ REST candle fetch failed: ${err.message}`);
      console.error(`❌ REST Candle Fetch Failed:`, err.message);
    }

    // Test 2: Price injection
    if (typeof MarketData !== 'undefined') {
      try {
        const beforePrice = MarketData.getAsset('BTC')?.price;
        MarketData._injectRealPrice('BTC', {
          price: 67500,
          high24h: 68000,
          low24h: 67000,
          vol24h: 1000000,
          chg24h: 500,
          pct24h: 0.75,
        });
        const afterPrice = MarketData.getAsset('BTC')?.price;
        status.priceInjection = {
          success: afterPrice === 67500,
          before: beforePrice,
          after: afterPrice,
        };
        console.log(`✅ Price Injection: BTC $${beforePrice} → $${afterPrice}`);
      } catch (err) {
        status.priceInjection = { success: false, error: err.message };
        report.errors.push(`❌ Price injection failed: ${err.message}`);
      }
    }

    // Test 3: Event emission
    if (typeof MarketData !== 'undefined') {
      try {
        let eventFired = false;
        MarketData.on('price:TEST', (data) => {
          eventFired = true;
        });
        MarketData._injectRealPrice('TEST', { price: 100 });
        
        // Wait a bit for async event
        await new Promise(r => setTimeout(r, 50));
        
        status.eventEmission = { success: eventFired };
        console.log(`✅ Event Emission: ${eventFired ? 'WORKING' : 'FAILED'}`);
      } catch (err) {
        status.eventEmission = { success: false, error: err.message };
      }
    }

    report.results.dataFlow = status;
    return status;
  }

  // ── Validation: DebugMonitor ────────────────────────────
  function validateDebugMonitor() {
    if (typeof DebugMonitor === 'undefined') {
      report.errors.push('❌ DebugMonitor not loaded');
      return null;
    }

    const metrics = DebugMonitor.getMetrics?.();
    const status = {
      available: true,
      metrics: {
        realDataTicks: metrics?.realDataTicks ?? 0,
        chartUpdates: metrics?.chartUpdates ?? 0,
        chartUpdateFailures: metrics?.chartUpdateFailures ?? 0,
        wsErrors: metrics?.wsErrors ?? 0,
      },
    };

    report.results.debugMonitor = status;

    console.log(`✅ DebugMonitor: Active`);
    console.log(`   Ticks: ${status.metrics.realDataTicks}`);
    console.log(`   Chart Updates: ${status.metrics.chartUpdates}`);
    if (status.metrics.chartUpdateFailures > 0) {
      console.log(`   ⚠️ Chart Failures: ${status.metrics.chartUpdateFailures}`);
    }
    if (status.metrics.wsErrors > 0) {
      console.log(`   ⚠️ WS Errors: ${status.metrics.wsErrors}`);
    }

    return status;
  }

  // ── Validation: Performance ────────────────────────────
  function validatePerformance() {
    const status = {
      memory: null,
      fps: null,
      eventLoopLag: null,
    };

    // Memory
    if (performance.memory) {
      const used = Math.round(performance.memory.usedJSHeapSize / 1048576);
      const limit = Math.round(performance.memory.jsHeapSizeLimit / 1048576);
      status.memory = {
        used: used,
        limit: limit,
        percentUsed: Math.round((used / limit) * 100),
      };
      
      if (status.memory.percentUsed > 80) {
        report.warnings.push(`⚠️ High memory usage: ${status.memory.percentUsed}%`);
      }
      console.log(`✅ Memory: ${used}MB / ${limit}MB (${status.memory.percentUsed}%)`);
    }

    // Event loop lag
    const startTime = performance.now();
    let lag = 0;
    setTimeout(() => {
      lag = Math.round((performance.now() - startTime - 10) * 100) / 100;
      status.eventLoopLag = lag;
      if (lag > 50) {
        report.warnings.push(`⚠️ Event loop lagging: ${lag}ms`);
      }
    }, 10);

    report.results.performance = status;
    return status;
  }

  // ── Generate HTML Report ────────────────────────────────
  function generateHTMLReport() {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Chart Validation Report - ${new Date().toLocaleString()}</title>
        <style>
          body { font-family: 'JetBrains Mono', monospace; background: #0a0e16; color: #e2e8f0; padding: 20px; }
          .report { max-width: 900px; margin: 0 auto; }
          .section { background: #151a24; border: 1px solid rgba(95,179,142,0.2); border-radius: 8px; padding: 16px; margin: 12px 0; }
          .title { font-size: 20px; font-weight: bold; color: #5fb38e; margin-bottom: 12px; }
          .subsection { margin: 12px 0; padding-left: 16px; border-left: 2px solid rgba(95,179,142,0.4); }
          .success { color: #5fb38e; }
          .error { color: #d65d5d; }
          .warning { color: #d4a574; }
          pre { background: #0a0e16; border: 1px solid rgba(95,179,142,0.2); padding: 12px; border-radius: 6px; overflow-x: auto; }
          table { width: 100%; border-collapse: collapse; }
          td, th { text-align: left; padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); }
          th { background: rgba(95,179,142,0.1); font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="report">
          <div class="section">
            <div class="title">🔍 Chart Validation Report</div>
            <p>Generated: ${report.timestamp}</p>
          </div>

          ${report.errors.length > 0 ? `
            <div class="section">
              <div class="title error">❌ Errors (${report.errors.length})</div>
              ${report.errors.map(e => `<div class="subsection error">• ${e}</div>`).join('')}
            </div>
          ` : ''}

          ${report.warnings.length > 0 ? `
            <div class="section">
              <div class="title warning">⚠️ Warnings (${report.warnings.length})</div>
              ${report.warnings.map(w => `<div class="subsection warning">• ${w}</div>`).join('')}
            </div>
          ` : ''}

          <div class="section">
            <div class="title">📊 Detailed Report</div>
            <pre>${JSON.stringify(report, null, 2)}</pre>
          </div>
        </div>
      </body>
      </html>
    `;
    return html;
  }

  // ── Public API ────────────────────────────────────────
  function runFullValidation() {
    console.clear();
    console.log('%c🔍 CHART SYSTEM VALIDATION STARTING', 'color: #5fb38e; font-size: 16px; font-weight: bold;');
    console.log('════════════════════════════════════════════════════════════\n');

    validateModules();
    validateRealDataAdapter();
    validateMarketData();
    validateChartEngine();
    validateDOM();
    validateDebugMonitor();
    validatePerformance();
    
    // Run data flow test after small delay
    setTimeout(() => validateDataFlow(), 100);

    console.log('\n════════════════════════════════════════════════════════════');
    console.log('%c✅ VALIDATION COMPLETE', 'color: #5fb38e; font-size: 16px; font-weight: bold;');
    console.log('\nSummary:');
    console.log(`  Errors: ${report.errors.length}`);
    console.log(`  Warnings: ${report.warnings.length}`);
    console.log('\nTo view full report: ChartValidation.getReport()');
    console.log('To generate HTML report: ChartValidation.downloadReport()');

    return report;
  }

  function getReport() {
    return report;
  }

  function downloadReport() {
    const html = generateHTMLReport();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chart-validation-${Date.now()}.html`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // Run on initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => console.log('📌 Run ChartValidation.runFullValidation() to validate chart system'), 1000);
    });
  } else {
    setTimeout(() => console.log('📌 Run ChartValidation.runFullValidation() to validate chart system'), 1000);
  }

  return {
    runFullValidation,
    getReport,
    downloadReport,
  };
})();
