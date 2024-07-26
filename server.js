const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config(); // Load environment variables from .env file

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());

let accessToken = null;
let tokenExpirationTime = Date.now();

async function refreshAccessToken() {
    try {
        const response = await axios.post('https://accounts.zoho.in/oauth/v2/token', null, {
            params: {
                refresh_token: process.env.ZOHO_REFRESH_TOKEN,
                client_id: process.env.ZOHO_CLIENT_ID,
                client_secret: process.env.ZOHO_CLIENT_SECRET,
                grant_type: 'refresh_token'
            }
        });

        accessToken = response.data.access_token;
        tokenExpirationTime = Date.now() + (response.data.expires_in * 1000);

        console.log('Access token refreshed successfully');
    } catch (error) {
        console.error('Error refreshing access token:', error.response ? error.response.data : error.message);
    }
}

app.use(async (req, res, next) => {
    const currentTime = Date.now();
    if (currentTime >= tokenExpirationTime - (5 * 60 * 1000)) { // Refresh 5 minutes before expiration
        await refreshAccessToken();
    }
    next();
});

app.get('/', (req, res) => {
    res.send('Zoho Books API Integration');
});

app.get('/get-contacts', async (req, res) => {
    try {
        const response = await axios.get('https://www.zohoapis.in/books/v3/contacts', {
            headers: {
                Authorization: `Zoho-oauthtoken ${accessToken}`,
                'X-com-zoho-books-organizationid': process.env.ZOHO_ORGANIZATION_ID,
            },
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error making request to Zoho Books API:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: error.response ? error.response.data : error.message });
    }
});

app.post('/zoho-books-webhook', (req, res) => {
    try {   
        const webhookData = req.body;
        console.log('Received data from Zoho Books webhook:', webhookData);

        res.status(200).json({ message: 'Webhook data received successfully' });
    } catch (error) {
        console.error('Error processing Zoho Books webhook data:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
