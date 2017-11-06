# Google Sheets app for CouplesCards Root app

## Setup Instructions:
1. Follow the normal instructions to set up a Google App Script app linked
to a Google Sheet. Publish it as an anonymous web app (no authentication).

2.  Set up the following Script Property under Project Properties: TOKEN_HASH: This is the SHA256 hash of the token configured in couplescards to perform actions on the Google App Script. This is needed since the GA script is published as an anonymous script.
   
3. Create a sheet named "Template" with the following column headers: ID, Timestamp,	Merchant,	Card,	Amount,	Category

4. Create a sheet named "Overview" and add a named ranged called "MonthlyBudget" that points to a cell where you must enter your monthly budget amount in Rands.

This is the minimal "get up and running" requirements. Obviously you need to customise your sheets app to suit your needs, I might package it properly at a later stage once the PoC has had some time to evolve. 