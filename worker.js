/**
 * Expense Tracker Cloudflare Worker
 * Parses Indian bank SMS messages and appends to Google Sheets
 */

// ============ SMS PARSER ============

class SMSParser {
  constructor(smsText) {
    this.smsText = smsText;
    this.result = {
      amount: null,
      merchant: null,
      date: null,
      time: null,
      source: null,
      type: null,
      confidence: 'low',
      rawSMS: smsText
    };
  }

  parse() {
    // Try each parser in order of specificity
    const parsers = [
      this.parseHDFCCard.bind(this),
      this.parseHDFCUPI.bind(this),
      this.parseAxisCard.bind(this),
      this.parseAMEX.bind(this),
      this.parseScapia.bind(this),
      this.parseUPITransfer.bind(this),
      this.parseIMPS.bind(this),
      this.parseGenericDebit.bind(this)
    ];

    for (const parser of parsers) {
      if (parser()) {
        this.calculateConfidence();
        return this.result;
      }
    }

    // If no parser matched, return low confidence result
    this.result.confidence = 'low';
    return this.result;
  }

  // HDFC Card: "Spent Rs.9559 On HDFC Bank Card 6542 At MERCHANT On 2025-11-21:19:31:50..."
  parseHDFCCard() {
    const pattern = /(?:Spent|spent)\s+Rs\.?\s*(\d+(?:,\d+)*(?:\.\d{2})?)\s+(?:On|on)\s+HDFC Bank Card\s+(\d+)\s+(?:At|at)\s+(.+?)\s+(?:On|on)\s+(\d{4}-\d{2}-\d{2}):(\d{2}:\d{2}:\d{2})/i;
    const match = this.smsText.match(pattern);

    if (match) {
      this.result.amount = this.parseAmount(match[1]);
      this.result.source = `HDFC Card ${match[2]}`;
      this.result.merchant = this.cleanMerchant(match[3]);
      this.result.date = match[4];
      this.result.time = match[5];
      this.result.type = 'Card';
      this.result.confidence = 'high';
      return true;
    }
    return false;
  }

  // HDFC UPI: "Txn Rs.7216.00 On HDFC Bank Card 0962 At MERCHANT@ybl by UPI..."
  parseHDFCUPI() {
    const pattern = /(?:Txn|txn)\s+Rs\.?\s*(\d+(?:,\d+)*(?:\.\d{2})?)\s+(?:On|on)\s+HDFC Bank Card\s+(\d+)\s+(?:At|at)\s+(.+?)\s+by UPI/i;
    const match = this.smsText.match(pattern);

    if (match) {
      this.result.amount = this.parseAmount(match[1]);
      this.result.source = `HDFC Card ${match[2]}`;
      this.result.merchant = this.cleanMerchant(match[3]);
      this.result.type = 'UPI';
      this.result.confidence = 'high';
      return true;
    }
    return false;
  }

  // Axis Card: "Spent INR 1824 Axis Bank Card no. XX9793 20-11-25 19:40:56 IST MERCHANT..."
  parseAxisCard() {
    const pattern = /(?:Spent|spent)\s+INR\s+(\d+(?:,\d+)*(?:\.\d{2})?)\s+Axis Bank Card no\.\s+(\w+)\s+(\d{2}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\s+IST\s+(.+?)(?:\.|$|Avl)/i;
    const match = this.smsText.match(pattern);

    if (match) {
      this.result.amount = this.parseAmount(match[1]);
      this.result.source = `Axis Card ${match[2]}`;
      this.result.date = this.convertDateFormat(match[3]);
      this.result.time = match[4];
      this.result.merchant = this.cleanMerchant(match[5]);
      this.result.type = 'Card';
      this.result.confidence = 'high';
      return true;
    }
    return false;
  }

  // AMEX: "Alert: You've spent INR 6,698.00 on your AMEX card ** 51004 at MERCHANT on 20 November 2025 at 01:18 PM IST"
  parseAMEX() {
    const pattern = /(?:spent|Spent)\s+INR\s+(\d+(?:,\d+)*(?:\.\d{2})?)\s+on your AMEX card\s+\*{2}\s+(\d+)\s+at\s+(.+?)\s+on\s+(\d{1,2}\s+\w+\s+\d{4})\s+at\s+(\d{1,2}:\d{2}\s+[AP]M)/i;
    const match = this.smsText.match(pattern);

    if (match) {
      this.result.amount = this.parseAmount(match[1]);
      this.result.source = `AMEX Card ${match[2]}`;
      this.result.merchant = this.cleanMerchant(match[3]);
      this.result.date = this.convertAMEXDate(match[4]);
      this.result.time = match[5];
      this.result.type = 'Card';
      this.result.confidence = 'high';
      return true;
    }
    return false;
  }

  // Scapia: "Hi! Your txn of ₹1,745.35 at Starbucks on your Scapia Federal Visa credit card..."
  parseScapia() {
    const pattern = /(?:txn|Txn)\s+of\s+₹(\d+(?:,\d+)*(?:\.\d{2})?)\s+at\s+(.+?)\s+on your Scapia Federal/i;
    const match = this.smsText.match(pattern);

    if (match) {
      this.result.amount = this.parseAmount(match[1]);
      this.result.source = 'Scapia Federal Card';
      this.result.merchant = this.cleanMerchant(match[2]);
      this.result.type = 'Card';
      this.result.confidence = 'medium'; // No date in SMS
      return true;
    }
    return false;
  }

  // UPI Transfer: "INR 38000.00 debited A/c no. XX7977 UPI/P2A/123456/RECIPIENT NAME..."
  parseUPITransfer() {
    const pattern = /INR\s+(\d+(?:,\d+)*(?:\.\d{2})?)\s+debited\s+A\/c no\.\s+(\w+)\s+UPI\/P2A\/\d+\/(.+?)(?:\.|$)/i;
    const match = this.smsText.match(pattern);

    if (match && !this.isAvailableBalance(match[1])) {
      this.result.amount = this.parseAmount(match[1]);
      this.result.source = `Account ${match[2]}`;
      this.result.merchant = this.cleanMerchant(match[3]);
      this.result.type = 'UPI Transfer';
      this.result.confidence = 'high';
      return true;
    }
    return false;
  }

  // IMPS: "Debit INR 60000.00 Axis Bank A/c XX7977 IMPS/P2A/123456/RECIPIENT..."
  parseIMPS() {
    const pattern = /Debit\s+INR\s+(\d+(?:,\d+)*(?:\.\d{2})?)\s+(?:Axis Bank\s+)?A\/c\s+(\w+)\s+IMPS\/P2A\/\d+\/(.+?)(?:\.|$)/i;
    const match = this.smsText.match(pattern);

    if (match && !this.isAvailableBalance(match[1])) {
      this.result.amount = this.parseAmount(match[1]);
      this.result.source = `Account ${match[2]}`;
      this.result.merchant = this.cleanMerchant(match[3]);
      this.result.type = 'IMPS';
      this.result.confidence = 'high';
      return true;
    }
    return false;
  }

  // Generic debit parser (fallback)
  parseGenericDebit() {
    // Try to extract amount from common patterns
    const amountPatterns = [
      /(?:Rs\.?|INR|₹)\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
      /(\d+(?:,\d+)*(?:\.\d{2})?)\s*(?:Rs\.?|INR|₹)/i
    ];

    for (const pattern of amountPatterns) {
      const match = this.smsText.match(pattern);
      if (match && !this.isAvailableBalance(match[1])) {
        this.result.amount = this.parseAmount(match[1]);

        // Try to extract merchant
        const merchantMatch = this.smsText.match(/(?:at|At)\s+(.+?)(?:\s+on|\.|$)/);
        if (merchantMatch) {
          this.result.merchant = this.cleanMerchant(merchantMatch[1]);
        }

        this.result.type = 'Unknown';
        this.result.confidence = 'low';
        return true;
      }
    }

    return false;
  }

  // Helper: Parse amount and remove commas
  parseAmount(amountStr) {
    return parseFloat(amountStr.replace(/,/g, ''));
  }

  // Helper: Check if this is an "Avl Limit" or "Avl bal" amount (should be ignored)
  isAvailableBalance(amountStr) {
    const contextBefore = this.smsText.substring(
      Math.max(0, this.smsText.indexOf(amountStr) - 20),
      this.smsText.indexOf(amountStr)
    );
    return /Avl\s*(?:Limit|bal)/i.test(contextBefore);
  }

  // Helper: Clean merchant name
  cleanMerchant(merchant) {
    if (!merchant) return null;

    return merchant
      .replace(/@ybl/gi, '')           // Remove @ybl
      .replace(/@\w+/gi, '')           // Remove other UPI handles
      .replace(/_/g, ' ')              // Replace underscores with spaces
      .replace(/\.+$/, '')             // Remove trailing dots
      .replace(/\s+/g, ' ')            // Normalize spaces
      .trim()
      .split(' ')                      // Title case
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  // Helper: Convert DD-MM-YY to YYYY-MM-DD
  convertDateFormat(dateStr) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const day = parts[0];
      const month = parts[1];
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return `${year}-${month}-${day}`;
    }
    return dateStr;
  }

  // Helper: Convert "20 November 2025" to YYYY-MM-DD
  convertAMEXDate(dateStr) {
    const months = {
      'January': '01', 'February': '02', 'March': '03', 'April': '04',
      'May': '05', 'June': '06', 'July': '07', 'August': '08',
      'September': '09', 'October': '10', 'November': '11', 'December': '12'
    };

    const match = dateStr.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
    if (match) {
      const day = match[1].padStart(2, '0');
      const month = months[match[2]];
      const year = match[3];
      return `${year}-${month}-${day}`;
    }
    return null;
  }

  // Calculate confidence based on extracted fields
  calculateConfidence() {
    const fields = [
      this.result.amount,
      this.result.merchant,
      this.result.source,
      this.result.date
    ];

    const filledFields = fields.filter(f => f !== null && f !== undefined).length;

    if (filledFields >= 4) {
      this.result.confidence = 'high';
    } else if (filledFields >= 2) {
      this.result.confidence = 'medium';
    } else {
      this.result.confidence = 'low';
    }
  }
}

// ============ GOOGLE SHEETS INTEGRATION ============

class GoogleSheetsClient {
  constructor(env) {
    this.serviceAccountEmail = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    this.privateKey = env.GOOGLE_PRIVATE_KEY;
    this.spreadsheetId = env.GOOGLE_SPREADSHEET_ID;
  }

  async appendToSheet(parsedData) {
    // Get access token
    const accessToken = await this.getAccessToken();

    // Prepare row data: Date | Time | Amount | Merchant | Card/Account | Type | Confidence | Raw SMS
    const row = [
      parsedData.date || '',
      parsedData.time || '',
      parsedData.amount || '',
      parsedData.merchant || '',
      parsedData.source || '',
      parsedData.type || '',
      parsedData.confidence || '',
      parsedData.rawSMS || ''
    ];

    // Append to sheet
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/Sheet1!A:H:append?valueInputOption=RAW`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [row]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to append to sheet: ${error}`);
    }

    return await response.json();
  }

  async getAccessToken() {
    // Create JWT
    const jwt = await this.createJWT();

    // Exchange JWT for access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get access token: ${error}`);
    }

    const data = await response.json();
    return data.access_token;
  }

  async createJWT() {
    const now = Math.floor(Date.now() / 1000);

    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };

    const payload = {
      iss: this.serviceAccountEmail,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };

    // Base64url encode header and payload
    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));

    const signatureInput = `${encodedHeader}.${encodedPayload}`;

    // Sign with private key
    const signature = await this.signJWT(signatureInput);

    return `${signatureInput}.${signature}`;
  }

  async signJWT(data) {
    // Parse PEM private key
    const pemKey = this.privateKey.replace(/\\n/g, '\n');
    const pemContents = pemKey
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace(/\s/g, '');

    const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

    // Import key
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryKey,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256'
      },
      false,
      ['sign']
    );

    // Sign
    const encoder = new TextEncoder();
    const signatureBuffer = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      encoder.encode(data)
    );

    // Base64url encode signature
    return this.base64UrlEncode(String.fromCharCode(...new Uint8Array(signatureBuffer)));
  }

  base64UrlEncode(str) {
    const base64 = btoa(
      typeof str === 'string'
        ? str
        : String.fromCharCode(...new Uint8Array(str))
    );
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
}

// ============ CLOUDFLARE WORKER HANDLER ============

export default {
  async fetch(request, env, ctx) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only accept POST requests
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    try {
      // Parse request body
      const body = await request.json();
      const smsText = body.sms || body.text || body.message;

      if (!smsText) {
        return new Response(JSON.stringify({ error: 'No SMS text provided' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Parse SMS
      const parser = new SMSParser(smsText);
      const parsedData = parser.parse();

      // Append to Google Sheets
      const sheetsClient = new GoogleSheetsClient(env);
      await sheetsClient.appendToSheet(parsedData);

      // Return success response
      return new Response(JSON.stringify({
        success: true,
        parsed: parsedData
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error processing SMS:', error);
      return new Response(JSON.stringify({
        error: error.message,
        stack: error.stack
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
