(function () {
  'use strict';

  var root = document.getElementById('ascent-cinema');
  if (!root) return;

  var track = root.querySelector('[data-ad-track]');
  var bar = root.querySelector('[data-ad-bar]');
  var indexEl = root.querySelector('[data-ad-index]');
  var buttons = root.querySelectorAll('.ascent-cinema-nav [data-ad]');
  var creditEl = root.querySelector('[data-ad-credit]');
  var pnlEl = root.querySelector('[data-ad-pnl]');
  var ticks = root.querySelectorAll('[data-ad-tick]');
  var steps = root.querySelectorAll('[data-step]');
  var wallets = root.querySelectorAll('.ad-wallet');
  var canvas = document.getElementById('ascent-ad-chart');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var index = 0;
  var paused = false;
  var slideMs = 8000;
  var slideStart = 0;
  var progress = 0;
  var stepClock = 0;
  var lastNow = 0;
  var chartShown = 8;
  var creditPhase = 0;
  var pinnedStep = null;
  var pinnedSlide = null;

  root.querySelectorAll('[data-step]').forEach(function (el) {
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
  });

  var candles = [];
  var price = 64200;
  var i;
  for (i = 0; i < 28; i++) {
    var drift = (i > 16 ? 180 : 90) + Math.sin(i * 0.8) * 70;
    var open = price;
    var close = price + drift * (i % 6 === 3 ? -0.55 : 1);
    candles.push({
      o: open,
      c: close,
      h: Math.max(open, close) + 40 + (i % 3) * 18,
      l: Math.min(open, close) - 36 - (i % 4) * 12
    });
    price = close;
  }
  var buyAt = 16;

  function go(next) {
    index = ((next % 3) + 3) % 3;
    if (track) track.style.transform = 'translateX(' + (-index * 100) + '%)';
    if (indexEl) indexEl.textContent = '0' + (index + 1);
    buttons.forEach(function (btn, n) {
      var on = n === index;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    slideStart = performance.now();
    progress = 0;
  }

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      go(Number(btn.getAttribute('data-ad')));
    });
  });

  function pinFrom(target) {
    var el = target && target.closest ? target.closest('[data-step]') : null;
    if (!el || !root.contains(el)) return;
    var slide = el.closest('[data-ad-slide]');
    if (!slide) return;
    pinnedSlide = Number(slide.getAttribute('data-ad-slide'));
    pinnedStep = Number(el.getAttribute('data-step'));
    paintRail(pinnedSlide, pinnedStep);
    if (pinnedSlide === 0) paintFund(pinnedStep);
  }

  function releasePin() {
    paused = false;
    pinnedStep = null;
    pinnedSlide = null;
    slideStart = performance.now() - progress * slideMs;
    lastNow = 0;
  }

  root.addEventListener('mouseenter', function () { paused = true; });
  root.addEventListener('mouseover', function (event) { pinFrom(event.target); });
  root.addEventListener('mouseleave', releasePin);
  root.addEventListener('focusin', function (event) {
    paused = true;
    pinFrom(event.target);
  });
  root.addEventListener('focusout', function (event) {
    if (!root.contains(event.relatedTarget)) releasePin();
  });

  function money(n) {
    return '+$' + Math.round(n).toLocaleString('en-US');
  }

  function drawChart(now) {
    if (!canvas) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = canvas.clientWidth || 640;
    var h = canvas.clientHeight || 220;
    var pw = Math.floor(w * dpr);
    var ph = Math.floor(h * dpr);
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    }
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#070b10';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    var g;
    for (g = 1; g < 4; g++) {
      var gy = (h * g) / 4;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
    }

    var shown = reduced ? candles.length : chartShown;
    if (shown < 2) shown = 2;
    var slice = candles.slice(0, shown);
    var min = Infinity;
    var max = -Infinity;
    slice.forEach(function (c) {
      if (c.l < min) min = c.l;
      if (c.h > max) max = c.h;
    });
    var pad = 18;
    var span = (max - min) || 1;
    function yOf(v) {
      return pad + (1 - (v - min) / span) * (h - pad * 2);
    }
    var gap = w / (candles.length + 1);
    var body = Math.max(7, gap * 0.62);
    slice.forEach(function (c, n) {
      var x = gap * (n + 1);
      var up = c.c >= c.o;
      ctx.strokeStyle = up ? '#2ebd85' : '#e25b5b';
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath();
      ctx.moveTo(x, yOf(c.h));
      ctx.lineTo(x, yOf(c.l));
      ctx.stroke();
      var top = yOf(Math.max(c.o, c.c));
      var bot = yOf(Math.min(c.o, c.c));
      ctx.fillRect(x - body / 2, top, body, Math.max(8, bot - top));
      if (n === buyAt && shown > buyAt) {
        ctx.fillStyle = '#f0d7a4';
        ctx.beginPath();
        ctx.moveTo(x, yOf(c.l) + 12);
        ctx.lineTo(x - 6, yOf(c.l) + 22);
        ctx.lineTo(x + 6, yOf(c.l) + 22);
        ctx.closePath();
        ctx.fill();
      }
    });

    if (pnlEl) {
      var gain = shown > buyAt ? Math.min(1284, (shown - buyAt) * 92) : 0;
      pnlEl.textContent = money(gain);
    }
  }

  function tickCredit() {
    if (!creditEl) return;
    var phase = creditPhase;
    if (pinnedSlide === 2 && pinnedStep !== null) phase = [0.08, 0.28, 0.46, 0.85][pinnedStep];
    creditEl.textContent = money(479 * Math.min(1, phase / 0.5));
    var labels = ['Deploying', 'Filled', 'Credited'];
    var li = Math.min(2, Math.floor(phase * 3));
    ticks.forEach(function (el, n) {
      el.textContent = labels[(li + n) % 3];
    });
  }

  function paintRail(slide, step) {
    root.querySelectorAll('[data-ad-slide="' + slide + '"] [data-step]').forEach(function (el) {
      el.classList.toggle('is-on', Number(el.getAttribute('data-step')) === step);
    });
  }

  function paintFund(step) {
    var nowEl = root.querySelector('[data-fund-now]');
    wallets.forEach(function (el) {
      var net = el.getAttribute('data-net');
      el.classList.toggle('is-focus', (step === 1 || step === 2) && net === 'btc');
    });
    if (nowEl) nowEl.textContent = fundLines[step] || fundLines[0];
  }

  function chartStepNow() {
    if (pinnedSlide === 1 && pinnedStep !== null) return pinnedStep;
    if (chartShown <= 8) return 0;
    if (chartShown <= buyAt) return 1;
    if (chartShown <= buyAt + 3) return 2;
    return 3;
  }

  function formulaStepNow() {
    if (pinnedSlide === 2 && pinnedStep !== null) return pinnedStep;
    if (creditPhase < 0.18) return 0;
    if (creditPhase < 0.36) return 1;
    if (creditPhase < 0.52) return 2;
    return 3;
  }

  var fundLines = [
    'Step 1. Choose Crypto. These are the addresses inside the desk.',
    'Step 2. Copy the Bitcoin address. ETH, USDT, and BNB share one Ethereum address.',
    'Step 3. Send from your own wallet to the address you copied.',
    'Step 4. Report the transfer. The desk credits you after verification, usually within 24 hours.'
  ];

  function frame(now) {
    if (reduced) {
      if (bar) bar.style.width = '100%';
      if (creditEl) creditEl.textContent = '+$479';
      paintRail(0, 0);
      paintRail(1, 3);
      paintRail(2, 3);
      paintFund(0);
      chartShown = candles.length;
      drawChart(0);
      return;
    }
    if (!paused) {
      if (lastNow) {
        var dt = Math.min(64, now - lastNow);
        stepClock += dt;
        chartShown = Math.min(candles.length, 8 + Math.floor((stepClock / 80) % (candles.length + 6)));
        creditPhase = (stepClock % 3400) / 3400;
      }
      lastNow = now;
      progress = Math.min(1, (now - slideStart) / slideMs);
      if (bar) bar.style.width = (progress * 100) + '%';
      if (progress >= 1) go(index + 1);
    }
    var fundStep = (pinnedSlide === 0 && pinnedStep !== null)
      ? pinnedStep
      : Math.floor((stepClock / 1800) % 4);
    paintRail(0, fundStep);
    paintFund(fundStep);
    paintRail(1, chartStepNow());
    paintRail(2, formulaStepNow());
    tickCredit();
    drawChart(now);
    requestAnimationFrame(frame);
  }

  go(0);
  requestAnimationFrame(frame);
  countHeroBook();
})();

function countHeroBook() {
  var nodes = document.querySelectorAll('[data-hero-count]');
  if (!nodes.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var start = performance.now();
  function tick(now) {
    var t = Math.min(1, (now - start) / 1100);
    var eased = 1 - Math.pow(1 - t, 3);
    nodes.forEach(function (el) {
      var target = Number(el.getAttribute('data-hero-count'));
      el.textContent = '+$' + Math.round(target * eased).toLocaleString('en-US');
    });
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
