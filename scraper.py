from __future__ import print_function
import base64
from bs4 import BeautifulSoup
import parser
import io
import email
import boto3
from datetime import datetime
from datetime import timedelta
import pandas as pd

import os.path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# If modifying these scopes, delete the file token.json.
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']


# Fetching the start of month to get all transactions since then
dt = datetime.today().replace(day=1, hour=0, minute=0, second=0, microsecond=0).date()
dt = str(dt)


def main():
    """Shows basic usage of the Gmail API.
    Lists the user's Gmail labels.
    """
    creds = None
    # The file token.json stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first
    # time.
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        # Save the credentials for the next run
        with open('token.json', 'w') as token:
            token.write(creds.to_json())

    msgIdList = []
    bodyList = []
    try:
        # Call the Gmail API
        service = build('gmail', 'v1', credentials=creds)
        results = service.users().messages().list(userId='<YOUR_EMAIL_ID>', labelIds = '<LABEL_ID_OF_PAYMENT_MODE>', q="after:"+dt+"").execute()
        #print(results)
        msgIdDict = results.get('messages', [])
        #print(msgIdDict)
        for item in msgIdDict:
            msg_id = item['id']
            msgIdList.append(msg_id)
            
        print(msgIdList)

        for msg in msgIdList:
            message = service.users().messages().get(
                userId='<YOUR_EMAIL_ID>', id=msg, format='raw').execute()
           
            messageBody = base64.urlsafe_b64decode(
                message['raw'].encode('ASCII'))
            msg_str = email.message_from_bytes(messageBody)


            #Body is found in the payload of the response
            if msg_str.is_multipart():
                for part in msg_str.get_payload():
                    messageBody = part.get_payload(decode=True)
                # more processing?
            else:
                messageBody = msg_str.get_payload(decode=True)

            # Parse HTML using BeautifulSoup
            messageBody = BeautifulSoup(messageBody, 'html.parser')
            messageBody = str(messageBody)

          
            # Extracting spend and merchant name from the email - since these are templatized and vary for different banks and modes, this part of the code will require contextual modification            
            x = messageBody.find('for INR')
            y = messageBody.find('The total')
            print(x,y)
            spendAll = messageBody[x+4:y-10]
            print(spendAll)
            x1 = spendAll.find('at')
            x2 = spendAll.find('on')
            amount = spendAll[0:x1-1]
            title = spendAll[x1+3:x2-1]
            date = spendAll[x2+3:x2+13].rstrip()

            # Creating a list with date, merchant title, amount and payment mode
            row = [date, title, amount, 'credit_card']
            bodyList.append(row)
        
        # Exporting as CSV
        df = pd.DataFrame(bodyList)
        print(df)
        df.to_csv(''+dt+'_credit_card.csv')


    except HttpError as error:
        # TODO(developer) - Handle errors from gmail API.
        print(f'An error occurred: {error}')


if __name__ == '__main__':
    main()

