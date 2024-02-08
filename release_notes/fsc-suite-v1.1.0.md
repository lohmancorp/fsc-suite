# Release Notes - V1.1.0
Date: February 8th, 2024

## New Features

1. **Scoring Map Script** - score_map.py is a script to generate a default list of rules in CSV format, based on a number of values and their enums. After, a manager can generate a new rule set from scratch.  The script can be found in the /lib directory.
2. **Scoring Map Config File** - SCORE_MAP no longer exists within the code and is now loaded from score_map.csv, located in static/assets/config/.
3. **Filter by TAM** - Now a TAM can see all of their customer tickets in a single view.
4. **First Response Due By** - Is now visible as a datapoint in the table.  If the first response is past due, the text will appear in red.  If the text is black, this is the time remaining.  If the value is "--", then the first response has been provided.  Note, this is not a filterable item.
5. **Dashboard** - It is now visible to understand the need number of team members to complete the current backlog within 5 days, but using averages for AHT.  Tickets in "pending" status are not included in the HC needed calculation.
6. **Dashboard** - It is now possible to see percentage of tickets escalated and overdue is now visible to allow users to find hotspots.

## Improvements

1. **Scoring Rules** - Raised from 76 rules to 1600.  Now account for customer tier, prority, status, environment, escalated, overdue, with every varation accounted for.
2. **Scoring Rules** - Additional sorting applied to account for issue where customers Service Requests were never gotten to according to prioritization and load from incidents.  
3. **Scoring Rules** - New status is now accounted for and weighted higher or to the top to ensure that Initial Response Time (IRT) SLA is secured.
4. **Scoring Rules** - Tickets with status "Pending" are now sorted lower to ensure tickets with New, Open, & Service Request Triage.  Tickets with statuses for pending/waiting are all scored equally.
5. **Account Tier** - Account Tier is now pulled from the company custom field and it is no longer pulled from ticket custom field to make ticket payloads smaller and to have Account Tier changes take place immediately.
6. **UI Improvement** - To understand time better visually, days/hours is now reflected in the table view, and dates are reflected as a popover of the datapoint in the row.
7. **UI Improvement** - Created Dates greater than 20 days appear as red.  Last Update Dates greater than 5 days appear as read.  All Due By dates in the past appear as red.
8. **UI Improvements** - Various CSS & text updates were applied to save space and promote readability. 
9. **Logging Improvement** - Script version is now captured in the log header.
