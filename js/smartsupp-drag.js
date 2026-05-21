/**
 * Smartsupp chat bubble — draggable + position remembered per device.
 * Works with async widget injection from smartsuppchat.com loader.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'zen_smartsupp_pos_v1';
  const SELECTORS = [
    '#chat-application',
    '#smartsupp-widget',
    '#smartsupp-widget-container',
    '[id*="smartsupp"]',
    '[id*="Smartsupp"]',
    'div[class*="smartsupp"]',
  ];

  let boundEl = null;
  let dragState = null;

  function isMobile() {
    return window.matchMedia('(max-width: 768px)').matches;
  }

  function findWidget() {
    for (const sel of SELECTORS) {
      try {
        const el = document.querySelector(sel);
        if (el && (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getBoundingClientRect().width > 0)) {
          return el;
        }
      } catch (_) { /* invalid selector in old browsers */ }
    }
    const frames = document.querySelectorAll('iframe[src*="smartsupp"]');
    for (const frame of frames) {
      const parent = frame.parentElement;
      if (parent && parent.id !== 'app') return parent;
    }
    return null;
  }

  function loadPos() {
    try {
      const pos = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!pos || typeof pos.left !== 'number' || typeof pos.top !== 'number') return null;
      const w = 64;
      const h = 64;
      if (pos.left < -w || pos.top < -h) return null;
      if (pos.left > window.innerWidth + w || pos.top > window.innerHeight + h) return null;
      return pos;
    } catch {
      return null;
    }
  }

  function savePos(left, top) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ left, top }));
    } catch (_) { /* private mode */ }
  }

  function defaultPosition(el) {
    const pad = isMobile() ? 16 : 24;
    const bottomNav = isMobile() ? 80 : 0;
    const w = el.offsetWidth || 60;
    const h = el.offsetHeight || 60;
    return {
      left: window.innerWidth - w - pad - (isMobile() ? 0 : 0),
      top: window.innerHeight - h - pad - bottomNav,
    };
  }

  function applyPosition(el, pos) {
    el.style.setProperty('position', 'fixed', 'important');
    el.style.setProperty('z-index', '99990', 'important');
    el.style.setProperty('right', 'auto', 'important');
    el.style.setProperty('bottom', 'auto', 'important');
    el.style.setProperty('margin', '0', 'important');
    el.style.setProperty('touch-action', 'none', 'important');
    el.style.setProperty('cursor', 'grab', 'important');
    el.classList.add('zen-smartsupp-draggable');

    const w = el.offsetWidth || 56;
    const h = el.offsetHeight || 56;
    const maxL = Math.max(8, window.innerWidth - w - 8);
    const maxT = Math.max(8, window.innerHeight - h - 8);

    let left = pos?.left;
    let top = pos?.top;
    if (typeof left !== 'number' || typeof top !== 'number') {
      const d = defaultPosition(el);
      left = d.left;
      top = d.top;
    }
    left = Math.min(maxL, Math.max(8, left));
    top = Math.min(maxT, Math.max(8, top));

    el.style.setProperty('left', left + 'px', 'important');
    el.style.setProperty('top', top + 'px', 'important');
  }

  function clampMove(el, clientX, clientY) {
    const w = el.offsetWidth || 56;
    const h = el.offsetHeight || 56;
    const left = Math.min(window.innerWidth - w - 8, Math.max(8, clientX - dragState.ox));
    const top = Math.min(window.innerHeight - h - 8, Math.max(8, clientY - dragState.oy));
    el.style.setProperty('left', left + 'px', 'important');
    el.style.setProperty('top', top + 'px', 'important');
    return { left, top };
  }

  function onPointerDown(e) {
    if (!boundEl || e.button > 0) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

    const rect = boundEl.getBoundingClientRect();
    dragState = {
      ox: e.clientX - rect.left,
      oy: e.clientY - rect.top,
      pointerId: e.pointerId,
    };
    boundEl.setPointerCapture?.(e.pointerId);
    boundEl.style.setProperty('cursor', 'grabbing', 'important');
    boundEl.style.setProperty('transition', 'none', 'important');
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!dragState || !boundEl || e.pointerId !== dragState.pointerId) return;
    clampMove(boundEl, e.clientX, e.clientY);
    e.preventDefault();
  }

  function onPointerUp(e) {
    if (!dragState || !boundEl || e.pointerId !== dragState.pointerId) return;
    const rect = boundEl.getBoundingClientRect();
    savePos(rect.left, rect.top);
    boundEl.releasePointerCapture?.(e.pointerId);
    boundEl.style.removeProperty('transition');
    boundEl.style.setProperty('cursor', 'grab', 'important');
    dragState = null;
  }

  function bindDrag(el) {
    if (!el || el === boundEl) return;
    boundEl = el;
    applyPosition(el, loadPos());

    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    window.addEventListener('resize', () => {
      if (boundEl) applyPosition(boundEl, loadPos());
    });
  }

  function tryInit() {
    const el = findWidget();
    if (el) {
      bindDrag(el);
      return true;
    }
    return false;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit);
  } else {
    tryInit();
  }

  const obs = new MutationObserver(() => {
    if (tryInit()) obs.disconnect();
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });

  let attempts = 0;
  const retry = setInterval(() => {
    if (tryInit() || ++attempts > 60) clearInterval(retry);
  }, 1000);
})();
