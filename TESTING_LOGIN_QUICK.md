# Quick Login Troubleshooting Guide

## Current Status
✅ Email sending **DISABLED** for troubleshooting
✅ All email-dependent blocking removed from auth flow
✅ Registration and login should be instant

## Test Login Flow

### 1. Test Registration (Fast Path)
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@gmail.com",
    "password": "TestPassword123!",
    "fullName": "Test User",
    "tier": "gold",
    "depositAmount": 100,
    "pin": "1234"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "email": "test@gmail.com",
    "fullName": "Test User",
    "role": "user",
    "tier": "gold",
    "status": "active",
    "kycStatus": "none"
  },
  "wallet": {
    "balance": 100,
    "initialDeposit": 100,
    ...
  }
}
```

### 2. Test Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@gmail.com",
    "password": "TestPassword123!"
  }'
```

### 3. Check Admin Panel
- Open admin panel at `http://localhost:3000/admin.html`
- Look for the newly created user in the user list
- Verify the account appears instantly

### 4. Verify Database
```bash
# Check if user was created
sqlite3 backend/db/data.db "SELECT id, email, full_name, status, created_at FROM users ORDER BY created_at DESC LIMIT 1;"

# Check wallet
sqlite3 backend/db/data.db "SELECT user_id, balance, initial_deposit FROM wallets WHERE user_id = 1;"

# Check sessions
sqlite3 backend/db/data.db "SELECT user_id, token_jti, created_at FROM sessions WHERE user_id = 1 ORDER BY created_at DESC LIMIT 1;"
```

## What to Monitor

### Logs to Check
```bash
# Watch backend logs for registration
grep "user.registered" logs/backend.log

# Watch for any errors
grep "ERROR\|error" logs/backend.log

# Watch login attempts
grep "AUTH/LOGIN" logs/backend.log
```

### Frontend Console
- Open browser DevTools (F12)
- Check Network tab for API responses
- Check Console tab for any JS errors
- Verify token is stored in localStorage

## Debugging Checklist

- [ ] Registration returns JWT token immediately
- [ ] Token is valid and can be verified
- [ ] User appears in database (check with sqlite3)
- [ ] User appears in admin panel
- [ ] Login works with email/password
- [ ] Session is created for logged-in user
- [ ] Users can stay logged in (refresh page)
- [ ] Logout works and revokes session

## Re-Enable Emails Later

When login/registration is working 100%, re-enable emails:

1. Open `backend/routes/auth.js`
2. Uncomment the 4 email service calls (lines 330, 333, 403, 405)
3. Set `DISABLE_EMAILS=false` in `.env`
4. Test email sending with test account

## Performance Notes

With emails disabled, registration should now:
- ✅ Complete in <100ms (down from potential 5-10s)
- ✅ Return immediately to frontend
- ✅ Allow instant login without delays
- ✅ Prevent database inconsistencies from timeouts
