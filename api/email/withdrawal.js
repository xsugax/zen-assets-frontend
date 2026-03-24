// POST /api/email/withdrawal — Send withdrawal status email
const { send, fmtMoney, _esc, validatePost } = require('../_lib/sendgrid');

const STATUS_CONFIG = {
  pending:  { label: 'Processing',  color: '#d4a574', icon: '&#9203;', subject: 'Withdrawal Request Received' },
  approved: { label: 'Approved',    color: '#5fb38e', icon: '&#10003;', subject: 'Withdrawal Approved' },
  denied:   { label: 'Declined',    color: '#e74c5e', icon: '&#10007;', subject: 'Withdrawal Update' },
};

module.exports = async function handler(req, res) {
  const body = validatePost(req, res, ['email', 'fullName', 'amount', 'status']);
  if (!body) return;

  const { email, fullName, amount, status, method, reason } = body;
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  const html = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#ffffff;">${_esc(cfg.subject)}</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#8b95a5;">Your withdrawal request has been updated.</p>

    <!-- Status badge -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
    <tr>
      <td style="padding:24px;background:rgba(10,14,22,0.6);border-radius:10px;border:1px solid ${cfg.color}33;text-align:center;">
        <div style="font-size:36px;margin-bottom:8px;">${cfg.icon}</div>
        <div style="font-size:11px;color:#8b95a5;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;">Status</div>
        <div style="display:inline-block;padding:6px 20px;background:${cfg.color}1a;border:1px solid ${cfg.color}40;border-radius:20px;font-size:14px;font-weight:700;color:${cfg.color};letter-spacing:1px;">${_esc(cfg.label)}</div>
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
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#8b95a5;border-bottom:1px solid rgba(255,255,255,0.04);">Withdrawal Amount</td>
            <td style="padding:8px 0;font-size:15px;color:#e74c5e;font-weight:800;text-align:right;border-bottom:1px solid rgba(255,255,255,0.04);">-${_esc(fmtMoney(amount))}</td>
          </tr>
          ${method ? `<tr>
            <td style="padding:8px 0;font-size:13px;color:#8b95a5;border-bottom:1px solid rgba(255,255,255,0.04);">Method</td>
            <td style="padding:8px 0;font-size:13px;color:#fff;font-weight:600;text-align:right;border-bottom:1px solid rgba(255,255,255,0.04);">${_esc(method)}</td>
          </tr>` : ''}
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#8b95a5;">Date</td>
            <td style="padding:8px 0;font-size:13px;color:#fff;font-weight:600;text-align:right;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
          </tr>
        </table>
      </td>
    </tr>
    </table>

    ${status === 'approved' ? `
    <p style="margin:0 0 16px;font-size:14px;color:#c8d0dc;line-height:1.6;">
      Your withdrawal has been approved and is being processed. Funds will arrive in your designated account within 1–3 business days depending on your payment method.
    </p>` : ''}

    ${status === 'denied' && reason ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
    <tr>
      <td style="padding:14px 16px;background:rgba(231,76,94,0.08);border-left:3px solid #e74c5e;border-radius:4px;">
        <div style="font-size:11px;color:#8b95a5;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Reason</div>
        <div style="font-size:13px;color:#c8d0dc;line-height:1.5;">${_esc(reason)}</div>
      </td>
    </tr>
    </table>
    <p style="margin:0 0 16px;font-size:14px;color:#c8d0dc;line-height:1.6;">
      If you have questions about this decision, please contact our support team.
    </p>` : ''}

    ${status === 'pending' ? `
    <p style="margin:0 0 16px;font-size:14px;color:#c8d0dc;line-height:1.6;">
      Your withdrawal request is under review. Our compliance team will process it within 24 hours. You'll receive another email once a decision is made.
    </p>` : ''}

    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;">
    <tr>
      <td style="background:linear-gradient(135deg,#d4a574,#b8956a);border-radius:8px;padding:14px 32px;">
        <a href="https://zenassets.tech" style="color:#0a0e16;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.5px;">View Dashboard →</a>
      </td>
    </tr>
    </table>

    <p style="margin:24px 0 0;font-size:12px;color:#5a6373;line-height:1.5;">
      For urgent inquiries, contact support@zenassets.tech.
    </p>
  `;

  try {
    await send(email, `${cfg.subject} — ${fmtMoney(amount)}`, html);
    res.status(200).json({ ok: true, message: 'Withdrawal email sent' });
  } catch (err) {
    console.error('SendGrid withdrawal email error:', err.message);
    res.status(500).json({ ok: false, error: 'Failed to send email' });
  }
};
