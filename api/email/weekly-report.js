// POST /api/email/weekly-report — Send weekly portfolio summary
// Called from admin panel (loops through users) or via Vercel cron
const { send, fmtMoney, _esc, validatePost } = require('../_lib/sendgrid');

const TIER_COLORS = {
  bronze:   '#cd7f32',
  silver:   '#c0c0c0',
  gold:     '#d4a574',
  platinum: '#e5e4e2',
  diamond:  '#b9f2ff',
};

module.exports = async function handler(req, res) {
  const body = validatePost(req, res, ['email', 'fullName', 'balance']);
  if (!body) return;

  const { email, fullName, balance, earnings, tier, weeklyChange, topCorridor } = body;
  const tierName  = (tier || 'bronze').charAt(0).toUpperCase() + (tier || 'bronze').slice(1);
  const tierColor = TIER_COLORS[tier] || '#d4a574';
  const change    = parseFloat(weeklyChange) || 0;
  const changeStr = change >= 0 ? `+${fmtMoney(change)}` : `-${fmtMoney(Math.abs(change))}`;
  const changeColor = change >= 0 ? '#5fb38e' : '#e74c5e';
  const changePct = balance > 0 ? ((change / balance) * 100).toFixed(2) : '0.00';

  const html = `
    <h1 style="margin:0 0 4px;font-size:24px;font-weight:800;color:#ffffff;">Weekly Portfolio Report</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#8b95a5;">Performance summary for the week ending ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.</p>

    <!-- Portfolio value highlight -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
    <tr>
      <td style="padding:28px 24px;background:linear-gradient(135deg,rgba(212,165,116,0.08),rgba(95,179,142,0.05));border-radius:12px;border:1px solid rgba(212,165,116,0.15);text-align:center;">
        <div style="font-size:11px;color:#8b95a5;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Total Portfolio Value</div>
        <div style="font-size:40px;font-weight:800;color:#ffffff;margin-bottom:4px;">${_esc(fmtMoney(balance))}</div>
        <div style="font-size:16px;font-weight:700;color:${changeColor};">${_esc(changeStr)} (${_esc(changePct)}%) this week</div>
      </td>
    </tr>
    </table>

    <!-- Stats row -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="8" style="margin-bottom:24px;">
    <tr>
      <td width="33%" style="padding:14px 12px;background:rgba(212,165,116,0.06);border-radius:8px;border:1px solid rgba(212,165,116,0.1);text-align:center;vertical-align:top;">
        <div style="font-size:10px;color:#8b95a5;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Node Tier</div>
        <div style="font-size:16px;font-weight:800;color:${tierColor};">${_esc(tierName)}</div>
      </td>
      <td width="33%" style="padding:14px 12px;background:rgba(212,165,116,0.06);border-radius:8px;border:1px solid rgba(212,165,116,0.1);text-align:center;vertical-align:top;">
        <div style="font-size:10px;color:#8b95a5;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Total Earnings</div>
        <div style="font-size:16px;font-weight:800;color:#5fb38e;">${_esc(fmtMoney(earnings || 0))}</div>
      </td>
      <td width="33%" style="padding:14px 12px;background:rgba(212,165,116,0.06);border-radius:8px;border:1px solid rgba(212,165,116,0.1);text-align:center;vertical-align:top;">
        <div style="font-size:10px;color:#8b95a5;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Top Corridor</div>
        <div style="font-size:14px;font-weight:800;color:#ffffff;">${_esc(topCorridor || 'NY-CORR')}</div>
      </td>
    </tr>
    </table>

    <!-- Performance summary -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
    <tr>
      <td style="padding:16px 20px;background:rgba(10,14,22,0.6);border-radius:8px;border:1px solid rgba(212,165,116,0.08);">
        <div style="font-size:13px;font-weight:700;color:#d4a574;margin-bottom:12px;text-transform:uppercase;letter-spacing:1px;">Corridor Activity</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#8b95a5;">NY-CORR (New York)</td>
            <td style="padding:6px 0;font-size:13px;color:#5fb38e;font-weight:600;text-align:right;">Active</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#8b95a5;">LDN-CORR (London)</td>
            <td style="padding:6px 0;font-size:13px;color:#5fb38e;font-weight:600;text-align:right;">Active</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#8b95a5;">EDN-CORR (Edinburgh)</td>
            <td style="padding:6px 0;font-size:13px;color:#5fb38e;font-weight:600;text-align:right;">Active</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#8b95a5;">HK-CORR (Hong Kong)</td>
            <td style="padding:6px 0;font-size:13px;color:#5fb38e;font-weight:600;text-align:right;">Active</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#8b95a5;">SH-CORR (Shanghai)</td>
            <td style="padding:6px 0;font-size:13px;color:#d4a574;font-weight:600;text-align:right;">Optimising</td>
          </tr>
        </table>
      </td>
    </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;">
    <tr>
      <td style="background:linear-gradient(135deg,#d4a574,#b8956a);border-radius:8px;padding:14px 32px;">
        <a href="https://zenassets.tech" style="color:#0a0e16;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.5px;">Full Report →</a>
      </td>
    </tr>
    </table>

    <p style="margin:24px 0 0;font-size:12px;color:#5a6373;line-height:1.5;">
      Reports are generated every Monday. Corridor performance data is refreshed in real-time on your dashboard.
    </p>
  `;

  try {
    await send(email, `Weekly Report — Portfolio ${changeStr}`, html);
    res.status(200).json({ ok: true, message: 'Weekly report sent' });
  } catch (err) {
    console.error('SendGrid weekly report error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to send email' });
  }
};
