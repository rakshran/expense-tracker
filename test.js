/**
 * Test file for SMS Parser
 * Run with: node test.js
 */

// Import the SMS Parser class (we'll copy it here for testing)
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

    this.result.confidence = 'low';
    return this.result;
  }

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

  parseScapia() {
    const pattern = /(?:txn|Txn)\s+of\s+₹(\d+(?:,\d+)*(?:\.\d{2})?)\s+at\s+(.+?)\s+on your Scapia Federal/i;
    const match = this.smsText.match(pattern);

    if (match) {
      this.result.amount = this.parseAmount(match[1]);
      this.result.source = 'Scapia Federal Card';
      this.result.merchant = this.cleanMerchant(match[2]);
      this.result.type = 'Card';
      this.result.confidence = 'medium';
      return true;
    }
    return false;
  }

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

  parseGenericDebit() {
    const amountPatterns = [
      /(?:Rs\.?|INR|₹)\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
      /(\d+(?:,\d+)*(?:\.\d{2})?)\s*(?:Rs\.?|INR|₹)/i
    ];

    for (const pattern of amountPatterns) {
      const match = this.smsText.match(pattern);
      if (match && !this.isAvailableBalance(match[1])) {
        this.result.amount = this.parseAmount(match[1]);

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

  parseAmount(amountStr) {
    return parseFloat(amountStr.replace(/,/g, ''));
  }

  isAvailableBalance(amountStr) {
    const contextBefore = this.smsText.substring(
      Math.max(0, this.smsText.indexOf(amountStr) - 20),
      this.smsText.indexOf(amountStr)
    );
    return /Avl\s*(?:Limit|bal)/i.test(contextBefore);
  }

  cleanMerchant(merchant) {
    if (!merchant) return null;

    return merchant
      .replace(/@ybl/gi, '')
      .replace(/@\w+/gi, '')
      .replace(/_/g, ' ')
      .replace(/\.+$/, '')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

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

// ============ TEST CASES ============

const testCases = [
  {
    name: "HDFC Card",
    sms: "Spent Rs.509.71 On HDFC Bank Card 0962 At ZOMATO new On 2025-11-15:19:52:25.Not You?",
    expected: {
      amount: 509.71,
      merchant: "Zomato New",
      date: "2025-11-15",
      source: "HDFC Card 0962"
    }
  },
  {
    name: "AMEX Card",
    sms: "Alert: You've spent INR 299.00 on your AMEX card ** 91009 at PAYU RETAIL on 20 November 2025 at 01:18 PM IST.",
    expected: {
      amount: 299.00,
      merchant: "Payu Retail",
      date: "2025-11-20",
      source: "AMEX Card 91009"
    }
  },
  {
    name: "Scapia Card",
    sms: "Hi! Your txn of ₹1,745.35 at Starbucks on your Scapia Federal Visa credit card was successful.",
    expected: {
      amount: 1745.35,
      merchant: "Starbucks",
      source: "Scapia Federal Card"
    }
  },
  {
    name: "HDFC UPI with @ybl",
    sms: "Txn Rs.7216.00 On HDFC Bank Card 0962 At merchant@ybl by UPI on 15-11-25",
    expected: {
      amount: 7216.00,
      merchant: "Merchant",
      source: "HDFC Card 0962"
    }
  },
  {
    name: "Axis Card",
    sms: "Spent INR 1824 Axis Bank Card no. XX9793 20-11-25 19:40:56 IST MERCHANT_NAME. Avl Limit 50000",
    expected: {
      amount: 1824,
      merchant: "Merchant Name",
      date: "2025-11-20",
      source: "Axis Card XX9793"
    }
  }
];

// Run tests
console.log("🧪 Running SMS Parser Tests\n");
console.log("=".repeat(80));

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  console.log(`\nTest ${index + 1}: ${test.name}`);
  console.log("-".repeat(80));
  console.log(`SMS: ${test.sms.substring(0, 80)}...`);

  const parser = new SMSParser(test.sms);
  const result = parser.parse();

  console.log("\nParsed Result:");
  console.log(`  Amount:     ${result.amount}`);
  console.log(`  Merchant:   ${result.merchant}`);
  console.log(`  Date:       ${result.date}`);
  console.log(`  Time:       ${result.time}`);
  console.log(`  Source:     ${result.source}`);
  console.log(`  Type:       ${result.type}`);
  console.log(`  Confidence: ${result.confidence}`);

  console.log("\nExpected:");
  console.log(`  Amount:   ${test.expected.amount}`);
  console.log(`  Merchant: ${test.expected.merchant}`);
  console.log(`  Date:     ${test.expected.date || 'N/A'}`);
  console.log(`  Source:   ${test.expected.source}`);

  // Validate
  const amountMatch = result.amount === test.expected.amount;
  const merchantMatch = result.merchant?.toLowerCase().includes(test.expected.merchant.toLowerCase().split(' ')[0]);
  const sourceMatch = result.source === test.expected.source;
  const dateMatch = !test.expected.date || result.date === test.expected.date;

  if (amountMatch && merchantMatch && sourceMatch && dateMatch) {
    console.log("\n✅ PASSED");
    passed++;
  } else {
    console.log("\n❌ FAILED");
    if (!amountMatch) console.log("  - Amount mismatch");
    if (!merchantMatch) console.log("  - Merchant mismatch");
    if (!sourceMatch) console.log("  - Source mismatch");
    if (!dateMatch) console.log("  - Date mismatch");
    failed++;
  }

  console.log("=".repeat(80));
});

console.log(`\n📊 Test Summary: ${passed} passed, ${failed} failed out of ${testCases.length} tests\n`);
