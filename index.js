// server.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Function to generate signature
const generateSignature = (params) => {
    const sortedParams = Object.keys(params)
        .sort()
        .map((key) => `${key}=${params[key]}`)
        .join('&');

    const crypto = require('crypto');
    return crypto.createHash('sha1').update(sortedParams + process.env.API_SECRET).digest('hex');
};

// Proxy endpoint for Cloudinary API
app.use('/cloudinary', async (req, res) => {
    const url = `${process.env.API_CLOUDINARY_ENDPOINT}/${process.env.CLOUD_NAME}${req.path}`;
    const method = req.method;

    try {
        const paramsToSign = {
            timestamp: Math.floor(Date.now() / 1000),
            ...req.body,
        };

        // Generate signature
        const signature = generateSignature(paramsToSign);
        paramsToSign.signature = signature;

        const response = await axios({
            url,
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(`${process.env.API_KEY}:${process.env.API_SECRET}`).toString('base64')}`,
            },
            data: method === 'POST' || method === 'PUT' ? paramsToSign : {},
            params: method === 'GET' ? paramsToSign : {},
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error forwarding request to Cloudinary:', error);
        res.status(error.response?.status || 500).send(error.response?.data || 'Error forwarding request');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Proxy server running at http://localhost:${port}`);
});
