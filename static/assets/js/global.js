// function showStartToast() {
//     const toastElement = document.getElementById('refreshToastStart');
//     const refreshIcon = document.querySelector('#homeButton .bi-arrow-clockwise');
//     const reloadButtonText = document.querySelector('#homeButton span');

//     if (toastElement && refreshIcon && reloadButtonText) {
//         const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
//         toastElement.querySelector('.text-body-secondary').textContent = currentTime;
//         const toast = new bootstrap.Toast(toastElement);
//         toast.show();
//         refreshIcon.classList.add('rotating');  // Start rotating
//         reloadButtonText.textContent = ' Reloading'; // Update text to 'Reloading'
//     } else {
//         console.error('Toast element, icon, or button text not found');
//     }
// }

// function showEndToast() {
//     const toastElementEnd = document.getElementById('refreshToastEnd');
//     const refreshIcon = document.querySelector('#homeButton .bi-arrow-clockwise');
//     const reloadButtonText = document.querySelector('#homeButton span');

//     if (toastElementEnd && refreshIcon && reloadButtonText) {
//         const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
//         document.querySelector('#refreshToastEnd .text-body-secondary').textContent = currentTime;
//         refreshToastEnd.show();
//         refreshIcon.classList.remove('rotating');  // Stop rotating
//         reloadButtonText.textContent = ' Reload'; // Restore text to 'Reload'

//         setTimeout(() => {

//             refreshToastStart.hide();
//             refreshToastEnd.hide();

//         }, 3000); // Hide both toasts after 3 seconds
//     } else {
//         console.error('End toast element, icon, or button text not found');
//     }
// }

// function handleLogoInternalNavigation(event) {
//     event.preventDefault(); // Prevent default link behavior
//     // Refresh the page
// }

// document.getElementById('homeButton').addEventListener('click', handleInternalNavigation);

// function handleInternalNavigation(event) {
//     event.preventDefault(); // Prevent default link behavior
//     // Refresh the page
//     //location.reload();
//     //Refresh the ticket data in the background.
//     fetchAndUpdateTickets(true);
// }