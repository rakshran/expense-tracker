# Google Sheets API Setup Guide

This guide walks you through setting up Google Sheets API access using a Service Account (no OAuth required).

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it: "Expense Tracker"
4. Click "Create"

## Step 2: Enable Google Sheets API

1. In the Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Google Sheets API"
3. Click on it and press "Enable"

## Step 3: Create a Service Account

1. Go to **APIs & Services** → **Credentials**
2. Click "**Create Credentials**" → "**Service Account**"
3. Fill in details:
   - **Name**: `expense-tracker-service`
   - **ID**: `expense-tracker-service` (auto-generated)
   - **Description**: "Service account for expense tracker worker"
4. Click "**Create and Continue**"
5. Skip optional steps (Grant access, User access) and click "**Done**"

## Step 4: Create and Download Service Account Key

1. In the Credentials page, find your service account under "Service Accounts"
2. Click on the service account email (e.g., `expense-tracker-service@your-project.iam.gserviceaccount.com`)
3. Go to the "**Keys**" tab
4. Click "**Add Key**" → "**Create new key**"
5. Choose "**JSON**" format
6. Click "**Create**" - a JSON file will download automatically

⚠️ **Keep this file secure!** It contains your private key.

## Step 5: Extract Credentials from JSON

Open the downloaded JSON file. You'll need these values:

```json
{
  "type": "service_account",
  "project_id": "expense-tracker-12345",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n",
  "client_email": "expense-tracker-service@expense-tracker-12345.iam.gserviceaccount.com",
  "client_id": "123456789",
  ...
}
```

You'll need:
- `client_email` → This is your **GOOGLE_SERVICE_ACCOUNT_EMAIL**
- `private_key` → This is your **GOOGLE_PRIVATE_KEY**

## Step 6: Create Your Google Sheet

1. Go to [Google Sheets](https://sheets.google.com/)
2. Create a new spreadsheet
3. Name it: "Expense Tracker"
4. **Add column headers in row 1:**
   ```
   | Date | Time | Amount | Merchant | Card/Account | Type | Confidence | Raw SMS |
   ```

5. **Share the sheet with your service account:**
   - Click "Share" button
   - Paste the service account email (from Step 5, `client_email`)
   - Give it "Editor" permissions
   - Uncheck "Notify people"
   - Click "Share"

6. **Get the Spreadsheet ID:**
   - Look at the URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
   - Copy the `SPREADSHEET_ID` (long string between `/d/` and `/edit`)
   - This is your **GOOGLE_SPREADSHEET_ID**

## Step 7: Prepare Credentials for Cloudflare Worker

You now have three secrets to configure:

1. **GOOGLE_SERVICE_ACCOUNT_EMAIL**
   - Example: `expense-tracker-service@expense-tracker-12345.iam.gserviceaccount.com`

2. **GOOGLE_PRIVATE_KEY**
   - Copy the ENTIRE private key including header/footer:
     ```
     -----BEGIN PRIVATE KEY-----
     MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
     ...multiple lines...
     -----END PRIVATE KEY-----
     ```
   - ⚠️ Keep the `\n` characters in the key - they're important!

3. **GOOGLE_SPREADSHEET_ID**
   - Example: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`

## Step 8: Set Secrets in Cloudflare (See DEPLOYMENT.md)

You'll use these commands:

```bash
wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL
wrangler secret put GOOGLE_PRIVATE_KEY
wrangler secret put GOOGLE_SPREADSHEET_ID
```

## Testing Your Setup

After deploying (see DEPLOYMENT.md), test with:

```bash
curl -X POST https://expense-tracker.YOUR-SUBDOMAIN.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"sms": "Spent Rs.509.71 On HDFC Bank Card 0962 At ZOMATO On 2025-11-15:19:52:25"}'
```

Check your Google Sheet - you should see a new row!

## Troubleshooting

### Error: "The caller does not have permission"
- Make sure you shared the sheet with the service account email
- Verify the service account has "Editor" permissions

### Error: "Invalid JWT Signature"
- Check that the private key is copied correctly with ALL newlines
- Make sure you're using the exact key from the JSON file

### Error: "Spreadsheet not found"
- Verify the Spreadsheet ID is correct
- Check that the sheet is shared with the service account

### No data appearing in sheet
- Check the sheet name is "Sheet1" (or update worker.js line 326)
- Verify the sheet has at least one row (the header row)

## Security Best Practices

✅ **DO:**
- Keep the JSON key file secure (don't commit to git)
- Use Cloudflare Worker secrets for credentials
- Regularly rotate service account keys (every 90 days)

❌ **DON'T:**
- Share the private key publicly
- Commit credentials to version control
- Use the same service account for multiple unrelated projects

## Optional: Set Up Google Sheets Dashboard

You can create charts and visualizations in Google Sheets:

1. Select your data range
2. Insert → Chart
3. Choose chart type (e.g., pie chart for spending by merchant)
4. Customize as needed

Or connect to **Looker Studio** (formerly Google Data Studio) for advanced dashboards:
1. Go to [Looker Studio](https://lookerstudio.google.com/)
2. Create → Data Source → Google Sheets
3. Select your expense tracker sheet
4. Build visualizations and reports
