function applyCookieValues() {
    const watchedInputs = ['yourName', 'yourGroups', 'autoRefresh', 'refreshInterval', 'siteNotifications', 'darkMode', 'ticketStats', 'ticketProgressBar']; // IDs of inputs to watch and update

    watchedInputs.forEach(inputId => {
        const inputElement = document.getElementById(inputId);
        if (inputElement) {
            const storedValue = readFromCookie(inputId); // Use your existing readFromCookie function
            console.log(`ID: ${inputId}, Stored Value: ${storedValue}, Type: ${inputElement.type}`); // Debug line
            if (storedValue !== null) {
                if (inputElement.type === 'checkbox') {
                    // Ensure boolean conversion for checkboxes
                    inputElement.checked = storedValue == true;
                } else {
                    // For other inputs like text or range, set their value directly
                    inputElement.value = storedValue;
                }
            }
        }
    });
}

function applyLabels() {
    const checkboxIds = ['autoRefresh', 'siteNotifications', 'darkMode', 'ticketStats', 'ticketProgressBar'];
    checkboxIds.forEach(id => {
        const checkbox = document.getElementById(id);
        const label = document.querySelector(`label[for="${id}"]`);

        function updateLabel() {
            label.innerText = checkbox.checked ? "Activated" : "Deactivated";
        }

        // Set initial label state based on the checkbox checked state on page load
        updateLabel();

        // Add event listener to change label text when the checkbox state changes
        checkbox.addEventListener('change', updateLabel);
    });
}

// Function to push changes to UI for Auto-Refresh Interval configuration element.
function syncRefreshIntervalOutput() {
    // Assuming 'refreshInterval' is the ID of your range input connected to the 'refreshIntervalOutput' element
    const refreshIntervalInput = document.getElementById('refreshInterval');
    const refreshIntervalOutput = document.getElementById('refreshIntervalOutput');

    if (refreshIntervalInput && refreshIntervalOutput) {
        // Function to update the output's value based on the input's current value
        function updateOutput() {
            refreshIntervalOutput.value = refreshIntervalInput.value;
            refreshIntervalOutput.innerText = refreshIntervalInput.value; // Update display text
        }

        // Initialize the output value on page load
        updateOutput();

        // Add event listener to update output when the input value changes
        refreshIntervalInput.addEventListener('input', updateOutput);
        //updateAutoRefreshInterval(refreshIntervalInput);
    }
}

// Function to update and select the groups in the select options
function updateGroupsSelect(groups) {
    const groupsSelect = document.getElementById("yourGroups");
    groupsSelect.innerHTML = '';
    groups.forEach(group => {
        const option = document.createElement("option");
        option.textContent = group;
        option.value = group;
        option.selected = true;
        groupsSelect.appendChild(option);
    });
    applyGroupSelectionsFromCookie();// here if you want to reapply selections after updating groups
}

function applyGroupSelectionsFromCookie() {
    const storedValue = readFromCookie('yourGroups');
    console.log("Applying stored groups from cookie:", storedValue);

    // Check if storedValue is not null and is a string
    if (storedValue !== null && typeof storedValue === 'string') {
        try {
            // Attempt to parse the stored string back into an array
            const groupsArray = JSON.parse(storedValue);
            if (Array.isArray(groupsArray)) {
                const groupsSelect = document.getElementById("yourGroups");
                // Ensure existing options are cleared if you're repopulating the select
                groupsSelect.innerHTML = '';
                groupsArray.forEach(group => {
                    let option = document.createElement("option");
                    option.textContent = group;
                    option.value = group;
                    option.selected = true; // Mark the option as selected
                    groupsSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error("Error parsing 'yourGroups' from cookie:", error);
        }
    }
}

function updateThemePreference() {
    if (darkModeCheckbox.checked) {
        localStorage.setItem("theme", "dark");
    } else {
        localStorage.setItem("theme", "light");
    }
}

document.addEventListener("DOMContentLoaded", function() {
    const inputField = document.getElementById("yourName");
    const resultsContainer = document.getElementById("searchResults");
    const groupsSelect = document.getElementById("yourGroups");
    const darkModeCheckbox = document.getElementById("darkMode");
    
    let agents = []; // Initialize an empty array to store all agents

    // Function to toggle class based on dark mode state and update label text
    function applyTheme(isDarkMode) {
        document.body.classList.toggle("dark-theme", isDarkMode);
        document.body.classList.toggle("light-theme", !isDarkMode);
        // Update the label text based on the dark mode state
        document.querySelector('label[for="darkMode"]').textContent = isDarkMode ? "Activated" : "Deactivated";
    }

    // Function to update theme preference and toggle immediately
    function updateThemePreference() {
        const isDarkMode = darkModeCheckbox.checked;
        localStorage.setItem("theme", isDarkMode ? "dark" : "light");
        applyTheme(isDarkMode); // Apply theme changes immediately
        writeToCookie("darkMode", isDarkMode); // Optionally save this preference to a cookie as well
    }

    // Apply cookie values to form inputs
    applyCookieValues();
    applyLabels();
    syncRefreshIntervalOutput();

    // Apply initial theme based on saved preference or default
    const savedTheme = localStorage.getItem("theme") || "light"; // Assume "light" as default if not set
    darkModeCheckbox.checked = savedTheme === "dark";
    applyTheme(savedTheme === "dark");

    // Listener for the dark mode toggle
    darkModeCheckbox.addEventListener('change', updateThemePreference);

    // Fetch all agents and apply group selections
    fetch(`/agents`)
        .then(response => response.json())
        .then(data => {
            agents = data.agents || []; // Directly access the 'agents' array from the response
            agents.sort((a, b) => a.name.localeCompare(b.name));
            applyGroupSelectionsFromCookie();
        })
        .catch(error => console.error('Error fetching agents:', error));

    // Updated function to handle group selections based on the agent
    function updateGroupsSelect(groups) {
        const groupsSelect = document.getElementById("yourGroups");
        groupsSelect.innerHTML = '';
        groups.forEach(group => {
            const option = document.createElement("option");
            option.textContent = group; // Assuming group is a string. Adjust if it's an object.
            option.value = group; // Same as above
            option.select = true;
            groupsSelect.appendChild(option);
        });
        // Call applyGroupSelectionsFromCookie() if needed to reapply selections
    }

    // Handle input field interactions for agent search
    inputField.addEventListener("input", function() {
        const query = inputField.value.trim().toLowerCase();
        resultsContainer.innerHTML = '';

        if (query.length > 0) {
            agents.filter(agent => agent.name.toLowerCase().includes(query))
                .forEach(agent => {
                    const div = document.createElement("div");
                    div.textContent = agent.name;
                    div.className = "search-result-item";
                    div.addEventListener("click", function() {
                        inputField.value = agent.name;
                        resultsContainer.innerHTML = '';
                        updateGroupsSelect(agent.groups);
                        writeToCookie(inputField.id, inputField.value);
                        // Convert agent.groups array to a string for cookie storage
                        writeToCookie("yourGroups", JSON.stringify(agent.groups));
                    });
                    resultsContainer.appendChild(div);
                });
        }
    });

    // Watch inputs for changes and write changes to the cookie
    const watchedInputs = ['yourName', 'autoRefresh', 'refreshInterval', 'siteNotifications', 'darkMode', 'ticketStats', 'ticketProgressBar'];

    watchedInputs.forEach(inputId => {
        const inputElement = document.getElementById(inputId);
        if (inputElement) {
            const eventType = inputElement.type === 'checkbox' ? 'change' : 'input';
            inputElement.addEventListener(eventType, function() {
                const valueToStore = inputElement.type === 'checkbox' ? inputElement.checked : inputElement.value;
                writeToCookie(inputElement.id, valueToStore);

            });
        }
    });
});
