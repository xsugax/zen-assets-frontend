# 🚀 Production Deployment Guide — ZEN ASSETS

## Status: RENDER HOSTED

Your backend is deployed on **Render** (confirmed via render.yaml)

---

## ✅ What's Been Updated

- ✅ Resend API Key: `re_9CiwXsqG_CHrtauo8txiRAiS8Nya1BQmJ`
- ✅ Backend Email: `thezenassets@gmail.com`
- ✅ Frontend Domain: `https://zenassets.tech`
- ✅ Backend URL: `https://zen-assets-backend.onrender.com/api`
- ✅ Environment: Production

---

## 🔐 Resend Domain Verification (CRITICAL for emails)

You MUST verify your Namecheap domain in Resend to use `thezenassets@gmail.com` for sending emails.

### Step 1: Add Domain to Resend

1. Go to https://resend.com/domains
2. Click **Add Domain**
3. Enter: `zenassets.tech`
4. You'll receive DNS records to add

### Step 2: Get Namecheap DNS Records

From Resend, you'll see records like:

```
Type: TXT
Record: dkim._domainkey.zenassets.tech
Value: v=DKIM1; p=...
TTL: 3600

Type: MX
Record: zenassets.tech
Value: feedback-smtp.{region}.amazonses.com
Priority: 10
```

(Exact values depend on your Resend region)

### Step 3: Add to Namecheap DNS

1. Go to **Namecheap Dashboard**
2. Find **zenassets.tech** domain
3. Click **Manage** → **Advanced DNS**
4. Add all Resend-provided records:
   - **TXT records** (DKIM verification)
   - **MX records** (if using Resend MX)
   - **CNAME record** (if provided)

### Step 4: Verify in Resend

1. Back in Resend dashboard
2. Click **Verify Domain**
3. Wait for DNS propagation (5-30 minutes)
4. Status should show ✅ **Verified**

---

## 🌐 Render Backend Configuration

### Current Setup

Your backend is at: **zen-assets-backend.onrender.com**

This is the default Render subdomain. To use your custom domain:

### Option A: Use Default Render Domain (Quick ⭐)

Keep backend at: `https://zen-assets-backend.onrender.com`
- Frontend already configured for this ✓
- No DNS changes needed
- Emails work immediately once Resend domain verified

### Option B: Custom Domain (Advanced)

Point `api.zenassets.tech` to Render:

1. In **Render Dashboard**:
   - Select project: **zen-assets-backend**
   - Go to **Settings** → **Custom Domain**
   - Add: `api.zenassets.tech`

2. In **Namecheap DNS**:
   - Add **CNAME record**:
     - Name: `api`
     - Value: `zen-assets-backend.onrender.com`
     - TTL: 3600

3. Update `frontend/js/user-auth.js`:
   ```javascript
   const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
     ? 'http://localhost:4000/api'
     : 'https://api.zenassets.tech/api';  // ← change this
   ```

---

## 📧 Email Configuration (Production)

### What's Configured

```env
RESEND_API_KEY=re_9CiwXsqG_CHrtauo8txiRAiS8Nya1BQmJ
EMAIL_FROM_ADDR=thezenassets@gmail.com
EMAIL_FROM_NAME=ZEN ASSETS
```

### What Still Needs Setup

1. **Verify domain in Resend** (see above)
2. Once verified, emails automatically send from `thezenassets@gmail.com`

### Email Flow

```
User registers
    ↓
Backend sends welcome email
    ↓
Resend API sends (using your verified domain)
    ↓
User receives in inbox
```

---

## 🔄 Deploy to Render

### Automatic Deployment

Your `render.yaml` is configured:

```yaml
services:
  - type: web
    name: zen-assets-backend
    runtime: node
    buildCommand: npm install
    startCommand: node server.js
```

**Just push to GitHub:**
```bash
git add .
git commit -m "Production: Resend email + Render deployment"
git push origin main
```

Render auto-deploys from `master` branch.

### Manual Environment Variables in Render

If variables don't auto-load, manually set in Render Dashboard:

1. **Render Dashboard** → **zen-assets-backend** → **Environment**
2. Add:
   ```
   RESEND_API_KEY=re_9CiwXsqG_CHrtauo8txiRAiS8Nya1BQmJ
   EMAIL_FROM_ADDR=thezenassets@gmail.com
   NODE_ENV=production
   FRONTEND_URL=https://zenassets.tech
   ```

3. **Save and Redeploy**

---

## ✅ Production Checklist

### DNS Setup (Namecheap)

- [ ] Domain points to **Render** (if using custom domain)
- [ ] **TXT records** added for Resend DKIM
- [ ] **MX records** configured (if using Resend MX)
- [ ] DNS propagated (check: `nslookup zenassets.tech`)

### Resend Configuration

- [ ] Domain verified in Resend dashboard (✅ green status)
- [ ] API key working (test send in Resend UI)
- [ ] SPF record added (if required)

### Backend (Render)

- [ ] Environment variables set: `RESEND_API_KEY`, `EMAIL_FROM_ADDR`
- [ ] Server deployed and running
- [ ] Logs show: `[EMAIL CONFIG] ✓ Resend API enabled`

### Frontend (zenassets.tech)

- [ ] Points to Render backend: `https://zen-assets-backend.onrender.com/api`
- [ ] Remember-me checkbox visible on login
- [ ] CORS allows `https://zenassets.tech`

### Testing

- [ ] Register test account
- [ ] Check email arrives within 60 seconds
- [ ] Log in with "Remember me" checked
- [ ] Close browser → reopen → auto-logged in

---

## 🧪 Test Email Delivery

### Method 1: Register Account

1. Visit **https://zenassets.tech**
2. Click **Create Account**
3. Fill form with test email
4. Check inbox for welcome email

### Method 2: Admin Send

```javascript
// In browser console (logged in as admin):
UserAuth.sendDepositConfirm({
  email: 'youremail@example.com',
  full_name: 'Test User'
}, 100, 'Test');
```

### Check Backend Logs

```bash
# In Render dashboard, view logs for:
[EMAIL/Resend] OK "Welcome to ZEN ASSETS" → user@example.com
```

---

## 🆘 Troubleshooting

### Email Not Arriving

**Check in Render logs:**
```
[EMAIL CONFIG] ✓ Resend API enabled → FROM: thezenassets@gmail.com
[EMAIL/Resend] OK "..." → user@example.com
```

**If you see:**
- `[EMAIL/LOG]` → Resend API key not configured
- `[EMAIL/Resend] FAIL` → Domain not verified in Resend

**Solution:**
1. Verify domain in Resend: https://resend.com/domains
2. Check DNS records propagated: `nslookup zenassets.tech`
3. Redeploy backend on Render

### DNS Not Resolving

```bash
# Check DNS records:
nslookup zenassets.tech
nslookup api.zenassets.tech

# Should return Render IP or CNAME
```

**Fix:** Wait 5-30 minutes for propagation, then check Namecheap dashboard.

### Backend Not Responding

Check in **Render Dashboard**:
- Is service deployed? (green status)
- View logs for startup errors
- Click **Manual Deploy** to redeploy

---

## 📋 DNS Records Summary

### For Resend Email Verification (Namecheap)

| Type | Name | Value | TTL |
|------|------|-------|-----|
| TXT | dkim._domainkey.zenassets.tech | v=DKIM1; p=... | 3600 |
| TXT | _domainkey.zenassets.tech | t=y; o=~; | 3600 |
| MX | zenassets.tech | feedback-smtp...amazonses.com | 10 |

*(Get exact values from Resend Domains dashboard)*

### For Custom API Domain (Optional)

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | api | zen-assets-backend.onrender.com | 3600 |

---

## 🔐 Render backend env (roadmap checklist)

| Variable | Required | Notes |
|----------|----------|-------|
| `JWT_SECRET` | Yes | Auto-generated in `render.yaml`; do not use dev fallback |
| `ADMIN_PASSWORD` | Yes | Admin login; set in Render dashboard |
| `DB_PATH` | Yes | `/data/zen_assets.db` with persistent disk mount |
| `FRONTEND_URL` | Yes | `https://zenassets.tech` |
| `DATA_ENCRYPTION_KEY` | Recommended | 64-char hex for KYC document encryption at rest |
| `EARNINGS_CRON_ENABLED` | Optional | `true` to accrue `pending_earnings` daily |
| `SYNC_ADMIN_PASSWORD` | Optional | Set `true` only when intentionally resetting admin password on deploy |

**Smoke tests:** `node scripts/test-multidevice-auth.js <api>` and `node scripts/test-wallet-platform.js <api>`

---

## 🎯 What's Next

1. **Verify Resend domain** (critical for emails)
2. **Test email delivery** (register account)
3. **Deploy to production** (push to GitHub → Render auto-deploys)
4. **Monitor logs** (Render dashboard)
5. **Test remember-me** (login → close → reopen → auto-logged in)

---

## 📞 Support

**Render Issues:** https://dashboard.render.com → Logs  
**Resend Issues:** https://resend.com → Domains  
**Namecheap Issues:** https://www.namecheap.com → Domain DNS

---

✅ **Production ready!** All systems configured and waiting for Resend domain verification.
