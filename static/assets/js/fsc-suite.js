let globalTickets = [];
let companies = new Set();
let groups = new Set();
let agents = new Set();
let type = new Set();
let status = new Set();
let priority = new Set();
let tier = new Set();
let environment = new Set();
let escalated = new Set(['Yes', 'No']); // Prepopulate with Yes and No
let overdue = new Set(['Yes', 'No']); // Prepopulate with Yes and No
let focusedStatuses = new Set(['Open', 'New', 'Service request triage']); // Prepopulate with focused statuses

// Function to get a random MP3 file
const getRandomLoadingAudio = () => {
    const audios = ['/static/assets/music/loading_1.mp3', '/static/assets/music/loading_2.mp3', '/static/assets/music/loading_3.mp3', '/static/assets/music/loading_4.mp3'];
    const randomIndex = Math.floor(Math.random() * audios.length);
    return new Audio(audios[randomIndex]);
};

// Initialize loading audio with a random MP3
const loadingAudio = getRandomLoadingAudio();

// Show loading overlay
const showLoadingOverlay = () => {
    document.getElementById('loadingOverlay').style.display = 'flex';
    loadingAudio.play();
};

// Hide loading overlay
const hideLoadingOverlay = () => {
    document.getElementById('loadingOverlay').style.display = 'none';
    loadingAudio.pause();
    loadingAudio.currentTime = 0;
};

// Function to format date and time
const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return "";
    const dateTime = new Date(dateTimeStr);
    const date = dateTime.toISOString().split('T')[0];
    const time = dateTime.toTimeString().split(' ')[0].substring(0, 5);
    return `${date} - ${time}`;
};

// Function to format escalated and past due fields
const formatBadge = (value) => {
    return value ? '<span class="badge bg-danger-subtle border border-danger-subtle text-danger-emphasis rounded-pill">Yes</span>' : 'No';
};

// Function to toggle column visibility
const toggleColumnVisibility = (column, isVisible) => {
    document.querySelectorAll(`#ticketsTable td:nth-child(${column}), #ticketsTable th:nth-child(${column})`).forEach(cell => {
        cell.style.display = isVisible ? '' : 'none';
    });
};

// Function to save settings to a cookie
const saveSettingsToCookie = () => {
    const settings = {
        columnVisibility: {},
        filterCategory: document.getElementById('filterCategory').value,
        filterValue: document.getElementById('filterValue').value,
        focusFilter: document.getElementById('focusFilter').value // Adding focus filter to settings
    };
    document.querySelectorAll('.column-toggle').forEach(checkbox => {
        settings.columnVisibility[checkbox.dataset.column] = checkbox.checked;
    });
    document.cookie = `fsc-settings=${JSON.stringify(settings)};path=/`;
};

// Function to get settings from a cookie
const getSettingsFromCookie = () => {
    const cookieValue = document.cookie.split('; ').find(row => row.startsWith('fsc-settings='));
    return cookieValue ? JSON.parse(cookieValue.split('=')[1]) : {};
};

// Function to apply settings and then apply the filters
const applySettings = () => {
    const settings = getSettingsFromCookie();
    // Apply column visibility
    Object.keys(settings.columnVisibility || {}).forEach(column => {
        const isVisible = settings.columnVisibility[column];
        toggleColumnVisibility(column, isVisible);
        const checkbox = document.querySelector(`.column-toggle[data-column="${column}"]`);
        if (checkbox) {
            checkbox.checked = isVisible;
        }
    });

    // Apply filters for category and value
    if (settings.filterCategory) {
        document.getElementById('filterCategory').value = settings.filterCategory;
        updateFilterValueDropdown(() => {
            if (settings.filterValue) {
                document.getElementById('filterValue').value = settings.filterValue;
            }
        });
    }

    // Apply focus filter
    if (settings.focusFilter) {
        document.getElementById('focusFilter').value = settings.focusFilter;
    }

    // Ensure filterRows is called after all dropdowns have been set
    filterRows();
};

// Function to update dashboard counts
const updateDashboardCounts = () => {
    const rows = document.querySelectorAll('#ticketsTable tbody tr:not([style*="display: none"])');

    const totalTickets = rows.length;
    const totalIncidents = Array.from(rows).filter(row => row.cells[6].textContent.trim() === 'Incident or Problem').length;
    const totalServiceRequests = Array.from(rows).filter(row => row.cells[6].textContent.trim() === 'Service request').length;
    const totalEscalated = Array.from(rows).filter(row => row.cells[8].textContent.trim().includes('Yes')).length;
    const totalOverdue = Array.from(rows).filter(row => row.cells[9].textContent.trim().includes('Yes')).length;

    document.getElementById('totalTickets').textContent = totalTickets;
    document.getElementById('totalIncidents').textContent = totalIncidents;
    document.getElementById('totalServiceRequests').textContent = totalServiceRequests;
    document.getElementById('totalEscalated').textContent = totalEscalated;
    document.getElementById('totalOverdue').textContent = totalOverdue;
};

const delayedUpdateDashboardCounts = () => {
    setTimeout(() => {
        updateDashboardCounts();
    }, 100); // Delay by 100 milliseconds
};

// Function to filter rows based on dropdown selection
const filterRows = () => {
    const filterCategory = document.getElementById('filterCategory').value;
    const filterValue = document.getElementById('filterValue').value;
    const focusFilter = document.getElementById('focusFilter').value; // New focus filter
    const rows = document.querySelectorAll('#ticketsTable tbody tr');

    rows.forEach(row => {
        let isMatch = true;
        switch (filterCategory) {
            case 'company':
                isMatch = row.cells[1].textContent.trim() === filterValue;
                break;
            case 'group':
                isMatch = row.cells[14].textContent.trim() === filterValue;
                break;
            case 'agent':
                isMatch = row.cells[13].textContent.trim() === filterValue;
                break;
            case 'tier':
                isMatch = row.cells[2].textContent.trim() === filterValue;
                break;
            case 'priority':
                isMatch = row.cells[4].textContent.trim() === filterValue;
                break;
            case 'status':
                isMatch = row.cells[5].textContent.trim() === filterValue;
                break;
            case 'type':
                isMatch = row.cells[6].textContent.trim() === filterValue;
                break;
            case 'environment':
                isMatch = row.cells[7].textContent.trim() === filterValue;
                break;
            case 'escalated':
            case 'overdue':
                let cellText = row.cells[filterCategory === 'escalated' ? 8 : 9].querySelector('.badge')?.textContent.trim() || 'No';
                isMatch = cellText === filterValue;
                break;
            default:
                isMatch = true;
        }

        // Apply focus filter if set to 'focused'
        if (focusFilter === 'focused') {
            const status = row.cells[5].textContent.trim(); // Assuming status is in the 6th column
            isMatch = isMatch && focusedStatuses.has(status);
        }

        row.style.display = isMatch ? '' : 'none';
    });
    delayedUpdateDashboardCounts();
};

// Function to reset filters
const resetFilters = () => {
        // Reset all dropdowns to 'All'
        document.getElementById('filterCategory').value = 'all';
        document.getElementById('filterValue').innerHTML = ''; // Clear the second dropdown
        document.getElementById('focusFilter').value = 'all'; // Reset the third dropdown to 'All'

    // Apply the reset to the table and save the settings
    filterRows();
    saveSettingsToCookie();
};

// Function to update the filter value dropdown based on category selection
const updateFilterValueDropdown = (callback) => {
    const filterCategory = document.getElementById('filterCategory').value;
    const filterValueDropdown = document.getElementById('filterValue');

    filterValueDropdown.innerHTML = '';
    let options = [];
    if (filterCategory === 'company') options = Array.from(companies).sort();
    if (filterCategory === 'group') options = Array.from(groups).sort();
    if (filterCategory === 'agent') options = Array.from(agents).sort();
    if (filterCategory === 'tier') options = Array.from(tier).sort();
    if (filterCategory === 'priority') options = Array.from(priority).sort();
    if (filterCategory === 'status') options = Array.from(status).sort();
    if (filterCategory === 'type') options = Array.from(type).sort();
    if (filterCategory === 'environment') options = Array.from(environment).sort();
    if (filterCategory === 'escalated' || filterCategory === 'overdue') options = ['Yes', 'No'];
    if (filterCategory !== 'escalated' && filterCategory !== 'overdue') {
        filterValueDropdown.add(new Option('', ''));
        document.getElementById('focusFilter').value = 'all'; // Reset the third dropdown to 'All'
    }

    options.forEach(option => {
        filterValueDropdown.add(new Option(option, option));
    });

    if (callback) callback();
};

// Populate table with tickets and then apply visibility settings
const populateTable = (tickets) => {
    const tableBody = document.getElementById('ticketsTable').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = ''; // Clear existing rows
    companies.clear();
    groups.clear();
    agents.clear();
    tier.clear();
    priority.clear();
    status.clear();
    type.clear();
    environment.clear();
    escalated.clear();
    overdue.clear();

    tickets.forEach(ticket => {
        let row = tableBody.insertRow();
        row.style.cursor = "pointer";
        row.onclick = () => window.open(`https://support.cloudblue.com/a/tickets/${ticket.id}`, '_blank');

        let cellId = row.insertCell(0);
        let cellCompany = row.insertCell(1);
        let cellTier = row.insertCell(2);
        let cellSubject = row.insertCell(3);
        let cellPriority = row.insertCell(4);
        let cellStatus = row.insertCell(5);
        let cellType = row.insertCell(6);
        let cellEnvironment = row.insertCell(7);
        let cellEscalated = row.insertCell(8);
        let cellPastDue = row.insertCell(9);
        let cellCreated = row.insertCell(10);
        let cellDueBy = row.insertCell(11);
        let cellLastUpdate = row.insertCell(12);
        let cellAgent = row.insertCell(13);
        let cellGroup = row.insertCell(14);
        let cellScore = row.insertCell(15);

        cellId.innerHTML = ticket.id;
        cellCompany.innerHTML = ticket.company_name;
        cellTier.innerHTML = ticket.account_tier;
        cellSubject.innerHTML = ticket.subject;
        cellPriority.innerHTML = ticket.priority;
        cellStatus.innerHTML = ticket.status;
        cellType.innerHTML = ticket.ticket_type;
        cellEnvironment.innerHTML = ticket.environment;
        cellEscalated.innerHTML = formatBadge(ticket.escalated);
        cellPastDue.innerHTML = formatBadge(ticket.is_past_due);
        cellCreated.innerHTML = formatDateTime(ticket.created_at);
        cellDueBy.innerHTML = formatDateTime(ticket.due_by);
        cellLastUpdate.innerHTML = formatDateTime(ticket.updated_at);
        cellAgent.innerHTML = ticket.agent_name;
        cellGroup.innerHTML = ticket.group_name;
        cellScore.innerHTML = ticket.score;

        companies.add(ticket.company_name);
        groups.add(ticket.group_name);
        agents.add(ticket.agent_name);
        tier.add(ticket.account_tier);
        priority.add(ticket.priority);
        status.add(ticket.status);
        type.add(ticket.ticket_type);
        environment.add(ticket.environment);
        escalated.add(ticket.escalated ? 'Yes' : 'No');
        overdue.add(ticket.is_past_due ? 'Yes' : 'No');
        cellId.classList.add('text-center');
        cellTier.classList.add('text-center');
        cellPriority.classList.add('text-center');
        cellStatus.classList.add('text-center');
        cellEscalated.classList.add('text-center');
        cellPastDue.classList.add('text-center');
        cellCreated.classList.add('text-center');
        cellDueBy.classList.add('text-center');
        cellLastUpdate.classList.add('text-center');
        cellScore.classList.add('text-center');

    });
    updateFilterValueDropdown();
    applySettings();
    delayedUpdateDashboardCounts();
};

document.querySelectorAll('.column-toggle').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        toggleColumnVisibility(checkbox.dataset.column, checkbox.checked);
        saveSettingsToCookie();
    });
});

// Event listener for filter category change
document.getElementById('filterCategory').addEventListener('change', function() {
    updateFilterValueDropdown(() => {
        if (this.value === 'all') {
            document.getElementById('focusFilter').value = 'all'; // Set the third dropdown to 'All'
        }
        filterRows(); // Apply filters based on the new dropdown settings
        saveSettingsToCookie();
    });
});

document.getElementById('resetFilters').addEventListener('click', resetFilters);

document.getElementById('filterValue').addEventListener('change', () => {
    filterRows();
    saveSettingsToCookie();
});

// Event listener for focus filter change
document.getElementById('focusFilter').addEventListener('change', () => {
    filterRows();
    saveSettingsToCookie();
});

// Load settings and fetch tickets on page load
window.addEventListener('DOMContentLoaded', (event) => {
        showLoadingOverlay();
    fetch('/tickets')
        .then(response => response.json())
        .then(tickets => {
        globalTickets = tickets;
    populateTable(tickets); // Populate the table with tickets
    applySettings(); // Apply settings and filters after populating
        })
        .catch(error => {
        console.error('Error:', error);
        })
        .finally(() => {
        hideLoadingOverlay();
        });
});

// Update the filter value dropdown when the category changes
document.getElementById('filterCategory').addEventListener('change', function () {
    const category = this.value;
    const valueDropdown = document.getElementById('filterValue');
    valueDropdown.innerHTML = '';

    let options = [];
    if (category === 'company') options = Array.from(companies).sort();
    if (category === 'group') options = Array.from(groups).sort();
    if (category === 'agent') options = Array.from(agents).sort();
    if (category === 'tier') options = Array.from(tier).sort();
    if (category === 'priority') options = Array.from(priority).sort();
    if (category === 'status') options = Array.from(status).sort();
    if (category === 'type') options = Array.from(type).sort();
    if (category === 'environment') options = Array.from(environment).sort();
    if (category === 'escalated' || category === 'overdue') options = ['Yes', 'No'];

    if (category !== 'escalated' && category !== 'overdue') {
        options.unshift(''); // Add a blank option at the start
    }

    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        valueDropdown.appendChild(optionElement);
    });

    filterRows();
});
