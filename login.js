// Handle the registration form submission
document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("register-name").value.trim();
    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value.trim();
    const passwordConfirm = document.getElementById("register-password-confirm").value.trim();

    if (password !== passwordConfirm) {
        alert("Passwords do not match.");
        return;
    }

    try {
        const response = await fetch("http://localhost:5000/auth/register", {  // Ensure the URL is correct
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password }),
        });

        const result = await response.json();  // Ensure we are parsing JSON

        if (response.ok) {
            alert(result.message || "Registration successful!");
            showLoginForm(); // Show the login form after registration
        } else {
            alert(result.message || "Registration failed.");
        }
    } catch (err) {
        console.error("Error during registration:", err);
        alert("An error occurred. Please try again.");
    }
});

// Toggle between Login and Register forms
function showRegisterForm() {
    document.getElementById("login-form").style.display = "none";
    document.getElementById("register-form").style.display = "block";
}

function showLoginForm() {
    document.getElementById("register-form").style.display = "none";
    document.getElementById("login-form").style.display = "block";
}


// Handle the login form submission
document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value.trim();

    try {
        const response = await fetch("http://localhost:5000/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        const result = await response.json();

        if (response.ok) {
            localStorage.setItem("userEmail", email);
            alert(result.message || "Login successful!");
            window.location.href = "role-selection.html"; // Redirect to role selection page
        } else {
            alert(result.message || "Invalid email or password.");
        }
    } catch (err) {
        console.error("Error during login:", err);
        alert("An error occurred. Please try again.");
    }
});