# 🚀 ZEN ASSETS - Complete Application Guide

## ✨ What's New: Full Backend Implementation

Your application now has a **complete, production-ready backend** running alongside the frontend!

```
🖥️  FRONTEND (HTML/CSS/JS) ←→ 🔌 BACKEND API (Node.js) ←→ 💾 DATABASE (SQLite)
    http://localhost:5500         http://localhost:4000         zen_assets.db
```

---

## 🎯 Quick Start

### 1️⃣ Start the Backend Server
```bash
cd backend
npm start
```
You should see:
```
╔══════════════════════════════════════════════════════╗
║  ZEN ASSETS Backend Server                           ║
║  Port: 4000                                          ║
║  Env:  development                                   ║
║  DB:   ./data/zen_assets.db                          ║
╚══════════════════════════════════════════════════════╝
```

### 2️⃣ Open the Frontend
```
Open in browser: http://localhost:5500/frontend/
```

### 3️⃣ Login with Admin Account
```
Email:    admin@zenassets.com
Password: ZenAdmin2026!
```

---

## 🔐 Authentication Flow

### How Login Works

```
User enters email/password
           ↓
Frontend sends POST to /api/auth/login
           ↓
Backend checks credentials against SQLite database
           ↓
Backend generates JWT token (lasts 7 days)
           ↓
Frontend stores token in localStorage
           ↓
Frontend redirects to dashboard
           ↓
All future requests include "Authorization: Bearer {token}"
```

### Token Structure

Your JWT token contains:
- **sub**: Your user ID
- **role**: 'user' or 'admin'
- **jti**: Session identifier (can be revoked)
- **exp**: Expiration time (7 days from login)

---

## 📊 User Accounts

### Pre-created Admin Account
| Field | Value |
|-------|-------|
| Email | admin@zenassets.com |
| Password | ZenAdmin2026! |
| Role | Admin |
| Tier | Diamond |
| Status | Verified |

### Create New Accounts
1. Click "Create Account" at login screen
2. Fill in all required fields
3. Choose your membership tier (Bronze → Diamond)
4. Enter deposit amount

Minimum deposits by tier:
- Bronze: $5,000
- Silver: $25,000
- Gold: $100,000
- Platinum: $500,000
- Diamond: $1,000,000

---

## 📁 Project Structure

```
OmniVest-AI/
├── backend/
│   ├── server.js              # Main Express server
│   ├── package.json           # Dependencies
│   ├── .env                   # Configuration
│   ├── routes/                # API endpoints
│   │   ├── auth.js           # Login/register
│   │   ├── wallet.js         # Wallet operations
│   │   ├── trades.js         # Trading history
│   │   ├── admin.js          # Admin functions
│   │   ├── stripe.js         # Payment processing
│   │   └── kyc.js            # ID verification
│   ├── middleware/            # Authentication & security
│   │   ├── auth.js           # JWT verification
│   │   └── security.js       # Input validation
│   ├── services/              # Business logic
│   │   ├── cron.js           # Scheduled jobs
│   │   └── email.js          # Email notifications
│   ├── db/
│   │   ├── database.js       # SQLite setup
│   │   └── migrations/       # Schema updates
│   └── data/
│       └── zen_assets.db     # SQLite database file
│
├── frontend/
│   ├── index.html            # Main page
│   ├── admin.html            # Admin panel
│   ├── 200.html              # Error page
│   ├── js/
│   │   ├── app.js            # Main app controller
│   │   ├── user-auth.js      # Authentication (NEW: Backend-integrated!)
│   │   ├── chart-engine.js   # Charts
│   │   ├── market-data.js    # Market feeds
│   │   └── ...               # Other modules
│   └── css/
│       ├── main.css          # Main styles
│       └── ...               # Other styles
│
├── BACKEND_SETUP.txt         # Backend configuration guide
├── DEMO_ACCOUNTS.txt         # Demo account list
└── README.md                 # This file
```

---

## 🔌 API Endpoints

### Authentication
```javascript
// Register
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "fullName": "John Doe",
  "tier": "gold",
  "depositAmount": 150000
}

// Login
POST /api/auth/login
{
  "email": "admin@zenassets.com",
  "password": "ZenAdmin2026!"
}

// Get current user
GET /api/auth/me
Headers: Authorization: Bearer {token}

// Logout
POST /api/auth/logout
Headers: Authorization: Bearer {token}
```

### Wallet Management
```javascript
// Get balance
GET /api/wallet
Headers: Authorization: Bearer {token}

// Deposit funds
POST /api/wallet/deposit
{
  "amount": 10000
}

// Withdraw funds
POST /api/wallet/withdraw
{
  "amount": 5000
}

// Transaction history
GET /api/wallet/transactions
```

### Trades
```javascript
// Log a trade
POST /api/trades
{
  "symbol": "BTC/USD",
  "side": "buy",
  "quantity": 0.5,
  "entry_price": 45000,
  "exit_price": 48000,
  "pnl": 1500
}

// Get all trades
GET /api/trades

// Trading stats
GET /api/trades/stats

// Open positions
GET /api/trades/open
```

### Admin Panel
```javascript
// Get all users
GET /api/admin/users
Headers: Authorization: Bearer {admin_token}

// Get all transactions
GET /api/admin/transactions

// Update user tier
PATCH /api/admin/users/{userId}
{
  "tier": "platinum"
}
```

---

## 🔒 Security Features

1. **Password Hashing**: bcryptjs with 10 salt rounds
2. **Token Signing**: HMAC-SHA256 with JWT_SECRET
3. **CORS Protection**: Whitelist of allowed origins
4. **Rate Limiting**: 5 login attempts per 15 minutes
5. **SQL Injection Prevention**: Parameterized queries
6. **Session Tracking**: Can revoke tokens on logout
7. **User Status**: Suspended/banned accounts blocked
8. **2FA Ready**: Middleware for two-factor authentication

---

## 🛠️ Configuration

Edit `backend/.env` to customize:

```env
# Server
PORT=4000                          # API port
NODE_ENV=development              # or 'production'

# Security
JWT_SECRET=your_secret_key_here    # Change in production!
ENFORCE_HTTPS=false                # Enable for production

# Database
DB_PATH=./data/zen_assets.db       # SQLite location

# Admin Account
ADMIN_EMAIL=admin@zenassets.com
ADMIN_PASSWORD=ZenAdmin2026!

# Email Service (optional)
RESEND_API_KEY=your_key_here       # For notifications

# Stripe (optional)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 🧪 Testing

### Test Login via API
```bash
# Windows PowerShell
$body = '{"email":"admin@zenassets.com","password":"ZenAdmin2026!"}'
Invoke-WebRequest -Uri "http://localhost:4000/api/auth/login" `
  -Method POST -ContentType "application/json" -Body $body
```

### Test with Frontend
1. Open http://localhost:5500/frontend/
2. Click Login
3. Enter credentials
4. Should see dashboard

---

## 🚨 Troubleshooting

### "Server unreachable"
```bash
# Ensure backend is running
cd backend && npm start
# Check: http://localhost:4000/api/health
```

### "CORS error"
Backend CORS whitelist includes:
- http://localhost:5500
- http://localhost:3000
- http://127.0.0.1:5500
- https://zenassets.tech

### "Invalid token"
- Clear localStorage: Check DevTools → Application → LocalStorage
- Login again
- Token should be stored as `zen_token`

### "Password too weak"
Backend requires:
- 12+ characters
- Uppercase letter
- Lowercase letter
- Number
- Special character (!@#$%^&*)

Example: `ZenAdmin2026!` ✅

### Port Already In Use
```bash
# Find process using port 4000
netstat -ano | findstr :4000

# Kill process (Windows)
taskkill /PID {process_id} /F
```

---

## 📈 Next Steps

### Short Term
- [ ] Test all login/logout functionality
- [ ] Create user accounts through UI
- [ ] Verify wallet and transaction tracking
- [ ] Test admin panel features

### Medium Term
- [ ] Set up Stripe API keys for real payments
- [ ] Configure email service for notifications
- [ ] Add two-factor authentication
- [ ] Set up backup database

### Production
- [ ] Change JWT_SECRET to a strong random value
- [ ] Set NODE_ENV=production
- [ ] Enable HTTPS
- [ ] Set up database backups
- [ ] Deploy to cloud (Render, Railway, AWS, etc.)
- [ ] Configure DNS and domain
- [ ] Set up monitoring and logging

---

## 📚 Documentation

- [Backend Setup Guide](BACKEND_SETUP.txt)
- [Demo Accounts Reference](DEMO_ACCOUNTS.txt)
- [API Routes Documentation](backend/routes/)
- [Database Schema](backend/db/database.js)

---

## 🤝 Support

If you encounter issues:

1. Check the error message in browser console (F12)
2. Check backend logs (running terminal)
3. Verify JWT token in localStorage
4. Ensure .env configuration is correct
5. Try clearing cache and reloading

---

## ⚡ Performance Tips

- Token lasts **7 days** - users stay logged in longer
- Rate limiting allows **5 login attempts per 15 minutes**
- Database uses **WAL mode** for better concurrency
- CORS headers are **cached** for performance
- Sessions are **cleaned up hourly**

---

## 🎉 You're All Set!

Your application is now:
✅ Backend-powered with Node.js/Express
✅ Secured with JWT authentication
✅ Data-persistent with SQLite
✅ API-first architecture
✅ Production-ready code structure

**Ready to build amazing features!**

---

*ZEN ASSETS Backend v1.0.0 — March 2026*
