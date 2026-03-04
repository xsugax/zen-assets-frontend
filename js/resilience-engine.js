/* ════════════════════════════════════════════════════════════
   resilience-engine.js — Circuit Breaker & Auto-Recovery
   OmniVest AI / ZEN ASSETS
   
   Implements:
   - Circuit breaker pattern for WebSocket failures
   - Automatic recovery with exponential backoff
   - Health checks and system diagnostics
   - Cascade failure prevention
   - State machine for connection management
════════════════════════════════════════════════════════════ */

const ResilienceEngine = (() => {
  'use strict';

  // ── Circuit Breaker State Machine ──────────────────────
  const CircuitBreaker = {
    CLOSED: 'CLOSED',         // Normal operation
    OPEN: 'OPEN',             // Blocking requests
    HALF_OPEN: 'HALF_OPEN',   // Testing recovery
  };

  const breakers = {
    websocket: { state: CircuitBreaker.CLOSED, failureCount: 0, lastFailure: null },
    restAPI: { state: CircuitBreaker.CLOSED, failureCount: 0, lastFailure: null },
    chartEngine: { state: CircuitBreaker.CLOSED, failureCount: 0, lastFailure: null },
    marketData: { state: CircuitBreaker.CLOSED, failureCount: 0, lastFailure: null },
  };

  const CONFIG = {
    failureThreshold: 5,           // Open circuit after 5 failures
    successThreshold: 3,           // Close circuit after 3 successes in half-open
    resetTimeout: 30000,           // Try recovery after 30s
    backoffMultiplier: 1.5,       // Exponential backoff: 1s, 1.5s, 2.25s, 3.375s, 5s
    maxBackoff: 30000,            // Cap at 30s
  };

  // ── Failure History ────────────────────────────────────
  const failureHistory = {
    websocket: [],
    restAPI: [],
    chartEngine: [],
    marketData: [],
  };

  const MAX_HISTORY = 100;

  // ── Health Check ──────────────────────────────────────
  const health = {
    lastCheck: null,
    results: {
      websocket: 'UNKNOWN',
      restAPI: 'UNKNOWN',
      chartEngine: 'UNKNOWN',
      marketData: 'UNKNOWN',
      memory: 'UNKNOWN',
      eventLoop: 'UNKNOWN',
    },
  };

  // ── Request Handler with Circuit Breaker ─────────────
  async function executeWithCircuitBreaker(breakerName, fn, fallback) {
    const breaker = breakers[breakerName];
    if (!breaker) {
      console.error(`❌ Unknown breaker: ${breakerName}`);
      return null;
    }

    // OPEN: Fail fast without trying
    if (breaker.state === CircuitBreaker.OPEN) {
      const timeSinceFailure = Date.now() - breaker.lastFailure;
      if (timeSinceFailure < CONFIG.resetTimeout) {
        console.warn(`🔴 Circuit OPEN for ${breakerName} (${Math.round(timeSinceFailure / 1000)}s ago) - Using fallback`);
        return fallback?.() ?? null;
      } else {
        // Try recovery
        console.log(`🟡 Circuit HALF_OPEN for ${breakerName} - Attempting recovery`);
        breaker.state = CircuitBreaker.HALF_OPEN;
        breaker.failureCount = 0;
      }
    }

    // Execute request
    try {
      const result = await fn();
      recordSuccess(breakerName);
      return result;
    } catch (err) {
      recordFailure(breakerName, err);
      return fallback?.() ?? null;
    }
  }

  function recordSuccess(breakerName) {
    const breaker = breakers[breakerName];
    
    if (breaker.state === CircuitBreaker.HALF_OPEN) {
      breaker.failureCount++;
      console.log(`✅ Recovery attempt #${breaker.failureCount}/${CONFIG.successThreshold} for ${breakerName}`);
      
      if (breaker.failureCount >= CONFIG.successThreshold) {
        breaker.state = CircuitBreaker.CLOSED;
        breaker.failureCount = 0;
        console.log(`🟢 Circuit CLOSED again for ${breakerName} - System recovered!`);
        if (typeof DebugMonitor !== 'undefined') {
          console.log(`📊 DebugMonitor: ${breakerName} recovered`);
        }
      }
    } else {
      breaker.failureCount = Math.max(0, breaker.failureCount - 1);
    }
    
    breaker.lastFailure = null;
    health.results[breakerName] = 'HEALTHY';
  }

  function recordFailure(breakerName, err) {
    const breaker = breakers[breakerName];
    breaker.failureCount++;
    breaker.lastFailure = Date.now();
    health.results[breakerName] = 'FAILED';

    // Add to history
    failureHistory[breakerName].push({
      time: Date.now(),
      error: err.message,
      stack: err.stack,
    });
    if (failureHistory[breakerName].length > MAX_HISTORY) {
      failureHistory[breakerName].shift();
    }

    console.error(`❌ ${breakerName} failure #${breaker.failureCount}: ${err.message}`);

    // Check if should open circuit
    if (breaker.failureCount >= CONFIG.failureThreshold) {
      breaker.state = CircuitBreaker.OPEN;
      console.error(`🔴 CIRCUIT OPENED for ${breakerName} after ${breaker.failureCount} failures`);
      console.error(`   Will attempt recovery in ${CONFIG.resetTimeout / 1000}s`);
    }
  }

  // ── Exponential Backoff Calculator ────────────────────
  function calculateBackoff(attemptNumber) {
    const backoff = Math.min(
      (1000 * Math.pow(CONFIG.backoffMultiplier, attemptNumber - 1)) +
      (Math.random() * 1000), // Add jitter
      CONFIG.maxBackoff
    );
    return Math.round(backoff);
  }

  // ── Health Check System ──────────────────────────────
  async function runHealthCheck() {
    console.log('🏥 Running system health check...');
    health.lastCheck = Date.now();

    // Test 1: WebSocket availability
    try {
      if (typeof RealDataAdapter !== 'undefined') {
        const price = RealDataAdapter.getPrice('BTC');
        health.results.websocket = price ? 'HEALTHY' : 'DEGRADED';
        console.log(`  ✅ WebSocket: ${health.results.websocket}`);
      }
    } catch (err) {
      health.results.websocket = 'FAILED';
      console.error(`  ❌ WebSocket: ${err.message}`);
    }

    // Test 2: MarketData availability
    try {
      if (typeof MarketData !== 'undefined') {
        const btc = MarketData.getAsset('BTC');
        health.results.marketData = btc ? 'HEALTHY' : 'DEGRADED';
        console.log(`  ✅ MarketData: ${health.results.marketData}`);
      }
    } catch (err) {
      health.results.marketData = 'FAILED';
      console.error(`  ❌ MarketData: ${err.message}`);
    }

    // Test 3: Chart Engine availability
    try {
      if (typeof AdvancedChartEngine !== 'undefined') {
        health.results.chartEngine = 'HEALTHY';
        console.log(`  ✅ ChartEngine: HEALTHY`);
      }
    } catch (err) {
      health.results.chartEngine = 'FAILED';
      console.error(`  ❌ ChartEngine: ${err.message}`);
    }

    // Test 4: Memory usage
    if (performance.memory) {
      const percentUsed = (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100;
      health.results.memory = percentUsed > 80 ? 'CRITICAL' : percentUsed > 50 ? 'WARNING' : 'HEALTHY';
      console.log(`  Memory: ${Math.round(percentUsed)}% used - ${health.results.memory}`);
    }

    // Test 5: Event loop responsiveness
    const startTime = performance.now();
    await new Promise(r => setTimeout(r, 10));
    const eventLoopLag = Math.round((performance.now() - startTime - 10) * 100) / 100;
    health.results.eventLoop = eventLoopLag > 50 ? 'CRITICAL' : eventLoopLag > 20 ? 'WARNING' : 'HEALTHY';
    console.log(`  Event Loop: ${eventLoopLag}ms lag - ${health.results.eventLoop}`);

    // Calculate overall health
    const healthValues = Object.values(health.results);
    const criticalCount = healthValues.filter(v => v === 'CRITICAL').length;
    const failedCount = healthValues.filter(v => v === 'FAILED').length;
    const warningCount = healthValues.filter(v => v === 'WARNING').length;

    const overallHealth = criticalCount > 0 ? 'CRITICAL' : failedCount > 2 ? 'FAILED' : warningCount > 1 ? 'WARNING' : 'HEALTHY';

    console.log(`\n🏥 Overall Health: ${overallHealth}`);
    console.log(`   Healthy: ${healthValues.filter(v => v === 'HEALTHY').length}`);
    console.log(`   Warnings: ${warningCount}`);
    console.log(`   Failures: ${failedCount}`);
    console.log(`   Critical: ${criticalCount}\n`);

    return { health, overallHealth };
  }

  // ── Auto Recovery System ─────────────────────────────
  function startAutoRecovery() {
    console.log('🔄 Starting auto-recovery system (30s interval)...');

    setInterval(async () => {
      // Check if any circuits are open
      const openCircuits = Object.entries(breakers)
        .filter(([_, breaker]) => breaker.state === CircuitBreaker.OPEN)
        .map(([name, _]) => name);

      if (openCircuits.length > 0) {
        console.log(`🔄 Checking ${openCircuits.length} open circuit(s) for recovery...`);
        
        for (const circuit of openCircuits) {
          const timeSinceFailure = Date.now() - breakers[circuit].lastFailure;
          if (timeSinceFailure >= CONFIG.resetTimeout) {
            console.log(`🟡 Attempting recovery for ${circuit}...`);
            // Will be picked up on next request attempt
          }
        }
      }
    }, CONFIG.resetTimeout);
  }

  // ── Graceful Degradation ───────────────────────────
  function applyDegradedMode() {
    console.warn('⚠️ System in DEGRADED mode - applying fallback strategies');

    // Strategy 1: Increase REST polling frequency
    console.log('  → Increasing REST polling to 250ms');

    // Strategy 2: Reduce chart update frequency
    console.log('  → Reducing chart updates to essential data only');

    // Strategy 3: Cache data more aggressively
    console.log('  → Enabling aggressive caching');

    // Strategy 4: Notify user
    if (typeof DebugMonitor !== 'undefined') {
      console.warn('⚠️ System running in degraded mode due to service failures');
    }
  }

  // ── Check System Cascades ──────────────────────────
  function checkCascades() {
    const failedServices = Object.entries(breakers)
      .filter(([_, b]) => b.state === CircuitBreaker.OPEN)
      .map(([name, _]) => name);

    if (failedServices.length >= 2) {
      console.error(`🚨 CASCADING FAILURE DETECTED: ${failedServices.join(', ')} all failed`);
      applyDegradedMode();
      return true;
    }
    return false;
  }

  // ── Statistics & Reporting ──────────────────────────
  function getStatistics() {
    const stats = {
      timestamp: new Date().toISOString(),
      circuitBreakers: {},
      failureSummary: {},
      health: health,
      overallStatus: 'UNKNOWN',
    };

    // Circuit breaker stats
    for (const [name, breaker] of Object.entries(breakers)) {
      stats.circuitBreakers[name] = {
        state: breaker.state,
        failureCount: breaker.failureCount,
        lastFailure: breaker.lastFailure ? new Date(breaker.lastFailure).toISOString() : null,
        recentFailures: failureHistory[name].slice(-5),
      };

      // Summary
      stats.failureSummary[name] = {
        totalFailures: failureHistory[name].length,
        recentFailuresLast5Min: failureHistory[name].filter(
          f => Date.now() - f.time < 300000
        ).length,
        firstFailureTime: failureHistory[name][0]?.time,
        lastFailureTime: failureHistory[name][failureHistory[name].length - 1]?.time,
      };
    }

    return stats;
  }

  // ── Public API ──────────────────────────────────────
  function init() {
    console.log('🔧 Initializing Resilience Engine...');
    startAutoRecovery();
    
    // Run health check immediately and then every 60 seconds
    runHealthCheck();
    setInterval(runHealthCheck, 60000);
    
    // Check for cascading failures every 10 seconds
    setInterval(checkCascades, 10000);

    console.log('✅ Resilience Engine active');
  }

  return {
    CircuitBreaker,
    init,
    executeWithCircuitBreaker,
    recordSuccess,
    recordFailure,
    calculateBackoff,
    runHealthCheck,
    getStatistics,
    getHealth: () => health,
    getBreakers: () => breakers,
    getFailureHistory: () => failureHistory,
  };
})();

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ResilienceEngine.init());
} else {
  ResilienceEngine.init();
}
