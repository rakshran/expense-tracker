# Deployment Guide - Expense Tracker

Complete guide to deploy your expense tracking system to Cloudflare Workers.

## Prerequisites

Before you begin, ensure you have:
- [x] Node.js installed (v18 or later)
- [x] A Cloudflare account (free tier works!)
- [x] Google Sheets API set up (see `SETUP-GOOGLE-SHEETS.md`)
- [x] Service account credentials ready

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Login to Cloudflare
npx wrangler login

# 3. Set up secrets (interactive prompts will appear)
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL
npx wrangler secret put GOOGLE_PRIVATE_KEY
npx wrangler secret put GOOGLE_SPREADSHEET_ID

# 4. Deploy!
npm run deploy
```

Your worker will be deployed to: `https://expense-tracker.YOUR-SUBDOMAIN.workers.dev`

---

## Detailed Setup Instructions

### Step 1: Install Wrangler (Cloudflare CLI)

```bash
npm install
```

This installs Wrangler (Cloudflare's CLI tool) as defined in `package.json`.

### Step 2: Authenticate with Cloudflare

```bash
npx wrangler login
```

This will:
1. Open a browser window
2. Ask you to log in to your Cloudflare account
3. Grant Wrangler permission to deploy workers

### Step 3: Get Your Account ID (Optional but Recommended)

```bash
npx wrangler whoami
```

Copy your Account ID and add it to `wrangler.toml`:

```toml
account_id = "your-account-id-here"
```

### Step 4: Configure Secrets

Cloudflare Workers use "secrets" to store sensitive data securely. Set these three secrets:

#### 4.1 Google Service Account Email

```bash
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL
```

When prompted, paste your service account email:
```
expense-tracker-service@expense-tracker-12345.iam.gserviceaccount.com
```

#### 4.2 Google Private Key

```bash
npx wrangler secret put GOOGLE_PRIVATE_KEY
```

When prompted, paste the **ENTIRE** private key including the header and footer:

```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
(many lines)
...
-----END PRIVATE KEY-----
```

⚠️ **Important**: Make sure to include the newlines! The key should be multi-line.

**Tip**: If pasting doesn't work, you can use:
```bash
cat service-account-key.json | jq -r '.private_key' | wrangler secret put GOOGLE_PRIVATE_KEY
```

#### 4.3 Google Spreadsheet ID

```bash
npx wrangler secret put GOOGLE_SPREADSHEET_ID
```

Paste your spreadsheet ID (from the URL):
```
1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
```

### Step 5: Test Locally (Optional)

Before deploying, you can test locally:

```bash
npm run dev
```

This starts a local development server. Open a new terminal and test:

```bash
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{"sms": "Spent Rs.509.71 On HDFC Bank Card 0962 At ZOMATO On 2025-11-15:19:52:25"}'
```

⚠️ **Note**: Local development won't have access to secrets unless you create a `.dev.vars` file:

```bash
# .dev.vars (DO NOT COMMIT THIS FILE!)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-email@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_ID=your-spreadsheet-id
```

### Step 6: Deploy to Cloudflare

```bash
npm run deploy
```

Or:

```bash
npx wrangler deploy
```

You'll see output like:

```
 ⛅️ wrangler 3.x.x
-------------------
Total Upload: xx.xx KiB / gzip: xx.xx KiB
Uploaded expense-tracker (x.xx sec)
Published expense-tracker (x.xx sec)
  https://expense-tracker.YOUR-SUBDOMAIN.workers.dev
Current Deployment ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**🎉 Your worker is now live!**

Copy the URL - you'll need it for the iOS Shortcut.

---

## Testing Your Deployed Worker

### Test 1: HDFC Card SMS

```bash
curl -X POST https://expense-tracker.YOUR-SUBDOMAIN.workers.dev \
  -H "Content-Type: application/json" \
  -d '{
    "sms": "Spent Rs.509.71 On HDFC Bank Card 0962 At ZOMATO new On 2025-11-15:19:52:25"
  }'
```

Expected response:
```json
{
  "success": true,
  "parsed": {
    "amount": 509.71,
    "merchant": "Zomato New",
    "date": "2025-11-15",
    "time": "19:52:25",
    "source": "HDFC Card 0962",
    "type": "Card",
    "confidence": "high",
    "rawSMS": "Spent Rs.509.71 On HDFC Bank Card 0962 At ZOMATO new On 2025-11-15:19:52:25"
  }
}
```

### Test 2: AMEX Card SMS

```bash
curl -X POST https://expense-tracker.YOUR-SUBDOMAIN.workers.dev \
  -H "Content-Type: application/json" \
  -d '{
    "sms": "Alert: You'\''ve spent INR 299.00 on your AMEX card ** 91009 at PAYU RETAIL on 20 November 2025 at 01:18 PM IST."
  }'
```

### Test 3: Scapia Card SMS

```bash
curl -X POST https://expense-tracker.YOUR-SUBDOMAIN.workers.dev \
  -H "Content-Type: application/json" \
  -d '{
    "sms": "Hi! Your txn of ₹1,745.35 at Starbucks on your Scapia Federal Visa credit card was successful."
  }'
```

After each test, check your Google Sheet - you should see new rows!

---

## Monitoring and Logs

### View Real-time Logs

```bash
npx wrangler tail
```

This streams live logs from your worker. Send a test request and watch the logs appear!

### Check Deployment Status

```bash
npx wrangler deployments list
```

### View Worker Analytics

Go to your [Cloudflare Dashboard](https://dash.cloudflare.com/):
1. Select your account
2. Go to "Workers & Pages"
3. Click on "expense-tracker"
4. View analytics: requests, errors, CPU time, etc.

---

## Updating Your Worker

Made changes to `worker.js`? Just deploy again:

```bash
npm run deploy
```

Cloudflare will automatically update your worker with zero downtime.

---

## Custom Domain (Optional)

Want to use your own domain instead of `*.workers.dev`?

1. Go to Cloudflare Dashboard → Workers & Pages
2. Click on your worker
3. Go to "Triggers" tab
4. Click "Add Custom Domain"
5. Enter your domain (e.g., `api.yourdomain.com`)
6. Click "Add Custom Domain"

Update your iOS Shortcut with the new URL!

---

## Troubleshooting

### "Error: No account_id found"

Add your account ID to `wrangler.toml`:
```bash
npx wrangler whoami
# Copy the account ID
```

### "Error: Authentication failed"

Re-authenticate:
```bash
npx wrangler logout
npx wrangler login
```

### "Error: Invalid JWT Signature" (in worker logs)

Your private key might be malformed. Ensure:
- The entire key is copied including `-----BEGIN/END PRIVATE KEY-----`
- Newlines are preserved (use `\n` in the key)
- No extra spaces or characters

Re-set the secret:
```bash
npx wrangler secret put GOOGLE_PRIVATE_KEY
```

### "Error: The caller does not have permission"

Your sheet isn't shared with the service account:
1. Open your Google Sheet
2. Click "Share"
3. Add the service account email
4. Give it "Editor" permissions

### Worker returns 500 error

Check the logs:
```bash
npx wrangler tail
```

Then send a test request and see the error details.

---

## Cost Estimation

**Cloudflare Workers Free Tier:**
- ✅ 100,000 requests per day
- ✅ 10ms CPU time per request
- ✅ Plenty for personal expense tracking!

**Google Sheets API Free Tier:**
- ✅ 100 requests per 100 seconds per user
- ✅ More than enough for SMS tracking

**Total cost: $0/month** 💰

---

## Security Considerations

✅ **Implemented:**
- Secrets stored securely in Cloudflare (not in code)
- HTTPS-only communication
- CORS headers configured
- Service account with minimal permissions

⚠️ **Recommendations:**
- Don't share your Worker URL publicly
- Rotate service account keys every 90 days
- Monitor worker logs for suspicious activity
- Consider adding authentication (API key) if needed

### Adding API Key Authentication (Optional)

If you want to restrict access:

1. Add a secret for your API key:
```bash
npx wrangler secret put API_KEY
# Enter a strong random key
```

2. Update `worker.js` to check the key:
```javascript
// In the fetch handler, before parsing SMS
const apiKey = request.headers.get('X-API-Key');
if (apiKey !== env.API_KEY) {
  return new Response('Unauthorized', { status: 401 });
}
```

3. Update your iOS Shortcut to include the header:
- Add header: `X-API-Key: your-api-key-here`

---

## Next Steps

✅ Worker deployed and tested
✅ Google Sheets integration working

Now set up your iOS Shortcut! See: `ExpenseTrackerShortcut.txt`

---

## Support

If you encounter issues:

1. Check the logs: `npx wrangler tail`
2. Test with curl to isolate the problem
3. Verify secrets are set correctly
4. Check Google Sheet permissions
5. Review the Google Cloud Console for API errors

Happy expense tracking! 📊💰
