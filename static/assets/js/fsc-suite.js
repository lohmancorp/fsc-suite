let globalTickets = [];
let companies = new Set();
let groups = new Set();
let agents = new Set();
let tam = new Set();
let type = new Set();
let status = new Set();
let priority = new Set();
let tier = new Set();
let environment = new Set();
let escalated = new Set(['Yes', 'No']); // Prepopulate with Yes and No
let overdue = new Set(['Yes', 'No']); // Prepopulate with Yes and No
let focusedStatuses = new Set(['Open', 'New', 'Service request triage']); // Prepopulate with focused statuses
let isFetchAndUpdateRunning = false;
let lastFetchAndUpdateTimestamp = null;
let autoRefreshIntervalId = null;
let autoRefreshInterval = 10 * 60 * 1000; // Default 10 minutes in milliseconds
let urlFiltersApplied = false;

const completionAudio = new Audio('/static/assets/music/100_percent.mp3');


// Function to start auto-refresh
function startAutoRefresh() {
    console.log('Attempting to start auto-refresh');
    if (autoRefreshIntervalId !== null) {
        clearInterval(autoRefreshIntervalId); // Clear existing interval if any
    }
    autoRefreshIntervalId = setInterval(() => {
        if (!isFetchAndUpdateRunning) {
            console.log('Starting auto-refresh');
            fetchAndUpdateTickets(true);
        } else {
            console.log('Auto-refresh is already running');
        }
    }, autoRefreshInterval);
}

// Function to fetch and update tickets

function fetchAndUpdateTickets(refresh = false) {
    // Prevent concurrent fetch operations
    if (isFetchAndUpdateRunning) {
        console.log('fetchAndUpdateTickets is already running');
        return; // Exit if already running
    }
    console.log('fetchAndUpdateTickets started');
    isFetchAndUpdateRunning = true;

    // Show loading UI only if refresh is true
    if (refresh) {
        document.querySelector('#homeButton i').classList.add('rotating');
        showStartToast();
    }

    // Construct the fetch URL with an optional refresh query based on the argument
    const url = '/tickets' + (refresh ? '?refresh=true' : '');

    fetch(url)
        .then(response => response.json())
        .then(tickets => {
            globalTickets = tickets;
            populateTable(tickets); // Update the table with new ticket data

            // Only show completion UI if refresh was true
            if (refresh) {
                console.log('fetchAndUpdateTickets completed with refresh');
                document.querySelector('#homeButton i').classList.remove('rotating');
                showEndToast(); // Assuming this function hides the start toast and shows an end toast
            } else {
                console.log('fetchAndUpdateTickets completed from cache');
            }
        })
        .catch(error => {
            // Error handling
            console.error('Error:', error);
            if (refresh) {
                document.querySelector('#homeButton i').classList.remove('rotating');
                showEndToast(); // Show end toast to indicate completion, even on error
            }
        })
        .finally(() => {
            isFetchAndUpdateRunning = false; // Mark fetch operation as complete
        });
}




// Check if the refresh interval has elapsed
function isRefreshIntervalElapsed() {
    if (!lastFetchAndUpdateTimestamp) return true;
    const now = new Date();
    return (now - lastFetchAndUpdateTimestamp) >= autoRefreshInterval;
}

// Show loading overlay
const showLoadingOverlay = () => {
    document.getElementById('loadingOverlay').style.display = 'flex';
    if (document.getElementById('toggleMusic').checked) {
        loadingAudio.play();
    } else {
        loadingAudio.pause();
        loadingAudio.currentTime = 0;
    }
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

function isDateEqual(date1Str, date2Str) {
    const date1 = new Date(date1Str);
    const date2 = new Date(date2Str);
    return date1.getTime() === date2.getTime();
}

function has24HoursPassedSince(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    return (now.getTime() - date.getTime()) > 24 * 60 * 60 * 1000;
}


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
        selectedAgent: document.getElementById('agentSelect').value, // Add selected agent to settings
        filterCategory: document.getElementById('filterCategory').value,
        filterValue: document.getElementById('filterValue').value,
        focusFilter: document.getElementById('focusFilter').value, // Adding focus filter to settings
        musicEnabled: document.getElementById('toggleMusic').checked,
        dashboardVisible: document.getElementById('toggleDashboard').checked,
        progressBarVisible: document.getElementById('toggleProgressBar').checked, // New setting
        autoRefreshEnabled: document.getElementById('toggleAutoRefresh').checked,
        autoRefreshInterval: document.getElementById('refreshTime').value
    };

    document.querySelectorAll('.column-toggle').forEach(checkbox => {
        settings.columnVisibility[checkbox.dataset.column] = checkbox.checked;
    });

    // Calculate the expiration date, 1 month from now
    const now = new Date();
    now.setMonth(now.getMonth() + 1);
    const expires = `expires=${now.toUTCString()};`;

    // Set the cookie with the SameSite attribute to 'Strict' and the calculated expiration date
    document.cookie = `fsc-settings=${JSON.stringify(settings)};path=/;${expires}SameSite=Strict;`;
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
        const checkbox = document.querySelector(`.column-toggle[data-column="${column}"]`);
        if (checkbox) {
            toggleColumnVisibility(column, isVisible);
            checkbox.checked = isVisible;
        }
    });

    // Apply filters for category and value from cookies
    const filterCategoryElement = document.getElementById('filterCategory');
    const filterValueElement = document.getElementById('filterValue');
    const focusFilterElement = document.getElementById('focusFilter');

    if (!urlFiltersApplied && filterCategoryElement && filterValueElement) {
        if (settings.filterCategory) {
            filterCategoryElement.value = settings.filterCategory;
            updateFilterValueDropdown(() => {
                if (settings.filterValue) {
                    filterValueElement.value = settings.filterValue;
                }
            });
        }
    }

    if (settings.focusFilter && focusFilterElement) {
        focusFilterElement.value = settings.focusFilter;
    }

    // Apply selected agent from settings
    const selectedAgentName = getSelectedAgentName();
    const agentSelectDropdown = document.getElementById('agentSelect');
    if (selectedAgentName && agentSelectDropdown) {
        agentSelectDropdown.value = selectedAgentName; // This should now work as expected
    }
    
    const dashboardToggleElement = document.getElementById('toggleDashboard');
    const topDashboardElement = document.getElementById('topDashboard');
    if (settings.dashboardVisible !== undefined && dashboardToggleElement && topDashboardElement) {
        dashboardToggleElement.checked = settings.dashboardVisible;
        topDashboardElement.style.display = settings.dashboardVisible ? '' : 'none';
    }

    const progressBarToggleElement = document.getElementById('toggleProgressBar');
    const topProgressBarElement = document.getElementById('topProgressBar');
    if (settings.progressBarVisible !== undefined && progressBarToggleElement && topProgressBarElement) {
        progressBarToggleElement.checked = settings.progressBarVisible;
        topProgressBarElement.style.display = settings.progressBarVisible ? '' : 'none';
    }

    const autoRefreshToggleElement = document.getElementById('toggleAutoRefresh');
    const refreshTimeElement = document.getElementById('refreshTime');
    if (autoRefreshToggleElement && refreshTimeElement) {
        if (settings.autoRefreshEnabled !== undefined) {
            autoRefreshToggleElement.checked = settings.autoRefreshEnabled;
        }
        if (settings.autoRefreshInterval !== undefined) {
            refreshTimeElement.value = settings.autoRefreshInterval;
            autoRefreshInterval = parseInt(settings.autoRefreshInterval, 10) * 60 * 1000;
        }
        if (settings.autoRefreshEnabled) {
            startAutoRefresh();
        }
    }

    // Ensure filterRows is called after all dropdowns have been set
    filterRows();
};


// Remove query parameters from the URL without reloading the page
function clearURLFilters(){
    const urlWithoutQueryParams = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.pushState({ path: urlWithoutQueryParams }, '', urlWithoutQueryParams);
}

// Function to read URL encoded parameters on the ticket page to apply filter settings so specific views can be linked to.
function readAndApplyURLFilters() {
    console.log('Reading URL parameters...');
    const urlParams = new URLSearchParams(window.location.search);
    const filterCategory = urlParams.get('filterCategory');
    const filterValue = urlParams.get('filterValue');

    console.log(`URL Parameters - filterCategory: ${filterCategory}, filterValue: ${filterValue}`);

    if (filterCategory) {
        document.getElementById('filterCategory').value = filterCategory;

        new Promise((resolve) => {
            updateFilterValueDropdown(resolve);
        }).then(() => {
            if (filterValue) {
                const decodedValue = decodeURIComponent(filterValue);
                console.log(`Decoded filterValue to set: ${decodedValue}`);
                document.getElementById('filterValue').value = decodedValue;
                console.log('filterValue should now be set. Checking dropdown value:', document.getElementById('filterValue').value);
                filterRows(); // Ensure this function exists and works as intended
                urlFiltersApplied = true;
            }
        });
    }
}



// Function to get a random MP3 file
const getRandomLoadingAudio = () => {
    const audios = ['/static/assets/music/loading_1.mp3', '/static/assets/music/loading_2.mp3', '/static/assets/music/loading_3.mp3', '/static/assets/music/loading_4.mp3', '/static/assets/music/loading_5.mp3'];
    const randomIndex = Math.floor(Math.random() * audios.length);
    return new Audio(audios[randomIndex]);
};

// Initialize loading audio with a random MP3
const loadingAudio = getRandomLoadingAudio();



// Helper function to get a cookie by name
function getCookie(name) {
    let cookieArray = document.cookie.split(';');
    for (let i = 0; i < cookieArray.length; i++) {
        let cookiePair = cookieArray[i].split('=');
        if (name == cookiePair[0].trim()) {
            return decodeURIComponent(cookiePair[1]);
        }
    }
    return null;
}

// Helper function to set a cookie
function setCookie(name, value, days = 30) { // Default to 30 days if days parameter isn't provided
    let expires = "";
    if (days) {
        let date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Strict";
}


const updateFscTicketsCookie = (ticketId, cellPriority, cellStatus, cellLastUpdate, readStatus) => {
    let fscTickets = JSON.parse(getCookie('fsc-tickets') || '[]');
    let ticketIndex = fscTickets.findIndex(ticket => ticket.ticketId === ticketId);

    if (readStatus === 'unread') {
        // Remove entry if it's marked as unread
        if (ticketIndex !== -1) {
            fscTickets.splice(ticketIndex, 1);
        }
    } else {
        // Update or add new entry
        const ticketData = { ticketId, cellPriority, cellStatus, cellLastUpdate, read_status: readStatus };
        if (ticketIndex !== -1) {
            fscTickets[ticketIndex] = ticketData;
        } else {
            fscTickets.push(ticketData);
        }
    }

    // Update the cookie
    setCookie('fsc-tickets', JSON.stringify(fscTickets), 7); // Expires in 7 days
};

function evaluateReadStatus(tickets) {
    let fscTickets = JSON.parse(getCookie('fsc-tickets') || '[]');
    let currentTime = new Date();
    let isCookieUpdated = false;

    tickets.forEach(ticket => {
        let storedTicket = fscTickets.find(fscTicket => fscTicket.ticketId === ticket.id.toString());
        const ticketUpdated = formatDateTime(ticket.updated_at);

        if (!storedTicket) {
            // Automatically mark as read if the status is 'Pending', otherwise 'unread'
            ticket.read_status = ticket.status === 'Pending' ? 'read' : 'unread';
        } else {
            let updatedTime = new Date(storedTicket.cellLastUpdate);
            console.log(`Ticket ID: ${ticket.id}, Updated in ticket: ${ticketUpdated}, Stored Updated: ${storedTicket.cellLastUpdate}`);

            if (ticketUpdated !== storedTicket.cellLastUpdate ||
                storedTicket.cellPriority !== ticket.priority ||
                storedTicket.cellStatus !== ticket.status) {
                ticket.read_status = 'readUpdated'; // Data mismatch
                storedTicket.read_status = 'readUpdated';
                isCookieUpdated = true;
            } else if ((currentTime - updatedTime) >= 24 * 60 * 60 * 1000) {
                ticket.read_status = 'readRecheck'; // More than 24 hours
                storedTicket.read_status = 'readRecheck';
                isCookieUpdated = true;
            } else {
                // Use the stored read status if available
                ticket.read_status = storedTicket.read_status;
            }
        }
    });

    // Update the cookie if any changes were made
    if (isCookieUpdated) {
        setCookie('fsc-tickets', JSON.stringify(fscTickets), 7); // Expires in 7 days
    }
}

// Function to calculate total engineers needed for load/backload open within 5 days.
function calculateEngineersRequired(N) {
    const AHT = 2.55; // Average handle time in hours  (SHOULD BE INPUT VALUE)
    //const N = 500; // Average tickets number per month (SHOULD BE INPUT VALUE)
    const Nh = AHT * N; // Active hours per month 
    const U1 = 1.0; // Meal and rest periods
    const U2 = 0.75; // Ticket processing utilization
    const U3 = 0.99; // Education and RnD coefficient
    const S = 1.03; // Sickness coefficient
    const V = 1.08; // Vacation coefficient
    const WHPAM = 40; // Working hours per week

    // Calculate total hours needed
    const Htotal = (Nh / (U1 * U2 * U3)) * V * S;

    // Calculate total engineers required, assuming 168 working hours per month per engineer
    const Etotal = Htotal / WHPAM;

    // Round up to the nearest whole number since we can't have a fraction of an engineer
    return Math.ceil(Etotal);
}

// Function to get counts for a static dashboard
const selectedAgentName = getSelectedAgentName(); // This should return the actual name, e.g., "Alexandr Churikov"

document.addEventListener('DOMContentLoaded', function () {
    const selectedAgentName = getSelectedAgentName();
    document.querySelectorAll('.filter-criteria-container').forEach((container) => {
        const resultContainerId = container.getAttribute('data-target');
        let filterCriteria = {};

        container.querySelectorAll('[data-filter]').forEach((element) => {
            const filterName = element.getAttribute('data-filter');
            let filterValue = element.getAttribute('data-value');

            // Check if placeholder value is present, and replace it with the actual variable's value
            if (filterValue === '$selectedAgent' && selectedAgentName) {
                filterValue = selectedAgentName; // Use the actual agent name
            }

            filterCriteria[filterName] = filterValue;
        });

        const queryParams = new URLSearchParams(filterCriteria).toString();
        console.log(`Fetching data for URL: /tickets/count?${queryParams}`); // Debugging log

        fetch(`/tickets/count?${queryParams}`)
            .then(response => response.json())
            .then(data => {
                document.getElementById(resultContainerId).textContent = data.count;
            })
            .catch(error => console.error('Error fetching ticket count:', error));
    });
});

// Function to update the link with the selected agent from the cookie
const updateLinkWithSelectedAgent = () => {
    const selectedAgent = getSelectedAgentName(); // Directly fetch the selected agent name
    const yourTicketsLink = document.getElementById('yourTicketsLink');

    if (yourTicketsLink && selectedAgent) {
        // Encode the selectedAgent value for URL
        const encodedSelectedAgent = encodeURIComponent(selectedAgent);

        // Update the href with the encoded selectedAgent
        yourTicketsLink.href = `/ticketlist?filterCategory=agent&filterValue=${encodedSelectedAgent}`;

        // If you have other elements that need updating based on the selected agent, handle them here
    }
};


function afterDropdownPopulated() {
    // Call applySettings to apply any settings stored in cookies or elsewhere
    applySettings();
    updateLinkWithSelectedAgent();
    const selectedAgentName = getSelectedAgentName();
    document.querySelectorAll('.filter-criteria-container').forEach((container) => {
        const resultContainerId = container.getAttribute('data-target');
        let filterCriteria = {};

        container.querySelectorAll('[data-filter]').forEach((element) => {
            const filterName = element.getAttribute('data-filter');
            let filterValue = element.getAttribute('data-value');

            if (filterValue === '$selectedAgent' && selectedAgentName) {
                filterValue = selectedAgentName; // Use the actual agent name
            }

            filterCriteria[filterName] = filterValue;
        });

        const queryParams = new URLSearchParams(filterCriteria).toString();
        console.log(`Fetching data for URL: /tickets/count?${queryParams}`);

        fetch(`/tickets/count?${queryParams}`)
            .then(response => response.json())
            .then(data => {
                document.getElementById(resultContainerId).textContent = data.count;
            })
            .catch(error => console.error('Error fetching ticket count:', error));
    });
}


document.addEventListener('DOMContentLoaded', function () {
    // Populate the agent dropdown and call applySettings as a callback
    populateAgentDropdown(afterDropdownPopulated);
    updateLinkWithSelectedAgent();
});

// Function to update percentages
document.addEventListener('DOMContentLoaded', function () {
    // Function to update percentage for progress bars based on data-criteria
    function updateProgressBars() {
        // Select all progress bars with data-criteria
        const progressBars = document.querySelectorAll('[data-criteria]');

        progressBars.forEach(bar => {
            const criteria = JSON.parse(bar.getAttribute('data-criteria'));
            let apiUrl = '/tickets/count/percent?';

            // Construct the query string from criteria
            Object.entries(criteria).forEach(([key, value], index) => {
                apiUrl += `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
                if (index < Object.entries(criteria).length - 1) apiUrl += '&';
            });

            // Fetch the percentage and update the progress bar
            fetch(apiUrl)
                .then(response => response.json())
                .then(data => {
                    const percent = data.percent;
                    bar.setAttribute('style', `width: ${percent};`); // Explicitly set the style attribute
                    bar.textContent = percent; // Update the text content
                })
                .catch(error => console.error('Error fetching data:', error));
        });
    }

    // Call the function to update all progress bars on page load
    updateProgressBars();
});

// Function to update dashboard counts & progress bar
const updateDashboardCounts = () => {
    const rows = document.querySelectorAll('#ticketsTable tbody tr:not([style*="display: none"])');

    const totalTickets = rows.length;
    const totalPending = Array.from(rows).filter(row => row.cells[6].textContent.trim() === 'Pending').length;
    const totalPendingIncidents = Array.from(rows).filter(row => row.cells[6].textContent.trim() === 'Pending' && row.cells[7].textContent.trim() === 'Incident').length;
    const totalPendingServiceRequests = Array.from(rows).filter(row => row.cells[6].textContent.trim() === 'Pending' && row.cells[7].textContent.trim() === 'Service request').length;
    const totalIncidents = Array.from(rows).filter(row => row.cells[7].textContent.trim() === 'Incident').length;
    const totalServiceRequests = Array.from(rows).filter(row => row.cells[7].textContent.trim() === 'Service request').length;
    const totalEscalated = Array.from(rows).filter(row => row.cells[9].textContent.trim().includes('Yes')).length;
    const totalOverdue = Array.from(rows).filter(row => row.cells[10].textContent.trim().includes('Yes')).length;
    const totalDone = Array.from(rows).filter(row => {
        const status = row.cells[6].textContent.trim(); // Ticket status in column 6
        const cellIconHTML = row.cells[0].innerHTML; // Read status icon in column 0

        // Check if the row is marked as 'read'
        const isRead = cellIconHTML.includes('bi-envelope-check');

        return ['Pending', 'Resolved', 'Closed', 'Rejected', 'Duplicate'].includes(status) || isRead;
    }).length;

    // Calculate engineers required for Incidents and Service Requests
    const totalTicketsLeft = totalTickets - totalPending;
    const totalIncidentsLeft = totalIncidents - totalPendingIncidents;
    const totalServiceRequestsLeft = totalServiceRequests - totalPendingServiceRequests;
    const escalatedPercent = Math.ceil((totalEscalated / totalTickets) * 100);
    const overduePercent = Math.ceil((totalOverdue / totalTickets) * 100);
    const engineersRequiredForTotal = calculateEngineersRequired(totalTicketsLeft);
    const engineersRequiredForIncidents = calculateEngineersRequired(totalIncidentsLeft);
    const engineersRequiredForServiceRequests = calculateEngineersRequired(totalServiceRequestsLeft);

    document.getElementById('totalTickets').textContent = `${totalTickets} (HC: ${engineersRequiredForTotal})`;
    document.getElementById('totalIncidents').textContent = `${totalIncidents} (HC: ${engineersRequiredForIncidents})`;
    document.getElementById('totalServiceRequests').textContent = `${totalServiceRequests} (HC: ${engineersRequiredForServiceRequests})`;
    document.getElementById('totalEscalated').textContent = `${totalEscalated} (${escalatedPercent}%)`;
    document.getElementById('totalOverdue').textContent = `${totalOverdue} (${overduePercent}%)`;

    // Calculate fraction for progress bar and text
    let progressBarFraction = totalTickets > 0 ? (totalDone / totalTickets) : 0;
    progressBarFraction = Math.min(Math.max(progressBarFraction, 0), 1); // Clamp between 0 and 1

    // Convert fraction to percentage and round up to the nearest whole number
    const progressWidth = Math.ceil(progressBarFraction * 100) + '%';

    // Update progress bar width and text
    const progressBar = document.getElementById('progressBar');
    progressBar.style.width = progressWidth;
    progressBar.textContent = `Total Done: ${totalDone} / ${totalTickets} - ${progressWidth}`;

    // Update progress bar class based on progressBarFraction
    if (progressBarFraction < 0.5) {
        progressBar.classList.remove('bg-dark', 'bg-warning', 'bg-info', 'bg-success');
        progressBar.classList.add('bg-dark');
    } else if (progressBarFraction >= 0.5 && progressBarFraction < 0.7) {
        progressBar.classList.remove('bg-dark', 'bg-warning', 'bg-info', 'bg-success');
        progressBar.classList.add('bg-warning');
    } else if (progressBarFraction >= 0.7 && progressBarFraction < 0.8) {
        progressBar.classList.remove('bg-dark', 'bg-warning', 'bg-info', 'bg-success');
        progressBar.classList.add('bg-info');
    } else {
        progressBar.classList.remove('bg-dark', 'bg-warning', 'bg-info', 'bg-success');
        progressBar.classList.add('bg-success');
        if (progressBarFraction === 1) {
            // Show the loading overlay and play the audio
            showVictoryOverlay();

            // After 8 seconds, hide the loading overlay and display the victory overlay
            setTimeout(() => hideVictoryOverlay(true), 8000);
        }
    }
};


// Show victory overlay
const showVictoryOverlay = () => {
    const victoryOverlay = document.getElementById('victoryOverlay');
    // Assuming you have an MP3 file URL
    if (victoryOverlay) {
        completionAudio.play(); 
        victoryOverlay.style.display = 'flex';
        
    } else {
        console.error('Victory overlay element not found');
    }
};

// Hide victory overlay
const hideVictoryOverlay = () => {
    const victoryOverlay = document.getElementById('victoryOverlay');
    // Assuming you have an MP3 file URL
    if (victoryOverlay) {
        victoryOverlay.style.display = 'none';
        completionAudio.pause();
        completionAudio.currentTime = 0;
    } else {
        console.error('Victory overlay element not found');
    }
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
                isMatch = row.cells[2].textContent.trim() === filterValue;
                break;
            case 'group':
                isMatch = row.cells[16].textContent.trim() === filterValue;
                break;
            case 'tam':
                isMatch = row.cells[17].textContent.trim() === filterValue;
                break;
            case 'agent':
                isMatch = row.cells[15].textContent.trim() === filterValue;
                break;
            case 'tier':
                isMatch = row.cells[3].textContent.trim() === filterValue;
                break;
            case 'priority':
                isMatch = row.cells[5].textContent.trim() === filterValue;
                break;
            case 'status':
                isMatch = row.cells[6].textContent.trim() === filterValue;
                break;
            case 'type':
                isMatch = row.cells[7].textContent.trim() === filterValue;
                break;
            case 'environment':
                isMatch = row.cells[8].textContent.trim() === filterValue;
                break;
            case 'escalated':
            case 'overdue':
                let cellText = row.cells[filterCategory === 'escalated' ? 9 : 10].querySelector('.badge')?.textContent.trim() || 'No';
                isMatch = cellText === filterValue;
                break;
            default:
                isMatch = true;
        }

        // Apply focus filter if set to 'focused'
        if (focusFilter === 'focused') {
            const status = row.cells[6].textContent.trim(); // Assuming status is in the 7th column
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
    applySettings();

    // Remove query parameters from the URL without reloading the page
    const urlWithoutQueryParams = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.pushState({ path: urlWithoutQueryParams }, '', urlWithoutQueryParams);
};


// Function to update the filter value dropdown based on category selection
const updateFilterValueDropdown = (callback) => {
    console.log('Updating filterValue dropdown...');
    const filterCategory = document.getElementById('filterCategory').value;
    console.log(`Selected filterCategory: ${filterCategory}`);
    const filterValueDropdown = document.getElementById('filterValue');
    const rows = document.querySelectorAll('#ticketsTable tbody tr');

    filterValueDropdown.innerHTML = '';
    let options = [];
    let counts = {};

    // Count the occurrences of each option
    rows.forEach(row => {
        let value;
        switch (filterCategory) {
            case 'company':
                value = row.cells[2].textContent.trim();
                break;
            case 'group':
            case 'agent':
                value = row.cells[filterCategory === 'group' ? 16 : 15].textContent.trim() || 'Unassigned';
                break;
            case 'tam':
                value = row.cells[17].textContent.trim();
                break;    
            case 'tier':
                value = row.cells[3].textContent.trim();
                break;
            case 'priority':
                value = row.cells[5].textContent.trim();
                break;
            case 'status':
                value = row.cells[6].textContent.trim();
                break;
            case 'type':
                value = row.cells[7].textContent.trim();
                break;
            case 'environment':
                value = row.cells[8].textContent.trim();
                break;
            case 'escalated':
            case 'overdue':
                value = row.cells[filterCategory === 'escalated' ? 9 : 10].textContent.trim().includes('Yes') ? 'Yes' : 'No';
                break;
            default:
                value = ''; // Default case to catch any unforeseen categories
                break;
        }

        if (!options.includes(value)) {
            options.push(value);
        }
        counts[value] = (counts[value] || 0) + 1;

    });
    
    console.log('Options generated:', options);

    // Sort options and ensure 'Unassigned' is at the top for 'group' and 'agent'
    if (filterCategory === 'group' || filterCategory === 'agent') {
        options = options.filter(option => option !== 'Unassigned').sort();
        options.unshift('Unassigned');
    } else {
        options.sort();
    }

    // Add a blank option at the start for other categories
    if (filterCategory !== 'escalated' && filterCategory !== 'overdue' && filterCategory !== 'group' && filterCategory !== 'agent') {
        options.unshift('');
    }

    // Create dropdown options
    options.forEach(option => {
        const count = counts[option] || 0;
        const optionText = option ? `${option} (${count})` : '';
        const newOption = new Option(optionText, option);
        filterValueDropdown.add(newOption);
    });
    console.log('Dropdown options populated.');
    console.log(`Selected filterValue: ${filterValue}`);
    if (callback) callback();
};

function copyFilteredTicketsURLToClipboard() {
    const baseUrl = 'http://127.0.0.1:5000/ticketlist';
    const filterCategory = document.getElementById('filterCategory').value;
    const filterValue = document.getElementById('filterValue').value;
    const encodedFilterValue = encodeURIComponent(filterValue); // Ensure the value is URL-friendly
    const fullUrl = `${baseUrl}?filterCategory=${filterCategory}&filterValue=${encodedFilterValue}`;

    // Create a temporary textarea element to hold the URL
    const tempInput = document.createElement('textarea');
    tempInput.value = fullUrl;
    document.body.appendChild(tempInput);
    tempInput.select(); // Select the text
    document.execCommand('copy'); // Copy the text
    document.body.removeChild(tempInput); // Remove the temporary element

    // Notify the user that the URL has been copied with a toast, including the full URL
    showCopyToast(fullUrl);
}



const toggleIcon = (cellIcon, cellId, cellPriority, cellStatus, cellLastUpdate) => {
    let isCurrentlyRead = cellIcon.innerHTML.includes('bi-envelope-check');
    let newReadStatus = isCurrentlyRead ? 'unread' : 'read';

    if (newReadStatus === 'read') {
        cellIcon.innerHTML = '<i class="bi bi-envelope-check text-success fw-bold" data-bs-toggle="tooltip" data-bs-html="true" data-bs-title="Item read.<br> Swipe left to mark unread." style="font-size: 1.25rem; font-weight: bold; z-index: 10001; position: relative;"></i>';
        // Reinitialize tooltips
        var newTooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        newTooltipTriggerList.forEach(function (tooltipTriggerEl) {
            new bootstrap.Tooltip(tooltipTriggerEl);
        });
    } else {
        cellIcon.innerHTML = '-';
    }

    // Update cookie and data
    updateFscTicketsCookie(cellId.textContent, cellPriority.textContent, cellStatus.textContent, cellLastUpdate.textContent, newReadStatus);

    // Recalculate and update dashboard counts
    delayedUpdateDashboardCounts();
};


// Function to apply animation to the icon
const animateIcon = (iconElement) => {
    setTimeout(() => {
        //iconElement.style.animation = 'zoomSpin 1s ease-in-out 2';
    }, 1000); // Delay to ensure the row is back in position
};

// Function to create a placeholder for the drag effect
const createDragPlaceholder = (row) => {
    const rect = row.getBoundingClientRect();
    const placeholder = document.createElement('div');
    placeholder.classList.add('drag-placeholder');
    placeholder.style.height = `${rect.height}px`;
    placeholder.style.width = '0'; // Start with no width and expand as the row is dragged
    placeholder.style.position = 'absolute';
    placeholder.style.top = `${rect.top + window.scrollY}px`; // Adjust for scrolling
    placeholder.style.left = `${rect.right}px`; // Start from the right side of the row
    placeholder.style.zIndex = '10'; // Ensure it's under the dragged row
    placeholder.style.transition = 'width 0.2s'; // Optional: for smooth width transition
    document.body.appendChild(placeholder);
    return placeholder;
};
const isDarkMode = () => {
    // Example: Check if the body has a class that indicates dark mode
    return document.body.classList.contains('dark-mode');
};

// Function to calculate the difference in days & hours, and to color code red based on threshold days
const calculateTimeDifference = (dateStr, redThresholdDays) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = date - now;
    const days = Math.floor(Math.abs(diff) / (1000 * 60 * 60 * 24));
    const hours = Math.floor((Math.abs(diff) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    let dayWord = days === 1 ? 'day' : 'days'; // Singular or plural for days
    let hourWord = hours === 1 ? 'hr' : 'hrs'; // Singular or plural for hours
    let timeDiffText = (days > 0 ? `${days} ${dayWord} ` : '') + `${hours} ${hourWord}`;

    let textClass = diff < 0 && days >= redThresholdDays ? 'text-danger' : '';

    return `<span class="${textClass}" style="white-space:nowrap;">${timeDiffText}</span>`;
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
    tam.clear();
    evaluateReadStatus(tickets); // Evaluate read statuses
    let fscTickets = JSON.parse(getCookie('fsc-tickets') || '[]');

    tickets.forEach(ticket => {
        let row = tableBody.insertRow();
        row.classList.add('ticket-row'); // Add class for styling and identification
        row.style.cursor = "pointer";
        row.style.position = "relative"; // Add position property
        row.style.zIndex = "500"; // Apply z-index
        row.ondblclick = () => window.open(`https://support.cloudblue.com/a/tickets/${ticket.id}`, '_blank');
        // Calculate and set popover content for cellPastDue, cellCreated, and cellDueBy
        const pastDuePopoverContent = calculateTimeDifference(ticket.due_by, 0); // Assuming ticket object has past_due_date


        // Event listeners for drag functionality
        let startX, isDragging = false;
        let placeholder; // Placeholder for the dragged row's original position

        row.addEventListener('mousedown', (e) => {
            startX = e.clientX;
            isDragging = false;
            placeholder = createDragPlaceholder(row); // Create and display the placeholder
            row.classList.add('row-dragging'); // Add this line to apply the dragging style
            row.classList.add('no-select');
        });

        row.addEventListener('mousemove', (e) => {
            if (e.buttons !== 1) return;
            let dx = e.clientX - startX;
            if (dx < 0 && dx > -150) { // Limit dragging to -50px
                row.style.transform = `translateX(${dx}px)`;
                placeholder.style.width = `${-dx * 2}px`; // Amplify the width
                isDragging = true;
            }
        });

        row.addEventListener('mouseup', () => {
            if (isDragging) {
                //toggleIcon(row.cells[0]); // Toggle icon after drag
                toggleIcon(row.cells[0], row.cells[1], row.cells[5], row.cells[6], row.cells[13]);
                animateIcon(row.cells[0].firstChild); // Animate the icon
            }
            row.style.transform = 'translateX(0)';
            row.style.cursor = "pointer";
            if (placeholder) placeholder.remove(); // Ensure placeholder is removed
            isDragging = false;
            startX = null;
            row.classList.remove('row-dragging'); // Add this line to remove the dragging style
            row.classList.remove('no-select');
        });

        row.addEventListener('mouseleave', () => {
            if (isDragging) {
                row.style.transform = 'translateX(0)';
                row.style.cursor = "pointer";
                if (placeholder) placeholder.remove(); // Ensure placeholder is removed
                isDragging = false;
                startX = null;
                row.classList.remove('row-dragging'); // Also remove the dragging style here for the leave event
                row.classList.remove('no-select');
            }
        });

        let cellIcon = row.insertCell(0);
        let cellId = row.insertCell(1);
        let cellCompany = row.insertCell(2);
        let cellTier = row.insertCell(3);
        let cellSubject = row.insertCell(4);
        let cellPriority = row.insertCell(5);
        let cellStatus = row.insertCell(6);
        let cellType = row.insertCell(7);
        let cellEnvironment = row.insertCell(8);
        let cellEscalated = row.insertCell(9);
        let cellPastDue = row.insertCell(10);
        let cellCreated = row.insertCell(11);
        let cellFrDueBy = row.insertCell(12);
        let cellDueBy = row.insertCell(13);
        let cellLastUpdate = row.insertCell(14);
        let cellAgent = row.insertCell(15);
        let cellGroup = row.insertCell(16);
        let cellTam = row.insertCell(17);
        let cellScore = row.insertCell(18);

        let matchedTicket = fscTickets.find(fscTicket => fscTicket.ticketId === ticket.id);
        let readStatus = ticket.read_status;

        if (matchedTicket) {
            const ticketUpdated = formatDateTime(ticket.updated_at);
            if (!isDateEqual(ticketUpdated, matchedTicket.cellLastUpdate) ||
                matchedTicket.cellPriority !== ticket.priority ||
                matchedTicket.cellStatus !== ticket.status) {
                readStatus = 'readUpdated';
            } else if (has24HoursPassedSince(matchedTicket.cellLastUpdate)) {
                readStatus = 'readRecheck';
            } else {
                readStatus = 'read';
            }
        }

        // Set the icon based on readStatus
        switch (readStatus) {
            case 'read':
                cellIcon.innerHTML = '<span><i class="bi bi-envelope-check text-success fw-bold" data-bs-toggle="tooltip" data-bs-html="true" data-bs-title="Item read.<br> Swipe left to mark as unread." style = "font-size: 1.25rem; font-weight: bold; z-index: 10001; position: relative;" ></i></span>';
                break;
            case 'readUpdated':
                cellIcon.innerHTML = '<span><i class="bi bi-envelope-exclamation text-danger fw-bold" data-bs-toggle="tooltip" data-bs-html="true" data-bs-title="Item has been updated.<br> Please recheck item." style = "font-size: 1.25rem; font-weight: bold; z-index: 10001; position: relative;" ></i></span>';
                break;
            case 'readRecheck':
                cellIcon.innerHTML = '<span><i class="bi bi-envelope-heart text-warning fw-bold" data-bs-toggle="tooltip" data-bs-html="true" data-bs-title="Item has no movement.<br> Please recheck item and push." style = "font-size: 1.25rem; font-weight: bold; z-index: 10001; position: relative;" ></i></span>';
                break;
            default:
                cellIcon.innerHTML = '-';
        }

        // Modify the environment attribute for each ticket
        if (ticket.environment === "Production") {
            ticket.environment = "Prod"; // Adjust the environment value
        }

        // Modify the type attribute for each ticket
        if (ticket.ticket_type === "Incident or Problem") {
            ticket.ticket_type = "Incident"; // Adjust the environment value
        }

        // Modify FR Due if status is not new.
        if (ticket.status === "New") {
            fr_due_by = calculateTimeDifference(ticket.fr_due_by, 0);
        } else {
            fr_due_by = '--';
        }

        cellId.textContent = ticket.id;
        cellCompany.textContent = ticket.company_name;
        cellTier.textContent = ticket.account_tier;
        cellSubject.textContent = ticket.subject;
        cellPriority.textContent = ticket.priority;
        cellStatus.textContent = ticket.status;
        cellType.textContent = ticket.ticket_type;
        cellEnvironment.textContent = ticket.environment;
        cellEscalated.innerHTML = formatBadge(ticket.escalated);
        cellPastDue.innerHTML = formatBadge(ticket.is_past_due);
        cellCreated.innerHTML = calculateTimeDifference(ticket.created_at, 20);
        cellFrDueBy.innerHTML = fr_due_by;   
        cellDueBy.innerHTML = calculateTimeDifference(ticket.due_by, 0);
        cellLastUpdate.innerHTML = calculateTimeDifference(ticket.updated_at, 5);
        cellAgent.textContent = ticket.agent_name;
        cellGroup.textContent = ticket.group_name;
        cellTam.textContent = ticket.tam_name;
        cellScore.textContent = ticket.score;

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
        cellIcon.classList.add('text-center');
        cellId.classList.add('text-center');
        cellTier.classList.add('text-center');
        cellPriority.classList.add('text-center');
        cellStatus.classList.add('text-center');
        cellEscalated.classList.add('text-center');
        cellPastDue.classList.add('text-center');
        cellCreated.classList.add('text-center');
        cellFrDueBy.classList.add('text-center');
        cellDueBy.classList.add('text-center');
        cellLastUpdate.classList.add('text-center');
        cellTam.classList.add('no-wrap');
        cellScore.classList.add('text-center');

        // Initialize popovers for these cells with detailed datetime information
        [cellPastDue, cellCreated, cellDueBy, cellLastUpdate, cellFrDueBy].forEach((cell, index) => {
            let popoverClass = isDarkMode() ? 'bg-light' : 'bg-light';
            const popoverContent =
                index === 0 ? pastDuePopoverContent :
                    index === 1 ? formatDateTime(ticket.created_at) :
                        index === 2 ? formatDateTime(ticket.due_by) :
                            index === 3 ? formatDateTime(ticket.updated_at) :
                                formatDateTime(ticket.fr_due_by);

            // Dispose of any existing popover instances and initialize a new popover with detailed datetime
            let existingPopover = bootstrap.Popover.getInstance(cell);
            if (existingPopover) {
                existingPopover.dispose();
            }

            cell.setAttribute('data-bs-toggle', 'popover');
            cell.setAttribute('data-bs-html', 'true');
            cell.setAttribute('data-bs-content', popoverContent);
            let popoverTextClass = isDarkMode() ? 'text-light' : 'text-dark';
            new bootstrap.Popover(cell, {
                trigger: 'hover',
                template: `<div class="popover ${popoverClass}" role="tooltip"><div class="popover-arrow"></div><div class="popover-header"></div><div class="popover-body ${popoverTextClass}"></div></div>`
            });
        });


    });
    updateFilterValueDropdown();
    applySettings();
    readAndApplyURLFilters();
    delayedUpdateDashboardCounts();
    var newTooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    newTooltipTriggerList.forEach(function (tooltipTriggerEl) {
        new bootstrap.Tooltip(tooltipTriggerEl);
    });
};

//const refreshToastStart = new bootstrap.Toast(document.getElementById('refreshToastStart'));
//const refreshToastEnd = new bootstrap.Toast(document.getElementById('refreshToastEnd'));

function showStartToast() {
    const toastElement = document.getElementById('refreshToastStart');
    const refreshIcon = document.querySelector('#homeButton .bi-arrow-clockwise');
    const reloadButtonText = document.querySelector('#homeButton span');

    if (toastElement && refreshIcon && reloadButtonText) {
        const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        toastElement.querySelector('.text-body-secondary').textContent = currentTime;
        const toast = new bootstrap.Toast(toastElement);
        toast.show();
        refreshIcon.classList.add('rotating');  // Start rotating
        reloadButtonText.textContent = ' Reloading'; // Update text to 'Reloading'
    } else {
        console.error('Toast element, icon, or button text not found');
    }
}

function showEndToast() {
    const toastElementEnd = document.getElementById('refreshToastEnd');
    const refreshIcon = document.querySelector('#homeButton .bi-arrow-clockwise');
    const reloadButtonText = document.querySelector('#homeButton span');

    if (toastElementEnd && refreshIcon && reloadButtonText) {
        const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.querySelector('#refreshToastEnd .text-body-secondary').textContent = currentTime;
        refreshToastEnd.show();
        refreshIcon.classList.remove('rotating');  // Stop rotating
        reloadButtonText.textContent = ' Reload'; // Restore text to 'Reload'

        setTimeout(() => {

            refreshToastStart.hide();
            refreshToastEnd.hide();

        }, 3000); // Hide both toasts after 3 seconds
    } else {
        console.error('End toast element, icon, or button text not found');
    }
}

function showCopyToast(copiedUrl) {
    const toastElement = document.getElementById('copyToast');

    if (toastElement) {
        const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        toastElement.querySelector('#refreshCopyTime').textContent = currentTime;
        toastElement.querySelector('#copyToastBody').textContent = `Copied URL: ${copiedUrl}`; // Set the copied URL in the toast body
        const toast = new bootstrap.Toast(toastElement);
        toast.show();
        setTimeout(() => {
            toast.hide();
        }, 2500); // Hides toast after 3 seconds
    } else {
        console.error('Toast element not found');
    }
}

// Example implementation, adjust based on your application logic
function getSelectedAgentName() {
    // Example: Fetching the selected agent's name from a cookie
    const settings = getSettingsFromCookie(); // Assuming this function is correctly implemented
    return settings.selectedAgent; // Make sure this matches your actual settings structure
}

// Run the function to update the link when the page loads
document.addEventListener('DOMContentLoaded', updateLinkWithSelectedAgent);


document.querySelectorAll('.column-toggle').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        toggleColumnVisibility(checkbox.dataset.column, checkbox.checked);
        saveSettingsToCookie();
    });
});

// Event listener for filter category change
document.getElementById('filterCategory').addEventListener('change', function () {
    // Call the function to update the filter value dropdown
    updateFilterValueDropdown(() => {
        if (this.value === 'all') {
            document.getElementById('focusFilter').value = 'all'; // Reset the third dropdown to 'All'
        }
        filterRows(); // Apply filters based on the new dropdown settings
        clearURLFilters();
        saveSettingsToCookie();
    });
});


document.getElementById('resetFilters').addEventListener('click', resetFilters);

document.getElementById('filterValue').addEventListener('change', () => {
    filterRows();
    clearURLFilters();
    saveSettingsToCookie();
});

// Event listener for focus filter change
document.getElementById('focusFilter').addEventListener('change', () => {
    filterRows();
    saveSettingsToCookie();
});

// Main Event Listener for Page Load - DOMContentLoaded listener
window.addEventListener('DOMContentLoaded', (event) => {

    fetchAndUpdateTickets(); // Fetch tickets immediately on load
    populateAgentDropdown();
    applySettings();
    //updateYourTicketsLinkFromCookie();
    if (document.getElementById('toggleAutoRefresh').checked) {
        startAutoRefresh(); // Start auto-refresh if enabled
    }
});


document.addEventListener('DOMContentLoaded', () => {
    populateAgentDropdown();
    refreshToastStart = new bootstrap.Toast(document.getElementById('refreshToastStart'));
    refreshToastEnd = new bootstrap.Toast(document.getElementById('refreshToastEnd'));
    applySettings();
    //updateYourTicketsLinkFromCookie();
});

document.getElementById('agentSelect').addEventListener('change', function () {
    saveSettingsToCookie(); // Save settings after change
    applySettings();
});


document.getElementById('toggleMusic').addEventListener('change', function () {
    if (this.checked) {
        // Code to enable music
        //loadingAudio.play();
        saveSettingsToCookie(); // Save settings after change
        applySettings();
    } else {
        // Code to disable music
        loadingAudio.pause();
        loadingAudio.currentTime = 0;
        saveSettingsToCookie();
        applySettings();
    }
});

document.getElementById('toggleDashboard').addEventListener('change', function () {
    const dashboard = document.getElementById('topDashboard');
    if (this.checked) {
        dashboard.style.display = ''; // Show the dashboard
    } else {
        dashboard.style.display = 'none'; // Hide the dashboard
    }
});

document.getElementById('toggleProgressBar').addEventListener('change', function () {
    const progressbar = document.getElementById('topProgressBar');
    if (this.checked) {
        progressbar.style.display = ''; // Show the progress bar
    } else {
        progressbar.style.display = 'none'; // Hide the progress bar
    }
});

// Event listener for the toggleAutoRefresh checkbox
document.getElementById('toggleAutoRefresh').addEventListener('change', function () {
    if (this.checked) {
        startAutoRefresh();
    } else {
        clearTimeout(autoRefreshIntervalId);
        autoRefreshIntervalId = null;
    }
    saveSettingsToCookie();
});



document.getElementById('refreshTime').addEventListener('input', function () {
    const inputValue = parseInt(this.value, 10);
    const form = this.closest('form');

    // Check if input is within the allowed range
    if (!isNaN(inputValue) && inputValue >= 10 && inputValue <= 60) {
        this.classList.remove('is-invalid');
        autoRefreshInterval = inputValue * 60 * 1000; // Convert minutes to milliseconds

        if (document.getElementById('toggleAutoRefresh').checked) {
            startAutoRefresh(); // Restart auto-refresh with new interval
        }
        saveSettingsToCookie(); // Save settings after change
        applySettings();
    } else {
        this.classList.add('is-invalid'); // Show validation error
    }

    form.classList.add('was-validated'); // Bootstrap validation class
});

// Event listener for the Esc key
document.addEventListener('keydown', (event) => {
    const victoryOverlay = document.getElementById('victoryOverlay');
    if (event.key === "Escape" && victoryOverlay.style.display === 'flex') {
        hideVictoryOverlay();
    }
});

// Event listeners for the new toggles
document.getElementById('toggleMusic').addEventListener('change', function () {
    // Existing code to handle music toggle...
    saveSettingsToCookie(); // Save settings after change
    applySettings();
});

document.getElementById('toggleDashboard').addEventListener('change', function () {
    // Existing code to handle dashboard visibility toggle...
    saveSettingsToCookie(); // Save settings after change
    applySettings();
});

document.getElementById('toggleProgressBar').addEventListener('change', function () {
    // Existing code to handle dashboard visibility toggle...
    saveSettingsToCookie(); // Save settings after change
    applySettings();
});

// Additional handling for internal navigation (if needed)
// Replace 'logoElement' and 'homeButton' with the actual IDs or classes of your elements
document.getElementById('homeButton').addEventListener('click', handleInternalNavigation);

function handleInternalNavigation(event) {
    event.preventDefault(); // Prevent default link behavior
    // Refresh the page
    //location.reload();
    //Refresh the ticket data in the background.
    fetchAndUpdateTickets(true);
}
function handleLogoInternalNavigation(event) {
    event.preventDefault(); // Prevent default link behavior
    // Refresh the page
}


document.getElementById('refreshTickets').addEventListener('click', function () {
    fetchAndUpdateTickets(true); // True to refresh data
});


function populateAgentDropdown(callback) {
    console.log("Attempting to populate agents dropdown...");
    fetch('/agents')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Agents data:", data);
            const select = document.getElementById('agentSelect');
            if (!select) {
                throw new Error('Agent select element not found');
            }
            // Clear existing options except the first one
            while (select.options.length > 1) {
                select.remove(1);
            }

            // Sort agents by name
            const sortedAgents = Object.entries(data)
                .sort(([, agentInfoA], [, agentInfoB]) => agentInfoA.name.localeCompare(agentInfoB.name));

            // Populate the select element with sorted agents
            sortedAgents.forEach(([_, agentInfo]) => {
                const option = new Option(agentInfo.name, agentInfo.name); // Set both text and value to agent's name
                select.appendChild(option);
            });

            // Call the callback function if provided, indicating the dropdown has been populated
            if (callback && typeof callback === 'function') {
                callback();
            }
        })
        .catch(error => {
            console.error('Error populating agents dropdown:', error);
        });
}





