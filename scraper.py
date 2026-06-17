"""Scrape expense emails via the Gmail API and export them to a CSV.

The script authenticates with the Gmail API, fetches messages tagged with a
given label since the start of the current month, parses each email body to
extract the transaction date, merchant and amount, and writes the results to a
CSV file. Configuration is read from environment variables (see .env.example).
"""

import base64
import email
import os
import sys
from datetime import datetime

import pandas as pd
from bs4 import BeautifulSoup
from dotenv import load_dotenv

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# If modifying these scopes, delete the saved token file.
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

load_dotenv()

# Configuration (see .env.example)
GMAIL_USER_ID = os.getenv('GMAIL_USER_ID', 'me')
GMAIL_LABEL_ID = os.getenv('GMAIL_LABEL_ID')
OUTPUT_DIR = os.getenv('OUTPUT_DIR', 'output')
CREDENTIALS_FILE = os.getenv('CREDENTIALS_FILE', 'credentials.json')
TOKEN_FILE = os.getenv('TOKEN_FILE', 'token.json')

# Start of the current month; used to fetch all transactions since then.
START_OF_MONTH = str(
    datetime.today().replace(day=1, hour=0, minute=0, second=0, microsecond=0).date()
)


def get_credentials():
    """Return valid Gmail API credentials, running the OAuth flow if needed.

    The token file stores the user's access and refresh tokens and is created
    automatically when the authorization flow completes for the first time.
    """
    creds = None
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)

    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)
        # Save the credentials for the next run.
        with open(TOKEN_FILE, 'w') as token:
            token.write(creds.to_json())

    return creds


def fetch_message_ids(service, label_id, after_date):
    """Return the IDs of messages with ``label_id`` received after ``after_date``."""
    results = service.users().messages().list(
        userId=GMAIL_USER_ID,
        labelIds=label_id,
        q='after:' + after_date,
    ).execute()
    messages = results.get('messages', [])
    return [item['id'] for item in messages]


def parse_message(service, msg_id):
    """Fetch a single message and extract ``[date, title, amount, mode]``.

    The body extraction below relies on string slicing against a specific email
    template ("for INR ... at ... on ..."). It is bank/template-specific, so if
    you use a different bank or payment provider this logic will need adjusting.
    Returns ``None`` if the body cannot be parsed.
    """
    message = service.users().messages().get(
        userId=GMAIL_USER_ID, id=msg_id, format='raw'
    ).execute()

    raw_bytes = base64.urlsafe_b64decode(message['raw'].encode('ASCII'))
    msg_str = email.message_from_bytes(raw_bytes)

    # The body is found in the payload of the response.
    if msg_str.is_multipart():
        body = None
        for part in msg_str.get_payload():
            body = part.get_payload(decode=True)
    else:
        body = msg_str.get_payload(decode=True)

    if body is None:
        return None

    # Parse HTML to plain text using BeautifulSoup.
    text = str(BeautifulSoup(body, 'html.parser'))

    # Extract spend and merchant name from the templatized email body.
    start = text.find('for INR')
    end = text.find('The total')
    if start == -1 or end == -1:
        return None

    spend = text[start + 4:end - 10]
    at_idx = spend.find('at')
    on_idx = spend.find('on')
    if at_idx == -1 or on_idx == -1:
        return None

    amount = spend[0:at_idx - 1]
    title = spend[at_idx + 3:on_idx - 1]
    date = spend[on_idx + 3:on_idx + 13].rstrip()

    return [date, title, amount, 'credit_card']


def export_csv(rows, output_path):
    """Write the extracted ``rows`` to ``output_path`` as a CSV file."""
    df = pd.DataFrame(rows, columns=['date', 'merchant', 'amount', 'mode'])
    df.to_csv(output_path, index=False)
    return df


def main():
    """Fetch labelled expense emails for the current month and export to CSV."""
    if not GMAIL_LABEL_ID:
        sys.exit(
            'Error: GMAIL_LABEL_ID is not set. Copy .env.example to .env and '
            'fill in your Gmail label ID.'
        )

    creds = get_credentials()

    try:
        service = build('gmail', 'v1', credentials=creds)
        message_ids = fetch_message_ids(service, GMAIL_LABEL_ID, START_OF_MONTH)

        rows = []
        for msg_id in message_ids:
            row = parse_message(service, msg_id)
            if row is not None:
                rows.append(row)
            else:
                print(f'Skipping message {msg_id}: could not parse body.')

        os.makedirs(OUTPUT_DIR, exist_ok=True)
        output_path = os.path.join(OUTPUT_DIR, f'{START_OF_MONTH}_credit_card.csv')
        export_csv(rows, output_path)
        print(f'Exported {len(rows)} transaction(s) to {output_path}')

    except HttpError as error:
        sys.exit(f'An error occurred while calling the Gmail API: {error}')


if __name__ == '__main__':
    main()
