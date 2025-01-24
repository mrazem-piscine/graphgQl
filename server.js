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
app.use(express.static(path.join(__dirname, 'public')));

// Proxy /login to external API
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    console.log('Login Request Credentials:', { username, password }); // Debugging log

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
            console.error('Login Error Response:', errorText);
            return res.status(response.status).json({ error: errorText });
        }

        const token = await response.text();
        console.log('Token from External API:', token);

        // Validate the JWT format
        if (token.split('.').length !== 3) {
            console.error('Invalid JWT format:', token);
            throw new Error('Invalid JWT token received from the external API');
        }

        res.json({ token });
    } catch (error) {
        console.error('Login Endpoint Error:', error.message);
        res.status(500).json({ error: `Error contacting external API: ${error.message}` });
    }
});

// Proxy /profile to external API
app.get('/profile', async (req, res) => {
  let token = req.headers.authorization?.split(' ')[1];

  // Remove any surrounding quotes from the token
  token = token?.replace(/^"|"$/g, '');
  console.log('Cleaned Token:', token);

  if (!token || token.split('.').length !== 3) {
      console.error('Profile Request Error: Invalid or missing JWT');
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
                      id
                      firstName
                      lastName
                      email
                      login
                      campus
                      auditRatio
                      totalUp
                      totalDown
                      totalUpBonus
                      createdAt
                      updatedAt
                  }
              }
              `,
          }),
      });

      const result = await response.json();
      console.log('Profile Data:', result);

      if (!response.ok || result.errors) {
          const errorText = result.errors ? result.errors.map(e => e.message).join(', ') : 'Error fetching profile';
          console.error('Profile Error Response:', errorText);
          return res.status(500).json({ error: errorText });
      }

      res.json(result.data.user[0]);
  } catch (error) {
      console.error('Profile Endpoint Error:', error.message);
      res.status(500).json({ error: 'Error contacting external API' });
  }
});

// Serve index.html for root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
