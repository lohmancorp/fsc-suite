################################################################################
# app.py is a script retrieves information from freshservice in order to displat
# a list of sorted and prioritized tickets for agents.
#
# - Ticket Sorting
#
# Author: Taylor Giddens - taylor.giddens@ingrammicro.com
# Version: 1.1.0-c
################################################################################

# Import necessary libraries
import argparse
import os
import logging
import requests
import base64
import time
import signal
import sys
import string
from datetime import datetime
from pathlib import Path
from flask import Flask, jsonify, render_template, request
from lib.tickets import get_all_tickets, make_status_priority_readable, sort_tickets

# Flask app initialization
app = Flask(__name__)

# Script Variables:
SCRIPT_NAME = 'app.py'
SCRIPT_VERSION = '1.1.0-c'  # Update with each release.

# Global variables for tracking
original_time_wait = None
interrupted = False
global_companies = None
global_agents = None
global_groups = None
global_tickets = None


# Argument Parsing
def parse_arguments():
    parser = argparse.ArgumentParser(description='Script to read and sort FreshService tickets.\n')
    parser.add_argument('-m', '--mode', default='production', choices=['staging', 'production', 'test'], help='API mode: staging, production, or test.')
    parser.add_argument('-t', '--time-wait', type=int, default=200, help='Time in milliseconds to wait between API calls.')
    parser.add_argument('-l', '--log-level', choices=['INFO', 'WARNING', 'DEBUG'], default='INFO', help='Logging level')
    return parser.parse_args()

# Environment variables
## Old method being replaced.
#API_KEY = input("Enter your API key: ")
## New method
print(f"Enter your API Key: ")
API_KEY = sys.stdin.readline().rstrip('\n')

FRESH_SERVICE_ENDPOINTS = {
    'staging': 'cbportal-fs-sandbox',
    'production': 'cbportal',
}
LOG_DIRECTORY = './logs/'

# Logging Configuration with Iteration
def setup_logging(args):
    today = datetime.now().strftime("%Y-%m-%d")
    input_filename = SCRIPT_NAME

    # Convert the relative log directory path to an absolute path
    log_directory = Path(LOG_DIRECTORY).resolve()

    # Check if the log directory exists, create it if it does not
    if not log_directory.exists():
        log_directory.mkdir(parents=True, exist_ok=True)

    iteration = 1
    while True:
        log_filename = f"{today}-{input_filename}_{iteration}.log"
        full_log_path = log_directory / log_filename
        if not full_log_path.exists():
            break
        iteration += 1

    # Set the baseline logging level to INFO
    logging.basicConfig(filename=str(full_log_path), filemode='w',  # 'w' to write from the beginning
                        level=logging.INFO,
                        format='%(asctime)s - %(levelname)s - %(message)s')

    # Start logging with script details
    logging.info('#' * 50)
    logging.info(f"Script Name: {SCRIPT_NAME}")
    logging.info(f"Script Version: {SCRIPT_VERSION}")
    logging.info(f"Script Start Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Log the input parameters
    for arg in vars(args):
        logging.info(f"{arg}: {getattr(args, arg)}")

    logging.info('#' * 50)

    # Adjust logging level based on user's choice
    if args.log_level.upper() == 'DEBUG':
        logging.getLogger().setLevel(logging.DEBUG)
    elif args.log_level.upper() == 'WARNING':
        logging.getLogger().setLevel(logging.WARNING)
    else:
        logging.getLogger().setLevel(logging.INFO)

def signal_handler(sig, frame):
    print('Exiting gracefully...')
    sys.exit(0)

# Generate the authorization header for API requests
def generate_auth_header(api_key):
    if sanitize_user_input(api_key):
        encoded_credentials = base64.b64encode(f"{api_key}:X".encode('utf-8')).decode('utf-8')
        return {
            "Content-Type": "application/json",
            "Authorization": f"Basic {encoded_credentials}"
        }
    else:
        logging.error("Special Characters or whitespaces are not allowed in api key. "
                      "Authentication header generation will fail.")
        sys.exit(0)

# Function to check the rate limit and adjust wait time if needed
def check_and_adjust_rate_limit(response, args):
    remaining_calls = int(response.headers.get('X-Ratelimit-Remaining', 0))
    if remaining_calls <= 40:
        args.time_wait = max(args.time_wait, 1000)  # Slowing down API calls
        logging.warning(f"Slowing down API requests due to low remaining calls. Current remaining {remaining_calls}")
    else:
        args.time_wait = original_time_wait  # Resetting to original time wait
        logging.info(f"Returning API timewait to original value. Current remaining {remaining_calls}")

# Function to handle API requests with retries for timeouts and handle specific error codes
def make_api_request(method, url, headers, data=None, retries=2):
    try:
        response = requests.request(method, url, headers=headers, json=data)
        if response.status_code == 403:  # Handling 403 Forbidden Error
            logging.error(f"403 Forbidden error encountered. URL: {url} Method: {method}")
            print("It looks like FreshWorks doesn't like what you were doing and the user was locked.")
            print("Please check in FreshService that the user who your API KEY corresponds to is not locked.")
            print("https://support.cloudblue.com/agents")
            exit(1)
        elif response.status_code == 401:  # Handling 401 Unauthorized Error
            logging.error(f"401 Unauthorized error encountered. URL: {url} Method: {method}")
            print("It looks like the API KEY you provided has a problem.")
            print("Follow these instructions to make sure you are getting the correct API KEY:")
            print("https://support.freshservice.com/en/support/solutions/articles/50000000306-where-do-i-find-my-api-key-")
            print("Once you have the correct API KEY, open the .env file located in the root folder of the script to update the value.")
            exit(1)
        elif response.status_code == 429:  # Handling 429 Too Many Requests Error
            logging.error(f"429 Too Many Requests error encountered. URL: {url} Method: {method}")
            print("It looks like you exceeded the API rate limit.")
            print("Go get a coffee, check your user isn't locked, and try again.")
            exit(1)
        response.raise_for_status()
        return response
    except requests.exceptions.Timeout:
        if retries > 0:
            time.sleep(2)
            return make_api_request(method, url, headers, data, retries - 1)
        else:
            raise
    except requests.exceptions.RequestException as e:
        logging.error(f"API request failed: {e}")
        raise

# Functions to retrieve companies, agents, and groups
def get_company_names(base_url, headers):
    companies = {}
    page = 1
    while True:
        url = f"https://{base_url}.freshservice.com/api/v2/departments?per_page=100&page={page}"
        response = make_api_request("GET", url, headers)
        data = response.json()

        # Check if there are departments in the response
        if 'departments' in data and data['departments']:
            for company in data['departments']:
                # Access tam_name from custom_fields, with a fallback if it's not present
                account_tier = company['custom_fields'].get('account_tier', 'Unknown Tier')
                tam_name = company['custom_fields'].get('tam_name', 'Unknown TAM')
                companies[company['id']] = {'name': company['name'], 'tam_name': tam_name, 'account_tier': account_tier}
            page += 1
        else:
            break
    return companies

def get_agents(base_url, headers):
    agents = {}
    page = 1
    while True:
        url = f"https://{base_url}.freshservice.com/api/v2/agents?per_page=100&page={page}"
        response = make_api_request("GET", url, headers)
        data = response.json()

        if 'agents' in data and data['agents']:
            for agent in data['agents']:
                agent_info = {
                    'name': f"{agent['first_name']} {agent['last_name']}".strip(),
                    'email': agent['email']
                }
                agents[agent['id']] = agent_info
            page += 1
        else:
            break
    return agents

def get_groups(base_url, headers):
    groups = {}
    page = 1
    while True:
        url = f"https://{base_url}.freshservice.com/api/v2/groups?per_page=100&page={page}"
        response = make_api_request("GET", url, headers)
        data = response.json()

        # Check if there are groups in the response
        if 'groups' in data and data['groups']:
            for group in data['groups']:
                groups[group['id']] = group['name']
            page += 1
        else:
            break
    return groups

# section for utility methods
def sanitize_user_input(input_string):
    """
    Checks if the input string contains any special characters, spaces, or hyphens
    """
    # Define a set of special characters, spaces, and hyphens
    special_characters = set(string.punctuation + ' -')

    # Check if any special characters are present in the input string
    if any(char in special_characters for char in input_string):
        return False
    return True

# Get all initial data so pages load quickly
def load_initial_data():
    global global_companies, global_agents, global_groups, global_tickets
    auth_header = generate_auth_header(API_KEY)
    print(f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - Retrieving Companies.")
    logging.info(f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - Retrieving Companies.")

    global_companies = get_company_names(FRESH_SERVICE_ENDPOINTS['production'], auth_header)
    print(f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - Retrieving Agents.")
    logging.info(f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - Retrieving Agents.")
    
    global_agents = get_agents(FRESH_SERVICE_ENDPOINTS['production'], auth_header)
    print(f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - Retrieving Groups.")
    logging.info(f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - Retrieving Groups.")
    
    global_groups = get_groups(FRESH_SERVICE_ENDPOINTS['production'], auth_header)
    fetched_tickets = get_all_tickets(FRESH_SERVICE_ENDPOINTS['production'], auth_header, global_agents, global_companies, global_groups)
    readable_tickets = make_status_priority_readable(fetched_tickets)
    global_tickets = sort_tickets(readable_tickets)


# Endpoints for API content
# Get refreshed ticket information or share backed cached information.
@app.route('/companies', methods=['GET'])
def companies():
    global global_companies
    if not global_companies:
        auth_header = generate_auth_header(API_KEY)
        global_companies = get_company_names(FRESH_SERVICE_ENDPOINTS['production'], auth_header)

    # Sort global_companies by company name
    sorted_companies = sorted(global_companies.items(), key=lambda x: x[1]['name'])

    # Convert the sorted list of tuples back into a dictionary
    sorted_companies_dict = {company_id: company_info for company_id, company_info in sorted_companies}

    return jsonify(sorted_companies_dict)


@app.route('/groups', methods=['GET'])
def groups():
    global global_groups
    if not global_groups:
        auth_header = generate_auth_header(API_KEY)
        global_groups = get_groups(FRESH_SERVICE_ENDPOINTS['production'], auth_header)

    # Sort global_groups by group name
    sorted_groups = sorted(global_groups.items(), key=lambda x: x[1])

    # Convert the sorted list of tuples back into a dictionary
    sorted_groups_dict = {group_id: group_name for group_id, group_name in sorted_groups}

    return jsonify(sorted_groups_dict)



@app.route('/agents', methods=['GET'])
def agents():
    global global_agents
    if not global_agents:
        auth_header = generate_auth_header(API_KEY)
        global_agents = get_agents(FRESH_SERVICE_ENDPOINTS['production'], auth_header)
    
    # Sort global_agents by agent name
    sorted_agents = sorted(global_agents.items(), key=lambda x: x[1]['name'])
    
    # Convert the sorted list of tuples back into a dictionary
    sorted_agents_dict = {agent_id: agent_info for agent_id, agent_info in sorted_agents}
    
    return jsonify(sorted_agents_dict)


@app.route('/tickets', methods=['GET'])
def get_tickets():
    global global_tickets
    refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    if refresh or global_tickets is None:
        # Fetch and transform only if refreshing or if cache is empty
        auth_header = generate_auth_header(API_KEY)
        fetched_tickets = get_all_tickets(FRESH_SERVICE_ENDPOINTS['production'], auth_header, global_agents, global_companies, global_groups)
        readable_tickets = make_status_priority_readable(fetched_tickets)
        global_tickets = sort_tickets(readable_tickets)
        
    return jsonify(global_tickets)

@app.route('/tickets/count', methods=['GET'])
def get_dynamic_filtered_ticket_count():
    # Retrieve all query parameters as a dictionary
    filter_criteria = request.args.to_dict()

    # Initialize the count
    count = 0

    # Check if global_tickets is not None and has data
    if global_tickets:
        # Iterate over each ticket in global_tickets
        for ticket in global_tickets:
            # Flag to track if ticket matches all filter criteria
            matches_all_criteria = True

            # Check each filter criterion in filter_criteria
            for key, value in filter_criteria.items():
                # If any criterion doesn't match, set the flag to False and break
                if str(ticket.get(key, '')).lower() != value.lower():
                    matches_all_criteria = False
                    break
            
            # If the ticket matches all criteria, increment the count
            if matches_all_criteria:
                count += 1

    # Return the count as JSON
    return jsonify({'count': count})

@app.route('/tickets/count/percent', methods=['GET'])
def get_tickets_count_percent():
    # Retrieve all query parameters as a dictionary
    all_criteria = request.args.to_dict()

    # Handling 'percentageOf' separately
    percentage_of = all_criteria.pop('percentageOf', None)

    # The remaining criteria are for the subset count
    subset_criteria = all_criteria

    # Initialize counts
    subset_count = 0
    total_set_count = 0

    # Check if global_tickets is not None and has data
    if global_tickets:
        # Count for subset
        for ticket in global_tickets:
            if all(str(ticket.get(key, '')).lower() == value.lower() for key, value in subset_criteria.items()):
                subset_count += 1

        # Determine total set count based on percentageOf value
        if percentage_of == 'all':
            total_set_count = len(global_tickets)
        else:
            # Parse the percentageOf criteria into a dictionary
            total_set_criteria = {}
            for criterion in percentage_of.split('&'):
                key, value = criterion.split('=')
                total_set_criteria[key] = value

            # Count for total set based on parsed criteria
            for ticket in global_tickets:
                if all(str(ticket.get(key, '')).lower() == value.lower() for key, value in total_set_criteria.items()):
                    total_set_count += 1

    # Calculate percentage
    percent = (subset_count / total_set_count * 100) if total_set_count > 0 else 0
    rounded_percent = round(percent)

    # Return the calculated percentage
    return jsonify({'percent': f'{rounded_percent}%'})

# Endpoints for html content.
@app.route('/')
def index():
    # Render the main template that might include the navigation, footer, and common elements
    return render_template('main.html')


@app.route('/ticketlist')
def tickets_view():
    # This route is for displaying the tickets in a web page format
    global global_tickets
    return render_template('tickets.html')



@app.route('/documentation')
def documentation():
    # Render the documentation-specific template
    return render_template('documentation.html')

if __name__ == "__main__":
    args = parse_arguments()
    setup_logging(args)
    # Register the signal handler
    signal.signal(signal.SIGINT, signal_handler)
    debug_mode = False if args.log_level.upper() == 'DEBUG' else False
    load_initial_data()
    app.run(debug=False, use_reloader=False, host='127.0.0.1', port=5000)
