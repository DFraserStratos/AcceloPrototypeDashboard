/**
 * Settings page functionality with persistent storage for Client ID and Deployment Name
 */

let debugLogs = [];
let currentSettings = null;
let autoRefreshInterval = null;

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    await loadSavedCredentials();
    await checkCurrentConnection();
    setupEventListeners();
    
    // Auto-detect deployment from Client ID
    document.getElementById('clientId').addEventListener('blur', autoDetectDeployment);
    
    // Save credentials when they change
    document.getElementById('deployment').addEventListener('input', saveCredentials);
    document.getElementById('clientId').addEventListener('input', saveCredentials);
    
    // Initial log load and setup auto-refresh
    await refreshLogs();
    startAutoRefresh();
});

// Load saved credentials from localStorage
function loadSavedCredentials() {
    try {
        const savedCredentials = localStorage.getItem('accelo_credentials');
        if (savedCredentials) {
            const credentials = JSON.parse(savedCredentials);
            
            if (credentials.deployment) {
                document.getElementById('deployment').value = credentials.deployment;
            }
            
            if (credentials.clientId) {
                document.getElementById('clientId').value = credentials.clientId;
            }
            
            log('Loaded saved credentials from browser storage', 'info');
        }
    } catch (error) {
        log(`Error loading saved credentials: ${error.message}`, 'error');
    }
}

// Save credentials to localStorage
function saveCredentials() {
    try {
        const deployment = document.getElementById('deployment').value.trim();
        const clientId = document.getElementById('clientId').value.trim();
        
        if (deployment || clientId) {
            const credentials = {
                deployment: deployment,
                clientId: clientId,
                savedAt: new Date().toISOString()
            };
            
            localStorage.setItem('accelo_credentials', JSON.stringify(credentials));
            log('Credentials saved to browser storage', 'info');
        }
    } catch (error) {
        log(`Error saving credentials: ${error.message}`, 'error');
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('settingsForm').addEventListener('submit', handleConnect);
    document.getElementById('clearBtn').addEventListener('click', handleClearSettings);
}

// Start auto-refresh for logs
function startAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    // Refresh logs every 30 seconds
    autoRefreshInterval = setInterval(() => {
        refreshLogs();
    }, 30000);
}

// Stop auto-refresh
function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// Check current connection status
async function checkCurrentConnection() {
    log('Checking current connection status...');
    
    try {
        const response = await fetch('/api/settings');
        if (response.ok) {
            currentSettings = await response.json();
            
            // Check if token is still valid
            const tokenExpiry = new Date(currentSettings.tokenExpiry);
            const now = new Date();
            
            if (tokenExpiry > now) {
                const hoursRemaining = Math.round((tokenExpiry - now) / (1000 * 60 * 60));
                const daysRemaining = Math.floor(hoursRemaining / 24);
                
                updateConnectionStatus(true, {
                    name: currentSettings.userName,
                    email: currentSettings.userEmail,
                    deployment: currentSettings.deployment,
                    expiryInfo: daysRemaining > 0 
                        ? `Token expires in ${daysRemaining} days` 
                        : `Token expires in ${hoursRemaining} hours`
                });
                
                log(`Connected as ${currentSettings.userName} (${currentSettings.userEmail})`, 'success');
                log(`Token valid for ${daysRemaining} days, ${hoursRemaining % 24} hours`, 'info');
            } else {
                updateConnectionStatus(false, 'Token has expired. Please reconnect.');
                log('Token has expired', 'warning');
            }
        } else {
            updateConnectionStatus(false);
            log('No existing connection found', 'info');
        }
    } catch (error) {
        log(`Error checking connection: ${error.message}`, 'error');
        updateConnectionStatus(false);
    }
}

// Handle form submission
async function handleConnect(e) {
    e.preventDefault();
    
    const deployment = document.getElementById('deployment').value.trim();
    const clientId = document.getElementById('clientId').value.trim();
    const clientSecret = document.getElementById('clientSecret').value.trim();
    
    log(`Attempting to connect to deployment: ${deployment}`);
    
    // Validate inputs
    if (!deployment || !clientId || !clientSecret) {
        showAlert('Please fill in all fields', 'error');
        return;
    }
    
    // Save credentials before attempting connection
    saveCredentials();
    
    // Show loading state
    setLoadingState(true);
    
    try {
        // Step 1: Get access token
        const tokenUrl = `https://${deployment}.api.accelo.com/oauth2/v0/token`;
        const credentials = btoa(`${clientId}:${clientSecret}`);
        
        log(`Requesting access token from ${tokenUrl}`);
        
        const tokenResponse = await fetch('/api/proxy', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Target-URL': tokenUrl
            },
            body: new URLSearchParams({
                'grant_type': 'client_credentials'
            })
        });
        
        if (!tokenResponse.ok) {
            const error = await tokenResponse.text();
            throw new Error(`Authentication failed: ${error}`);
        }
        
        const tokenData = await tokenResponse.json();
        log('Access token received successfully', 'success');
        
        // Calculate token expiry
        const expiresIn = tokenData.expires_in || 2592000; // Default 30 days
        const tokenExpiry = new Date(Date.now() + (expiresIn * 1000));
        
        // Extract user information
        const userName = tokenData.account_details 
            ? `${tokenData.account_details.firstname} ${tokenData.account_details.surname}`
            : 'Unknown User';
        const userEmail = tokenData.account_details?.email || '';
        
        // Save settings to server (without client secret)
        const settings = {
            deployment,
            clientId,
            accessToken: tokenData.access_token,
            tokenExpiry: tokenExpiry.toISOString(),
            userName,
            userEmail,
            deploymentName: tokenData.deployment_name,
            deploymentUri: tokenData.deployment_uri
        };
        
        const saveResponse = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });
        
        if (!saveResponse.ok) {
            throw new Error('Failed to save settings');
        }
        
        log('Settings saved successfully', 'success');
        currentSettings = settings;
        
        // Update UI
        updateConnectionStatus(true, {
            name: userName,
            email: userEmail,
            deployment: deployment,
            expiryInfo: `Token expires in 30 days`
        });
        
        showAlert('Successfully connected to Accelo!', 'success');
        
        // Clear the client secret field for security
        document.getElementById('clientSecret').value = '';
        
    } catch (error) {
        log(`Connection failed: ${error.message}`, 'error');
        showAlert(`Connection failed: ${error.message}`, 'error');
        updateConnectionStatus(false);
    } finally {
        setLoadingState(false);
    }
}

// Handle clear settings
async function handleClearSettings() {
    if (!confirm('Are you sure you want to clear all saved settings? This will remove your saved credentials and you will need to reconnect.')) {
        return;
    }
    
    try {
        // Clear settings on server
        await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });
        
        // Clear saved credentials from localStorage
        localStorage.removeItem('accelo_credentials');
        
        // Clear form
        document.getElementById('settingsForm').reset();
        currentSettings = null;
        
        updateConnectionStatus(false);
        showAlert('All settings cleared successfully', 'info');
        log('Settings and saved credentials cleared', 'info');
        
    } catch (error) {
        log(`Error clearing settings: ${error.message}`, 'error');
        showAlert('Failed to clear settings', 'error');
    }
}

// Update connection status display with modern UI
function updateConnectionStatus(connected, details = null) {
    const statusEl = document.getElementById('connectionStatus');
    const statusIndicator = statusEl.querySelector('.status-indicator');
    const statusContent = statusEl.querySelector('.status-content');
    
    if (connected) {
        statusEl.className = 'connection-status connected';
        statusIndicator.className = 'status-indicator connected';
        
        if (typeof details === 'object') {
            statusContent.innerHTML = `
                <div class="status-title">Connected</div>
                <div class="status-details">
                    ${details.name} (${details.email})<br>
                    Deployment: ${details.deployment}<br>
                    ${details.expiryInfo}
                </div>
            `;
        } else {
            statusContent.innerHTML = `
                <div class="status-title">Connected</div>
                <div class="status-details">API connection is active</div>
            `;
        }
    } else {
        statusEl.className = 'connection-status disconnected';
        statusIndicator.className = 'status-indicator disconnected';
        
        const message = typeof details === 'string' ? details : 'Please configure your API credentials below';
        statusContent.innerHTML = `
            <div class="status-title">Not Connected</div>
            <div class="status-details">${message}</div>
        `;
    }
}

// Auto-detect deployment from Client ID
function autoDetectDeployment() {
    const clientId = document.getElementById('clientId').value;
    const deploymentInput = document.getElementById('deployment');
    
    const match = clientId.match(/@(.+)\.accelo\.com$/);
    if (match && !deploymentInput.value) {
        deploymentInput.value = match[1];
        log(`Auto-detected deployment: ${match[1]}`);
        // Save the auto-detected deployment
        saveCredentials();
    }
}

// Set loading state
function setLoadingState(loading) {
    const btn = document.querySelector('button[type="submit"]');
    const btnText = document.getElementById('btnText');
    const btnSpinner = document.getElementById('btnSpinner');
    
    if (loading) {
        btn.disabled = true;
        btnText.textContent = 'Connecting...';
        btnSpinner.classList.remove('d-none');
    } else {
        btn.disabled = false;
        btnText.textContent = 'Connect';
        btnSpinner.classList.add('d-none');
    }
}

// Show alert message with modern styling
function showAlert(message, type = 'info') {
    // Remove any existing alerts
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type === 'error' ? 'error' : type} fade-in`;
    alert.textContent = message;
    
    const form = document.getElementById('settingsForm');
    form.parentNode.insertBefore(alert, form);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}

async function refreshLogs() {
    try {
        const response = await fetch('/api/logs');
        const data = await response.json();
        
        updateLogDisplay(data.logs);
        updateLogStatus(`${data.count} entries • Auto-refreshing`);
    } catch (error) {
        updateLogStatus('Error loading logs');
        console.error('Failed to load logs:', error);
    }
}

async function clearLogs() {
    if (!confirm('Are you sure you want to clear all logs?')) {
        return;
    }
    
    try {
        const response = await fetch('/api/logs/clear', { method: 'POST' });
        if (response.ok) {
            updateLogDisplay([]);
            updateLogStatus('Logs cleared');
            showAlert('Logs cleared successfully', 'info');
        } else {
            throw new Error('Failed to clear logs');
        }
    } catch (error) {
        showAlert('Failed to clear logs: ' + error.message, 'error');
    }
}

async function copyLogs() {
    try {
        const response = await fetch('/api/logs');
        const data = await response.json();
        
        // Format logs for copying
        const logText = data.logs.map(entry => {
            const timestamp = new Date(entry.timestamp).toLocaleString();
            let text = `[${timestamp}] [${entry.type.toUpperCase()}] ${entry.message}`;
            
            if (entry.details) {
                text += '\n' + JSON.stringify(entry.details, null, 2);
            }
            
            return text;
        }).join('\n\n');
        
        await navigator.clipboard.writeText(logText);
        showAlert('Logs copied to clipboard', 'success');
        updateLogStatus('Copied to clipboard');
        
        // Reset status after 3 seconds
        setTimeout(() => {
            updateLogStatus(`${data.logs.length} entries • Auto-refreshing`);
        }, 3000);
    } catch (error) {
        showAlert('Failed to copy logs: ' + error.message, 'error');
    }
}

function updateLogDisplay(logs) {
    const container = document.getElementById('logEntries');
    
    if (!logs || logs.length === 0) {
        container.innerHTML = '<div style="padding: var(--spacing-lg); text-align: center; color: var(--text-secondary);">No logs available</div>';
        return;
    }
    
    container.innerHTML = logs.map(entry => {
        const timestamp = new Date(entry.timestamp).toLocaleString();
        const hasDetails = entry.details && Object.keys(entry.details).length > 0;
        
        return `
            <div class="log-entry ${entry.type}">
                <div class="log-entry-header">
                    <span>${entry.message}</span>
                    <span class="log-entry-time">${timestamp}</span>
                </div>
                ${hasDetails ? `
                    <div class="log-entry-details">${JSON.stringify(entry.details, null, 2)}</div>
                ` : ''}
            </div>
        `;
    }).join('');
    
    // Scroll to top to show newest entries first
    container.scrollTop = 0;
}

function updateLogStatus(message) {
    const status = document.getElementById('logStatus');
    if (status) {
        status.textContent = message;
    }
}

// Add log entry (enhanced with modern display)
function log(message, level = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    debugLogs.push({ timestamp, level, message });
    
    console.log(`[${level.toUpperCase()}] ${message}`);
    
    // Auto-refresh logs after a delay to capture new entries
    setTimeout(refreshLogs, 100);
}

// Test API connection with enhanced feedback
async function testAPI() {
    if (!currentSettings || !currentSettings.accessToken) {
        showAlert('No API connection configured. Please connect first.', 'error');
        return;
    }
    
    // Check if token is expired
    const tokenExpiry = new Date(currentSettings.tokenExpiry);
    const now = new Date();
    
    if (tokenExpiry <= now) {
        showAlert('Token has expired. Please reconnect to test the API.', 'error');
        return;
    }
    
    log('Starting API test...', 'info');
    updateLogStatus('Testing API connection...');
    
    try {
        // Test 1: Basic API endpoint (companies)
        const testUrl = `https://${currentSettings.deployment}.api.accelo.com/api/v0/companies`;
        
        log(`Testing API endpoint: ${testUrl}`, 'info');
        
        const response = await fetch('/api/proxy', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${currentSettings.accessToken}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-Target-URL': testUrl
            }
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API test failed: ${response.status} - ${error}`);
        }
        
        const data = await response.json();
        
        // Log successful test
        log('API test successful!', 'success');
        log(`Response received: ${data.response?.length || 0} companies found`, 'info');
        
        // Test 2: Check user permissions (whoami)
        const whoamiUrl = `https://${currentSettings.deployment}.api.accelo.com/api/v0/users/whoami`;
        log(`Testing user permissions: ${whoamiUrl}`, 'info');
        
        const whoamiResponse = await fetch('/api/proxy', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${currentSettings.accessToken}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-Target-URL': whoamiUrl
            }
        });
        
        if (whoamiResponse.ok) {
            const whoamiData = await whoamiResponse.json();
            const user = whoamiData.response;
            log(`Authenticated as: ${user.firstname} ${user.surname} (${user.email})`, 'success');
        } else {
            log('User permissions check failed (this may be expected for service apps)', 'warning');
        }
        
        showAlert('API test completed successfully!', 'success');
        updateLogStatus('API test completed');
        
        // Reset to normal status after 3 seconds
        setTimeout(() => {
            refreshLogs();
        }, 3000);
        
    } catch (error) {
        log(`API test failed: ${error.message}`, 'error');
        showAlert(`API test failed: ${error.message}`, 'error');
        updateLogStatus('API test failed');
        
        // Reset to normal status after 3 seconds
        setTimeout(() => {
            refreshLogs();
        }, 3000);
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
});
