const express = require('express');
const https = require('https');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'settings.html'));
});

// Serve src and styles directories
app.use('/src', express.static(path.join(__dirname, 'src')));
app.use('/styles', express.static(path.join(__dirname, 'styles')));

// API Proxy endpoint
app.all('/api/proxy', (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Target-URL');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }
    
    const targetUrl = req.headers['x-target-url'];
    if (!targetUrl) {
        res.status(400).json({ error: 'Missing X-Target-URL header' });
        return;
    }
    
    const parsedUrl = new URL(targetUrl);
    const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: req.method,
        headers: {}
    };
    
    // Forward relevant headers
    const headersToForward = ['authorization', 'content-type', 'accept'];
    headersToForward.forEach(header => {
        if (req.headers[header]) {
            options.headers[header] = req.headers[header];
        }
    });
    
    console.log(`[PROXY] ${req.method} ${targetUrl}`);
    
    const proxyReq = https.request(options, (proxyRes) => {
        res.status(proxyRes.statusCode);
        
        // Forward response headers
        Object.keys(proxyRes.headers).forEach(key => {
            res.setHeader(key, proxyRes.headers[key]);
        });
        
        proxyRes.pipe(res);
    });
    
    proxyReq.on('error', (error) => {
        console.error('[PROXY ERROR]', error);
        res.status(500).json({ error: 'Proxy error: ' + error.message });
    });
    
    // Forward request body if present
    if (req.body && Object.keys(req.body).length > 0) {
        if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
            proxyReq.write(new URLSearchParams(req.body).toString());
        } else {
            proxyReq.write(JSON.stringify(req.body));
        }
    }
    
    proxyReq.end();
});

// API endpoint to store/retrieve settings (in memory for now)
let apiSettings = null;

app.get('/api/settings', (req, res) => {
    if (apiSettings) {
        res.json(apiSettings);
    } else {
        res.status(404).json({ error: 'No settings configured' });
    }
});

app.post('/api/settings', (req, res) => {
    apiSettings = req.body;
    console.log('[SETTINGS] Updated API settings');
    res.json({ success: true });
});

// Start server
app.listen(PORT, () => {
    console.log(`Accelo API Dashboard running at http://localhost:${PORT}`);
    console.log(`Settings page at http://localhost:${PORT}/settings`);
    console.log('Press Ctrl+C to stop the server');
});