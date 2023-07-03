# expense-tracker
scraping emails using Gmail API to track monthly expenses across payment modes (credit cards and UPI)

# Problem Statement

I wanted to track my expenditure across my two credit cards and UPI account. There are two types of apps you can use for the same:

1. Apps that ask you to enter expenses manually (each time you incur them)
2. Apps that invade your privacy by reading through your emails/SMSes to automatically track them for you

I tried a great manual entry app called 'Expenses - Spending Tracker'. It was super intuitive to use, and had a great iOS widget and CSV export feature.

But this was a tedious process and I forgot to add them sometimes. At the same time, I didn't want other people to read through my emails and SMSes so I wrote this basic Python script to solve the problem.

# Solution

Here are the steps I followed:

1. Created 3 different automated labels for my two credit cards and UPI expense emails - every new email is tagged with the corresponding label on arrival
2. Fetched the label ids for the three labels
3. Set up the Gmail API on the Google Developer Console - fetched credentials and access tokens
4. Used the Gmail API to fetch all expense-related emails using the Python script (scraper.py)
5. Parsed through the emails using BeautifulSoup, and deconstructed the mail body to extract the date, merchant name and amount
6. Created a DataFrame and exported it as a CSV file

Now I am able to track my monthly expenditure across modes in excel files.
