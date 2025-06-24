/**
 * Settings page functionality
 */

let debugLogs = [];
let currentSettings = null;

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    await checkCurrentConnection();
    setupEventListeners();
    
    // Auto-detect deployment from Client ID
    document.getElementById('clientId').addEventListener('blur', autoDetectDeployment);
});

// Setup event listeners
function setupEventListeners() {
    document.getElementById('settingsForm').addEventListener('submit', handleConnect);
    document.getElementById('clearBtn').addEventListener('click', handleClearSettings);
}

// Check current connection status
async function checkCurrentConnection() {
    log('Checking current connection status...');
    
    try {
        const response = await fetch('/api/settings');
        if (response.ok) {
            currentSettings = await response.json();
            
            // Populate form with existing values
            document.getElementById('deployment').value = currentSettings.deployment || '';
            document.getElementById('clientId').value = currentSettings.clientId || '';
            // Don't populate client secret for security
            
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
        
        // Save settings to server
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
    if (!confirm('Are you sure you want to clear all settings? You will need to reconnect to use the dashboard.')) {
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
        
        // Clear form
        document.getElementById('settingsForm').reset();
        currentSettings = null;
        
        updateConnectionStatus(false);
        showAlert('Settings cleared successfully', 'info');
        log('Settings cleared', 'info');
        
    } catch (error) {
        log(`Error clearing settings: ${error.message}`, 'error');
        showAlert('Failed to clear settings', 'error');
    }
}

// Update connection status display
function updateConnectionStatus(connected, details = null) {
    const statusEl = document.getElementById('connectionStatus');
    const statusIcon = statusEl.querySelector('.status-icon');
    
    if (connected) {
        statusEl.className = 'connection-status connected';
        statusIcon.className = 'status-icon connected';
        
        if (typeof details === 'object') {
            statusEl.innerHTML = `
                <span class="status-icon connected"></span>
                <div>
                    <strong>Connected</strong>
                    <div class="text-small">
                        ${details.name} (${details.email})<br>
                        Deployment: ${details.deployment}<br>
                        ${details.expiryInfo}
                    </div>
                </div>
            `;
        } else {
            statusEl.innerHTML = `
                <span class="status-icon connected"></span>
                <div>
                    <strong>Connected</strong>
                    <div class="text-small">API connection is active</div>
                </div>
            `;
        }
    } else {
        statusEl.className = 'connection-status disconnected';
        statusIcon.className = 'status-icon disconnected';
        
        const message = typeof details === 'string' ? details : 'Please configure your API credentials below';
        statusEl.innerHTML = `
            <span class="status-icon disconnected"></span>
            <div>
                <strong>Not Connected</strong>
                <div class="text-small">${message}</div>
            </div>
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
        btnText.textContent = 'Connect to Accelo';
        btnSpinner.classList.add('d-none');
    }
}

// Show alert message
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
    form.parentNode.insertBefore(alert, form.nextSibling);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// Toggle debug log visibility
function toggleDebugLog() {
    const debugLog = document.getElementById('debugLog');
    const icon = document.getElementById('debugToggleIcon');
    
    if (debugLog.classList.contains('show')) {
        debugLog.classList.remove('show');
        icon.textContent = '▶';
    } else {
        debugLog.classList.add('show');
        icon.textContent = '▼';
        updateDebugDisplay();
    }
}

// Add log entry
function log(message, level = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    debugLogs.push({ timestamp, level, message });
    
    console.log(`[${level.toUpperCase()}] ${message}`);
    
    if (document.getElementById('debugLog').classList.contains('show')) {
        updateDebugDisplay();
    }
}

// Update debug display
function updateDebugDisplay() {
    const debugLog = document.getElementById('debugLog');
    
    debugLog.innerHTML = debugLogs.map(entry => `
        <div class="log-entry">
            <span class="log-time">${entry.timestamp}</span>
            <span class="log-level ${entry.level}">${entry.level.toUpperCase()}</span>
            <span>${entry.message}</span>
        </div>
    `).join('');
    
    // Scroll to bottom
    debugLog.scrollTop = debugLog.scrollHeight;
}
