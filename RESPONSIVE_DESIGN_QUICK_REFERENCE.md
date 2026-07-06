# Responsive Design - Quick Reference Guide

## 🎯 Quick Start

### Initialize (auto-runs on page load)
```javascript
// Responsive Design Engine auto-initializes when DOM is ready
// No manual initialization needed
```

### Check Current State
```javascript
// Current breakpoint
ResponsiveDesignEngine.getCurrentBreakpoint()
// Returns: {name: 'mobile'|'tablet'|'desktop', min, max, label}

// Device info
ResponsiveDesignEngine.getDeviceType()
// Returns: {type: 'smartphone'|'tablet'|'desktop', os: 'windows'|'macos'|'linux'|'android'|'ios'}

// Touch capability
ResponsiveDesignEngine.isTouchCapable()
// Returns: true|false
```

---

## 📱 Breakpoint System

### CSS Classes Applied
```
Mobile (≤480px):     html.bp-mobile
Tablet (481-768px):  html.bp-tablet
Desktop (769+px):    html.bp-desktop

Touch Device:        html.is-touch
Desktop Device:      html.is-desktop
```

### Using in CSS
```css
/* Automatically available */
html.bp-mobile .card { padding: var(--padding-md); }
html.bp-tablet .card { padding: var(--padding-lg); }
html.bp-desktop .card { padding: var(--padding-xl); }

/* Or use media queries directly */
@media (max-width: 480px) { ... }
@media (min-width: 481px) and (max-width: 768px) { ... }
@media (min-width: 769px) { ... }
```

### In JavaScript
```javascript
if (ResponsiveDesignEngine.isMobileOrSmaller()) {
  // Mobile logic
}

if (ResponsiveDesignEngine.isTabletOrSmaller()) {
  // Mobile or tablet
}

if (ResponsiveDesignEngine.isDesktopOrLarger()) {
  // Desktop or larger
}

// Exact check
if (ResponsiveDesignEngine.isBreakpoint('tablet')) {
  // Only tablet
}
```

---

## 🎨 Responsive Tokens

### CSS Variables
```css
/* Base font size (adjusts per breakpoint) */
html { font-size: 13px; }
html.bp-tablet { font-size: 14px; }
html.bp-desktop { font-size: 16px; }

/* Automatic padding (mobile: 16px, tablet: 18px, desktop: 24px) */
.card { padding: var(--padding-md); }

/* Gap between flex/grid items */
.grid { gap: var(--gap); }
```

### In JavaScript
```javascript
// Get responsive token
const padding = ResponsiveDesignEngine.getResponsiveToken('padding', 'md');
// Returns: '12px', '14px', or '16px' based on current breakpoint

// Available categories: 'padding', 'fontSize', 'gap'
// Available levels: 'xs', 'sm', 'md', 'lg', 'xl'
```

### Token Values
```
PADDING (px):
  Mobile:  xs=8   sm=12  md=16  lg=16  xl=20
  Tablet:  xs=10  sm=14  md=18  lg=20  xl=24
  Desktop: xs=12  sm=16  md=24  lg=28  xl=32

FONT-SIZE (px):
  Mobile:  xs=11  sm=12  md=13  lg=14  xl=15
  Tablet:  xs=12  sm=13  md=14  lg=15  xl=16
  Desktop: xs=13  sm=14  md=16  lg=18  xl=20

GAP:
  Mobile:  12px
  Tablet:  16px
  Desktop: 20px
```

---

## 📐 Utility Classes

### Display (show/hide per breakpoint)
```html
<!-- Show only on mobile -->
<div class="show-mobile">Mobile content</div>

<!-- Show on tablet and above -->
<div class="show-tablet show-desktop">Tablet+ content</div>

<!-- Hide on mobile -->
<div class="hide-mobile">Desktop content</div>

<!-- Flex/Grid variants -->
<div class="show-mobile-flex">Flex on mobile</div>
<div class="show-desktop-grid">Grid on desktop</div>
```

### Layout
```html
<!-- Single column mobile, multi-column larger -->
<div class="grid-responsive">
  <div class="grid-responsive-2">2 columns on tablet+</div>
  <div class="grid-responsive-3">3 columns on desktop</div>
</div>

<!-- Stack on mobile, side-by-side on desktop -->
<div class="stack-responsive">
  <div>Left</div>
  <div>Right</div>
</div>

<!-- Responsive forms -->
<form class="form-responsive form-responsive-2">
  <input type="text">
  <input type="email">
</form>
```

### Padding
```html
<!-- Adaptive padding: 12-16px mobile, 14-18px tablet, 16-24px desktop -->
<div class="p-adaptive">Adaptive padding all sides</div>

<!-- Horizontal/vertical -->
<div class="px-adaptive">Horizontal padding</div>
<div class="py-adaptive">Vertical padding</div>

<!-- Size variants -->
<div class="p-sm-adaptive">Small adaptive</div>
<div class="p-lg-adaptive">Large adaptive</div>
```

### Gap
```html
<div class="flex gap-adaptive">Adaptive gap flex</div>
<div class="grid gap-row-adaptive">Row gap responsive</div>
```

---

## 📱 Touch Targets (WCAG 2.5 AAA)

### Requirement
- Mobile/Tablet: **44px × 44px minimum**
- Desktop: **36px × 36px acceptable**

### Implementation
```html
<!-- Automatic with button -->
<button>Click me</button>

<!-- Explicit with utility -->
<div class="touch-optimized">Touch target</div>

<!-- Form inputs auto-optimized -->
<input type="text" class="form-input-responsive">
<button class="touch-optimized">Submit</button>
```

### Verification
```javascript
// Check all elements
const issues = ResponsiveDesignEngine.verifyTouchTargets();
console.log(`${issues.length} targets below 44px`);

// Auto-optimize
ResponsiveDesignEngine.optimizeTouchTargets();
```

---

## 💾 State Persistence

### Save Preferences
```javascript
// Save user preferences
ResponsiveDesignEngine.saveMobilePreferences({
  theme: 'dark',
  sidebarCollapsed: true,
  language: 'en'
});

// Get stored preferences
const prefs = ResponsiveDesignEngine.getMobilePreferences();
console.log(prefs.theme); // 'dark'
```

### Save Component State
```javascript
// Save UI state (collapsed/expanded)
ResponsiveDesignEngine.saveUIState('sidebar', {
  isExpanded: false,
  width: '300px'
});

// Retrieve
const state = ResponsiveDesignEngine.getUIState('sidebar');
if (state) {
  restoreSidebarState(state);
}
```

### Cross-Tab Sync
```javascript
// Listen for storage changes (another tab)
window.addEventListener('storage', (e) => {
  if (e.key === 'zen_mobile_preferences') {
    // Reload preferences from storage
    const prefs = ResponsiveDesignEngine.getMobilePreferences();
    applyPreferences(prefs);
  }
});
```

---

## 🔄 Breakpoint Events

### Listen for Changes
```javascript
window.addEventListener('breakpoint-change', (e) => {
  console.log('Previous breakpoint:', e.detail.previous.name);
  console.log('Current breakpoint:', e.detail.current.name);
  console.log('Device type:', e.detail.deviceType);
  console.log('Is touch:', e.detail.isTouchDevice);
});
```

### Common Use Cases
```javascript
window.addEventListener('breakpoint-change', (e) => {
  const { current, previous } = e.detail;
  
  // Mobile to tablet transition
  if (previous.name === 'mobile' && current.name === 'tablet') {
    showSidebar(); // Sidebar now fits
  }
  
  // Any to desktop
  if (current.name === 'desktop') {
    enableHoverEffects();
  }
});
```

---

## 🎭 Media Query States

### Get All States
```javascript
const states = ResponsiveDesignEngine.getMediaQueryStates();
console.log({
  mobile: states.mobile,        // true/false
  tablet: states.tablet,        // true/false
  desktop: states.desktop,      // true/false
  touch: states.touch,          // true/false
  landscape: states.landscape,  // true/false
  portrait: states.portrait,    // true/false
  prefersReducedMotion: states.prefersReducedMotion, // true/false
  prefersDarkMode: states.prefersDarkMode // true/false
});
```

---

## 🔍 Device Detection

### Check Device Type
```javascript
const device = ResponsiveDesignEngine.getDeviceType();

switch (device.type) {
  case 'smartphone':
    // Mobile-specific UI
    break;
  case 'tablet':
    // Tablet-specific UI
    break;
  case 'desktop':
    // Desktop UI
    break;
}

// Check OS
if (device.os === 'ios') {
  applyIOSSpecificStyles();
}
```

### Get Full Metadata
```javascript
const metadata = ResponsiveDesignEngine.getMediaQueryStates();
console.log({
  deviceId: metadata.deviceId,
  fingerprint: metadata.fingerprint,
  name: metadata.name,  // e.g., "Chrome on Windows"
  userAgent: metadata.userAgent,
  screen: metadata.screen,
  timezone: metadata.timezone,
  language: metadata.language,
  hardware: metadata.hardware
});
```

---

## ⚡ Performance Tips

### For Mobile
```css
/* Already optimized: */
@media (max-width: 768px) {
  /* No backdrop-filter (GPU saver) */
  /* Reduced animations (150ms) */
  /* Optimized scrolling */
}
```

### For Desktop
```css
/* Enhanced effects: */
@media (min-width: 769px) {
  /* Backdrop-filter enabled */
  /* Full animations (300-400ms) */
  /* Hover effects active */
}
```

### Respect User Preferences
```css
/* Auto-respected: */
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

---

## 🧪 Testing Commands

### In Browser Console
```javascript
// Current state
console.log(ResponsiveDesignEngine.getCurrentBreakpoint());

// All media queries
console.log(ResponsiveDesignEngine.getMediaQueryStates());

// Device
console.log(ResponsiveDesignEngine.getDeviceType());

// Touch targets
console.log(ResponsiveDesignEngine.verifyTouchTargets());

// Preferences
console.log(ResponsiveDesignEngine.getMobilePreferences());

// Get responsive value
console.log(ResponsiveDesignEngine.getResponsiveToken('padding', 'md'));
```

---

## 📋 Common Patterns

### Responsive Card Layout
```html
<div class="grid-responsive grid-responsive-2">
  <article class="card p-adaptive">
    <h2>Title</h2>
    <p>Content</p>
    <button class="touch-optimized">Action</button>
  </article>
</div>
```

### Responsive Navigation
```html
<nav class="nav-responsive">
  <a href="/" class="nav-responsive-item">Home</a>
  <a href="/about" class="nav-responsive-item">About</a>
  <span class="show-desktop">
    <a href="/contact" class="nav-responsive-item">Contact</a>
  </span>
</nav>
```

### Responsive Form
```html
<form class="form-responsive form-responsive-2">
  <div>
    <label>Name</label>
    <input class="form-input-responsive" type="text">
  </div>
  <div>
    <label>Email</label>
    <input class="form-input-responsive" type="email">
  </div>
  <button class="touch-optimized" type="submit">Submit</button>
</form>
```

### Responsive Dashboard
```html
<div class="grid-responsive grid-responsive-4">
  <div class="kpi-card p-adaptive">KPI 1</div>
  <div class="kpi-card p-adaptive">KPI 2</div>
  <div class="kpi-card p-adaptive">KPI 3</div>
  <div class="kpi-card p-adaptive">KPI 4</div>
</div>
```

---

## 🚀 Deployment

### Version Updates
```html
<!-- Update versions on deploy -->
<link rel="stylesheet" href="css/responsive-utilities.css?v=100" />
<script src="js/responsive-design-engine.js?v=100" defer></script>
```

### Cache Busting
```
css/responsive-utilities.css?v=101
js/responsive-design-engine.js?v=101
```

---

## 📚 Full Documentation

See:
- `RESPONSIVE_DESIGN_IMPLEMENTATION.md` - Complete implementation guide
- `RESPONSIVE_DESIGN_TESTING.md` - Testing and verification checklist
- `css/responsive-utilities.css` - All available utility classes
- `js/responsive-design-engine.js` - Full source code documentation
