################################################################################
# app.py is a script retrieves information from freshservice in order to displat
# a list of sorted and prioritized tickets for agents.
#
# - Ticket Sorting
#
# Author: Taylor Giddens - taylor.giddens@ingrammicro.com
# Version: 1.0.1
################################################################################

# Import necessary libraries
import argparse
import os
import logging
import requests
import base64
#import json
import time
import signal
import sys
from datetime import datetime
from dotenv import load_dotenv
from pathlib import Path
from flask import Flask, jsonify, render_template 
from lib.tickets import get_all_tickets, make_status_priority_readable, sort_tickets

# Flask app initialization
app = Flask(__name__)

# Script Variables:
SCRIPT_NAME = 'app.py'
SCRIPT_VERSION = '1.0.1'  # Update with each release.

# Global variables for tracking
original_time_wait = None
interrupted = False

# Argument Parsing 
def parse_arguments():
    parser = argparse.ArgumentParser(description='Script to read and sort FreshService tickets.\n')
    parser.add_argument('-m', '--mode', default='production', choices=['staging', 'production', 'test'], help='API mode: staging, production, or test.')
    parser.add_argument('-t', '--time-wait', type=int, default=200, help='Time in milliseconds to wait between API calls.')
    parser.add_argument('-l', '--log-level', choices=['INFO', 'WARNING', 'DEBUG'], default='INFO', help='Logging level')
    return parser.parse_args()

# Environment variables
API_KEY = input("Enter your API key: ")
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
    encoded_credentials = base64.b64encode(f"{api_key}:X".encode('utf-8')).decode('utf-8')
    return {
        "Content-Type": "application/json",
        "Authorization": f"Basic {encoded_credentials}"
    }

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
                companies[company['id']] = company['name']
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

# Define the API endpoint

@app.route('/')
def index():
    return render_template('tickets.html')

@app.route('/tickets', methods=['GET'])
def get_tickets():
    args = parse_arguments()

    companies = get_company_names(FRESH_SERVICE_ENDPOINTS[args.mode], generate_auth_header(API_KEY))
    agents = get_agents(FRESH_SERVICE_ENDPOINTS[args.mode], generate_auth_header(API_KEY))
    groups = get_groups(FRESH_SERVICE_ENDPOINTS[args.mode], generate_auth_header(API_KEY))

    tickets = get_all_tickets(FRESH_SERVICE_ENDPOINTS[args.mode], generate_auth_header(API_KEY), agents, companies, groups)
    readable_tickets = make_status_priority_readable(tickets)
    sorted_tickets = sort_tickets(readable_tickets)

    return jsonify(sorted_tickets)

if __name__ == "__main__":
    args = parse_arguments()
    setup_logging(args)
    # Register the signal handler
    signal.signal(signal.SIGINT, signal_handler)
    debug_mode = False if args.log_level.upper() == 'DEBUG' else False
    app.run(debug=False, use_reloader=False, host='127.0.0.1', port=5000)