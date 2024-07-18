// ################################################################################
// cookie.js is the home for javascript that manages cookies for FSCS.
//
// Author: Taylor Giddens - taylor.giddens@ingrammicro.com
// Version: 1.1.0-d
// ################################################################################

function checkOrCreateCookie() {
  if (!document.cookie.split('; ').find(row => row.startsWith('fscs='))) {
    // Define the default values for the cookie
    const now = new Date().getTime();
    const defaultValues = {
      "autoRefresh": true,
      "refreshInterval": 30,
      "ticketStats": true,
      "ticketProgressBar": true,
      "lastRefresh": now
    };

    // Calculate the expiry date 30 days from now
    const date = new Date();
    date.setTime(date.getTime() + (30*24*60*60*1000)); // 30 days in milliseconds
    const expires = "expires=" + date.toUTCString();

    // Set the cookie with default values and expiry date
    document.cookie = `fscs=${(JSON.stringify(defaultValues))}; path=/; SameSite=Lax; ${expires}`; // Use "SameSite=None; Secure" if needed

    // Show the modal
    showSettingsModal();
  }
}

function showSettingsModal() {
  // Assuming Bootstrap 5 is used, show the modal using Bootstrap's modal instance
  var myModal = new bootstrap.Modal(document.getElementById('settingsPromptModal'), {
    keyboard: false
  });
  myModal.show();
}

function writeToCookie(key, value) {
  let cookieValue = document.cookie.split('; ').find(row => row.startsWith('fscs=')) || "fscs={}";
  let data = {};

  try {
    data = JSON.parse(cookieValue.substring(5));
  } catch(e) {
    console.error("Error parsing cookie value, initializing a new object", e);
    data = {};
  }

  data[key] = value;
  // Add SameSite=Lax; Secure if your application requires the cookie to be sent in a third-party context
  document.cookie = "fscs=" + JSON.stringify(data) + "; path=/; SameSite=Lax"; // Or SameSite=None; Secure if needed
}
 
function readFromCookie(key) {
  let cookieValue = document.cookie.split('; ').find(row => row.startsWith('fscs='));
  if (cookieValue) {
      try {
          let data = JSON.parse(cookieValue.substring(5)); // Remove "fscs=" part
          console.log(`Reading ${key} from cookie:`, data[key]); // Debugging line
          return data[key] || null; // Return null if the key does not exist
      } catch(e) {
          console.error("Error parsing cookie value", e);
          return null;
      }
  }
  return null;
}
  function doesCookieExist(cookieName) {
    return document.cookie.split(';').some((item) => item.trim().startsWith(`${cookieName}=`));
}