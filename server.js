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
    
    // Forward relevant headers (case-insensitive)
    const headersToForward = ['authorization', 'content-type', 'accept'];
    headersToForward.forEach(header => {
        // Find the header in a case-insensitive way
        const headerKey = Object.keys(req.headers).find(key => 
            key.toLowerCase() === header.toLowerCase()
        );
        if (headerKey && req.headers[headerKey]) {
            options.headers[header] = req.headers[headerKey];
        }
    });
    
    // Enhanced logging
    addLog('request', `${req.method} ${targetUrl}`, {
        method: req.method,
        url: targetUrl,
        headers: {
            authorization: req.headers.authorization ? `Bearer ${req.headers.authorization.slice(-10)}...` : 'None',
            'content-type': req.headers['content-type'],
            'user-agent': req.headers['user-agent']
        },
        forwardedHeaders: {
            authorization: options.headers.authorization ? `Bearer ${options.headers.authorization.slice(-10)}...` : 'None',
            'content-type': options.headers['content-type'],
            accept: options.headers.accept
        }
    });
    
    const proxyReq = https.request(options, (proxyRes) => {
        const statusCode = proxyRes.statusCode;
        const statusText = proxyRes.statusMessage;
        
        // Log response details
        addLog('response', `${req.method} ${targetUrl} - ${statusCode} ${statusText}`, {
            statusCode: statusCode,
            statusText: statusText,
            headers: {
                'content-type': proxyRes.headers['content-type'],
                'x-ratelimit-remaining': proxyRes.headers['x-ratelimit-remaining'],
                'x-ratelimit-limit': proxyRes.headers['x-ratelimit-limit'],
                'x-status-reason': proxyRes.headers['x-status-reason']
            }
        });
        
        // Log errors
        if (statusCode >= 400) {
            let errorBody = '';
            proxyRes.on('data', chunk => {
                errorBody += chunk.toString();
            });
            proxyRes.on('end', () => {
                try {
                    const errorData = JSON.parse(errorBody);
                    addLog('error', `API Error: ${statusCode} - ${errorData.meta?.message || statusText}`, {
                        statusCode: statusCode,
                        url: targetUrl,
                        errorMessage: errorData.meta?.message,
                        errorStatus: errorData.meta?.status,
                        moreInfo: errorData.meta?.more_info
                    });
                } catch (e) {
                    addLog('error', `API Error: ${statusCode} - ${statusText}`, {
                        statusCode: statusCode,
                        url: targetUrl,
                        rawError: errorBody
                    });
                }
            });
        }
        res.status(proxyRes.statusCode);
        
        // Forward response headers
        Object.keys(proxyRes.headers).forEach(key => {
            res.setHeader(key, proxyRes.headers[key]);
        });
        
        proxyRes.pipe(res);
    });
    
    proxyReq.on('error', (error) => {
        addLog('error', `Proxy Error: ${error.message}`, {
            error: error.message,
            code: error.code,
            url: targetUrl
        });
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

// Logging system
let apiLogs = [];
const MAX_LOGS = 100;

function addLog(type, message, details = null) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        type: type, // 'info', 'error', 'request', 'response'
        message: message,
        details: details
    };
    
    apiLogs.unshift(logEntry);
    
    // Keep only the last MAX_LOGS entries
    if (apiLogs.length > MAX_LOGS) {
        apiLogs = apiLogs.slice(0, MAX_LOGS);
    }
    
    // Also log to console
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
    if (details) {
        console.log(`[${timestamp}] Details:`, details);
    }
}

app.get('/api/settings', (req, res) => {
    if (apiSettings) {
        res.json(apiSettings);
    } else {
        res.status(404).json({ error: 'No settings configured' });
    }
});

app.post('/api/settings', (req, res) => {
    apiSettings = req.body;
    addLog('info', 'API settings updated', {
        deployment: req.body.deployment,
        userName: req.body.userName,
        userEmail: req.body.userEmail,
        tokenExpiry: req.body.tokenExpiry
    });
    res.json({ success: true });
});

// API endpoint to get logs
app.get('/api/logs', (req, res) => {
    res.json({
        logs: apiLogs,
        count: apiLogs.length,
        maxLogs: MAX_LOGS
    });
});

// API endpoint to clear logs
app.post('/api/logs/clear', (req, res) => {
    apiLogs = [];
    addLog('info', 'API logs cleared');
    res.json({ success: true });
});

// Start server
app.listen(PORT, () => {
    console.log(`Accelo API Dashboard running at http://localhost:${PORT}`);
    console.log(`Settings page at http://localhost:${PORT}/settings`);
    console.log('Press Ctrl+C to stop the server');
    
    addLog('info', `Server started on port ${PORT}`, {
        port: PORT,
        dashboardUrl: `http://localhost:${PORT}`,
        settingsUrl: `http://localhost:${PORT}/settings`
    });
});