const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // Using PostgreSQL (standard on Railway)
const app = express();

app.use(cors());
app.use(express.json());

// Railway automatically provides the DATABASE_URL environment variable
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Create the table if it doesn't exist
pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    password TEXT,
    projects JSONB
  )
`);

// LOGIN / REGISTER ENDPOINT
app.post('/auth', async (req, res) => {
    const { u, p } = req.body;
    const user = await pool.query('SELECT * FROM users WHERE username = $1', [u]);
    
    if (user.rows.length > 0) {
        if (user.rows[0].password === p) res.json(user.rows[0]);
        else res.status(401).send("Wrong password");
    } else {
        const newUser = { u, p, projects: {"main.sk": "# Welcome to Railway Cloud"} };
        await pool.query('INSERT INTO users (username, password, projects) VALUES ($1, $2, $3)', [u, p, newUser.projects]);
        res.json(newUser);
    }
});

// SAVE ENDPOINT
app.post('/save', async (req, res) => {
    const { u, projects } = req.body;
    await pool.query('UPDATE users SET projects = $2 WHERE username = $1', [u, JSON.stringify(projects)]);
    res.send("Saved");
});

app.listen(process.env.PORT || 3000);
