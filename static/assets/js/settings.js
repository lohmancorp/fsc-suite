/**
 * settings.js
 * This module handles saving to and retrieving settings from cookies.
 */

// Function to save settings to a cookie
function saveSettingsToCookie() {
    const settings = {
        columnVisibility: {},
        filterCategory: document.getElementById('filterCategory').value,
        filterValue: document.getElementById('filterValue').value,
        focusFilter: document.getElementById('focusFilter').value // Adding focus filter to settings
    };

    // Iterate over column checkboxes to store visibility settings
    document.querySelectorAll('.column-toggle').forEach(checkbox => {
        settings.columnVisibility[checkbox.dataset.column] = checkbox.checked;
    });

    // Save the settings object as a JSON string in a cookie
    document.cookie = `fsc-settings=${JSON.stringify(settings)};path=/`;
}

// Function to get settings from a cookie
function getSettingsFromCookie() {
    const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith('fsc-settings='));
    return cookieValue ? JSON.parse(cookieValue.split('=')[1]) : {};
}

// Function to apply settings from cookies to the page
function applySettings() {
    const settings = getSettingsFromCookie();

    // Apply column visibility settings
    Object.keys(settings.columnVisibility || {}).forEach(column => {
        const isVisible = settings.columnVisibility[column];
        toggleColumnVisibility(column, isVisible);

        // Update the checkbox state
        const checkbox = document.querySelector(`.column-toggle[data-column="${column}"]`);
        if (checkbox) {
            checkbox.checked = isVisible;
        }
    });

    // Apply filters if they are set
    if (settings.filterCategory) {
        document.getElementById('filterCategory').value = settings.filterCategory;
        // Update the filter value dropdown and apply the filter
        updateFilterValueDropdown(() => {
            if (settings.filterValue) {
                document.getElementById('filterValue').value = settings.filterValue;
                filterRows();
            }
        });
    }

    // Apply focus filter if it's set
    if (settings.focusFilter) {
        document.getElementById('focusFilter').value = settings.focusFilter;
    }

    // Ensure filterRows is called after all dropdowns have been set
    filterRows();
}
