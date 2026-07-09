/* ════════════════════════════════════════════════════════════
   token-manager.js — JWT Token Refresh & Expiry Management
   
   Manages access tokens with automatic refresh before expiry.
   Stores refresh tokens securely.
   Handles token rotation and graceful expiry.
════════════════════════════════════════════════════════════ */

const TokenManager = (() => {
  'use strict';

  const STORAGE_TOKEN = 'zen_token';
  const STORAGE_REFRESH_TOKEN = 'zen_refresh_token';
  const STORAGE_TOKEN_EXPIRY = 'zen_token_expiry';
  const TOKEN_REFRESH_BUFFER = 60000; // Refresh 60s before expiry
  const MIN_TOKEN_LIFETIME = 300000; // 5 minutes minimum

  let _refreshTimer = null;
  let _refreshPromise = null;
  let _tokenExpiryWarningShown = false;

  // ── Parse JWT without verification (client-side only) ────
  function _decodeJWT(token) {
    try {
      if (!token || typeof token !== 'string') return null;
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(atob(parts[1]));
      return payload;
    } catch (e) {
      return null;
    }
  }

  // ── Get Token Expiry Time ────────────────────────────────
  function getTokenExpiry(token) {
    const payload = _decodeJWT(token);
    if (!payload || !payload.exp) return null;
    return payload.exp * 1000; // Convert seconds to ms
  }

  // ── Check if Token is Expired ────────────────────────────
  function isTokenExpired(token) {
    const expiry = getTokenExpiry(token);
    if (!expiry) return true;
    return Date.now() > expiry;
  }

  // ── Check if Token Should be Refreshed ───────────────────
  function shouldRefreshToken(token) {
    const expiry = getTokenExpiry(token);
    if (!expiry) return true;
    const timeUntilExpiry = expiry - Date.now();
    return timeUntilExpiry < TOKEN_REFRESH_BUFFER;
  }

  // ── Store Tokens ─────────────────────────────────────────
  function storeTokens(accessToken, refreshToken, expiresIn) {
    try {
      const store = localStorage.getItem('zen_remember_me') ? localStorage : sessionStorage;
      store.setItem(STORAGE_TOKEN, accessToken);
      if (refreshToken) {
        store.setItem(STORAGE_REFRESH_TOKEN, refreshToken);
      }
      const expiryTime = Date.now() + (expiresIn || 7 * 24 * 60 * 60 * 1000);
      store.setItem(STORAGE_TOKEN_EXPIRY, expiryTime.toString());
      scheduleTokenRefresh(accessToken);
      return true;
    } catch (e) {
      console.error('Failed to store tokens:', e);
      return false;
    }
  }

  // ── Load Tokens ──────────────────────────────────────────
  function loadTokens() {
    const store = localStorage.getItem('zen_remember_me') ? localStorage : sessionStorage;
    const accessToken = store.getItem(STORAGE_TOKEN);
    const refreshToken = store.getItem(STORAGE_REFRESH_TOKEN);
    const expiry = store.getItem(STORAGE_TOKEN_EXPIRY);
    
    return {
      accessToken,
      refreshToken,
      expiry: expiry ? parseInt(expiry) : null,
    };
  }

  // ── Clear Tokens ─────────────────────────────────────────
  function clearTokens() {
    [localStorage, sessionStorage].forEach(store => {
      store.removeItem(STORAGE_TOKEN);
      store.removeItem(STORAGE_REFRESH_TOKEN);
      store.removeItem(STORAGE_TOKEN_EXPIRY);
    });
    if (_refreshTimer) {
      clearTimeout(_refreshTimer);
      _refreshTimer = null;
    }
  }

  // ── Refresh Token via API ────────────────────────────────
  async function refreshAccessToken() {
    if (_refreshPromise) {
      return _refreshPromise;
    }

    _refreshPromise = (async () => {
      const tokens = loadTokens();
      if (!tokens.refreshToken) {
        console.warn('[TokenManager] No refresh token available');
        return null;
      }

      try {
        const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
          ? 'http://localhost:4000/api'
          : 'https://zen-assets-backend.onrender.com/api';

        const response = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            refreshToken: tokens.refreshToken,
            deviceId: typeof DeviceManager !== 'undefined' ? DeviceManager.getDeviceId() : 'unknown',
          }),
        });

        if (!response.ok) {
          console.warn('[TokenManager] Token refresh failed:', response.status);
          if (response.status === 401) {
            clearTokens();
          }
          return null;
        }

        const data = await response.json();
        if (data.accessToken) {
          storeTokens(data.accessToken, data.refreshToken || tokens.refreshToken, data.expiresIn);
          console.log('[TokenManager] ✓ Token refreshed successfully');
          return data.accessToken;
        }
      } catch (e) {
        console.error('[TokenManager] Token refresh error:', e);
      }

      return null;
    })();

    return _refreshPromise.finally(() => {
      _refreshPromise = null;
    });
  }

  // ── Schedule Automatic Token Refresh ─────────────────────
  function scheduleTokenRefresh(token) {
    if (_refreshTimer) {
      clearTimeout(_refreshTimer);
    }

    const expiry = getTokenExpiry(token);
    if (!expiry) return;

    const timeUntilRefresh = expiry - Date.now() - TOKEN_REFRESH_BUFFER;
    if (timeUntilRefresh < MIN_TOKEN_LIFETIME) {
      console.log('[TokenManager] Token expires too soon, scheduling immediate refresh');
      _refreshTimer = setTimeout(() => refreshAccessToken(), 1000);
      return;
    }

    _refreshTimer = setTimeout(() => {
      console.log('[TokenManager] Triggering automatic token refresh');
      refreshAccessToken();
    }, timeUntilRefresh);

    console.log(`[TokenManager] Token refresh scheduled in ${Math.round(timeUntilRefresh / 1000)}s`);
  }

  // ── Validate Token ───────────────────────────────────────
  async function validateToken(token) {
    if (isTokenExpired(token)) {
      const newToken = await refreshAccessToken();
      if (!newToken) return false;
      return !isTokenExpired(newToken);
    }
    return true;
  }

  // ── Enhance Fetch with Token Refresh ─────────────────────
  function createTokenRefreshInterceptor(originalFetch) {
    return async function(resource, config = {}) {
      let token = loadTokens().accessToken;
      
      if (token && shouldRefreshToken(token)) {
        console.log('[TokenManager] Token expiring soon, refreshing before request');
        const newToken = await refreshAccessToken();
        if (newToken) {
          token = newToken;
        }
      }

      if (token && !config.headers) {
        config.headers = {};
      }
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      try {
        const response = await originalFetch(resource, config);

        if (response.status === 401) {
          console.log('[TokenManager] Received 401, attempting token refresh');
          const newToken = await refreshAccessToken();
          if (newToken) {
            config.headers.Authorization = `Bearer ${newToken}`;
            return originalFetch(resource, config);
          }
        }

        return response;
      } catch (e) {
        console.error('[TokenManager] Fetch error:', e);
        throw e;
      }
    };
  }

  // ── On Token Expiry Warning ──────────────────────────────
  function onTokenExpiryWarning(callback) {
    const tokens = loadTokens();
    if (!tokens.accessToken) return;

    const expiry = getTokenExpiry(tokens.accessToken);
    if (!expiry) return;

    const warningTime = expiry - 300000; // Warn 5 minutes before expiry
    const timeUntilWarning = warningTime - Date.now();

    if (timeUntilWarning > 0) {
      setTimeout(() => {
        if (!_tokenExpiryWarningShown) {
          _tokenExpiryWarningShown = true;
          callback();
          setTimeout(() => {
            _tokenExpiryWarningShown = false;
          }, 300000); // Reset warning flag after 5 minutes
        }
      }, timeUntilWarning);
    }
  }

  // ── Get Token Info ───────────────────────────────────────
  function getTokenInfo() {
    const tokens = loadTokens();
    const payload = _decodeJWT(tokens.accessToken);
    return {
      accessToken: tokens.accessToken ? tokens.accessToken.slice(0, 20) + '...' : null,
      refreshToken: tokens.refreshToken ? tokens.refreshToken.slice(0, 20) + '...' : null,
      expiry: tokens.expiry,
      expiresIn: tokens.expiry ? Math.round((tokens.expiry - Date.now()) / 1000) : null,
      isExpired: tokens.accessToken ? isTokenExpired(tokens.accessToken) : true,
      shouldRefresh: tokens.accessToken ? shouldRefreshToken(tokens.accessToken) : true,
      payload,
    };
  }

  // Public API
  return {
    storeTokens,
    loadTokens,
    clearTokens,
    refreshAccessToken,
    scheduleTokenRefresh,
    validateToken,
    isTokenExpired,
    shouldRefreshToken,
    getTokenExpiry,
    createTokenRefreshInterceptor,
    onTokenExpiryWarning,
    getTokenInfo,
  };
})();
