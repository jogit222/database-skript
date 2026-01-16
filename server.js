const express = require('express');
const cors = require('cors'); // Ensure this is installed!
const app = express();

app.use(cors()); // This must be above ALL app.post/get lines
app.use(express.json());

const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for some Railway setups
});

// Initialize Table
pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    password TEXT,
    projects TEXT
  )
`).catch(err => console.error("Table Init Error:", err));

app.post('/auth', async (req, res) => {
    try {
        const { u, p } = req.body;
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [u.toLowerCase()]);
        
        if (result.rows.length > 0) {
            const user = result.rows[0];
            if (user.password === p) {
                // Parse the projects back into JSON before sending to IDE
                return res.json({ 
                    username: user.username, 
                    projects: JSON.parse(user.projects) 
                });
            } else {
                return res.status(401).send("Invalid Password");
            }
        } else {
            // New User Registration
            const startData = JSON.stringify({"main.sk": "# New Cloud Project"});
            await pool.query(
                'INSERT INTO users (username, password, projects) VALUES ($1, $2, $3)',
                [u.toLowerCase(), p, startData]
            );
            return res.json({ username: u, projects: JSON.parse(startData) });
        }
    } catch (err) {
        console.error("Auth Error:", err);
        res.status(500).send("Database Error");
    }
});

app.post('/save', async (req, res) => {
    try {
        const { u, projects } = req.body;
        await pool.query(
            'UPDATE users SET projects = $2 WHERE username = $1', 
            [u.toLowerCase(), JSON.stringify(projects)]
        );
        res.send("Saved");
    } catch (err) {
        console.error("Save Error:", err);
        res.status(500).send("Save Failed");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
