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
    
    // Security: Validate target URL
    const allowedHosts = ['api.accelo.com', 'accelo.com'];
    let parsedUrl;
    try {
        parsedUrl = new URL(targetUrl);
        const isAllowed = allowedHosts.some(host => parsedUrl.hostname.endsWith(host));
        if (!isAllowed) {
            res.status(403).json({ error: 'Forbidden: Invalid target host' });
            addLog('error', `Blocked request to forbidden host: ${parsedUrl.hostname}`);
            return;
        }
    } catch (error) {
        res.status(400).json({ error: 'Invalid URL format' });
        return;
    }
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

// Chat API endpoints for AI integration
// These endpoints leverage the existing proxy but provide structured responses for AI consumption

app.get('/api/chat/status', (req, res) => {
    if (!apiSettings || !apiSettings.accessToken) {
        return res.status(400).json({
            error: 'No API credentials configured',
            message: 'Please configure your Accelo API credentials in the Settings page first',
            action: 'Visit /settings to configure credentials'
        });
    }

    // Check if token is expired
    const now = Date.now();
    const expiryTime = new Date(apiSettings.tokenExpiry).getTime();
    
    if (now >= expiryTime) {
        return res.status(401).json({
            error: 'Access token expired',
            message: 'Your API token has expired and needs to be refreshed',
            expiry: apiSettings.tokenExpiry,
            action: 'Visit /settings to refresh your credentials'
        });
    }

    res.json({
        status: 'connected',
        deployment: apiSettings.deployment,
        user: {
            name: apiSettings.userName,
            email: apiSettings.userEmail
        },
        token_expires: apiSettings.tokenExpiry,
        time_remaining: Math.floor((expiryTime - now) / (1000 * 60 * 60 * 24)) + ' days'
    });
});

app.get('/api/chat/companies', async (req, res) => {
    if (!apiSettings || !apiSettings.accessToken) {
        return res.status(400).json({
            error: 'No API credentials configured',
            action: 'Visit /settings to configure credentials'
        });
    }

    try {
        const { search, limit = 10, offset = 0 } = req.query;
        
        // Build API URL
        let apiUrl = `https://${apiSettings.deployment}.api.accelo.com/api/v0/companies`;
        const params = new URLSearchParams({
            _fields: 'id,name,website,phone,standing,status,date_created,date_modified',
            _limit: limit,
            _offset: offset
        });
        
        if (search) {
            params.append('_search', search);
        }
        
        apiUrl += '?' + params.toString();
        
        // Make request through existing proxy logic
        const response = await makeAcceloRequest(apiUrl, apiSettings.accessToken);
        
        res.json({
            success: true,
            companies: response.response || [],
            meta: {
                count: response.response ? response.response.length : 0,
                search_term: search || null,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                }
            }
        });
        
    } catch (error) {
        addLog('error', `Chat API - Companies Error: ${error.message}`);
        res.status(500).json({
            error: 'Failed to fetch companies',
            message: error.message,
            action: 'Check your API credentials and try again'
        });
    }
});

app.get('/api/chat/company/:id', async (req, res) => {
    if (!apiSettings || !apiSettings.accessToken) {
        return res.status(400).json({
            error: 'No API credentials configured',
            action: 'Visit /settings to configure credentials'
        });
    }

    try {
        const companyId = req.params.id;
        
        // Get company details
        const companyUrl = `https://${apiSettings.deployment}.api.accelo.com/api/v0/companies/${companyId}?_fields=id,name,website,phone,standing,status,date_created,date_modified,custom_fields`;
        
        // Get company projects
        const projectsUrl = `https://${apiSettings.deployment}.api.accelo.com/api/v0/jobs?_filters=against_type(company),against_id(${companyId})&_fields=id,title,status,standing,manager,date_started,date_due,billable_seconds,unbillable_seconds&_limit=50`;
        
        // Get company agreements
        const agreementsUrl = `https://${apiSettings.deployment}.api.accelo.com/api/v0/contracts?_filters=against_type(company),against_id(${companyId})&_fields=id,title,status,standing,date_started,date_expires,retainer_type&_limit=50`;
        
        // Make all requests
        const [companyResponse, projectsResponse, agreementsResponse] = await Promise.all([
            makeAcceloRequest(companyUrl, apiSettings.accessToken),
            makeAcceloRequest(projectsUrl, apiSettings.accessToken),
            makeAcceloRequest(agreementsUrl, apiSettings.accessToken)
        ]);
        
        // Get agreement periods for active agreements
        const agreements = agreementsResponse.response || [];
        const agreementDetails = await Promise.all(
            agreements.map(async (agreement) => {
                if (agreement.standing === 'active') {
                    try {
                        const periodsUrl = `https://${apiSettings.deployment}.api.accelo.com/api/v0/contracts/${agreement.id}/periods?_limit=1&_order_by=date_commenced&_order_by_desc=1`;
                        const periodsResponse = await makeAcceloRequest(periodsUrl, apiSettings.accessToken);
                        agreement.current_period = periodsResponse.response ? periodsResponse.response[0] : null;
                    } catch (error) {
                        addLog('error', `Failed to get periods for agreement ${agreement.id}: ${error.message}`);
                        agreement.current_period = null;
                    }
                }
                return agreement;
            })
        );
        
        res.json({
            success: true,
            company: companyResponse.response,
            projects: projectsResponse.response || [],
            agreements: agreementDetails,
            summary: {
                total_projects: (projectsResponse.response || []).length,
                active_projects: (projectsResponse.response || []).filter(p => p.standing === 'active').length,
                total_agreements: agreements.length,
                active_agreements: agreements.filter(a => a.standing === 'active').length
            }
        });
        
    } catch (error) {
        addLog('error', `Chat API - Company Details Error: ${error.message}`);
        res.status(500).json({
            error: 'Failed to fetch company details',
            message: error.message,
            company_id: req.params.id,
            action: 'Verify the company ID exists and try again'
        });
    }
});

app.get('/api/chat/project/:id', async (req, res) => {
    if (!apiSettings || !apiSettings.accessToken) {
        return res.status(400).json({
            error: 'No API credentials configured',
            action: 'Visit /settings to configure credentials'
        });
    }

    try {
        const projectId = req.params.id;
        
        // Get project details
        const projectUrl = `https://${apiSettings.deployment}.api.accelo.com/api/v0/jobs/${projectId}?_fields=id,title,description,status,standing,manager,against,date_started,date_due,billable_seconds,unbillable_seconds,custom_fields`;
        
        // Get project time allocations
        const allocationsUrl = `https://${apiSettings.deployment}.api.accelo.com/api/v0/activities/allocations?_filters=against_type(job),against_id(${projectId})&_fields=billable,nonbillable,logged,charged&_limit=1`;
        
        const [projectResponse, allocationsResponse] = await Promise.all([
            makeAcceloRequest(projectUrl, apiSettings.accessToken),
            makeAcceloRequest(allocationsUrl, apiSettings.accessToken)
        ]);
        
        const project = projectResponse.response;
        const allocation = allocationsResponse.response;
        
        // Calculate actual hours from allocations (which contain the real time data)
        let billableHours = 0;
        let unbillableHours = 0;
        let totalHours = 0;
        
        if (allocation) {
            // Convert seconds to hours
            billableHours = allocation.billable ? parseFloat(allocation.billable) / 3600 : 0;
            unbillableHours = allocation.nonbillable ? parseFloat(allocation.nonbillable) / 3600 : 0;
            totalHours = billableHours + unbillableHours;
        }
        
        res.json({
            success: true,
            project: project,
            time_summary: {
                billable_hours: billableHours.toFixed(2),
                unbillable_hours: unbillableHours.toFixed(2),
                total_hours: totalHours.toFixed(2),
                allocation_details: {
                    billable: allocation?.billable || 0,
                    nonbillable: allocation?.nonbillable || 0,
                    logged: allocation?.logged || 0,
                    charged: allocation?.charged || 0
                }
            }
        });
        
    } catch (error) {
        addLog('error', `Chat API - Project Details Error: ${error.message}`);
        res.status(500).json({
            error: 'Failed to fetch project details',
            message: error.message,
            project_id: req.params.id,
            action: 'Verify the project ID exists and try again'
        });
    }
});

app.get('/api/chat/agreement/:id', async (req, res) => {
    if (!apiSettings || !apiSettings.accessToken) {
        return res.status(400).json({
            error: 'No API credentials configured',
            action: 'Visit /settings to configure credentials'
        });
    }

    try {
        const agreementId = req.params.id;
        
        // Get agreement details
        const agreementUrl = `https://${apiSettings.deployment}.api.accelo.com/api/v0/contracts/${agreementId}?_fields=id,title,description,status,standing,against,date_started,date_expires,retainer_type,retainer_value,custom_fields`;
        
        // Get recent periods (need multiple to find current one)
        const periodsUrl = `https://${apiSettings.deployment}.api.accelo.com/api/v0/contracts/${agreementId}/periods?_fields=id,date_commenced,date_expires,allowance,budget_used,standing&_limit=50&_order_by=date_commenced&_order_by_desc=1`;
        
        const [agreementResponse, periodsResponse] = await Promise.all([
            makeAcceloRequest(agreementUrl, apiSettings.accessToken),
            makeAcceloRequest(periodsUrl, apiSettings.accessToken)
        ]);
        
        const agreement = agreementResponse.response;
        const periodsData = periodsResponse.response;
        const periods = periodsData?.periods || [];
        
        // Find the current period (the one with standing "opened")
        let currentPeriod = null;
        
        // First, look for an "opened" period
        for (const period of periods) {
            if (period.standing === 'opened') {
                currentPeriod = period;
                break;
            }
        }
        
        // If no opened period found, look for one that contains today's date
        if (!currentPeriod) {
            const now = Math.floor(Date.now() / 1000);
            for (const period of periods) {
                const startDate = parseInt(period.date_commenced);
                const endDate = parseInt(period.date_expires);
                
                if (now >= startDate && now <= endDate) {
                    currentPeriod = period;
                    break;
                }
            }
        }
        
        // If still no current period found, use the most recent one
        if (!currentPeriod && periods.length > 0) {
            currentPeriod = periods[0];
        }
        
        let usage_summary = null;
        if (currentPeriod) {
            // Determine the period budget type and handle accordingly
            let budgetType = 'none'; // 'time', 'value', or 'none'
            let timeAllowance = 0;
            let timeUsed = 0;
            let timeRemaining = 0;
            let valueAllowance = 0;
            let valueUsed = 0;
            
            // Check for time budget - must have meaningful billable allowance
            if (currentPeriod.allowance && currentPeriod.allowance.billable && parseFloat(currentPeriod.allowance.billable) > 0) {
                budgetType = 'time';
                timeAllowance = parseFloat(currentPeriod.allowance.billable) / 3600;
                
                if (currentPeriod.budget_used && currentPeriod.budget_used.value) {
                    timeUsed = parseFloat(currentPeriod.budget_used.value) / 3600;
                }
            }
            // Check for value budget - must have meaningful value/amount allowance
            else if (currentPeriod.allowance && 
                     ((currentPeriod.allowance.value && parseFloat(currentPeriod.allowance.value) > 0) || 
                      (currentPeriod.allowance.amount && parseFloat(currentPeriod.allowance.amount) > 0))) {
                budgetType = 'value';
                valueAllowance = parseFloat(currentPeriod.allowance.value || currentPeriod.allowance.amount || 0);
                
                if (currentPeriod.budget_used && currentPeriod.budget_used.amount) {
                    valueUsed = parseFloat(currentPeriod.budget_used.amount);
                }
            }
            // For agreements with no budget, we still want to track time worked
            else {
                budgetType = 'none';
                // For no-budget agreements, get time worked from budget_used
                if (currentPeriod.budget_used && currentPeriod.budget_used.value) {
                    timeUsed = parseFloat(currentPeriod.budget_used.value) / 3600;
                }
            }
            
            timeRemaining = timeAllowance - timeUsed;
            const valueRemaining = valueAllowance - valueUsed;
            
            const periodStart = new Date(parseInt(currentPeriod.date_commenced) * 1000).toISOString().split('T')[0];
            const periodEnd = new Date(parseInt(currentPeriod.date_expires) * 1000).toISOString().split('T')[0];
            
            usage_summary = {
                budget_type: budgetType,
                time_allowance_hours: timeAllowance.toFixed(2),
                time_used_hours: timeUsed.toFixed(2),
                time_remaining_hours: timeRemaining.toFixed(2),
                usage_percentage: timeAllowance > 0 
                    ? ((timeUsed / timeAllowance) * 100).toFixed(1) + '%'
                    : '0.0%',
                value_allowance: valueAllowance.toFixed(2),
                value_used: valueUsed.toFixed(2),
                value_remaining: valueRemaining.toFixed(2),
                period_start: periodStart,
                period_end: periodEnd,
                period_id: currentPeriod.id
            };
        }
        
        res.json({
            success: true,
            agreement: agreement,
            current_period: currentPeriod,
            usage_summary: usage_summary
        });
        
    } catch (error) {
        addLog('error', `Chat API - Agreement Details Error: ${error.message}`);
        res.status(500).json({
            error: 'Failed to fetch agreement details',
            message: error.message,
            agreement_id: req.params.id,
            action: 'Verify the agreement ID exists and try again'
        });
    }
});

// Debug endpoint for testing agreement periods
app.get('/api/chat/debug/agreement/:id/periods', async (req, res) => {
    if (!apiSettings || !apiSettings.accessToken) {
        return res.status(400).json({
            error: 'No API credentials configured'
        });
    }

    try {
        const agreementId = req.params.id;
        const periodsUrl = `https://${apiSettings.deployment}.api.accelo.com/api/v0/contracts/${agreementId}/periods?_fields=id,date_commenced,date_expires,allowance,budget_used,standing&_limit=50&_order_by=date_commenced&_order_by_desc=1`;
        
        const periodsResponse = await makeAcceloRequest(periodsUrl, apiSettings.accessToken);
        const periodsData = periodsResponse.response;
        const periods = periodsData?.periods || [];
        
        // Find opened period
        let currentPeriod = null;
        for (const period of periods) {
            if (period.standing === 'opened') {
                currentPeriod = period;
                break;
            }
        }
        
        let result = { periods, currentPeriod };
        
        if (currentPeriod) {
            const timeAllowance = currentPeriod.allowance?.billable ? parseFloat(currentPeriod.allowance.billable) / 3600 : 0;
            const timeUsed = currentPeriod.budget_used?.value ? parseFloat(currentPeriod.budget_used.value) / 3600 : 0;
            
            result.calculation = {
                timeAllowance,
                timeUsed,
                timeAllowanceFormatted: `${Math.floor(timeAllowance)}h ${Math.round((timeAllowance % 1) * 60)}m`,
                timeUsedFormatted: `${Math.floor(timeUsed)}h ${Math.round((timeUsed % 1) * 60)}m`
            };
        }
        
        res.json({ success: true, data: result });
        
    } catch (error) {
        res.status(500).json({
            error: 'Debug test failed',
            message: error.message
        });
    }
});

app.get('/api/chat/test/*', async (req, res) => {
    if (!apiSettings || !apiSettings.accessToken) {
        return res.status(400).json({
            error: 'No API credentials configured',
            action: 'Visit /settings to configure credentials'
        });
    }

    try {
        // Extract the endpoint from the path
        const endpoint = req.params[0];
        let apiUrl = `https://${apiSettings.deployment}.api.accelo.com/api/v0/${endpoint}`;
        
        // Add query parameters if present
        if (Object.keys(req.query).length > 0) {
            apiUrl += '?' + new URLSearchParams(req.query).toString();
        }
        
        const response = await makeAcceloRequest(apiUrl, apiSettings.accessToken);
        
        res.json({
            success: true,
            endpoint: endpoint,
            url: apiUrl,
            response: response
        });
        
    } catch (error) {
        addLog('error', `Chat API - Test Endpoint Error: ${error.message}`);
        res.status(500).json({
            error: 'Test endpoint failed',
            message: error.message,
            endpoint: req.params[0],
            action: 'Check the endpoint path and parameters'
        });
    }
});

// Helper function to make Accelo API requests
async function makeAcceloRequest(url, accessToken) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    
                    if (res.statusCode >= 400) {
                        reject(new Error(`API Error ${res.statusCode}: ${jsonData.meta?.message || res.statusMessage}`));
                    } else {
                        resolve(jsonData);
                    }
                } catch (error) {
                    reject(new Error(`Failed to parse API response: ${error.message}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(new Error(`Request failed: ${error.message}`));
        });

        req.end();
    });
}

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