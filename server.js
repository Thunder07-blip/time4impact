const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const bodyParser = require('body-parser');
const crypto = require("crypto");
const cors = require("cors");

const app = express();

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "MySQL",
    database: "t4i",
});

db.connect((err) => {
    if (err) {
        console.error("Database connection failed:", err);
        process.exit(1);
    }
    console.log("Connected to MySQL database");
});

app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.json());
app.use(cors());

// Function to generate a random session token
function generateToken() {
    return crypto.randomBytes(32).toString("hex");  // 64-character random token
}

//login route
app.post("/auth/login", async (req, res) => {
    const { email, password } = req.body;

if (!email || !password) {
        return res.status(400).json({ message: "Please fill in all fields." });
    }

    try {
        // Query the database to find the user by email
        db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
            if (err) {
                console.error("Error during login:", err.message);
                return res.status(500).json({ message: "An error occurred. Please try again." });
            }

            if (results.length === 0) {
                return res.status(400).json({ message: "Invalid email or password." });
            }

            // Compare password with hashed password in the database
            const user = results[0];
            const isPasswordValid = await bcrypt.compare(password, user.password);

            if (!isPasswordValid) {
                return res.status(400).json({ message: "Invalid email or password." });
            }

            // If credentials are valid, send a success response
            res.status(200).json({ message: "Login successful", userId: user.id });
        });

    } catch (err) {
        console.error("Unexpected error during login:", err.message);
        res.status(500).json({ message: "An unexpected error occurred. Please try again." });
    }
});



// Register route
app.post("/auth/register", async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: "All fields are required." });
    }

    try {
            // Hash password
            const hashedPassword = await bcrypt.hash(password, 8);
    
            // SQL query to insert the user into the database
            const query = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";
    
            // Insert user into the database
            db.query(query, [name, email, hashedPassword], (err, results) => {
                if (err) {
                    console.error("Error during registration:", err.message);
                    return res.status(500).json({ message: "Error registering user. Please try again." });
                }
    
                // User registered successfully
                res.status(201).json({ message: "User registered successfully." });
            });
        } catch (err) {
            console.error("Unexpected error during registration:", err.message);
            res.status(500).json({ message: "An unexpected error occurred. Please try again." });
        }
    });


// Handle task creation
app.post("/tasks/create", (req, res) => {
    console.log("Received request to create task:", req.body); // Debugging log

    const { title, description, location, startDate, endDate, startTime, endTime, userEmail } = req.body;

    if (!userEmail) {
        return res.status(401).json({ message: "Unauthorized. Please log in." });
    }

    if (!title || !description || !location || !startDate || !endDate || !startTime || !endTime) {
        return res.status(400).json({ message: "All fields are required." });
    }

    const query = "INSERT INTO tasks (title, description, location, startDate, endDate, startTime, endTime, userEmail) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

    db.query(query, [title, description, location, startDate, endDate, startTime, endTime, userEmail], (err) => {
        if (err) {
            console.error("⚠️ Error saving task:", err); // Log the full error
            return res.status(500).json({ message: "Error saving task. Try again.", error: err.message });
        }

        res.status(201).json({ message: "Task created successfully." });
    });
});

// Fetch tasks
app.get("/tasks", (req, res) => {
    const query = `
        SELECT id, title, description, location,
        DATE_FORMAT(startDate, '%Y-%m-%d') AS startDate,
        DATE_FORMAT(endDate, '%Y-%m-%d') AS endDate,
        startTime, endTime
        FROM tasks
    `;

    db.query(query, (error, results) => {
        if (error) {
            console.error("Error fetching tasks:", error);
            return res.status(500).json({ message: "Error fetching tasks." });
        }

        res.json(results); // results is an array, directly send it
    });
});


// Check if a volunteer entry already exists
app.post("/checkVolunteer", (req, res) => {
    const { taskId, date, startTime, endTime, userEmail } = req.body;

    const query = `
        SELECT 1 FROM volunteers
        WHERE taskId = ? AND dateVolunteered = ? AND startTime = ? AND endTime = ? AND userEmail = ?
    `;

    db.query(query, [taskId, date, startTime, endTime, userEmail], (err, results) => {
        if (err) {
            console.error("Error checking volunteer entry:", err);
            return res.status(500).json({ message: "Error checking volunteer entry." });
        }

        res.json({ exists: results.length > 0 });
    });
});

// Handle volunteer signup
app.post('/volunteer', async (req, res) => {
    const { taskId, taskName, taskDescription, location, selectedTimes, userEmail } = req.body;

    if (!taskId || !taskName || !taskDescription || !location || !selectedTimes || !userEmail) {
        return res.status(400).json({ message: "All fields are required" });
    }

    try {
        for (const { date, startTime, endTime } of selectedTimes) {
            const checkQuery = `
                SELECT 1 FROM volunteers
                WHERE taskId = ? AND dateVolunteered = ? AND startTime = ? AND endTime = ? AND userEmail = ?
            `;

            const [existingEntries] = await db.promise().query(checkQuery, [taskId, date, startTime, endTime, userEmail]);

            if (existingEntries.length > 0) {
                continue; // Skip duplicate entries
            }

            const insertQuery = `
                INSERT INTO volunteers (taskId, taskName, taskDescription, location, dateVolunteered, startTime, endTime, userEmail)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            await db.promise().query(insertQuery, [taskId, taskName, taskDescription, location, date, startTime, endTime, userEmail]);
        }

        res.status(200).json({ success: true, message: "Volunteer data saved successfully." });
    } catch (err) {
        console.error("Error saving volunteer data:", err);
        res.status(500).json({ success: false, message: "Error saving volunteer data. Please try again." });
    }
});

// Fetch user profile data
app.get('/profile/user', (req, res) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    const query = "SELECT name, email FROM users WHERE email = ?";
    db.query(query, [email], (err, results) => {
        if (err) {
            console.error("Error fetching user data:", err);
            return res.status(500).json({ message: "Error fetching user data" });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(results[0]);
    });
});

// Fetch user profile data
app.get('/profile/user', (req, res) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    const query = "SELECT name, email FROM users WHERE email = ?";
    db.query(query, [email], (err, results) => {
        if (err) {
            console.error("Error fetching user data:", err);
            return res.status(500).json({ message: "Error fetching user data" });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(results[0]);
    });
});


// Fetch tasks created by the user
app.get('/profile/tasksCreated', (req, res) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    const query = `
        SELECT id, title, description, location,
        DATE_FORMAT(startDate, '%Y-%m-%d') AS date
        FROM tasks WHERE userEmail = ?
    `;
    db.query(query, [email], (err, results) => {
        if (err) {
            console.error("Error fetching created tasks:", err);
            return res.status(500).json({ message: "Error fetching created tasks" });
        }

        res.json(results);
    });
});

// Fetch tasks the user has volunteered for
app.get('/profile/tasksVolunteered', (req, res) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    const query = `
        SELECT taskId, taskName AS title, taskDescription AS description, location,
        DATE_FORMAT(dateVolunteered, '%Y-%m-%d') AS volunteerDate, startTime, endTime
        FROM volunteers WHERE userEmail = ?
    `;
    db.query(query, [email], (err, results) => {
        if (err) {
            console.error("Error fetching volunteered tasks:", err);
            return res.status(500).json({ message: "Error fetching volunteered tasks" });
        }

        res.json(results);
    });
});

// Handle unvolunteer requests
app.delete('/profile/unvolunteer', (req, res) => {
    const { email, taskId, volunteerDate, startTime, endTime } = req.body;

    if (!email || !taskId || !volunteerDate || !startTime || !endTime) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const query = `
        DELETE FROM volunteers
        WHERE userEmail = ? AND taskId = ? AND dateVolunteered = ? AND startTime = ? AND endTime = ?
    `;
    db.query(query, [email, taskId, volunteerDate, startTime, endTime], (err, results) => {
        if (err) {
            console.error("Error deleting volunteer entry:", err);
            return res.status(500).json({ message: "Error deleting volunteer entry" });
        }

        if (results.affectedRows === 0) {
            return res.status(404).json({ message: "No volunteer entry found to delete" });
        }

        res.json({ success: true, message: "Successfully unvolunteered" });
    });
});



app.listen(5000, () => {
    console.log("Server running on http://localhost:5000");
});









