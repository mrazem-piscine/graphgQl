const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, 'docs')));

// Proxy /login to external API
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const response = await fetch('https://adam-jerusalem.nd.edu/api/auth/signin', {
            method: 'POST',
            headers: {
                Authorization: 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ error: errorText });
        }

        const token = await response.text();
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: `Error contacting external API: ${error.message}` });
    }
});

// Proxy /profile to external API
app.get('/profile', async (req, res) => {
    let token = req.headers.authorization?.split(' ')[1];
    token = token?.replace(/^"|"$/g, '');

    if (!token || token.split('.').length !== 3) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or missing JWT' });
    }

    try {
        const response = await fetch('https://adam-jerusalem.nd.edu/api/graphql-engine/v1/graphql', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: `
                query {
                    user {
                        firstName
                        lastName
                        email
                        totalUp
                        totalDown
                        auditRatio
                    }
                    projectStats: transaction(where: { type: { _eq: "project" } }) {
                        project
                        result
                        xp
                        attempts
                    }
                    piscineStats: transaction(where: { type: { _eq: "piscine" } }) {
                        exercise
                        result
                        attempts
                    }
                    grades {
                        subject
                        grade
                    }
                    skills {
                        name
                        level
                    }
                }
                `,
            }),
        });

        const result = await response.json();

        if (!response.ok || result.errors) {
            return res.status(500).json({ error: 'Error fetching profile data' });
        }

        const user = result.data.user[0];
        const projectStats = result.data.projectStats || [];
        const piscineStats = result.data.piscineStats || [];
        const grades = result.data.grades || [];
        const skills = result.data.skills || [];
        res.json({ ...user, transactions });
    } catch (error) {
        console.error('Error in /profile Route:', error.message);
        res.status(500).json({ error: 'Error contacting external API' });
    }
});

// Serve index.html for root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'docs', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
