// Initialize Leaflet Map
const map = L.map('map').setView([18.5204, 73.8567], 13); // Default view: Pune, India

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Marker for location
let locationMarker;

// Function to geocode location name
async function geocodeLocation(locationName) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}`);
        const results = await response.json();

        if (results && results.length > 0) {
            const { lat, lon } = results[0];
            const latitude = parseFloat(lat);
            const longitude = parseFloat(lon);

            // Set marker on the map
            if (locationMarker) {
                locationMarker.setLatLng([latitude, longitude]);
            } else {
                locationMarker = L.marker([latitude, longitude]).addTo(map);
            }

            // Center the map on the location
            map.setView([latitude, longitude], 13);

            // Update the location input with coordinates
            document.getElementById('location-input').value = locationName;
        } else {
            alert('Location not found. Please try a different name.');
        }
    } catch (error) {
        console.error('Error geocoding location:', error);
        alert('An error occurred while fetching the location. Please try again.');
    }
}

// Handle location input changes
const locationInput = document.getElementById('location-input');
locationInput.addEventListener('change', () => {
    const locationName = locationInput.value;
    if (locationName) {
        geocodeLocation(locationName);
    }
});

// Allow dropping a pin on the map
map.on('click', function (e) {
    const { lat, lng } = e.latlng;

    // Add or update marker
    if (locationMarker) {
        locationMarker.setLatLng([lat, lng]);
    } else {
        locationMarker = L.marker([lat, lng]).addTo(map);
    }

    // Reverse geocode to update the input with a readable location
    reverseGeocode(lat, lng);
});

// Function to reverse geocode coordinates
async function reverseGeocode(lat, lng) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const result = await response.json();

        if (result && result.display_name) {
            document.getElementById('location-input').value = result.display_name;
        } else {
            document.getElementById('location-input').value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        }
    } catch (error) {
        console.error('Error reverse geocoding location:', error);
        document.getElementById('location-input').value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
}

// Function to validate date and time inputs
function validateDateTime(startDate, endDate, startTime, endTime) {
    const today = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Check if start date and end date are valid and on or after today
    if (start < today.setHours(0, 0, 0, 0)) {
        alert("Start date must be today or later.");
        return false;
    }
    if (end < start) {
        alert("End date must be on or after the start date.");
        return false;
    }

    if (startTime >= endTime) {
        alert("End time must be later than start time!");
        return fasle;
    }

    // Validate time only if both are provided
    if (startDate === endDate && startTime && endTime) {
        const startTimeValue = new Date(`1970-01-01T${startTime}`);
        const endTimeValue = new Date(`1970-01-01T${endTime}`);

        if (startTimeValue >= endTimeValue) {
            alert("Start time must be before end time.");
            return false;
        }
    }

    return true;
}

// Handle form submission
document.getElementById("create-post-form").addEventListener("submit", async function (e) {
    e.preventDefault();

    const title = document.getElementById("title").value.trim();
    const description = document.getElementById("description").value.trim();
    const location = document.getElementById("location-input").value.trim();
    const startDate = document.getElementById("start-date").value;
    const endDate = document.getElementById("end-date").value;
    const startTime = document.getElementById("start-time").value;
    const endTime = document.getElementById("end-time").value;

    // Retrieve user email from localStorage
    const userEmail = localStorage.getItem("userEmail");

    if (!userEmail) {
        alert("You need to log in to create a task.");
        window.location.href = "login.html";
        return;
    }

    // Validate date and time
    if (!validateDateTime(startDate, endDate, startTime, endTime)) {
        return;
    }

    const task = { title, description, location, startDate, endDate, startTime, endTime, userEmail };

    try {
        const response = await fetch("http://localhost:5000/tasks/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(task),
        });


        if (!response.ok) {
            const text = await response.text(); // Get raw response
            throw new Error(`Server error: ${response.status} - ${text}`);
        }

        const result = await response.json();
        alert(result.message);
        window.location.href = "feedgpt.html";
    } catch (err) {
        console.error("Error creating task:", err);
        alert(`Failed to create task: ${err.message}`);
    }
});

