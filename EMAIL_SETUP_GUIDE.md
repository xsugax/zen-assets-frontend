# Email & Authentication Setup Guide — ZEN ASSETS

## What Was Updated

✅ **Professional registration email flow**
- Sign up sends a **6-digit verification code** (not instant login)
- After you enter the code, account activates and a **welcome email** is sent
- Forgot-password and resend-code emails are enabled again

✅ **Backend Email Configuration** (`.env` + Render)
- Sender must be `noreply@zenassets.tech` (verified in Resend)
- Gmail addresses **will fail** when using the Resend API

✅ **Email Service** (`backend/services/email.js`)
- Resend → SMTP → console (dev only)
- Production returns an error if email cannot be delivered (no silent fake success)

✅ **Frontend OTP screens** (`index.html`, `200.html`, `app.js`)
- Registration shows “Verify Your Email” step after sign-up
- Unverified users are prompted to complete verification before login

---

## 🔧 Configuration Steps

### Step 1: Get Resend API Key (Recommended)

1. Go to https://resend.com
2. Sign up / Log in
3. Navigate to **API Keys** section
4. Copy your API key (starts with `re_`)
5. In `backend/.env`, update:
   ```
   RESEND_API_KEY=re_YOUR_KEY_HERE
   ```

**For Testing:** Use the default `onboarding@resend.dev` domain  
**For Production:** Verify your custom domain in Resend first

### Step 2: Set Email Sender Address

Update `backend/.env`:

```env
# Email sender address (must match Resend verified domain)
EMAIL_FROM_ADDR=noreply@zenassets.tech

# Email display name
EMAIL_FROM_NAME=ZEN ASSETS
```

**⚠️ Important:** 
- For Resend production: use `noreply@zenassets.tech` (domain must be verified in Resend)
- For testing only: `onboarding@resend.dev`
- Do **not** set `EMAIL_FROM_ADDR` to a Gmail address when using Resend

### Render dashboard (production)

Set these environment variables on **zen-assets-backend**:

| Variable | Value |
|----------|-------|
| `RESEND_API_KEY` | Your `re_...` key from Resend |
| `EMAIL_FROM_ADDR` | `noreply@zenassets.tech` |
| `EMAIL_FROM_NAME` | `ZEN ASSETS` |
| `NODE_ENV` | `production` |

Then redeploy the backend. Check `GET /api/health` — you should see `"email":"configured"` and `"emailDriver":"resend"`.

---

## 📧 Email Driver Options

### Option A: Resend API (Recommended ⭐)

**Pros:** 
- Better deliverability
- Built for transactional emails
- Free tier available

**Setup:**
```env
RESEND_API_KEY=re_YOUR_KEY_HERE
EMAIL_FROM_ADDR=onboarding@resend.dev
```

Test: https://resend.com/emails

---

### Option B: Gmail SMTP (Fallback)

**Pros:**
- Free
- No additional signup

**Setup:**

1. Enable 2-Step Verification on your Gmail account
2. Generate **App Password** (not regular password):
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Windows Computer"
   - Copy the 16-character password

3. Update `backend/.env`:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=thezenassets@gmail.com
   SMTP_PASS=xxxx xxxx xxxx xxxx
   ```

---

## ✅ Verification Checklist

### Backend Email System

```bash
# 1. Restart backend server
npm start

# Check console for email config message:
# [EMAIL CONFIG] ✓ Resend API enabled → FROM: thezenassets@gmail.com
# (or SMTP configured message)
```

### User Registration → Email Flow

1. **Open frontend:** `https://zenassets.tech` (or localhost)
2. **Register new account** with valid email
3. **Check backend logs** for:
   ```
   [EMAIL/Resend] OK "Welcome to ZEN ASSETS..." -> user@example.com
   ```
   (or `[EMAIL/SMTP]` if using Gmail)

4. **Check user's inbox** for welcome email within 60 seconds

### Login Flow

1. **Log in** with the registered account
2. **Check "Remember Me" checkbox**
3. **Verify logged in**
4. **Close browser completely**
5. **Reopen and visit zenassets.tech**
6. **Should be auto-logged in** (remember-me working)
7. **Check logout works** to clear session

### Email Notifications Testing

Send deposit notification:
```javascript
// In browser console (logged-in admin):
UserAuth.sendDepositConfirm({email: 'user@example.com', full_name: 'John'}, 100, 'Bank Transfer')
```

Check logs for email delivery attempt.

---

## 🚨 Troubleshooting

### Emails Going to Console (Dev Mode)

**Issue:** You see `[EMAIL/LOG]` instead of `[EMAIL/Resend]` or `[EMAIL/SMTP]`

**Solution:**
1. Check if `RESEND_API_KEY` is set in `.env`
2. If using Resend, verify it doesn't start with `re_placeholder`
3. If using SMTP, check all 3 fields: `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`
4. Restart backend server: `npm start`

### Resend API Failing

**Error:** `[EMAIL/Resend] FAIL "..." : ...`

**Solutions:**
- Verify API key is correct at https://resend.com/api-keys
- Check email sender is verified in Resend Domains
- For testing, use `onboarding@resend.dev`

### Gmail SMTP Failing

**Error:** `[EMAIL/SMTP] FAIL "..." : Bad credentials`

**Solutions:**
- Use **App Password**, not regular Gmail password
- Enable 2-Step Verification first
- Generate new App Password: https://myaccount.google.com/apppasswords
- Use 16-char password without spaces: `xxxxxxxxxxxxxx`

### Remember Me Not Working

**Issue:** Logged out when closing browser

**Check:**
1. Is checkbox visible in login form? (should be labeled "Keep me signed in")
2. Is it checked before logging in?
3. Check browser DevTools → Application → localStorage
4. Should see `zen_remember_me=1` if working

**Solution:**
- Clear browser data: DevTools → Storage → Clear All
- Try logging in again with remember-me checked

---

## 📊 Email Status

After setup, run:

```bash
node -e "
require('dotenv').config();
console.log('✓ Email Configuration:');
console.log('  Resend:', process.env.RESEND_API_KEY ? '✓ Configured' : '✗ Missing');
console.log('  SMTP:', process.env.SMTP_HOST ? '✓ Configured' : '✗ Missing');
console.log('  From:', process.env.EMAIL_FROM_ADDR || 'no-reply@zenassets.tech');
"
```

---

## 🔄 Email Types & When They Send

| Event | Template | When |
|-------|----------|------|
| Register | Welcome | After registration |
| Deposit | DepositConfirm | When wallet funded |
| Withdrawal | WithdrawalUpdate | When admin approves/rejects |
| KYC | KYCUpdate | When admin verifies |
| Earnings | EarningsCredit | Daily/weekly credit |
| Login | LoginOTP | *(Optional—if 2FA enabled)* |

---

## 📝 Notes

- Emails currently use **console fallback** if no real driver is configured
- All email addresses are **validated on registration**
- Tokens expire after **7 days** (JWT_EXPIRES_IN)
- Remember-me uses **localStorage** (persistent across sessions)
- Without remember-me, session uses **sessionStorage** (tab-only)

---

✅ Setup complete! Users should now receive emails and remember-me should work perfectly.
