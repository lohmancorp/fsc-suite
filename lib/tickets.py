import requests
import logging
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

#Scoring map used to sort tickets in a finute order. 
SCORING_MAP = {
    ('A', 'Urgent', 'Production', 'Incident or Problem'): 76,
    ('A', 'Urgent', 'Lab', 'Incident or Problem'): 75,
    ('B', 'Urgent', 'Production', 'Incident or Problem'): 74,
    ('B', 'Urgent', 'Lab', 'Incident or Problem'): 73,
    ('C', 'Urgent', 'Production', 'Incident or Problem'): 72,
    ('C', 'Urgent', 'Lab', 'Incident or Problem'): 71,
    ('D', 'Urgent', 'Production', 'Incident or Problem'): 70,
    ('D', 'Urgent', 'Lab', 'Incident or Problem'): 69,
    ('E', 'Urgent', 'Production', 'Incident or Problem'): 68,
    ('E', 'Urgent', 'Lab', 'Incident or Problem'): 67,
    ('A', 'escalated', 'Production'): 66,
    ('A', 'escalated', 'Lab'): 65,
    ('B', 'escalated', 'Production'): 64,
    ('B', 'escalated', 'Lab'): 63,
    ('C', 'escalated', 'Production'): 62,
    ('C', 'escalated', 'Lab'): 61,
    ('A', 'High', 'Production', 'Incident or Problem'): 60,
    ('A', 'High', 'Lab', 'Incident or Problem'): 59,
    ('B', 'High', 'Production', 'Incident or Problem'): 58,
    ('B', 'High', 'Lab', 'Incident or Problem'): 57,
    ('C', 'High', 'Production', 'Incident or Problem'): 56,
    ('C', 'High', 'Lab', 'Incident or Problem'): 55,
    ('A', 'High', 'Production', 'Service request'): 54,
    ('A', 'High', 'Lab', 'Service request'): 53,
    ('B', 'High', 'Production', 'Service request'): 52,
    ('B', 'High', 'Lab', 'Service request'): 51,
    ('C', 'High', 'Production', 'Service request'): 50,
    ('C', 'High', 'Lab', 'Service request'): 49,
    ('D', 'High', 'Production', 'Incident or Problem'): 48,
    ('D', 'High', 'Lab', 'Incident or Problem'): 47,
    ('E', 'High', 'Production', 'Incident or Problem'): 46,
    ('E', 'High', 'Lab', 'Incident or Problem'): 45,
    ('A', 'Medium', 'Production', 'Incident or Problem'): 44,
    ('A', 'Medium', 'Lab', 'Incident or Problem'): 43,
    ('B', 'Medium', 'Production', 'Incident or Problem'): 42,
    ('B', 'Medium', 'Lab', 'Incident or Problem'): 41,
    ('D', 'escalated', 'Production'): 40,
    ('D', 'escalated', 'Lab'): 39,
    ('C', 'Medium', 'Production', 'Incident or Problem'): 38,
    ('C', 'Medium', 'Lab', 'Incident or Problem'): 37,
    ('A', 'Medium', 'Production', 'Service request'): 36,
    ('A', 'Medium', 'Lab', 'Service request'): 35,
    ('B', 'Medium', 'Production', 'Service request'): 34,
    ('B', 'Medium', 'Lab', 'Service request'): 33,
    ('C', 'Medium', 'Production', 'Service request'): 32,
    ('C', 'Medium', 'Lab', 'Service request'): 31,
    ('E', 'escalated', 'Production'): 30,
    ('E', 'escalated', 'Lab'): 29,
    ('D', 'Medium', 'Production', 'Incident or Problem'): 28,
    ('D', 'Medium', 'Lab', 'Incident or Problem'): 27,
    ('D', 'Medium', 'Production', 'Service request'): 26,
    ('D', 'Medium', 'Lab', 'Service request'): 25,
    ('E', 'Medium', 'Production', 'Incident or Problem'): 24,
    ('E', 'Medium', 'Lab', 'Incident or Problem'): 23,
    ('E', 'Medium', 'Production', 'Service request'): 22,
    ('E', 'Medium', 'Lab', 'Service request'): 21,
    ('A', 'Low', 'Production', 'Incident or Problem'): 20,
    ('A', 'Low', 'Lab', 'Incident or Problem'): 19,
    ('B', 'Low', 'Production', 'Incident or Problem'): 18,
    ('B', 'Low', 'Lab', 'Incident or Problem'): 17,
    ('C', 'Low', 'Production', 'Incident or Problem'): 16,
    ('C', 'Low', 'Lab', 'Incident or Problem'): 15,
    ('A', 'Low', 'Production', 'Service request'): 14,
    ('A', 'Low', 'Lab', 'Service request'): 13,
    ('B', 'Low', 'Production', 'Service request'): 12,
    ('B', 'Low', 'Lab', 'Service request'): 11,
    ('C', 'Low', 'Production', 'Service request'): 10,
    ('C', 'Low', 'Lab', 'Service request'): 9,
    ('D', 'Low', 'Production', 'Incident or Problem'): 8,
    ('D', 'Low', 'Lab', 'Incident or Problem'): 7,
    ('D', 'Low', 'Production', 'Service request'): 6,
    ('D', 'Low', 'Lab', 'Service request'): 5,
    ('E', 'Low', 'Production', 'Incident or Problem'): 4,
    ('E', 'Low', 'Lab', 'Incident or Problem'): 3,
    ('E', 'Low', 'Production', 'Service request'): 2,
    ('E', 'Low', 'Lab', 'Service request'): 1
}

# Function that performs the scoring against the SCORING_MAP
def calculate_sort_key(ticket):
    # Check if 'custom_fields' exists in the ticket, assign default if not
    #custom_fields = ticket.get('custom_fields', {})

    # Extract values from ticket or use defaults
    account_tier = ticket.get('account_tier', 'C')  # Default to 'C' if not present
    environment = ticket.get('environment', 'Production')  # Default to 'Production' if not present
    priority = ticket.get('priority', 'Urgent')  # Default to 'Urgent' if not present
    ticket_type = ticket.get('ticket_type', 'Incident or Problem')  # Default to 'Incident or Problem' if not present
    escalated = ticket.get('escalated', False)  # Default to False if not present

    # Handle 'MISSING' account_tier
    if account_tier == 'MISSING':
        # Define how to handle 'MISSING' account_tier, if different from 'C'
        # For example, you might want to log this or assign a different default
        logging.warning(f"Ticket ID: {ticket['id']} has 'MISSING' account tier. Handling as per logic.")

    # Determine score key based on whether the ticket is escalated
    if escalated:
        score_key = (account_tier, 'escalated', environment)
    else:
        score_key = (account_tier, priority, environment, ticket_type)

    # Get the score from the map
    score = SCORING_MAP.get(score_key, 0)

    # Log for debugging
    logging.debug(f"Calculated score key for Ticket ID {ticket['id']}: {score_key}, Score: {score}")

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
            logging.debug(f"Ticket ID: {ticket['id']}, Score: {ticket['score']}, Created At: {ticket['created_at']}, Tier: {ticket['account_tier']}, Priority: {ticket['priority']}, Is Escalated: {ticket['escalated']}, Environment: {ticket['environment']}, Type: {ticket['ticket_type']}")

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
        url = f"{base_url}tickets/filter?query=\"status: 2 OR status: 3 OR status: 6 OR status: 7 OR status: 8 OR status: 9 OR status: 10 OR status: 11 OR status: 12\"&per_page=100&page={page}"
        logging.info(f"Requesting page {page} of tickets.")
        print(f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - Requesting page {page} of tickets.")
        response = make_api_request("GET", url, headers)
        data = response.json()
        
        if 'tickets' in data and data['tickets']:
            for ticket in data['tickets']:
                # Gathering agent information
                agent_info = agents.get(ticket['responder_id'], {'name': '* Unassigned *', 'email': 'N/A'})
                
                # Check if account_tier is None (null in JSON) and set it to 'MISSING' if it is
                account_tier = ticket['custom_fields'].get('account_tier')
                if account_tier is None:
                    account_tier = 'C'
                    
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

                # Filtering and transforming ticket data
                filtered_ticket = {
                    'id': ticket['id'],
                    'subject': ticket['subject'],
                    'group_name': groups.get(ticket['group_id'], '* Unassigned *'),
                    'company_name': companies.get(ticket['department_id'], 'Unknown Company'),
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
