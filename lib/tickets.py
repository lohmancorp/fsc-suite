################################################################################
# tickets.py is a script that supports app.py.
#
# - Ticket Sorting
#
# Author: Taylor Giddens - taylor.giddens@ingrammicro.com
# Version: 1.1.0-b
################################################################################
import requests
import logging
import os
import pandas as pd
from datetime import datetime

def check_past_due(ticket):
    # Check if 'due_by' field exists
    if 'due_by' in ticket:
        due_date_str = ticket['due_by']

        # Convert due date string to datetime object
        try:
            due_date = datetime.strptime(due_date_str, "%Y-%m-%dT%H:%M:%SZ")

            # Compare due date with current date
            if due_date < datetime.now(due_date.tzinfo):
                return True  # Ticket is past due
            else:
                return False  # Ticket is not past due
        except ValueError:
            # Handle incorrect date format
            print(f"Incorrect date format for ticket ID {ticket['id']}. Due date: {due_date_str}")
            return False
    else:
        # If 'due_by' field is missing
        print(f"Ticket ID {ticket['id']} does not have a 'due_by' field.")
        return False

# Function to convert numerical status and priority to readable strings
def make_status_priority_readable(tickets):
    # Mappings for status and priority
    status_mapping = {
        2: "Open",
        3: "Pending",
        4: "Resolved",
        5: "Closed",
        6: "New",
        7: "Pending access",
        8: "Waiting for RnD",
        9: "Pending other ticket",
        10: "Waiting for maintenance",
        11: "Waiting for bugfix",
        12: "Service request triage",
        13: "Rejected",
        14: "Duplicate"
    }

    priority_mapping = {
        1: "Low",
        2: "Medium",
        3: "High",
        4: "Urgent"
    }

    # Iterate through each ticket and update status and priority
    for ticket in tickets:
        ticket['status'] = status_mapping.get(ticket['status'], "Unknown Status")
        ticket['priority'] = priority_mapping.get(ticket['priority'], "Unknown Priority")

    return tickets   

# Function that performs the scoring against the SCORING_MAP
#Scoring map used to sort tickets in a finute order. 

def load_scoring_map_from_csv(csv_file_path):
    """
    Securely load the scoring configuration from a CSV file and return a dictionary
    for score lookup based on ticket attributes.
    """
    # Base directory where the CSV files are stored - adjust as per your application's directory structure
    base_dir = 'static/assets/config/'

    # Sanitize the csv_file_path to prevent path traversal
    safe_file_name = os.path.basename(csv_file_path)

    # Construct the full, safe path
    full_path = os.path.join(base_dir, safe_file_name)

    # Check if the file exists to avoid FileNotFoundError
    if not os.path.isfile(full_path):
        raise FileNotFoundError(f"CSV file not found: {safe_file_name}")

    # Load the CSV file
    df = pd.read_csv(full_path)
    
    # Validate and sanitize data
    expected_columns = {'account_tier', 'priority', 'status', 'environment', 'ticket_type', 'escalated', 'past_due', 'Score'}
    if not set(df.columns).issubset(expected_columns):
        raise ValueError("Unexpected columns in the CSV file.")

    # Convert the DataFrame into a scoring map dictionary
    scoring_map = {}
    for _, row in df.iterrows():
        key = (
            str(row['account_tier']).strip(), 
            str(row['priority']).strip(), 
            str(row['status']).strip(), 
            str(row['environment']).strip(), 
            str(row['ticket_type']).strip(), 
            str(row['escalated']).strip(), 
            str(row['past_due']).strip()
        )
        scoring_map[key] = int(row['Score'])
    
    return scoring_map

# Example usage
csv_file_path = 'score_map.csv'  # Only the file name
try:
    SCORING_MAP = load_scoring_map_from_csv(csv_file_path)
except (FileNotFoundError, ValueError) as e:
    print(f"Error loading scoring map: {e}")
    # Handle the error appropriately


# def calculate_sort_key(ticket):
#     # Check if 'custom_fields' exists in the ticket, assign default if not
#     #custom_fields = ticket.get('custom_fields', {})

#     # Extract values from ticket or use defaults
#     account_tier = ticket.get('account_tier', 'C')  # Default to 'C' if not present
#     environment = ticket.get('environment', 'Production')  # Default to 'Production' if not present
#     priority = ticket.get('priority', 'Urgent')  # Default to 'Urgent' if not present
#     ticket_type = ticket.get('ticket_type', 'Incident or Problem')  # Default to 'Incident or Problem' if not present
#     escalated = ticket.get('escalated', False)  # Default to False if not present

#     # Handle 'MISSING' account_tier
#     if account_tier == 'MISSING':
#         # Define how to handle 'MISSING' account_tier, if different from 'C'
#         # For example, you might want to log this or assign a different default
#         logging.warning(f"Ticket ID: {ticket['id']} has 'MISSING' account tier. Handling as per logic.")

#     # Determine score key based on whether the ticket is escalated
#     if escalated:
#         score_key = (account_tier, 'escalated', environment)
#     else:
#         score_key = (account_tier, priority, environment, ticket_type)

#     # Get the score from the map
#     score = SCORING_MAP.get(score_key, 0)

#     # Log for debugging
#     logging.debug(f"Calculated score key for Ticket ID {ticket['id']}: {score_key}, Score: {score}")

#     return (-score, ticket['created_at'])

def calculate_sort_key(ticket):
    # Extract values from ticket or use defaults
    account_tier = ticket.get('account_tier', 'C')
    priority = ticket.get('priority', 'Urgent')
    status = ticket.get('status', 'New')  # Assuming 'status' is directly available
    environment = ticket.get('environment', 'Production')
    ticket_type = ticket.get('ticket_type', 'Incident or Problem')
    escalated = ticket.get('escalated', False)
    past_due = ticket.get('past_due', False)
    
    # Convert some statuses to OTHER
    status = "Other" if ticket.get('status', 'New') in ["Pending access", "Waiting for RnD", "Pending other ticket", "Waiting for maintenance", "Waiting for bugfix"] else ticket.get('status', 'New')

    # Convert Boolean to expected string representation for lookup
    escalated_str = 'True' if escalated else 'False'
    past_due_str = 'True' if past_due else 'False'

    # Construct the key for lookup in the SCORING_MAP
    score_key = (account_tier, priority, status, environment, ticket_type, escalated_str, past_due_str)

    # Look up the score based on the constructed key; default to 0 if not found
    score = SCORING_MAP.get(score_key, 0)

    return (-score, ticket['created_at'])


#Function to perform final sorting based on the final scoring (Sort Key).
def sort_tickets(tickets):
    # Calculate the sort key for each ticket and store the score
    for ticket in tickets:
        sort_key = calculate_sort_key(ticket)
        ticket['score'] = -sort_key[0]  # Store the actual score
        ticket['sort_key'] = sort_key   # Store the sort key

    # Sort the tickets based on the calculated sort key
    tickets.sort(key=lambda x: x['sort_key'])

    # Debug logging if needed
    if logging.getLogger().getEffectiveLevel() == logging.DEBUG:
        for ticket in tickets:
            logging.debug(f"Ticket ID: {ticket['id']}, Score: {ticket['score']}, Created At: {ticket['created_at']}, Company Name: {ticket['company_name']}, TAM Name: {ticket['tam_name']}, Tier: {ticket['account_tier']}, Priority: {ticket['priority']}, Is Escalated: {ticket['escalated']}, Environment: {ticket['environment']}, Type: {ticket['ticket_type']}")
            
    return tickets

def make_api_request(method, url, headers, data=None, retries=2):
    try:
        response = requests.request(method, url, headers=headers, json=data)
        if response.status_code in [401, 403, 429]:
            logging.error(f"Error {response.status_code} encountered. URL: {url} Method: {method}")
            response.raise_for_status()
        else:
            logging.info(f"API request successful. URL: {url} Method: {method} Status Code: {response.status_code}")
        return response
    except requests.exceptions.Timeout:
        if retries > 0:
            logging.warning("Timeout encountered. Retrying...")
            return make_api_request(method, url, headers, data, retries - 1)
        else:
            logging.error("Maximum retries reached for timeout.")
            raise
    except requests.exceptions.RequestException as e:
        logging.error(f"API request failed: {e}")
        raise    

def get_all_tickets(base_url, headers, agents, companies, groups):
    tickets = []
    page = 1
    logging.info(f"Starting to retrieve tickets from {base_url}")
    
    while True:
        url = f"https://{base_url}.freshservice.com/api/v2/tickets/filter?query=\"status: 2 OR status: 3 OR status: 6 OR status: 7 OR status: 8 OR status: 9 OR status: 10 OR status: 11 OR status: 12\"&per_page=100&page={page}"
        logging.info(f"Requesting page {page} of tickets.")
        print(f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - Requesting page {page} of tickets.")
        response = make_api_request("GET", url, headers)
        data = response.json()
        
        if 'tickets' in data and data['tickets']:
            for ticket in data['tickets']:
                # Gathering agent information
                agent_info = agents.get(ticket['responder_id'], {'name': 'Unassigned', 'email': 'N/A'})
                
                # Check if account_tier is None (null in JSON) and set it to 'MISSING' if it is
                #account_tier = ticket['custom_fields'].get('account_tier')
                #if account_tier is None:
                #    account_tier = 'C'
                    
                # Check if environment is None (null in JSON) and set it to 'MISSING' if it is
                environment = ticket['custom_fields'].get('environment')
                if environment is None:
                    environment = 'Production'
                    
                # Check if ticket_type is None (null in JSON) and set it to 'MISSING' if it is 
                ticket_type = ticket['custom_fields'].get('ticket_type')
                if ticket_type is None:
                    ticket_type = 'Service request'    
                    
                # Check if the ticket is past due
                is_past_due = check_past_due(ticket)
                if is_past_due is None:    
                    is_past_due = False 
                    
                # Retrieve company information, including tam_name
                company_id = ticket['department_id']
                company_info = companies.get(company_id, {'name': 'Unknown Company', 'tam_name': 'Unknown TAM', 'account_tier': 'Unknown Tier'})
                company_name = company_info['name']
                tam_name = company_info['tam_name']  # Extract tam_name for the company    
                account_tier = company_info['account_tier'] # Extract account_tier for the company

                # Filtering and transforming ticket data
                filtered_ticket = {
                    'id': ticket['id'],
                    'subject': ticket['subject'],
                    'group_name': groups.get(ticket['group_id'], 'Unassigned'),
                    'company_name': company_name,
                    'tam_name': tam_name, 
                    'priority': ticket['priority'],
                    'status': ticket['status'],
                    'created_at': ticket['created_at'],
                    'updated_at': ticket['updated_at'],
                    'fr_due_by': ticket['fr_due_by'],
                    'due_by': ticket['due_by'],
                    'is_past_due': is_past_due,
                    'agent_name': agent_info['name'],
                    'agent_email': agent_info['email'],
                    'account_tier': account_tier,
                    'environment': environment,
                    'escalated': ticket['custom_fields'].get('escalated', None),
                    'ticket_type': ticket_type
                }

                tickets.append(filtered_ticket)

            logging.info(f"Page {page} of tickets retrieved. Count: {len(data['tickets'])}")
            print(f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - Page {page} of tickets retrieved. Count: {len(data['tickets'])}")

            # Check if the number of tickets is 99 or less and exit the loop if so
            if len(data['tickets']) <= 99:
                logging.info("Less than 100 tickets retrieved. No more tickets to retrieve.")
                print(f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - No more tickets to retrieve.")
                break

            page += 1
        else:
            if page == 1:
                logging.warning("No tickets found.")
                print("No tickets found.")
            else:
                logging.info("No more tickets to retrieve.")
                print("No more tickets to retrieve.")
            break

    logging.info('#' * 50)
    logging.info(f"Total tickets retrieved: {len(tickets)}")
    logging.info('#' * 50)
    print(f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - Total tickets retrieved: {len(tickets)}")
    return tickets
