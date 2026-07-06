/* ════════════════════════════════════════════════════════════
   responsive-design-engine.js — Professional Mobile-Responsive Design
   
   - 3-tier breakpoint system (mobile, tablet, desktop)
   - Adaptive padding, typography, and layouts
   - Device detection and classification
   - Mobile state persistence
   - Touch-friendly interface optimization
════════════════════════════════════════════════════════════ */

const ResponsiveDesignEngine = (() => {
  'use strict';

  // ═══════════════════════════════════════════════════════
  // BREAKPOINT DEFINITIONS
  // ═══════════════════════════════════════════════════════
  const BREAKPOINTS = {
    MOBILE: { name: 'mobile', min: 0, max: 480, label: 'Mobile (≤480px)' },
    TABLET: { name: 'tablet', min: 481, max: 768, label: 'Tablet (481-768px)' },
    DESKTOP: { name: 'desktop', min: 769, max: Infinity, label: 'Desktop (769+px)' },
  };

  // ═══════════════════════════════════════════════════════
  // RESPONSIVE TOKENS (Padding, Typography, Spacing)
  // ═══════════════════════════════════════════════════════
  const RESPONSIVE_TOKENS = {
    padding: {
      mobile: { xs: '8px', sm: '12px', md: '16px', lg: '16px', xl: '20px' },
      tablet: { xs: '10px', sm: '14px', md: '18px', lg: '20px', xl: '24px' },
      desktop: { xs: '12px', sm: '16px', md: '24px', lg: '28px', xl: '32px' },
    },
    fontSize: {
      mobile: { xs: '11px', sm: '12px', md: '13px', lg: '14px', xl: '15px' },
      tablet: { xs: '12px', sm: '13px', md: '14px', lg: '15px', xl: '16px' },
      desktop: { xs: '13px', sm: '14px', md: '16px', lg: '18px', xl: '20px' },
    },
    touchTarget: {
      minimum: 44, // WCAG 2.5 Level AAA
      comfortable: 48,
      spacious: 56,
    },
    gap: {
      mobile: '12px',
      tablet: '16px',
      desktop: '20px',
    },
  };

  // ═══════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════
  let currentBreakpoint = null;
  let deviceType = null;
  let isTouchDevice = false;
  let mediaQueryLists = {};
  let resizeTimeout = null;

  const STORAGE_KEYS = {
    DEVICE_TYPE: 'zen_device_type',
    BREAKPOINT_PREF: 'zen_breakpoint_preference',
    TOUCH_ENABLED: 'zen_touch_enabled',
    MOBILE_PREFS: 'zen_mobile_preferences',
  };

  // ═══════════════════════════════════════════════════════
  // DEVICE DETECTION & CLASSIFICATION
  // ═══════════════════════════════════════════════════════

  /**
   * Classify device type based on userAgent and capabilities
   */
  function _classifyDevice() {
    const ua = navigator.userAgent.toLowerCase();
    const screen = window.screen;

    let type = 'desktop';
    let os = 'unknown';

    // OS Detection
    if (/windows/.test(ua)) os = 'windows';
    else if (/macintosh/.test(ua)) os = 'macos';
    else if (/android/.test(ua)) os = 'android';
    else if (/iphone|ipad|ipod/.test(ua)) os = 'ios';
    else if (/linux/.test(ua)) os = 'linux';

    // Device Type Detection (more sophisticated)
    if (/iphone|ipod|android(?!.*tablet)/.test(ua)) {
      type = 'smartphone';
    } else if (/ipad|android.*tablet|windows.*touch/.test(ua)) {
      type = 'tablet';
    } else if (screen.width <= 480) {
      type = 'smartphone';
    } else if (screen.width <= 768) {
      type = 'tablet';
    }

    deviceType = { type, os };
    return deviceType;
  }

  /**
   * Detect touch capability
   */
  function _detectTouchCapability() {
    const hasTouch = () => {
      return (('ontouchstart' in window) ||
              (navigator.maxTouchPoints > 0) ||
              (navigator.msMaxTouchPoints > 0));
    };

    isTouchDevice = hasTouch();
    localStorage.setItem(STORAGE_KEYS.TOUCH_ENABLED, isTouchDevice);
    return isTouchDevice;
  }

  /**
   * Get current breakpoint
   */
  function getCurrentBreakpoint() {
    const width = window.innerWidth;

    if (width <= BREAKPOINTS.MOBILE.max) {
      return BREAKPOINTS.MOBILE;
    } else if (width <= BREAKPOINTS.TABLET.max) {
      return BREAKPOINTS.TABLET;
    } else {
      return BREAKPOINTS.DESKTOP;
    }
  }

  /**
   * Update breakpoint and apply responsive styles
   */
  function _updateBreakpoint() {
    const newBreakpoint = getCurrentBreakpoint();

    if (currentBreakpoint?.name !== newBreakpoint.name) {
      const oldBreakpoint = currentBreakpoint;
      currentBreakpoint = newBreakpoint;

      // Apply breakpoint class to HTML element
      document.documentElement.classList.remove(
        `bp-${BREAKPOINTS.MOBILE.name}`,
        `bp-${BREAKPOINTS.TABLET.name}`,
        `bp-${BREAKPOINTS.DESKTOP.name}`
      );
      document.documentElement.classList.add(`bp-${currentBreakpoint.name}`);

      // Apply device-specific classes
      document.documentElement.classList.remove('is-touch', 'is-desktop');
      if (isTouchDevice) {
        document.documentElement.classList.add('is-touch');
      } else {
        document.documentElement.classList.add('is-desktop');
      }

      // Dispatch custom event for breakpoint change
      window.dispatchEvent(new CustomEvent('breakpoint-change', {
        detail: {
          previous: oldBreakpoint,
          current: currentBreakpoint,
          deviceType,
          isTouchDevice,
        },
      }));

      console.log(`📱 Breakpoint changed: ${newBreakpoint.label}`);
    }
  }

  /**
   * Setup media query listeners
   */
  function _setupMediaQueryListeners() {
    const queries = {
      mobile: `(max-width: ${BREAKPOINTS.MOBILE.max}px)`,
      tablet: `(min-width: ${BREAKPOINTS.TABLET.min}px) and (max-width: ${BREAKPOINTS.TABLET.max}px)`,
      desktop: `(min-width: ${BREAKPOINTS.DESKTOP.min}px)`,
      touch: '(hover: none) and (pointer: coarse)',
      preferDarkMode: '(prefers-color-scheme: dark)',
      prefersReducedMotion: '(prefers-reduced-motion: reduce)',
      landscape: '(orientation: landscape)',
      portrait: '(orientation: portrait)',
    };

    Object.entries(queries).forEach(([key, query]) => {
      const mql = window.matchMedia(query);
      mediaQueryLists[key] = mql;

      // Listen for changes
      if (mql.addListener) {
        mql.addListener(() => _updateBreakpoint());
      } else {
        mql.addEventListener('change', () => _updateBreakpoint());
      }
    });
  }

  // ═══════════════════════════════════════════════════════
  // RESPONSIVE UTILITIES
  // ═══════════════════════════════════════════════════════

  /**
   * Get responsive token value based on current breakpoint
   */
  function getResponsiveToken(category, level = 'md') {
    if (!RESPONSIVE_TOKENS[category]) return null;

    const breakpoint = currentBreakpoint.name;
    return RESPONSIVE_TOKENS[category][breakpoint][level];
  }

  /**
   * Check if current breakpoint matches criteria
   */
  function isBreakpoint(breakpointName) {
    return currentBreakpoint?.name === breakpointName;
  }

  function isMobileOrSmaller() {
    return window.innerWidth <= BREAKPOINTS.MOBILE.max;
  }

  function isTabletOrSmaller() {
    return window.innerWidth <= BREAKPOINTS.TABLET.max;
  }

  function isDesktopOrLarger() {
    return window.innerWidth >= BREAKPOINTS.DESKTOP.min;
  }

  /**
   * Get all media query states
   */
  function getMediaQueryStates() {
    const states = {};
    Object.entries(mediaQueryLists).forEach(([key, mql]) => {
      states[key] = mql.matches;
    });
    return states;
  }

  // ═══════════════════════════════════════════════════════
  // MOBILE STATE PERSISTENCE
  // ═══════════════════════════════════════════════════════

  /**
   * Save mobile preferences
   */
  function saveMobilePreferences(prefs) {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.MOBILE_PREFS) || '{}');
      const updated = { ...stored, ...prefs, lastUpdated: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.MOBILE_PREFS, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.warn('Failed to save mobile preferences:', e);
      return prefs;
    }
  }

  /**
   * Get mobile preferences
   */
  function getMobilePreferences() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.MOBILE_PREFS) || '{}');
    } catch {
      return {};
    }
  }

  /**
   * Save UI state (collapsed/expanded sections)
   */
  function saveUIState(componentId, state) {
    try {
      const prefs = getMobilePreferences();
      if (!prefs.uiState) prefs.uiState = {};
      prefs.uiState[componentId] = { ...state, timestamp: Date.now() };
      return saveMobilePreferences(prefs);
    } catch (e) {
      console.warn('Failed to save UI state:', e);
      return null;
    }
  }

  /**
   * Get UI state
   */
  function getUIState(componentId) {
    try {
      const prefs = getMobilePreferences();
      return prefs.uiState?.[componentId];
    } catch {
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════
  // TOUCH OPTIMIZATION
  // ═══════════════════════════════════════════════════════

  /**
   * Verify touch target sizes (44px minimum)
   */
  function verifyTouchTargets() {
    const buttons = document.querySelectorAll('button, a[role="button"], input[type="button"]');
    const issues = [];

    buttons.forEach((btn) => {
      const rect = btn.getBoundingClientRect();
      const minSize = RESPONSIVE_TOKENS.touchTarget.minimum;

      if (rect.width < minSize || rect.height < minSize) {
        issues.push({
          element: btn,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          minRequired: minSize,
        });
      }
    });

    if (issues.length > 0 && isMobileOrSmaller()) {
      console.warn(`⚠️ ${issues.length} touch targets below ${RESPONSIVE_TOKENS.touchTarget.minimum}px minimum:`, issues);
    }

    return issues;
  }

  /**
   * Add touch-friendly class to elements
   */
  function optimizeTouchTargets() {
    if (!isTouchDevice || !isMobileOrSmaller()) return;

    const buttons = document.querySelectorAll('button, a[role="button"], input[type="button"]');
    buttons.forEach((btn) => {
      // Ensure minimum padding for touch targets
      if (!btn.classList.contains('touch-optimized')) {
        const minSize = RESPONSIVE_TOKENS.touchTarget.minimum;
        btn.classList.add('touch-optimized');
        btn.style.minHeight = `${minSize}px`;
        btn.style.minWidth = `${minSize}px`;
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
      }
    });
  }

  // ═══════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════

  /**
   * Initialize responsive design engine
   */
  function init() {
    console.log('🎨 Initializing Responsive Design Engine...');

    // Detect device capabilities
    _classifyDevice();
    _detectTouchCapability();

    // Set initial breakpoint
    _updateBreakpoint();

    // Setup media query listeners
    _setupMediaQueryListeners();

    // Add resize handler with debouncing
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(_updateBreakpoint, 150);
    });

    // Store device type for later access
    try {
      localStorage.setItem(STORAGE_KEYS.DEVICE_TYPE, JSON.stringify(deviceType));
    } catch (e) {
      console.warn('Failed to store device type:', e);
    }

    // Log device info
    console.log('📱 Device Info:', {
      breakpoint: currentBreakpoint.name,
      deviceType,
      touchCapable: isTouchDevice,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    });

    // Verify touch targets on mobile
    if (isMobileOrSmaller()) {
      setTimeout(verifyTouchTargets, 500);
    }

    return true;
  }

  // ═══════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════
  return {
    // Initialization
    init,

    // Breakpoint Detection
    getCurrentBreakpoint,
    isBreakpoint,
    isMobileOrSmaller,
    isTabletOrSmaller,
    isDesktopOrLarger,

    // Device Detection
    getDeviceType: () => deviceType,
    isTouchCapable: () => isTouchDevice,
    getMediaQueryStates,

    // Responsive Tokens
    getResponsiveToken,
    BREAKPOINTS,
    RESPONSIVE_TOKENS,

    // Mobile State Persistence
    saveMobilePreferences,
    getMobilePreferences,
    saveUIState,
    getUIState,

    // Touch Optimization
    verifyTouchTargets,
    optimizeTouchTargets,

    // Constants
    STORAGE_KEYS,
  };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ResponsiveDesignEngine.init());
} else {
  ResponsiveDesignEngine.init();
}
