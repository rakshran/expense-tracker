# expense-tracker

> A small Python script that scrapes expense emails via the Gmail API to track monthly spending across payment modes (credit cards and UPI).

[![Python 3.8+](https://img.shields.io/badge/python-3.8%2B-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Problem Statement

I wanted to track my expenditure across my two credit cards and UPI account. There are two types of apps you can use for this:

1. Apps that ask you to enter expenses manually (each time you incur them)
2. Apps that invade your privacy by reading through your emails/SMSes to automatically track them for you

I tried a great manual-entry app called *Expenses - Spending Tracker*. It was super intuitive to use, and had a great iOS widget and CSV export feature.

But manual entry was tedious and I sometimes forgot to add expenses. At the same time, I didn't want a third party reading through my emails and SMSes — so I wrote this basic Python script to solve the problem myself.

## How It Works

1. Created automated Gmail labels for my two credit cards and UPI expense emails — every new email is tagged with the corresponding label on arrival.
2. Fetched the label IDs for those labels.
3. Set up the Gmail API on the Google Cloud Console and downloaded the OAuth credentials.
4. Used the Gmail API to fetch all expense-related emails for the current month (`scraper.py`).
5. Parsed each email body with BeautifulSoup to extract the date, merchant name and amount.
6. Built a pandas DataFrame and exported it as a CSV file.

Now I can track my monthly expenditure across payment modes in a spreadsheet.

## Prerequisites

- Python 3.8+
- A Google Cloud project with the **Gmail API** enabled and an OAuth 2.0 **Desktop app** client. See Google's [Gmail API Python quickstart](https://developers.google.com/gmail/api/quickstart/python) for setup. Download the client secret as `credentials.json`.
- One or more Gmail labels that tag your expense emails (filters can apply these automatically on arrival).

## Setup

```bash
# 1. Clone the repository
git clone https://github.com/rakshran/expense-tracker.git
cd expense-tracker

# 2. Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate    # On Windows: .venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Add your OAuth credentials
# Place the credentials.json downloaded from Google Cloud in the project root.

# 5. Configure environment variables
cp .env.example .env
# Edit .env and set GMAIL_LABEL_ID (and any other values you want to change).
```

### Finding a Gmail label ID

The label ID is not the label's display name. You can find it via the Gmail API's [`users.labels.list`](https://developers.google.com/gmail/api/reference/rest/v1/users.labels/list) endpoint (try it in the API Explorer) — it looks like `Label_1234567890`.

## Usage

```bash
python scraper.py
```

On the first run a browser window opens for you to authorize access; a `token.json` is then cached so subsequent runs don't prompt again. The script fetches labelled emails from the start of the current month and writes the results to:

```
output/<YYYY-MM-01>_credit_card.csv
```

## Configuration

All configuration is read from the `.env` file (see `.env.example`):

| Variable           | Default            | Description                                                          |
| ------------------ | ------------------ | ------------------------------------------------------------------- |
| `GMAIL_USER_ID`    | `me`               | Gmail user ID — `me` for the authenticated account, or your email.  |
| `GMAIL_LABEL_ID`   | _(required)_       | ID of the Gmail label that tags your expense emails.                |
| `OUTPUT_DIR`       | `output`           | Directory where exported CSV files are written.                     |
| `CREDENTIALS_FILE` | `credentials.json` | Path to your Google OAuth client credentials file.                  |
| `TOKEN_FILE`       | `token.json`       | Path where the OAuth token is cached after the first run.           |

## Notes

The email-parsing logic in `parse_message()` slices the message body against a specific bank/email template (`for INR ... at ... on ...`). Email formats vary across banks and payment providers, so you will likely need to adjust this extraction logic to match your own expense emails.

`credentials.json`, `token.json`, `.env` and the `output/` directory are git-ignored so your secrets and personal data are never committed.

## License

This project is licensed under the [MIT License](LICENSE).
