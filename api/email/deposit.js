// POST /api/email/deposit — Send deposit confirmation email
const { send, fmtMoney, _esc, statBox, validatePost } = require('../_lib/sendgrid');

module.exports = async function handler(req, res) {
  const body = validatePost(req, res, ['email', 'fullName', 'amount']);
  if (!body) return;

  const { email, fullName, amount, method, newBalance, reference } = body;

  const html = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#ffffff;">Deposit Confirmed</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#8b95a5;">Your capital deployment has been processed successfully.</p>

    <!-- Amount highlight -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
    <tr>
      <td style="padding:24px;background:linear-gradient(135deg,rgba(95,179,142,0.1),rgba(212,165,116,0.06));border-radius:10px;border:1px solid rgba(95,179,142,0.2);text-align:center;">
        <div style="font-size:11px;color:#8b95a5;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;">Amount Deployed</div>
        <div style="font-size:36px;font-weight:800;color:#5fb38e;">+${_esc(fmtMoney(amount))}</div>
      </td>
    </tr>
    </table>

    <!-- Details -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
    <tr>
      <td style="padding:16px 20px;background:rgba(10,14,22,0.6);border-radius:8px;border:1px solid rgba(212,165,116,0.08);">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#8b95a5;border-bottom:1px solid rgba(255,255,255,0.04);">Account Holder</td>
            <td style="padding:8px 0;font-size:13px;color:#fff;font-weight:600;text-align:right;border-bottom:1px solid rgba(255,255,255,0.04);">${_esc(fullName)}</td>
          </tr>
          ${method ? `<tr>
            <td style="padding:8px 0;font-size:13px;color:#8b95a5;border-bottom:1px solid rgba(255,255,255,0.04);">Method</td>
            <td style="padding:8px 0;font-size:13px;color:#fff;font-weight:600;text-align:right;border-bottom:1px solid rgba(255,255,255,0.04);">${_esc(method)}</td>
          </tr>` : ''}
          ${reference ? `<tr>
            <td style="padding:8px 0;font-size:13px;color:#8b95a5;border-bottom:1px solid rgba(255,255,255,0.04);">Reference</td>
            <td style="padding:8px 0;font-size:13px;color:#fff;font-weight:600;text-align:right;border-bottom:1px solid rgba(255,255,255,0.04);font-family:monospace;font-size:12px;">${_esc(reference)}</td>
          </tr>` : ''}
          ${newBalance != null ? `<tr>
            <td style="padding:8px 0;font-size:13px;color:#8b95a5;">New Balance</td>
            <td style="padding:8px 0;font-size:15px;color:#d4a574;font-weight:800;text-align:right;">${_esc(fmtMoney(newBalance))}</td>
          </tr>` : ''}
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#8b95a5;">Date</td>
            <td style="padding:8px 0;font-size:13px;color:#fff;font-weight:600;text-align:right;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
          </tr>
        </table>
      </td>
    </tr>
    </table>

    <p style="margin:0 0 4px;font-size:14px;color:#c8d0dc;line-height:1.6;">
      Your funds are now active across our sovereign deployment corridors. Returns are compounded autonomously — monitor performance in real-time from your dashboard.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;">
    <tr>
      <td style="background:linear-gradient(135deg,#d4a574,#b8956a);border-radius:8px;padding:14px 32px;">
        <a href="https://zenassets.tech" style="color:#0a0e16;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.5px;">View Portfolio →</a>
      </td>
    </tr>
    </table>

    <p style="margin:24px 0 0;font-size:12px;color:#5a6373;line-height:1.5;">
      If you did not authorise this deposit, contact support immediately at support@zenassets.tech.
    </p>
  `;

  try {
    await send(email, `Deposit Confirmed — ${fmtMoney(amount)} Deployed`, html);
    res.status(200).json({ ok: true, message: 'Deposit confirmation sent' });
  } catch (err) {
    console.error('SendGrid deposit email error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to send email' });
  }
};
