document.addEventListener("DOMContentLoaded", async () => {
    await fetchTasks(); // Fetch tasks from the server
    flatpickr("#date-filter", { dateFormat: "Y-m-d" });
    document.getElementById("apply-filters").addEventListener("click", applyFilters);
});

let tasks = [];

// Fetch tasks from the server
async function fetchTasks() {
    try {
        const response = await fetch("http://localhost:5000/tasks");
        if (!response.ok) {
            throw new Error("Failed to fetch tasks");
        }
        tasks = await response.json();
        populateFeed(tasks);
    } catch (error) {
        console.error("Error fetching tasks:", error);
    }
}

// Populate the feed with tasks
function populateFeed(filteredPosts) {
    const feedContainer = document.getElementById("feed-container");
    feedContainer.innerHTML = "";

    filteredPosts.forEach((post) => {
        const postCard = document.createElement("div");
        postCard.className = "post-card";

        postCard.innerHTML = `
            <h2>${post.title}</h2>
            <p><strong>Description:</strong> ${post.description}</p>
            <p><strong>Location:</strong> ${post.location}</p>
            <p><strong>Start Date:</strong> ${post.startDate}</p>
            <p><strong>End Date:</strong> ${post.endDate}</p>
            <p><strong>Time:</strong> ${post.startTime} - ${post.endTime}</p>
            <label>Select Dates:</label>
            <input type="text" class="multi-date-picker" placeholder="Select dates">
            <div class="time-picker-container"></div>
            <div class="error-message">Invalid time selection. Please follow the constraints.</div>
            <button class="volunteer-btn">Volunteer</button>
        `;

        feedContainer.appendChild(postCard);

        // Initialize Flatpickr for multi-date selection
        flatpickr(postCard.querySelector(".multi-date-picker"), {
            mode: "multiple",
            dateFormat: "Y-m-d",
            minDate: post.startDate,
            maxDate: post.endDate,
            onChange: (selectedDates) => updateTimePickers(postCard, selectedDates, post.startTime, post.endTime),
        });

        // Handle volunteer button click
        postCard.querySelector(".volunteer-btn").addEventListener("click", () => handleVolunteer(post, postCard));
    });
}

// Update time pickers for selected dates
function updateTimePickers(postCard, selectedDates, allowedStartTime, allowedEndTime) {
    const timePickerContainer = postCard.querySelector(".time-picker-container");
    timePickerContainer.innerHTML = ""; // Clear previous pickers

    selectedDates.forEach((date) => {
        const localDate = new Date(date);
        localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset()); // Adjust to local time
        
        const dateFormatted = localDate.toISOString().split("T")[0];// Convert to YYYY-MM-DD

        const dateContainer = document.createElement("div");
        dateContainer.className = "time-picker-group";
        dateContainer.innerHTML = `
            <label>${dateFormatted}:</label>
            <input type="time" class="time-picker start-time" min="${allowedStartTime}" max="${allowedEndTime}">
            <input type="time" class="time-picker end-time" min="${allowedStartTime}" max="${allowedEndTime}">
        `;
        timePickerContainer.appendChild(dateContainer);
    });
}

function applyFilters() {
    const locationInput = document.getElementById("location-filter");
    const dateInput = document.getElementById("date-filter");
    // const skillInput = document.getElementById("skill-filter");

    // Check if elements exist before accessing their values
    const locationFilter = locationInput ? locationInput.value.toLowerCase() : "";
    const dateFilter = dateInput ? dateInput.value : "";
    // const skillFilter = skillInput ? skillInput.value : "";

    // Convert selected filter date to a Date object (if provided)
    const filterDate = dateFilter ? new Date(dateFilter) : null;

    const filteredTasks = tasks.filter((task) => {
        const matchesLocation = locationFilter ? task.location.toLowerCase().includes(locationFilter) : true;
        // const matchesSkill = skillFilter ? task.skill === skillFilter : true;

        // Normalize task start and end dates
        const taskStartDate = new Date(task.startDate);
        const taskEndDate = new Date(task.endDate);

        // Ensure the filter date is within the task's range
        const matchesDate = filterDate ? (filterDate >= taskStartDate && filterDate <= taskEndDate) : true;

        // return matchesLocation && matchesSkill && matchesDate;
        return matchesLocation && matchesDate;
    });

    populateFeed(filteredTasks);
}

// Handle volunteering process
async function handleVolunteer(post, postCard) {
    const timePickerGroups = postCard.querySelectorAll(".time-picker-group");
    const errorMessage = postCard.querySelector(".error-message");

    let isValid = true;
    const selectedTimes = [];

    timePickerGroups.forEach((group) => {
        const date = group.querySelector("label").textContent.trim();
        const startTime = group.querySelector(".start-time").value;
        const endTime = group.querySelector(".end-time").value;

        if (!startTime || !endTime) {
            isValid = false;
            return;
        }

        // Convert to Date objects
        const startDateTime = new Date(`${date}T${startTime}`);
        const endDateTime = new Date(`${date}T${endTime}`);
        const allowedStartTime = new Date(`${date}T${post.startTime}`);
        const allowedEndTime = new Date(`${date}T${post.endTime}`);

        console.log("Selected Start:", startDateTime);
        console.log("Selected End:", endDateTime);
        console.log("Allowed Start:", allowedStartTime);
        console.log("Allowed End:", allowedEndTime);

        // Ensure valid time selection
        if (startDateTime >= endDateTime || startDateTime < allowedStartTime || endDateTime > allowedEndTime) {
            isValid = false;
            return;
        }

        selectedTimes.push({ date, startTime, endTime });
    });

    if (!isValid || selectedTimes.length === 0) {
        errorMessage.style.display = "block";
        alert("Invalid time selection. Ensure start time is before end time and within allowed hours.");
        return;
    }

    errorMessage.style.display = "none";

    const userEmail = localStorage.getItem("userEmail");
    if (!userEmail) {
        alert("Please log in to volunteer.");
        return;
    }

    // Check for duplicate volunteer entries
    for (const selectedTime of selectedTimes) {
        const { date, startTime, endTime } = selectedTime;

        try {
            const response = await fetch("http://localhost:5000/checkVolunteer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ taskId: post.id, date, startTime, endTime, userEmail })
            });

            const data = await response.json();
            if (data.exists) {
                alert(`You have already volunteered for this task on ${date} at this time.`);
                return;
            }
        } catch (error) {
            console.error("Error checking volunteer entry:", error);
            alert("Error checking volunteer data. Try again.");
            return;
        }
    }

    // Prepare data for submission
    const volunteerData = {
        taskId: post.id,
        taskName: post.title,
        taskDescription: post.description,
        location: post.location,
        selectedTimes,
        userEmail
    };

    fetch("http://localhost:5000/volunteer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(volunteerData),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(`Successfully volunteered for "${post.title}"!`);
        } else {
            alert("Error saving volunteer data. Try again.");
        }
    })
    .catch(error => {
        console.error("Error volunteering:", error);
        alert("Error volunteering. Please try again.");
    });
}


