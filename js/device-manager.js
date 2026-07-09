/* ════════════════════════════════════════════════════════════
   device-manager.js — Device Identification & Cross-Device Auth
   
   Generates and stores device IDs with fingerprinting.
   Remembers devices for faster login across sessions.
   Syncs authentication state across browser tabs.
════════════════════════════════════════════════════════════ */

const DeviceManager = (() => {
  'use strict';

  const DEVICE_ID_KEY = 'zen_device_id';
  const DEVICE_NAME_KEY = 'zen_device_name';
  const KNOWN_DEVICES_KEY = 'zen_known_devices';
  const DEVICE_SYNC_KEY = 'zen_device_sync_event';

  // ── Stable Fingerprint (cached — never regenerates per call) ──
  let _cachedFingerprint = null;

  function _generateFingerprint() {
    // Use cached value so fingerprint stays stable across this session
    if (_cachedFingerprint) return _cachedFingerprint;

    // First attempt: use stored fingerprint from localStorage (persistent)
    const stored = localStorage.getItem('zen_device_fingerprint');
    if (stored) {
      _cachedFingerprint = stored;
      return stored;
    }

    // Generate deterministic fingerprint from stable browser properties only
    // (no canvas — canvas output can vary subtly between loads)
    const nav = navigator;
    const screen = window.screen;
    const components = [
      nav.userAgent,
      nav.language,
      new Date().getTimezoneOffset(),
      screen.width,
      screen.height,
      screen.colorDepth,
      screen.pixelDepth,
      navigator.hardwareConcurrency || 'unknown',
      navigator.deviceMemory || 'unknown',
    ];

    let hash = 0;
    const str = components.join('|');
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const fp = Math.abs(hash).toString(36).padStart(12, '0');

    // Cache and persist so it never changes
    _cachedFingerprint = fp;
    try { localStorage.setItem('zen_device_fingerprint', fp); } catch {}
    return fp;
  }

  // ── Generate Device ID ───────────────────────────────────
  function _generateDeviceId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 10);
    const fingerprint = _generateFingerprint();
    return `DEV_${timestamp}_${random}_${fingerprint.slice(0, 8)}`;
  }

  // ── Get or Create Device ID ──────────────────────────────
  function getDeviceId() {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = _generateDeviceId();
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  }

  // ── Get Device Fingerprint ───────────────────────────────
  function getDeviceFingerprint() {
    return _generateFingerprint();
  }

  // ── Get Device Name (e.g., "Chrome on Windows") ─────────
  function getDeviceName() {
    let name = localStorage.getItem(DEVICE_NAME_KEY);
    if (!name) {
      const ua = navigator.userAgent;
      const browser = ua.includes('Chrome') ? 'Chrome'
        : ua.includes('Safari') ? 'Safari'
        : ua.includes('Firefox') ? 'Firefox'
        : ua.includes('Edge') ? 'Edge'
        : 'Browser';
      const os = ua.includes('Windows') ? 'Windows'
        : ua.includes('Mac') ? 'macOS'
        : ua.includes('Linux') ? 'Linux'
        : ua.includes('Android') ? 'Android'
        : ua.includes('iPhone') || ua.includes('iPad') ? 'iOS'
        : 'Unknown';
      name = `${browser} on ${os}`;
      localStorage.setItem(DEVICE_NAME_KEY, name);
    }
    return name;
  }

  // ── Get Device Metadata ──────────────────────────────────
  function getDeviceMetadata() {
    const nav = navigator;
    const screen = window.screen;
    return {
      deviceId: getDeviceId(),
      fingerprint: getDeviceFingerprint(),
      name: getDeviceName(),
      userAgent: nav.userAgent,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: nav.language,
      hardware: {
        cores: nav.hardwareConcurrency || null,
        memory: nav.deviceMemory || null,
      },
      timestamp: new Date().toISOString(),
    };
  }

  // ── Manage Known Devices ─────────────────────────────────
  function addKnownDevice(deviceInfo) {
    try {
      const devices = JSON.parse(localStorage.getItem(KNOWN_DEVICES_KEY) || '{}');
      const deviceId = deviceInfo.deviceId || getDeviceId();
      devices[deviceId] = {
        name: deviceInfo.name || getDeviceName(),
        added: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        fingerprint: deviceInfo.fingerprint || getDeviceFingerprint(),
      };
      localStorage.setItem(KNOWN_DEVICES_KEY, JSON.stringify(devices));
      return deviceId;
    } catch (e) {
      console.error('Failed to add known device:', e);
      return null;
    }
  }

  function getKnownDevices() {
    try {
      return JSON.parse(localStorage.getItem(KNOWN_DEVICES_KEY) || '{}');
    } catch {
      return {};
    }
  }

  function updateDeviceLastUsed(deviceId) {
    try {
      const devices = JSON.parse(localStorage.getItem(KNOWN_DEVICES_KEY) || '{}');
      if (devices[deviceId]) {
        devices[deviceId].lastUsed = new Date().toISOString();
        localStorage.setItem(KNOWN_DEVICES_KEY, JSON.stringify(devices));
      }
    } catch (e) {
      console.warn('Failed to update device last used:', e);
    }
  }

  function removeKnownDevice(deviceId) {
    try {
      const devices = JSON.parse(localStorage.getItem(KNOWN_DEVICES_KEY) || '{}');
      delete devices[deviceId];
      localStorage.setItem(KNOWN_DEVICES_KEY, JSON.stringify(devices));
    } catch (e) {
      console.warn('Failed to remove known device:', e);
    }
  }

  // ── Cross-Tab Synchronization ────────────────────────────
  function broadcastAuthChange(action, data = {}) {
    try {
      const event = {
        action,
        data,
        timestamp: Date.now(),
        deviceId: getDeviceId(),
      };
      localStorage.setItem(DEVICE_SYNC_KEY, JSON.stringify(event));
    } catch (e) {
      console.warn('Failed to broadcast auth change:', e);
    }
  }

  function onStorageChange(callback) {
    window.addEventListener('storage', (e) => {
      if (e.key === DEVICE_SYNC_KEY && e.newValue) {
        try {
          const event = JSON.parse(e.newValue);
          callback(event);
        } catch (err) {
          console.error('Failed to parse storage event:', err);
        }
      }
    });
  }

  // ── Session Lock (prevent concurrent logins on same device) ─
  function setSessionLock(sessionId, expiresIn = 3600000) {
    const lockKey = `zen_session_lock_${getDeviceId()}`;
    const lock = {
      sessionId,
      createdAt: Date.now(),
      expiresAt: Date.now() + expiresIn,
    };
    try {
      localStorage.setItem(lockKey, JSON.stringify(lock));
    } catch (e) {
      console.warn('Failed to set session lock:', e);
    }
  }

  function getSessionLock() {
    const lockKey = `zen_session_lock_${getDeviceId()}`;
    try {
      const lock = JSON.parse(localStorage.getItem(lockKey) || 'null');
      if (lock && lock.expiresAt > Date.now()) {
        return lock;
      }
      localStorage.removeItem(lockKey);
      return null;
    } catch {
      return null;
    }
  }

  function clearSessionLock() {
    const lockKey = `zen_session_lock_${getDeviceId()}`;
    try {
      localStorage.removeItem(lockKey);
    } catch (e) {
      console.warn('Failed to clear session lock:', e);
    }
  }

  // Public API
  return {
    getDeviceId,
    getDeviceFingerprint,
    getDeviceName,
    getDeviceMetadata,
    addKnownDevice,
    getKnownDevices,
    updateDeviceLastUsed,
    removeKnownDevice,
    broadcastAuthChange,
    onStorageChange,
    setSessionLock,
    getSessionLock,
    clearSessionLock,
  };
})();
