/* ════════════════════════════════════════════════════════════
   session-timeout.js — Inactivity & Session Timeout Management
   
   Tracks user inactivity and logs out after timeout.
   Shows warning before automatic logout.
   Preserves critical state before timeout.
════════════════════════════════════════════════════════════ */

const SessionTimeout = (() => {
  'use strict';

  const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  const WARNING_TIME = 5 * 60 * 1000; // Warn 5 minutes before timeout
  const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

  let _inactivityTimer = null;
  let _warningTimer = null;
  let _lastActivityTime = Date.now();
  let _isWarningShown = false;
  let _sessionTimeoutCallback = null;
  let _warningCallback = null;
  let _isEnabled = false;

  // ── Record User Activity ─────────────────────────────────
  function _recordActivity() {
    _lastActivityTime = Date.now();
    
    if (_isWarningShown) {
      _dismissWarning();
    }

    _resetTimers();
  }

  // ── Reset Inactivity Timers ──────────────────────────────
  function _resetTimers() {
    if (_inactivityTimer) clearTimeout(_inactivityTimer);
    if (_warningTimer) clearTimeout(_warningTimer);

    _warningTimer = setTimeout(() => {
      _showWarning();
    }, INACTIVITY_TIMEOUT - WARNING_TIME);

    _inactivityTimer = setTimeout(() => {
      _handleTimeout();
    }, INACTIVITY_TIMEOUT);
  }

  // ── Show Warning ─────────────────────────────────────────
  function _showWarning() {
    if (_isWarningShown) return;
    _isWarningShown = true;

    console.warn('[SessionTimeout] Inactivity warning: session will expire in 5 minutes');

    if (_warningCallback) {
      _warningCallback({
        message: 'Your session will expire in 5 minutes due to inactivity.',
        timeRemaining: WARNING_TIME,
        onExtend: extendSession,
        onLogout: handleTimeout,
      });
    }

    // Auto-show warning UI if available
    _showWarningUI();
  }

  // ── Dismiss Warning ──────────────────────────────────────
  function _dismissWarning() {
    if (!_isWarningShown) return;
    _isWarningShown = false;

    console.log('[SessionTimeout] Inactivity warning dismissed, session extended');

    _dismissWarningUI();
  }

  // ── Handle Timeout ───────────────────────────────────────
  async function _handleTimeout() {
    console.warn('[SessionTimeout] Session timeout triggered - logging out');
    
    _isWarningShown = false;
    _dismissWarningUI();

    // Preserve state before logout
    if (typeof InvestmentReturns !== 'undefined' && InvestmentReturns.saveSnapshot) {
      InvestmentReturns.saveSnapshot();
    }

    // Trigger logout
    if (typeof UserAuth !== 'undefined' && UserAuth.logout) {
      await UserAuth.logout();
    }

    if (_sessionTimeoutCallback) {
      _sessionTimeoutCallback();
    }

    // Show timeout message
    _showTimeoutUI();
  }

  // ── Extend Session ──────────────────────────────────────
  function extendSession() {
    console.log('[SessionTimeout] Session extended');
    _lastActivityTime = Date.now();
    _dismissWarning();
    _resetTimers();

    if (typeof TokenManager !== 'undefined' && TokenManager.refreshAccessToken) {
      TokenManager.refreshAccessToken().catch(e => {
        console.warn('[SessionTimeout] Failed to refresh token:', e);
      });
    }
  }

  // ── Show Warning UI ──────────────────────────────────────
  function _showWarningUI() {
    try {
      let modal = document.getElementById('session-timeout-warning');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'session-timeout-warning';
        modal.className = 'session-timeout-modal';
        modal.innerHTML = `
          <div class="stm-backdrop"></div>
          <div class="stm-container">
            <div class="stm-header">
              <i class="fa fa-hourglass-half stm-icon"></i>
              <h3>Session Timeout Warning</h3>
            </div>
            <div class="stm-body">
              <p>Your session will expire in <strong id="stm-countdown">5:00</strong> minutes due to inactivity.</p>
              <p style="font-size:13px;color:#94a3b8;margin-top:8px">Click "Stay Logged In" to continue working or you will be logged out automatically.</p>
            </div>
            <div class="stm-actions">
              <button class="btn btn-secondary" onclick="SessionTimeout.logout()">
                <i class="fa fa-sign-out-alt"></i> Log Out Now
              </button>
              <button class="btn btn-primary" onclick="SessionTimeout.extendSession()">
                <i class="fa fa-refresh"></i> Stay Logged In
              </button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        _addWarningStyles();
      }

      modal.style.display = 'flex';
      _startCountdown();
    } catch (e) {
      console.error('[SessionTimeout] Failed to show warning UI:', e);
    }
  }

  // ── Start Countdown ──────────────────────────────────────
  function _startCountdown() {
    let timeRemaining = WARNING_TIME / 1000; // Convert to seconds

    const updateCountdown = () => {
      const minutes = Math.floor(timeRemaining / 60);
      const seconds = Math.floor(timeRemaining % 60);
      const el = document.getElementById('stm-countdown');
      if (el) {
        el.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }
      timeRemaining--;
      if (timeRemaining >= 0) {
        setTimeout(updateCountdown, 1000);
      }
    };

    updateCountdown();
  }

  // ── Dismiss Warning UI ───────────────────────────────────
  function _dismissWarningUI() {
    try {
      const modal = document.getElementById('session-timeout-warning');
      if (modal) {
        modal.style.display = 'none';
      }
    } catch (e) {
      console.warn('[SessionTimeout] Failed to dismiss warning UI:', e);
    }
  }

  // ── Show Timeout UI ──────────────────────────────────────
  function _showTimeoutUI() {
    try {
      let modal = document.getElementById('session-timeout-expired');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'session-timeout-expired';
        modal.className = 'session-timeout-modal';
        modal.innerHTML = `
          <div class="stm-backdrop"></div>
          <div class="stm-container stm-expired">
            <div class="stm-header">
              <i class="fa fa-lock stm-icon"></i>
              <h3>Session Expired</h3>
            </div>
            <div class="stm-body">
              <p>Your session has expired due to inactivity.</p>
              <p style="font-size:13px;color:#94a3b8;margin-top:8px">For security reasons, you have been automatically logged out. Please log in again to continue.</p>
            </div>
            <div class="stm-actions">
              <button class="btn btn-primary" onclick="window.location.href = '/'">
                <i class="fa fa-sign-in-alt"></i> Return to Login
              </button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        _addWarningStyles();
      }

      modal.style.display = 'flex';
    } catch (e) {
      console.error('[SessionTimeout] Failed to show timeout UI:', e);
    }
  }

  // ── Add Warning Styles ───────────────────────────────────
  function _addWarningStyles() {
    if (document.getElementById('session-timeout-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'session-timeout-styles';
    styles.textContent = `
      .session-timeout-modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 9999;
        align-items: center;
        justify-content: center;
      }

      .stm-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
      }

      .stm-container {
        position: relative;
        z-index: 10000;
        background: linear-gradient(135deg, #0a0e16 0%, #1a2332 100%);
        border: 1px solid rgba(212, 165, 116, 0.2);
        border-radius: 12px;
        padding: 32px;
        max-width: 420px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
        animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .stm-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
      }

      .stm-icon {
        font-size: 28px;
        color: #d4a574;
      }

      .stm-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #ffffff;
      }

      .stm-body {
        margin-bottom: 24px;
        color: #cbd5e1;
        line-height: 1.6;
      }

      .stm-body strong {
        color: #d4a574;
        font-weight: 600;
      }

      .stm-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }

      .stm-actions .btn {
        padding: 10px 16px;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        border: none;
        transition: all 0.3s ease;
      }

      .stm-actions .btn-primary {
        background: linear-gradient(135deg, #d4a574 0%, #c9984a 100%);
        color: #0a0e16;
        font-weight: 600;
      }

      .stm-actions .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(212, 165, 116, 0.3);
      }

      .stm-actions .btn-secondary {
        background: rgba(212, 165, 116, 0.1);
        color: #d4a574;
        border: 1px solid rgba(212, 165, 116, 0.3);
      }

      .stm-actions .btn-secondary:hover {
        background: rgba(212, 165, 116, 0.2);
      }

      .stm-expired .stm-icon {
        color: #ef4444;
      }
    `;
    document.head.appendChild(styles);
  }

  // ── Initialize ───────────────────────────────────────────
  function init(options = {}) {
    // If already enabled, call disable first to purge listeners,
    // then re-init with fresh ones. This prevents duplicate listeners
    // from accumulating when login() is called multiple times.
    if (_isEnabled) {
      console.log('[SessionTimeout] Re-initializing — cleaning up first');
      disable();
    }

    _sessionTimeoutCallback = options.onTimeout;
    _warningCallback = options.onWarning;
    _lastActivityTime = Date.now();

    ACTIVITY_EVENTS.forEach(event => {
      document.addEventListener(event, _recordActivity, { passive: true });
    });

    window.addEventListener('focus', () => {
      _recordActivity();
    });

    _resetTimers();
    _isEnabled = true;

    console.log('[SessionTimeout] ✓ Initialized (timeout: 30min, warning: 5min)');
  }

  // ── Disable ──────────────────────────────────────────────
  function disable() {
    if (_inactivityTimer) clearTimeout(_inactivityTimer);
    if (_warningTimer) clearTimeout(_warningTimer);
    
    ACTIVITY_EVENTS.forEach(event => {
      document.removeEventListener(event, _recordActivity);
    });

    window.removeEventListener('focus', _recordActivity);

    _dismissWarningUI();
    // Fully remove DOM elements so they can be re-created fresh on re-init
    _cleanupUIElements();
    _isEnabled = false;
    _isWarningShown = false;
    _sessionTimeoutCallback = null;
    _warningCallback = null;
    console.log('[SessionTimeout] ✓ Disabled');
  }

  // ── Remove all timeout-related DOM elements from the page ──
  function _cleanupUIElements() {
    ['session-timeout-warning', 'session-timeout-expired'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  }

  // ── Get Status ───────────────────────────────────────────
  function getStatus() {
    const now = Date.now();
    const inactiveTime = now - _lastActivityTime;
    const timeUntilTimeout = Math.max(0, INACTIVITY_TIMEOUT - inactiveTime);
    const timeUntilWarning = Math.max(0, INACTIVITY_TIMEOUT - WARNING_TIME - inactiveTime);

    return {
      isEnabled: _isEnabled,
      isWarningShown: _isWarningShown,
      lastActivityTime: _lastActivityTime,
      inactiveTime,
      timeUntilWarning,
      timeUntilTimeout,
      inactivityTimeout: INACTIVITY_TIMEOUT,
      warningTime: WARNING_TIME,
    };
  }

  // Public API
  return {
    init,
    disable,
    extendSession,
    logout: _handleTimeout,
    getStatus,
  };
})();
