/* ════════════════════════════════════════════════════════════
   frontend/js/security.js — Frontend Security Layer
   ZEN ASSETS

   - Secure token storage (sessionStorage + memory cache)
   - CSRF prevention
   - Request validation
   - XSS protection
════════════════════════════════════════════════════════════ */

const Security = (() => {
  // Token stored in sessionStorage (cleared on browser close) + memory
  let _tokenCache = null;
  const TOKEN_KEY = 'zen__token_secure';

  // ── Secure Token Storage ────────────────────────────────────
  function saveToken(token, expiresIn = 604800000) {
    _tokenCache = token;
    // Store in sessionStorage (not localStorage — cleared on tab close)
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(`${TOKEN_KEY}__exp`, Date.now() + expiresIn);
    } catch (e) {
      console.warn('[SECURITY] SessionStorage unavailable:', e.message);
    }
  }

  function getToken() {
    if (_tokenCache) return _tokenCache;
    try {
      const token = sessionStorage.getItem(TOKEN_KEY);
      const expiry = parseInt(sessionStorage.getItem(`${TOKEN_KEY}__exp`), 10);
      if (token && expiry > Date.now()) {
        _tokenCache = token;
        return token;
      }
      // Expired
      clearToken();
    } catch (e) {
      console.warn('[SECURITY] SessionStorage read failed:', e.message);
    }
    return null;
  }

  function clearToken() {
    _tokenCache = null;
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(`${TOKEN_KEY}__exp`);
    } catch (e) {
      // Ignore
    }
  }

  // ── XSS Prevention ──────────────────────────────────────────
  function sanitizeHtml(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  }

  function sanitizeInput(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ── CSRF Prevention ─────────────────────────────────────────
  function generateCSRFToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function getCsrfToken() {
    let token = sessionStorage.getItem('_csrf_token');
    if (!token) {
      token = generateCSRFToken();
      sessionStorage.setItem('_csrf_token', token);
    }
    return token;
  }

  // ── Request validation ──────────────────────────────────────
  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
  }

  function validatePassword(pwd) {
    if (pwd.length < 12) return false;
    if (!/[A-Z]/.test(pwd)) return false;
    if (!/[a-z]/.test(pwd)) return false;
    if (!/[0-9]/.test(pwd)) return false;
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) return false;
    return true;
  }

  function validateAmount(amount) {
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0 && num < 1_000_000;
  }

  // ── Prevent timing attacks ──────────────────────────────────
  function constantTimeCompare(a, b) {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }

  // ── Content Security Policy helper ──────────────────────────
  function enforceCSP() {
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.smartsuppchat.com https://*.smartsuppchat.com https://*.smartsupp.com",
      "style-src 'self' 'unsafe-inline' https://*.smartsuppchat.com https://*.smartsupp.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https: wss:",
      "frame-src 'self' https://*.smartsuppchat.com https://*.smartsupp.com",
      "font-src 'self' https: data:"
    ].join('; ');
    document.head.appendChild(meta);
  }

  // ── Init security on page load ──────────────────────────────
  function init() {
    enforceCSP();
    // Clear sensitive data on page unload
    window.addEventListener('beforeunload', () => {
      clearToken();
    });
    console.log('[SECURITY] Initialized');
  }

  return {
    saveToken, getToken, clearToken,
    sanitizeHtml, sanitizeInput,
    generateCSRFToken, getCsrfToken,
    validateEmail, validatePassword, validateAmount,
    constantTimeCompare,
    init,
  };
})();

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Security.init());
} else {
  Security.init();
}
