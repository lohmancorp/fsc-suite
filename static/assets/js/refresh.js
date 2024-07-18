// Global scope variables
window.globalTickets = [];
window.isFetchAndUpdateRunning = false;
window.refreshTimeoutId = null;

// Check or create cookie at the beginning
checkOrCreateCookie();

function initializeRefreshLogic() {
// Step 1: Check if the cookie exists
    if (!doesCookieExist('fscs')) {
        console.log('Cookie fscs does not exist. Exiting.');
        return;
    }

    // Step 2: Check if the cookie has expected values
    const autoRefresh = readFromCookie('autoRefresh');
    const refreshInterval = readFromCookie('refreshInterval'); // Expected in minutes
    const lastRefresh = readFromCookie('lastRefresh');

    if (!autoRefresh || !refreshInterval || !lastRefresh) {
        console.log(`Missing values - AutoRefresh: ${autoRefresh}, RefreshInterval: ${refreshInterval}, LastRefresh: ${lastRefresh}`);
        return;
    }

    // Correctly interpreting the 'autoRefresh' value as a string
    if (autoRefresh !== true) {
        console.log('autoRefresh is not enabled.');
        return;
    }

    scheduleNextRefresh(refreshInterval, lastRefresh);
}


function scheduleNextRefresh(refreshInterval, lastRefresh) {
    // Step 3: Calculate time remaining till next refresh
    const timeSinceLastRefresh = (new Date().getTime() - lastRefresh) / 1000; // Convert milliseconds to seconds
    const refreshIntervalInSeconds = parseInt(refreshInterval) * 60; // Convert minutes to seconds
    const refreshCountdown = refreshIntervalInSeconds - timeSinceLastRefresh;

    // Calculate minutes and seconds for the countdown
    const minutesLeft = Math.floor(refreshCountdown / 60);
    const secondsLeft = Math.floor(refreshCountdown % 60);

    // Log the time till next refresh in a more readable format: minutes and seconds
    console.log(`Time till next refresh: ${minutesLeft} minutes and ${secondsLeft} seconds`);

    // Step 4: Evaluate refreshCountdown value
    if (refreshCountdown <= 0) {
        // Step 5: Check if a fetch-and-update operation is already running
        if (!window.isFetchAndUpdateRunning) {
            fetchAndUpdateTickets(true); // Step 6: Update globalTickets
        } else {
            console.log('Fetch and update operation is already running. Scheduling next attempt.');
            scheduleRefreshAfterDelay(refreshIntervalInSeconds);
        }
    } else {
        // If countdown is positive, schedule next check after the countdown period
        scheduleRefreshAfterDelay(refreshCountdown);
    }
}

function fetchAndUpdateTickets(refresh) {
    console.log('Starting fetchAndUpdateTickets operation');
    window.isFetchAndUpdateRunning = true;
    showStartToast();

    fetch('/tickets' + (refresh ? '?refresh=true' : ''))
        .then(response => response.json())
        .then(tickets => {
            window.globalTickets = tickets;
            console.log('Tickets data updated in globalTickets');
            refreshPageContent();
            showEndToast();
        })
        .catch(error => {
            console.error('Error during fetchAndUpdateTickets:', error);
            showEndToast();
        })
        .finally(() => {
            window.isFetchAndUpdateRunning = false;
            const now = new Date().getTime();
            writeToCookie('lastRefresh', now);
            // Immediately schedule the next refresh
            const refreshInterval = readFromCookie('refreshInterval');
            scheduleNextRefresh(refreshInterval, now);
        });
}



function scheduleRefreshAfterDelay(seconds) {
    // Clear any existing timeout
    if (window.refreshTimeoutId !== null) {
        clearTimeout(window.refreshTimeoutId);
    }
    // Schedule the next refresh    
    window.refreshTimeoutId = setTimeout(() => {
        // Directly invoke the refresh logic without waiting for user interaction
        initializeRefreshLogic();
    }, seconds * 1000); // Convert seconds back to milliseconds
}

function showStartToast() {
    const toastElementStart = document.getElementById('refreshToastStart');
    const refreshIcon = document.querySelector('#homeButton .bi-arrow-clockwise');
    const reloadButtonText = document.querySelector('#homeButton span');

    if (toastElementStart && refreshIcon && reloadButtonText) {
        const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        toastElementStart.querySelector('.text-body-secondary').textContent = currentTime;

        // Initialize and show the start toast
        const toastStart = new bootstrap.Toast(toastElementStart); // Ensures consistency in toast management
        toastStart.show();

        refreshIcon.classList.add('rotating'); // Indicate loading process
        reloadButtonText.textContent = 'Reloading'; // Update button text

        // Optionally, hide the start toast after a certain duration if desired
        setTimeout(() => {
            toastStart.hide(); // This could be removed if you want the start toast to stay visible until explicitly hidden
        }, 3000); // Adjust the duration based on your UX preferences
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
        
        // Initialize the toast using the Bootstrap Toast component
        const toastEnd = new bootstrap.Toast(toastElementEnd); // Create a Toast instance for the end toast
        toastEnd.show(); // Show the end toast
        
        refreshIcon.classList.remove('rotating');  // Stop rotating
        reloadButtonText.textContent = 'Reload'; // Restore text to 'Reload'

        // Check and hide the start toast if it's visible
        const toastElementStart = document.getElementById('refreshToastStart');
        if (toastElementStart) {
            const toastStart = new bootstrap.Toast(toastElementStart); // Assuming it's already initialized elsewhere
            toastStart.hide(); // Attempt to hide the start toast
        }

        setTimeout(() => {
            // Hide the end toast after a delay
            toastEnd.hide();
        }, 3000); // Hide the end toast after 3 seconds
    } else {
        console.error('End toast element, icon, or button text not found');
    }
}

// Initialize the refresh logic on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded. Checking for refresh logic initialization.');
    initializeRefreshLogic();
    updateDataBasedOnFilters(); // Now calling the new function here
});