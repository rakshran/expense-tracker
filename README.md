# 💰 Indian SMS Expense Tracker

Real-time expense tracking for Indian bank SMS messages using Cloudflare Workers and Google Sheets.

<img src="https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare" alt="Cloudflare Workers"> <img src="https://img.shields.io/badge/Google-Sheets-34A853?logo=google-sheets" alt="Google Sheets"> <img src="https://img.shields.io/badge/iOS-Shortcuts-007AFF?logo=apple" alt="iOS Shortcuts">

## 🎯 Problem Statement

Existing expense tracking apps either:
1. 📝 Require manual entry (tedious and easy to forget)
2. 🔓 Invade your privacy by reading ALL your emails/SMS

This solution gives you **privacy** + **automation**:
- ✅ SMS data stays on YOUR device until parsed
- ✅ Only transaction SMS are sent to YOUR worker
- ✅ Data stored only in YOUR Google Sheet
- ✅ No third-party apps reading your messages
- ✅ Completely free using Cloudflare + Google free tiers

## 🏗️ Architecture

```
┌─────────────┐         ┌──────────────────┐         ┌───────────────┐
│   Bank SMS  │         │  Cloudflare      │         │ Google Sheets │
│  (on iPhone)│   ────> │  Worker          │  ────>  │               │
│             │  HTTPS  │  (Parser + API)  │  API    │ Your Sheet    │
└─────────────┘         └──────────────────┘         └───────────────┘
      │                                                       │
      │ iOS Shortcut                                          │
      │ Automation                                            │
      └───────────────────────────────────────────────────────┘
                           View Expenses
```

## 🚀 Features

### 🏦 Supported Banks
- **HDFC Bank** (Card + UPI)
- **Axis Bank** (Card + IMPS)
- **American Express** (AMEX)
- **Scapia Federal**
- **Generic UPI** (any bank)

### 🧠 Smart Parsing
- ✅ Extracts amount, merchant, date, time, card/account
- ✅ Ignores "Available Balance" amounts
- ✅ Cleans merchant names (removes @ybl, underscores, etc.)
- ✅ Handles multiple date formats
- ✅ Returns confidence level (high/medium/low)

### 📊 Google Sheets Integration
Automatic columns: `Date | Time | Amount | Merchant | Card/Account | Type | Confidence | Raw SMS`

### 📱 iOS Automation
- Triggers automatically on transaction SMS
- No app installation required
- Uses native iOS Shortcuts

## 📦 What's Included

```
expense-tracker/
├── worker.js                      # Main Cloudflare Worker (SMS parser + Sheets API)
├── wrangler.toml                  # Cloudflare Worker configuration
├── package.json                   # Node.js dependencies
├── test.js                        # Test suite for SMS parser
├── DEPLOYMENT.md                  # Step-by-step deployment guide
├── SETUP-GOOGLE-SHEETS.md        # Google Cloud & Sheets API setup
├── ExpenseTrackerShortcut.txt    # iOS Shortcut setup instructions
└── scraper.py                     # Legacy Gmail scraper (for reference)
```

## 🏃 Quick Start

### 1️⃣ Set Up Google Sheets (15 minutes)
Follow the detailed guide: **[SETUP-GOOGLE-SHEETS.md](SETUP-GOOGLE-SHEETS.md)**

**Summary:**
1. Create Google Cloud project
2. Enable Sheets API
3. Create service account & download JSON key
4. Create Google Sheet with headers
5. Share sheet with service account email

### 2️⃣ Deploy to Cloudflare (5 minutes)
Follow the detailed guide: **[DEPLOYMENT.md](DEPLOYMENT.md)**

**Summary:**
```bash
# Install dependencies
npm install

# Login to Cloudflare
npx wrangler login

# Set secrets
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL
npx wrangler secret put GOOGLE_PRIVATE_KEY
npx wrangler secret put GOOGLE_SPREADSHEET_ID

# Deploy!
npm run deploy
```

Your worker URL: `https://expense-tracker.YOUR-SUBDOMAIN.workers.dev`

### 3️⃣ Set Up iOS Shortcut (10 minutes)
Follow the instructions: **[ExpenseTrackerShortcut.txt](ExpenseTrackerShortcut.txt)**

**Summary:**
1. Create shortcut that POSTs SMS to your worker URL
2. Create automation triggered by keywords: "spent", "debited", "Rs", "INR"
3. Enable "Run Immediately" for automatic tracking

### 4️⃣ Test!
Send a test SMS:
```bash
curl -X POST https://expense-tracker.YOUR-SUBDOMAIN.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"sms": "Spent Rs.509.71 On HDFC Bank Card 0962 At ZOMATO On 2025-11-15:19:52:25"}'
```

Check your Google Sheet! 📊

## 🧪 Testing

Run the test suite to verify SMS parsing:

```bash
node test.js
```

**Expected output:**
```
🧪 Running SMS Parser Tests
================================================================================
Test 1: HDFC Card
✅ PASSED

Test 2: AMEX Card
✅ PASSED

Test 3: Scapia Card
✅ PASSED

📊 Test Summary: 5 passed, 0 failed out of 5 tests
```

## 📋 Supported SMS Formats

### HDFC Card
```
Spent Rs.9559 On HDFC Bank Card 6542 At MERCHANT On 2025-11-21:19:31:50
→ Amount: 9559, Merchant: Merchant, Date: 2025-11-21
```

### HDFC UPI
```
Txn Rs.7216.00 On HDFC Bank Card 0962 At merchant@ybl by UPI
→ Amount: 7216.00, Merchant: Merchant (removes @ybl)
```

### Axis Bank
```
Spent INR 1824 Axis Bank Card no. XX9793 20-11-25 19:40:56 IST MERCHANT
→ Amount: 1824, Date: 2025-11-20
```

### AMEX
```
Alert: You've spent INR 6,698.00 on your AMEX card ** 51004 at MERCHANT on 20 November 2025
→ Amount: 6698.00, Date: 2025-11-20
```

### Scapia
```
Hi! Your txn of ₹1,745.35 at Starbucks on your Scapia Federal Visa credit card
→ Amount: 1745.35, Merchant: Starbucks
```

## 💰 Cost

**Total: $0/month** (using free tiers)

| Service | Free Tier | Usage |
|---------|-----------|-------|
| Cloudflare Workers | 100k requests/day | ~300/month |
| Google Sheets API | 100 req/100s | ~300/month |
| **Total Cost** | | **FREE** ✨ |

## 🔒 Security & Privacy

✅ **What happens to your SMS:**
1. SMS arrives on your iPhone
2. iOS Shortcut triggers ONLY for transaction keywords
3. SMS sent directly from YOUR phone to YOUR Cloudflare Worker
4. Worker parses and stores in YOUR Google Sheet
5. Data never touches third-party servers

✅ **Security features:**
- Secrets stored securely in Cloudflare (not in code)
- HTTPS-only communication
- Service account with minimal permissions
- You control all the infrastructure

## 📊 Optional: Create Dashboard

### Option 1: Google Sheets Charts
1. Select data range in your sheet
2. Insert → Chart
3. Create pie chart (spending by merchant) or line chart (spending over time)

### Option 2: Looker Studio (Advanced)
1. Go to [Looker Studio](https://lookerstudio.google.com/)
2. Create → Data Source → Google Sheets
3. Select your expense tracker sheet
4. Build custom dashboards with filters, charts, and metrics

## 🐛 Troubleshooting

### Worker returns 500 error
```bash
# Check logs
npx wrangler tail

# Then send test request and see error details
```

### Google Sheets permission error
- Ensure sheet is shared with service account email
- Give "Editor" permissions

### iOS Shortcut not triggering
- Check automation trigger keywords
- Verify "Run Immediately" is enabled
- Test manually first

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed troubleshooting.

## 🛠️ Customization

### Add New Bank Support

Edit `worker.js` and add a new parser method:

```javascript
parseNewBank() {
  const pattern = /your-regex-pattern-here/i;
  const match = this.smsText.match(pattern);

  if (match) {
    this.result.amount = this.parseAmount(match[1]);
    this.result.merchant = this.cleanMerchant(match[2]);
    // ... set other fields
    return true;
  }
  return false;
}
```

Then add it to the parsers array in the `parse()` method.

### Change Sheet Name

Default is "Sheet1". To use a different sheet name:

Edit `worker.js` line 326:
```javascript
const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/MySheetName!A:H:append?valueInputOption=RAW`;
```

### Add API Key Authentication

See [DEPLOYMENT.md](DEPLOYMENT.md) for instructions on adding API key protection.

## 📚 Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Complete deployment guide
- **[SETUP-GOOGLE-SHEETS.md](SETUP-GOOGLE-SHEETS.md)** - Google Cloud setup
- **[ExpenseTrackerShortcut.txt](ExpenseTrackerShortcut.txt)** - iOS Shortcut guide

## 🤝 Contributing

Found a bug or want to add support for a new bank?

1. Test your changes with `node test.js`
2. Add test cases for new SMS formats
3. Update documentation

## 📄 License

MIT License - feel free to use and modify!

## 🎉 Credits

Original Gmail scraper concept by the repository owner. Enhanced with:
- Real-time SMS processing
- Cloudflare Workers for serverless deployment
- iOS Shortcuts for native automation
- Comprehensive SMS parsing for Indian banks

---

**Happy expense tracking! 📊💰**

Questions? Issues? Check the docs or open an issue on GitHub.
