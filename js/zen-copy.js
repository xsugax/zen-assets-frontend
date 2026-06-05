/* ════════════════════════════════════════════════════════════
   zen-copy.js — Institutional voice map (dashboard / trading)
════════════════════════════════════════════════════════════ */

const ZenCopy = (() => {
  'use strict';

  const trade = {
    executing: 'Routing order…',
    confirmed: 'Order confirmed',
    confirmedDetail(side, qty, sym, price, value) {
      const s = side === 'long' || side === 'buy' ? 'Buy' : 'Sell';
      return `${s} ${qty} ${sym} @ ${price} · $${value}`;
    },
    closedPositive(amount) {
      return `Position closed · +${amount}`;
    },
    closedNegative(amount) {
      return `Position closed · ${amount}`;
    },
    closeReasonReview: 'Session review exit',
    closeReasonTarget: 'Target reached',
  };

  const funds = {
    pending: 'In review',
    accruing(label, amount) {
      return `${label}: ${amount}`;
    },
    claimed(amount) {
      return `Transferred to wallet · +${amount}`;
    },
    claimedAll(amount) {
      return `All earnings transferred · +${amount}`;
    },
    claimStep1: 'Verifying balance',
    claimStep2: 'Transferring to wallet',
    claimStep3: 'Complete',
    noPending: 'No accrued funds in this pool',
  };

  const chart = {
    calibrating: 'Calibrating feed…',
    loading: 'Updating live data…',
    live(symbol, tf) {
      const s = symbol || '';
      const t = (tf || '1h').toUpperCase();
      return s ? `Live · ${s} · ${t}` : 'Live market data';
    },
  };

  const engine = {
    locked: 'Institutional copy engine locked',
    awaitingPayment: 'Activation fee required',
    pendingClearance: 'Clearance in progress — account manager enabling execution',
    live: 'Institutional engine live',
    authorizeConfirm(fee) {
      return `Authorize engine access · ${fee} one-time from wallet`;
    },
  };

  const system = {
    actionFailed: "Couldn't complete that step. Try again.",
    tradingPaused: 'Portfolio management mode — automated trading paused.',
    engineLocked: 'Automated execution requires institutional engine activation.',
    profitsPaused: 'Earnings accrual paused — contact your account manager.',
    sessionSecured: 'Session secured',
    loadingPortfolio: 'Loading portfolio',
    syncingMarkets: 'Syncing market data',
    crisisNeutral: 'Elevated volatility — risk controls active',
    winRateCalibrating: 'Calibrating',
    winRateEmpty: '—',
    sessionAwaiting: 'Awaiting session data',
    perfIndicative: '30-day indicative performance',
  };

  const notifications = {
    broadcast(subject, snippet) {
      return { title: subject || 'Announcement', detail: snippet || '' };
    },
  };

  function formatMoney(n, decimals = 2) {
    const x = parseFloat(n);
    if (isNaN(x)) return '$0.00';
    return '$' + x.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  return {
    trade,
    funds,
    engine,
    chart,
    system,
    notifications,
    formatMoney,
  };
})();
