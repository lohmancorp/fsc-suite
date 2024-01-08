/**
 * utilities.js
 * This module contains utility functions for date formatting, UI manipulation, and more.
 */

// Function to format date and time from a string
function formatDateTime(dateTimeStr) {
    if (!dateTimeStr) return "";
    const dateTime = new Date(dateTimeStr);
    const date = dateTime.toISOString().split('T')[0];
    const time = dateTime.toTimeString().split(' ')[0].substring(0, 5);
    return `${date} - ${time}`;
}

// Function to create a formatted badge element for escalated and overdue statuses
function formatBadge(value) {
    return value ? '<span class="badge bg-danger-subtle border border-danger-subtle text-danger-emphasis rounded-pill">Yes</span>' : 'No';
}

// Function to toggle the visibility of columns in the tickets table
function toggleColumnVisibility(column, isVisible) {
    document.querySelectorAll(`#ticketsTable td:nth-child(${column}), #ticketsTable th:nth-child(${column})`)
        .forEach(cell => {
            cell.style.display = isVisible ? '' : 'none';
        });
}

// Function to get a random loading audio file
function getRandomLoadingAudio() {
    const audios = [
        '/static/assets/music/loading_1.mp3',
        '/static/assets/music/loading_2.mp3',
        '/static/assets/music/loading_3.mp3',
        '/static/assets/music/loading_4.mp3'
    ];
    const randomIndex = Math.floor(Math.random() * audios.length);
    return new Audio(audios[randomIndex]);
}

// Function to show the loading overlay and play audio
function showLoadingOverlay() {
    const loadingAudio = getRandomLoadingAudio();
    document.getElementById('loadingOverlay').style.display = 'flex';
    loadingAudio.play();
    return loadingAudio;
}

// Function to hide the loading overlay and stop audio
function hideLoadingOverlay(loadingAudio) {
    document.getElementById('loadingOverlay').style.display = 'none';
    if (loadingAudio) {
        loadingAudio.pause();
        loadingAudio.currentTime = 0;
    }
}