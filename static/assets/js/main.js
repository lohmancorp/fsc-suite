document.addEventListener('DOMContentLoaded', () => {
    // Ensure cookies are checked or created at the start
    checkOrCreateCookie();

    const selectedAgentName = readFromCookie('yourName');
    updateProgressBars();
    fetchAndDisplayTicketCounts(selectedAgentName);
    updateDataBasedOnFilters(); // Now calling the new function here
    replacePlaceholdersWithCookieValues();
});

function refreshPageContent() {
    const selectedAgentName = getSelectedAgentName();
    updateProgressBars();
    //fetchAndDisplayTicketCounts(selectedAgentName);
    updateDataBasedOnFilters(); // Now calling the new function here
    replacePlaceholdersWithCookieValues();
}

function getSelectedAgentName() {
    const agentName = readFromCookie('yourName');
    return agentName.selectedAgent; // Ensure this key exists in your cookie structure
}

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

function fetchAndDisplayTicketCounts(selectedAgentName) {
    document.querySelectorAll('.filter-criteria-container').forEach(container => {
        const resultContainerId = container.getAttribute('data-target');
        let filterCriteria = {};
        container.querySelectorAll('[data-filter]').forEach(element => {
            let filterValue = element.getAttribute('data-value');
            if (filterValue === '$selectedAgent' && selectedAgentName) {
                filterValue = selectedAgentName; // Replacing placeholder with actual value
            }
            filterCriteria[element.getAttribute('data-filter')] = filterValue;
        });
        const queryParams = new URLSearchParams(filterCriteria).toString();
        fetch(`/tickets/count?${queryParams}`)
            .then(response => response.json())
            .then(data => document.getElementById(resultContainerId).textContent = data.count)
            .catch(error => console.error('Error fetching ticket count:', error));
    });
}

function replacePlaceholdersWithCookieValues() {
    const placeholderRegex = /\$(\w+)/g;
    document.body.innerHTML = document.body.innerHTML.replace(placeholderRegex, (match, p1) => {
        const cookieValue = readFromCookie(p1);
        return cookieValue || match; // Using cookie value or keeping the placeholder if not found
    });
}

function updateDataBasedOnFilters() {
    const selectedAgentName = getSelectedAgentName(); // Ensure this fetches the latest selected agent name
    document.querySelectorAll('.filter-criteria-container').forEach(container => {
        const resultContainerId = container.getAttribute('data-target');
        let filterCriteria = {};

        container.querySelectorAll('[data-filter]').forEach(element => {
            const filterName = element.getAttribute('data-filter');
            let filterValue = element.getAttribute('data-value');

            // Replace placeholder with the actual selected agent name
            if (filterValue === '$selectedAgent' && selectedAgentName) {
                filterValue = selectedAgentName;
            }

            filterCriteria[filterName] = filterValue;
        });

        const queryParams = new URLSearchParams(filterCriteria).toString();
        fetch(`/tickets/count?${queryParams}`)
            .then(response => response.json())
            .then(data => {
                const targetElement = document.getElementById(resultContainerId);
                if (targetElement) targetElement.textContent = data.count;
            })
            .catch(error => console.error('Error fetching ticket count:', error));
    });
}


// Now, readFromCookie directly uses the provided cookies.js implementation

// document.addEventListener('DOMContentLoaded', () => {
//     // Ensure cookies are checked or created at the start
//     checkOrCreateCookie();

//     const selectedAgentName = readFromCookie('yourName');
//     updateProgressBars();
//     fetchAndDisplayTicketCounts(selectedAgentName);
//     updateDataBasedOnFilters(); // Now calling the new function here
//     replacePlaceholdersWithCookieValues();
// });

window.onload = function() {
    console.log('Page fully loaded. Initializing refresh logic and updating data based on filters.');
    const selectedAgentName = readFromCookie('yourName');
    
    fetchAndDisplayTicketCounts(selectedAgentName);
    updateDataBasedOnFilters(); // Now calling the new function here
    replacePlaceholdersWithCookieValues();

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
    updateProgressBars();
};
