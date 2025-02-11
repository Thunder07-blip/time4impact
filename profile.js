document.addEventListener('DOMContentLoaded', async () => {
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) {
        alert('User not logged in');
        window.location.href = "login.html"; // Redirect to login page
        return;
    }

    try {
        // Fetch User Info
        const userResponse = await fetch(`/profile/user?email=${encodeURIComponent(userEmail)}`);
        if (!userResponse.ok) throw new Error("Failed to fetch user info");

        const userData = await userResponse.json();
        document.getElementById("userName").textContent = userData.name;
        document.getElementById("userEmail").textContent = userData.email;
    } catch (error) {
        console.error("Error fetching user info:", error);
        alert("Error fetching user profile. Please try again.");
        return;
    }

// Fetch Created Tasks
try {
    const createdTasksResponse = await fetch(`/profile/tasksCreated?email=${encodeURIComponent(userEmail)}`);
    if (!createdTasksResponse.ok) throw new Error("Failed to fetch created tasks");

    const createdTasks = await createdTasksResponse.json();
    const createdTasksContainer = document.getElementById("createdTasks");
    createdTasksContainer.innerHTML = createdTasks.map(task => `
        <div class="task-card">
            <h4>${task.title}</h4>
            <p>${task.description}</p>
            <p><strong>Location:</strong> ${task.location}</p>
            <p><strong>Date:</strong> ${task.date}</p>
            <button onclick="viewVolunteers(${task.id})">View Volunteers</button>
        </div>
    `).join('');
} catch (error) {
    console.error("Error fetching created tasks:", error);
    alert("Error loading created tasks.");
}

    // Fetch Volunteered Tasks
    try {
        const volunteeredTasksResponse = await fetch(`/profile/tasksVolunteered?email=${encodeURIComponent(userEmail)}`);
        if (!volunteeredTasksResponse.ok) throw new Error("Failed to fetch volunteered tasks");

        const volunteeredTasks = await volunteeredTasksResponse.json();
        const volunteeredTasksContainer = document.getElementById("volunteeredTasks");
        volunteeredTasksContainer.innerHTML = volunteeredTasks.map(task => `
            <div class="task-card">
                <h4>${task.title}</h4>
                <p>${task.description}</p>
                <p><strong>Location:</strong> ${task.location}</p>
                <p><strong>Date:</strong> ${task.volunteerDate}</p>
                <button class="unvolunteer-btn" onclick="unvolunteer(${task.taskId}, '${task.volunteerDate}', '${task.startTime}', '${task.endTime}')">Unvolunteer</button>
            </div>
        `).join('');
    } catch (error) {
        console.error("Error fetching volunteered tasks:", error);
        alert("Error loading volunteered tasks.");
    }
});

// Function to unvolunteer from a task
async function unvolunteer(taskId, date, startTime, endTime) {
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) {
        alert('User not logged in');
        return;
    }

    try {
        const res = await fetch('/profile/unvolunteer', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail, taskId, volunteerDate: date, startTime, endTime })
        });

        const data = await res.json();

        if (data.success) {
            alert('Successfully unvolunteered.');
            location.reload();
        } else {
            alert('Could not unvolunteer.');
        }
    } catch (error) {
        console.error('Error unvolunteering:', error);
    }
}
