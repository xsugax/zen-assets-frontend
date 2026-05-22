/* ════════════════════════════════════════════════════════════
   zen-copy.js — Unified voice map (landing, programs, dashboard)
════════════════════════════════════════════════════════════ */

const ZenCopy = (() => {
  'use strict';

  const TIER_LABELS = {
    bronze: 'Core I',
    silver: 'Core II',
    gold: 'Core III',
    platinum: 'Preferred',
    diamond: 'Private',
  };

  const TIER_MIN = {
    bronze: '$2,000',
    silver: '$25,000',
    gold: '$100,000',
    platinum: '$500,000',
    diamond: '$2,000,000',
  };

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
    demo: 'Demo feed',
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
    tierApyIndicative: (apy) => `Indicative program range · ${apy}`,
  };

  const notifications = {
    broadcast(subject, snippet) {
      return { title: subject || 'Announcement', detail: snippet || '' };
    },
    depositCredited(amount) {
      return { title: 'Deposit credited', detail: `+${amount} added to wallet` };
    },
    withdrawalUpdate(status) {
      return { title: 'Withdrawal update', detail: status };
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

  const programs = {
    title: 'Private programs',
    parametersHeader: 'Program parameters (illustrative model)',
    modelAssumptions: 'Model assumptions',
    modelNote: 'Outputs depend on starting balance, tier range, and compounding — not live performance.',
    executionLog: 'Sample execution log (illustrative)',
    tierSelect: 'Select program tier',
  };

  const auth = {
    clientLogin: 'Client login',
    openAccount: 'Open account',
    signIn: 'Sign in',
    loginTitle: 'Client login',
    loginSubtitle: 'Sign in to your portfolio or open a new account.',
    registerTitle: 'Open your account',
    registerSubtitle: 'Choose a program tier and complete verification.',
    chooseTier: 'Program tier',
    platformOperational: 'Platform operational',
    marketsMonitored: 'Markets monitored 24/7',
    benefitResearch: 'Research-driven allocation across approved asset classes',
    benefitRisk: 'Risk limits and audit trail on balance changes',
    benefitReporting: 'Wallet balance synced from server; exportable history',
    benefitControl: 'Withdrawal requests with clear status tracking',
  };

  const ledger = {
    title: 'Account history',
    subtitle: 'Deposits, withdrawals, credits, and claims — matched to your wallet balance',
    exportCsv: 'Export CSV',
    exportStatement: 'Download statement',
    empty: 'No transactions yet',
    reconcileOk: 'Ledger matches wallet balance',
    reconcileWarn: 'Refresh to reconcile with wallet',
    attributionTitle: 'Earnings attribution (session)',
    poolInterest: 'Compound / interest pool',
    poolTrading: 'Trading pool',
    poolDaily: 'Daily pool',
    poolWeekly: 'Weekly pool',
  };

  const density = {
    novice: 'Guided view',
    professional: 'Professional view',
    noviceHint: 'Simpler labels and fewer alerts',
    professionalHint: 'Dense tables, exports, minimal demo surfaces',
  };

  const email = {
    welcomeSubject: 'Welcome to ZEN ASSETS',
    depositSubject: 'Deposit update',
    weeklySubject: 'Weekly portfolio summary',
  };

  function tierLabel(tier) {
    return TIER_LABELS[String(tier || '').toLowerCase()] || String(tier || 'Program');
  }

  function tierMinimum(tier) {
    return TIER_MIN[String(tier || '').toLowerCase()] || '—';
  }

  function disclaimer(scope) {
    const map = {
      home: landing.metricsDisclaimer,
      programs: landing.programsDisclaimer,
      model: 'Illustrative model — not a guarantee or forecast.',
      risk: 'Past performance does not guarantee future results.',
    };
    return map[scope] || map.risk;
  }

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
    programs,
    auth,
    ledger,
    density,
    email,
    tierLabel,
    tierMinimum,
    disclaimer,
    formatMoney,
    TIER_LABELS,
  };
})();
