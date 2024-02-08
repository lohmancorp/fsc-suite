################################################################################
# score_map.py is a script that creates a new default scoremap with
# all iteration combinations of multiple values and their enums.
#
# Author: Taylor Giddens - taylor.giddens@ingrammicro.com
# Version: 1.0.4
################################################################################

import itertools
import csv

# Step 1: Define Variables and Enums
variables_and_enums = {
    'account_tier': ['A', 'B', 'C', 'D', 'E'],
    'severity': ['Urgent', 'High', 'Medium', 'Low'],
    'status': ['New', 'Open', 'Service request triage', 'Other', 'Pending'],
    'environment': ['Production', 'Lab'],
    'ticket_type': ['Incident or Problem', 'Service request'],
    'escalated': ['True', 'False'],
    'past_due': ['True', 'False']
}

# Step 2: Generate Combinations
# Extract variable names and their enums for combination generation
variable_names = list(variables_and_enums.keys())
enum_lists = list(variables_and_enums.values())
combinations = list(itertools.product(*enum_lists))

# Step 3: Write to CSV
csv_filename = 'score_map.csv'
with open(csv_filename, 'w', newline='') as csvfile:
    csv_writer = csv.writer(csvfile)
    # Write the header row
    csv_writer.writerow(variable_names)
    # Write each combination as a row in the CSV
    for combination in combinations:
        csv_writer.writerow(combination)

print(f"CSV file '{csv_filename}' has been created with all possible combinations of the defined enums.")
