// POST /api/email/welcome — Send welcome email on signup
const { send, fmtMoney, _esc, validatePost } = require('../_lib/sendgrid');

const TIER_COLORS = {
  bronze:   '#cd7f32',
  silver:   '#c0c0c0',
  gold:     '#d4a574',
  platinum: '#e5e4e2',
  diamond:  '#b9f2ff',
};

module.exports = async function handler(req, res) {
  const body = validatePost(req, res, ['email', 'fullName', 'tier']);
  if (!body) return;

  const { email, fullName, tier, depositAmount } = body;
  const tierName  = (tier || 'bronze').charAt(0).toUpperCase() + (tier || 'bronze').slice(1);
  const tierColor = TIER_COLORS[tier] || '#d4a574';
  const deposit   = depositAmount ? fmtMoney(depositAmount) : null;

  const html = `
    <h1 style="margin:0 0 8px;font-size:28px;font-weight:800;color:#ffffff;">Welcome to ZEN ASSETS</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#8b95a5;">Your sovereign corridor deployment account is now active.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
    <tr>
      <td style="padding:20px;background:rgba(212,165,116,0.06);border-radius:10px;border:1px solid rgba(212,165,116,0.12);">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-bottom:12px;">
            <span style="font-size:11px;color:#8b95a5;text-transform:uppercase;letter-spacing:1px;">Account Holder</span><br/>
            <span style="font-size:16px;font-weight:700;color:#fff;">${_esc(fullName)}</span>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom:12px;">
            <span style="font-size:11px;color:#8b95a5;text-transform:uppercase;letter-spacing:1px;">Node Tier</span><br/>
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${tierColor};margin-right:6px;vertical-align:middle;"></span>
            <span style="font-size:16px;font-weight:700;color:${tierColor};">${_esc(tierName)}</span>
          </td>
        </tr>
        ${deposit ? `<tr>
          <td>
            <span style="font-size:11px;color:#8b95a5;text-transform:uppercase;letter-spacing:1px;">Initial Deployment</span><br/>
            <span style="font-size:16px;font-weight:700;color:#5fb38e;">${deposit}</span>
          </td>
        </tr>` : ''}
        </table>
      </td>
    </tr>
    </table>

    <h2 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#d4a574;">What Happens Next</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:8px 0;font-size:14px;color:#c8d0dc;line-height:1.6;">
          <span style="color:#d4a574;font-weight:700;">1.</span>&nbsp; Your account is being verified by our compliance team.<br/>
          <span style="color:#d4a574;font-weight:700;">2.</span>&nbsp; Once cleared, your capital will be deployed across sovereign corridors.<br/>
          <span style="color:#d4a574;font-weight:700;">3.</span>&nbsp; You'll receive real-time portfolio updates and performance reports.
        </td>
      </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;">
    <tr>
      <td style="background:linear-gradient(135deg,#d4a574,#b8956a);border-radius:8px;padding:14px 32px;">
        <a href="https://zenassets.tech" style="color:#0a0e16;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.5px;">Access Your Dashboard →</a>
      </td>
    </tr>
    </table>

    <p style="margin:24px 0 0;font-size:12px;color:#5a6373;line-height:1.5;">
      If you did not create this account, please disregard this email or contact support at support@zenassets.tech.
    </p>
  `;

  try {
    await send(email, 'Welcome to ZEN ASSETS — Your Account is Active', html);
    res.status(200).json({ ok: true, message: 'Welcome email sent' });
  } catch (err) {
    console.error('SendGrid welcome email error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to send email' });
  }
};
