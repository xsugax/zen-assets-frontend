// ════════════════════════════════════════════════════════════
//  _lib/sendgrid.js — Shared SendGrid helpers & branded templates
//  ZEN ASSETS — Sovereign Capital Intelligence
// ════════════════════════════════════════════════════════════
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@zenassets.tech';
const FROM_NAME  = 'ZEN ASSETS';

// ── Branded HTML wrapper ──────────────────────────────────
function wrapHtml(title, bodyContent) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${_esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:#06080e;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#06080e;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0d1117;border-radius:12px;border:1px solid rgba(212,165,116,0.15);overflow:hidden;">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#0a0e16 0%,#141c2b 100%);padding:32px 40px;border-bottom:2px solid #d4a574;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td>
        <div style="font-size:24px;font-weight:800;color:#d4a574;letter-spacing:3px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">ZEN ASSETS</div>
        <div style="font-size:11px;color:#8b95a5;letter-spacing:2px;margin-top:4px;text-transform:uppercase;">Sovereign Capital Intelligence</div>
      </td>
      <td align="right" style="vertical-align:middle;">
        <div style="width:40px;height:40px;background:linear-gradient(135deg,#d4a574,#b8956a);border-radius:50%;text-align:center;line-height:40px;font-size:18px;">&#9830;</div>
      </td>
    </tr>
    </table>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:36px 40px;">
    ${bodyContent}
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#080b12;padding:24px 40px;border-top:1px solid rgba(212,165,116,0.1);">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td>
      <p style="margin:0 0 8px;font-size:12px;color:#8b95a5;line-height:1.5;">
        This email was sent by ZEN ASSETS — autonomous capital intelligence platform.
      </p>
      <p style="margin:0 0 8px;font-size:11px;color:#5a6373;line-height:1.5;">
        Edinburgh &bull; London &bull; New York &bull; Hong Kong &bull; Shanghai
      </p>
      <p style="margin:0;font-size:11px;color:#5a6373;">
        &copy; 2024–2026 ZEN ASSETS. All rights reserved.
      </p>
    </td></tr>
    </table>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ── Helper: gold stat box ─────────────────────────────────
function statBox(label, value, color) {
  const c = color || '#ffffff';
  return `<td style="padding:12px 16px;background:rgba(212,165,116,0.06);border-radius:8px;border:1px solid rgba(212,165,116,0.1);text-align:center;">
    <div style="font-size:11px;color:#8b95a5;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">${_esc(label)}</div>
    <div style="font-size:20px;font-weight:800;color:${c};">${_esc(value)}</div>
  </td>`;
}

// ── Helper: divider ───────────────────────────────────────
function divider() {
  return '<tr><td style="padding:16px 0;"><hr style="border:none;border-top:1px solid rgba(212,165,116,0.1);margin:0;"/></td></tr>';
}

// ── HTML-escape ───────────────────────────────────────────
function _esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Format money ──────────────────────────────────────────
function fmtMoney(n) {
  const num = parseFloat(n) || 0;
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Send email ────────────────────────────────────────────
async function send(to, subject, htmlBody) {
  const msg = {
    to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject,
    html: wrapHtml(subject, htmlBody),
  };
  await sgMail.send(msg);
}

// ── Validate request method + parse body ──────────────────
function validatePost(req, res, requiredFields) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return null;
  }
  const body = req.body;
  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'Invalid request body' });
    return null;
  }
  for (const field of requiredFields) {
    if (!body[field] && body[field] !== 0) {
      res.status(400).json({ error: `Missing required field: ${field}` });
      return null;
    }
  }
  // Basic email validation
  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    res.status(400).json({ error: 'Invalid email address' });
    return null;
  }
  return body;
}

module.exports = { send, wrapHtml, statBox, divider, fmtMoney, _esc, validatePost };
