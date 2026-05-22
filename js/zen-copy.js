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

  const system = {
    actionFailed: "Couldn't complete that step. Try again.",
    tradingPaused: 'Portfolio management mode — automated trading paused.',
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

  const landing = {
    tagline: 'Capital Intelligence',
    marketsOpen: 'Markets open',
    clientLogin: 'Client login',
    openAccount: 'Open account',
    programs: 'Programs',
    heroTitle: 'Global multi-asset allocation platform',
    heroAccent: 'Research. Risk. Reporting.',
    heroLead: 'ZEN ASSETS provides institutional-grade portfolio infrastructure for family offices, private wealth, and qualified investors — with disciplined risk frameworks and transparent reporting.',
    viewPrograms: 'View programs',
    metricAum: 'Capital under management',
    metricTrack: 'Illustrative 12-month metrics',
    metricClients: 'Institutional & private clients',
    metricsDisclaimer: 'Figures are illustrative platform metrics unless otherwise stated. Not investment advice.',
    howWeOperate: 'How we operate',
    governance: 'Governance & security',
    globalPresence: 'Global presence',
    clientSegments: 'Client segments',
    programsDisclaimer: 'Program parameters and projections shown below are illustrative targets, not guarantees. Past performance does not indicate future results.',
  };

  function formatMoney(n, decimals = 2) {
    const x = parseFloat(n);
    if (isNaN(x)) return '$0.00';
    return '$' + x.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  return {
    trade,
    funds,
    chart,
    system,
    notifications,
    landing,
    formatMoney,
  };
})();
