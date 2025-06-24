# Accelo API Dashboard

A comprehensive dashboard application for Accelo that displays companies, projects, and agreements with real-time progress tracking.

## Table of Contents
- [Features](#features)
- [Screenshots](#screenshots)
- [How It Works](#how-it-works)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage Guide](#usage-guide)
- [Technical Architecture](#technical-architecture)
- [Project Structure](#project-structure)
- [Development Guide](#development-guide)
- [API Reference](#api-reference)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)
- [Current Limitations](#current-limitations)
- [Roadmap](#roadmap)

## Features

- **Company Overview**: View all your companies in a clean sidebar interface
- **Project Tracking**: Monitor project hours (billable and non-billable)
- **Agreement Management**: Track agreement usage and allowances
- **Search & Add**: Easily search and add companies to your dashboard
- **Secure Authentication**: Service Application OAuth 2.0 with 30-day tokens
- **Real-time Updates**: Automatic data refresh with caching
- **Responsive Design**: Works on desktop and tablet devices

## Screenshots

### Main Dashboard
- Companies listed in sidebar
- Progress tracker blocks for projects and agreements
- Visual indicators for usage levels

### Settings Page
- Secure API credential configuration
- Connection status monitoring
- Debug logging for troubleshooting

## How It Works

### Architecture Overview

This application uses a three-tier architecture to work around browser CORS restrictions and provide a secure integration with Accelo:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Frontend (SPA) │────▶│  Express Proxy  │────▶│   Accelo API    │
│                 │◀────│                 │◀────│                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
   localStorage           In-Memory Store         OAuth 2.0
   UI Components          CORS Handling           Service App
```

1. **Frontend (Browser)**
   - Single-page application using vanilla JavaScript (no framework dependencies)
   - Makes API calls to local Express server at `/api/proxy`
   - Stores dashboard configuration in localStorage
   - Cannot directly call Accelo API due to CORS restrictions

2. **Proxy Server (Express.js)**
   - Routes all API calls through `/api/proxy` endpoint
   - Stores OAuth credentials in memory (resets on server restart)
   - Adds necessary authentication headers for Accelo API
   - Handles CORS to allow browser requests
   - Forwards responses back to frontend

3. **Accelo API**
   - Uses Service Application authentication (OAuth 2.0 Client Credentials flow)
   - Executes as the designated user from app registration
   - Provides RESTful endpoints for all resources
   - Returns JSON responses with metadata

### Authentication Flow

```
1. User enters credentials in Settings
2. Frontend sends to /api/proxy with OAuth endpoint
3. Proxy makes OAuth request to Accelo
4. Accelo returns access token (30-day validity)
5. Token stored in server memory
6. All subsequent API calls use this token
```

### Data Flow Example

When a user clicks on a company:

```javascript
1. User clicks company → selectCompany(id)
2. Dashboard requests data → acceloAPI.getDashboardData([id])
3. API client checks cache → Makes proxy request if needed
4. Proxy forwards to Accelo → https://stp.api.accelo.com/api/v0/...
5. Response flows back → Cached for 5 minutes
6. UI components render → Progress blocks displayed
```

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Accelo account with administrator access
- Service Application registered in Accelo

### Registering a Service Application in Accelo

1. Log into your Accelo deployment as an administrator
2. Navigate to **Configuration** → **API** → **Register Application**
3. Fill in the form:
   - **Application Name**: Your app name (e.g., "Dashboard Integration")
   - **Application Type**: Select "Service"
   - **Execute Application As**: Select which user the API should run as
4. Save and copy the Client ID and Client Secret immediately

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/DFraserStratos/accelo-dashboard-prototype.git
   cd accelo-dashboard-prototype
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment (optional)**
   ```bash
   cp .env.example .env
   # Edit .env to change PORT if needed (default: 8080)
   ```

4. **Start the server**
   ```bash
   npm start
   # Or use the convenience script:
   chmod +x start.sh
   ./start.sh
   ```

5. **Access the application**
   - Open http://localhost:8080 in your browser
   - You'll be redirected to settings on first visit

## Configuration

### API Settings Configuration

1. Navigate to Settings (gear icon) or http://localhost:8080/settings
2. Enter your Service Application credentials:
   - **Deployment Name**: Your Accelo subdomain (e.g., "stp" for stp.accelo.com)
   - **Client ID**: Full ID from registration (e.g., service_app_xxx@stp.accelo.com)
   - **Client Secret**: Secret key from registration
3. Click "Connect to Accelo"
4. Verify connection status shows your user details

### Understanding the Settings

- **Deployment**: Your unique Accelo instance identifier
- **Token Expiry**: Shows remaining validity (max 30 days)
- **Execute As User**: The user whose permissions are used for all API calls
- **Debug Log**: Toggle to see detailed API request/response information

## Usage Guide

### Dashboard Overview

The dashboard has three main areas:
1. **Navigation Bar**: Title, Add Item button, Settings link
2. **Company Sidebar**: List of added companies with item counts
3. **Main Content**: Progress blocks for selected company

### Adding Companies to Dashboard

1. Click the "Add Item" button in the navigation bar
2. Search for companies by name (minimum 2 characters)
3. Click to select companies (they'll highlight)
4. Click "Add Selected Items"
5. Companies appear in the sidebar

### Viewing Company Data

1. Click any company in the sidebar (it highlights)
2. Main area shows all active projects and agreements
3. Each block displays key metrics and progress
4. Data refreshes automatically when switching companies

### Understanding Progress Blocks

**Project Blocks** (📁 icon) display:
- Project title and status
- Total logged hours
- Billable hours (revenue-generating)
- Non-billable hours (internal time)
- Due date (if set)

**Agreement Blocks** (📋 icon) display:
- Agreement title and type
- Current period dates
- Hours used vs. allowance
- Visual progress bar:
  - 🟢 Green: Under 75% usage
  - 🟡 Yellow: 75-90% usage (warning)
  - 🔴 Red: Over 90% usage (critical)
- Percentage of allowance consumed

### Search Functionality

- Search works across companies, projects, and agreements
- Minimum 2 characters to trigger search
- 300ms debounce prevents excessive API calls
- Results grouped by type
- Click results to select multiple items

## Technical Architecture

### Frontend Architecture

#### Key Components

**AcceloAPI Class** (`src/api-client.js`)
- Singleton pattern for consistent API access
- Built-in 5-minute cache for GET requests
- Automatic token expiry checking
- Comprehensive error handling
- Request transformation and response parsing

Key methods:
```javascript
init() // Initialize with settings
request(endpoint, options) // Make API call with caching
getCompanies(filters) // Get company list
getProjects(companyId, filters) // Get projects for company
getAgreements(companyId, filters) // Get agreements
getProjectHours(projectId) // Get time allocations
getAgreementUsage(agreementId) // Get period usage
getDashboardData(companyIds) // Bulk load for dashboard
searchAll(query) // Search across all object types
```

**Dashboard Class** (`src/dashboard.js`)
- Manages application state and UI updates
- Handles company selection and display
- Search implementation with debouncing
- localStorage persistence for dashboard configuration
- Modal and event management

Key methods:
```javascript
init() // Initialize dashboard
loadDashboardState() // Restore from localStorage
saveDashboardState() // Persist to localStorage
selectCompany(id) // Handle company selection
refreshDashboardData() // Update all data from API
showAddItemModal() // Display search modal
handleSearch(query) // Debounced search handler
```

**UIComponents Class** (`src/components.js`)
- Factory methods for creating DOM elements
- Consistent styling and structure
- XSS protection via HTML escaping
- Loading states and skeletons
- Toast notifications

Key methods:
```javascript
createCompanyCard(company, isActive) // Sidebar cards
createProjectBlock(project) // Project progress blocks
createAgreementBlock(agreement) // Agreement blocks
createSearchResultItem(item, type) // Search results
showToast(message, type) // User notifications
showLoading() / hideLoading() // Loading overlay
```

### Backend Architecture

**Express Server** (`server.js`)
- Minimal server for proxy functionality
- Static file serving for SPA
- CORS handling for API requests
- In-memory settings storage

Key endpoints:
- `GET /` - Serve main dashboard
- `GET /settings` - Serve settings page
- `GET /api/settings` - Retrieve stored settings
- `POST /api/settings` - Update settings
- `ALL /api/proxy` - Forward requests to Accelo

### State Management

**Dashboard State** (localStorage)
```javascript
{
  dashboardData: [
    {
      company: { id, name, ... },
      projects: [...],
      agreements: [...]
    }
  ],
  lastUpdated: "ISO timestamp"
}
```

**Settings State** (server memory)
```javascript
{
  deployment: "stp",
  clientId: "service_app_xxx@stp.accelo.com",
  accessToken: "Bearer token...",
  tokenExpiry: "ISO timestamp",
  userName: "John Doe",
  userEmail: "john@example.com"
}
```

### Caching Strategy

1. **API Response Cache**: 5-minute TTL for GET requests
2. **Dashboard State**: Persisted to localStorage
3. **Settings**: Stored in server memory (no persistence)
4. **UI State**: React-style updates without framework

## Project Structure

```
accelo-dashboard-prototype/
├── index.html              # Main dashboard HTML
├── settings.html           # Settings page HTML
├── server.js               # Express proxy server
├── package.json            # Dependencies and scripts
├── package-lock.json       # Locked dependencies
├── start.sh               # Convenience startup script
├── .env.example           # Environment template
├── .gitignore             # Git exclusions
├── LICENSE                # MIT License
├── README.md              # This file
├── ACCELO_API_DOCUMENTATION.md  # Comprehensive API guide
├── src/
│   ├── api-client.js      # Accelo API wrapper
│   ├── dashboard.js       # Dashboard controller
│   ├── settings.js        # Settings page logic
│   └── components.js      # UI component factories
├── styles/
│   ├── main.css          # Global styles and utilities
│   └── dashboard.css     # Dashboard-specific styles
└── public/               # Empty - for static assets

```

### Key Files Explained

- **server.js**: Express server that proxies API requests to avoid CORS
- **api-client.js**: Centralized API logic with caching and error handling
- **dashboard.js**: Main application logic and state management
- **components.js**: Reusable UI components with consistent patterns
- **settings.js**: Handles OAuth flow and credential management

## Development Guide

### Adding New API Endpoints

1. **Add method to AcceloAPI class**:
```javascript
async getCustomResource(id) {
  const params = new URLSearchParams({
    _fields: 'id,name,custom_field',
    _limit: 100
  });
  
  const response = await this.request(`/custom/${id}?${params}`);
  return response.response || [];
}
```

2. **Handle response transformation**:
```javascript
// Convert seconds to hours, handle nulls, etc.
return {
  id: response.id,
  hours: response.seconds ? response.seconds / 3600 : 0
};
```

3. **Implement caching if appropriate** (GET requests cached automatically)

### Creating New UI Components

1. **Add factory method to UIComponents**:
```javascript
static createCustomBlock(data) {
  const block = document.createElement('div');
  block.className = 'custom-block';
  block.innerHTML = `
    <h3>${this.escapeHtml(data.title)}</h3>
    <p>${this.escapeHtml(data.description)}</p>
  `;
  return block;
}
```

2. **Add corresponding CSS**:
```css
.custom-block {
  padding: var(--spacing-md);
  background: var(--surface-color);
  border-radius: var(--radius-md);
}
```

### Modifying the Dashboard

1. **Update state structure** in `Dashboard` class
2. **Modify localStorage schema** (consider versioning)
3. **Update render methods** for new UI
4. **Test state persistence** across reloads

### Error Handling Patterns

```javascript
try {
  const data = await acceloAPI.someMethod();
  // Handle success
} catch (error) {
  if (error.message.includes('expired')) {
    // Redirect to settings
  } else if (error.message.includes('settings')) {
    // Show configuration prompt  
  } else {
    UIComponents.showToast(error.message, 'error');
  }
}
```

### Development Tips

1. **Use the Debug Log**: Toggle in settings for API details
2. **Check Browser Console**: All API calls are logged
3. **Monitor Network Tab**: See proxy requests
4. **Test Token Expiry**: Manually edit expiry in settings response
5. **Simulate Errors**: Modify proxy to return error codes

## API Reference

### Core Endpoints Used

#### Companies
- `GET /companies` - List all companies
- `GET /companies/{id}` - Get specific company
- `GET /companies?_search={query}` - Search companies

#### Projects (Jobs)
- `GET /jobs?_filters=against_type(company),against_id({id})` - Get company projects
- `GET /activities/allocations?_filters=against_type(job),against_id({id})` - Get project hours

#### Agreements (Contracts)
- `GET /contracts?_filters=against_type(company),against_id({id})` - Get company agreements
- `GET /contracts/{id}/periods` - Get agreement period usage

### Common Parameters

- `_fields`: Specify fields to return
- `_filters`: Apply filters to results
- `_search`: Search across fields
- `_limit`: Results per page (max 100)
- `_offset`: Pagination offset

### Authentication Headers

```http
Authorization: Bearer {access_token}
X-Target-URL: https://stp.api.accelo.com/api/v0/...
```

## Security Considerations

### Current Implementation

1. **Credential Storage**
   - Client credentials stored in server memory only
   - Access token never sent to frontend
   - No credentials in localStorage or cookies

2. **API Security**
   - All requests proxied through server
   - No direct browser-to-Accelo communication
   - Token expiry checked before each request

3. **Frontend Security**
   - XSS protection via HTML escaping
   - No eval() or innerHTML with user data
   - Content Security Policy compatible

### Production Recommendations

1. **Use HTTPS** everywhere
2. **Store credentials** in environment variables or secrets manager
3. **Implement user authentication** for multi-tenant use
4. **Add request signing** for proxy endpoint
5. **Enable audit logging** for all API calls
6. **Implement rate limiting** on proxy
7. **Use database** for persistent storage

## Troubleshooting

### Common Issues

#### "No settings configured" error
- **Cause**: No credentials or expired token
- **Fix**: Visit /settings and reconfigure

#### CORS errors in console
- **Cause**: Direct API calls or wrong URL
- **Fix**: Ensure using http://localhost:8080

#### Authentication failures
- **Causes**:
  - Service Application not active
  - Wrong deployment name
  - Execute As user lacks permissions
- **Fix**: Verify in Accelo admin panel

#### Empty progress blocks
- **Cause**: No active projects/agreements
- **Fix**: Check standing in Accelo

#### Search not working
- **Cause**: Less than 2 characters
- **Fix**: Type at least 2 characters

### Debug Mode

Enable debug log in Settings to see:
- Full API requests with headers
- Response data and timing
- Token validity information
- Error details and stack traces

### Server Logs

Check terminal for:
- Proxy requests: `[PROXY] GET https://...`
- Settings updates: `[SETTINGS] Updated API settings`
- Server errors and stack traces

## Current Limitations

### Technical Limitations

1. **Settings Storage**: In-memory only, lost on server restart
2. **Single Tenant**: No user authentication or data isolation
3. **No Offline Mode**: Requires constant API connection
4. **Limited Bulk Operations**: Companies added one at a time
5. **No Real-time Updates**: Manual refresh required
6. **Search Limitations**: Cannot add individual projects/agreements
7. **No Export**: Cannot export dashboard data

### API Limitations

1. **Rate Limits**: 5,000 requests/hour shared across deployment
2. **Token Refresh**: Manual re-authentication after 30 days
3. **Permissions**: Limited by Execute As user's access
4. **Data Access**: Only active standing items shown

### UI Limitations

1. **Desktop Only**: Limited mobile responsiveness
2. **No Drag & Drop**: Cannot reorder companies
3. **No Filtering**: Cannot filter projects by status
4. **Fixed Metrics**: Cannot customize displayed data

## Roadmap

### Phase 1: Stability (Current)
- ✅ Core dashboard functionality
- ✅ Service Application auth
- ✅ Progress tracking
- ✅ Search and add

### Phase 2: Persistence
- [ ] Database for settings storage
- [ ] Automatic token refresh
- [ ] User preferences
- [ ] Dashboard templates

### Phase 3: Enhanced Features
- [ ] Bulk operations
- [ ] Excel export
- [ ] Custom metrics
- [ ] Webhooks for real-time updates
- [ ] Email notifications

### Phase 4: Multi-tenant
- [ ] User authentication
- [ ] Role-based access
- [ ] Multiple dashboards
- [ ] Sharing capabilities

### Phase 5: Advanced
- [ ] Mobile app
- [ ] Offline mode
- [ ] Advanced analytics
- [ ] Custom integrations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add/update tests
5. Submit a pull request

### Code Style

- Use ES6+ features
- Async/await over promises
- Descriptive variable names
- Comment complex logic
- Follow existing patterns

## Support

For application issues:
1. Check debug logs in Settings
2. Review browser console
3. Check server logs
4. See Troubleshooting section

For Accelo API issues:
- API Documentation: https://api.accelo.com/docs/
- Developer Forum: https://community.accelo.com/

## License

MIT License - See LICENSE file for details

## Acknowledgments

- Built using authentication patterns from the accelo-api-tester project
- Inspired by Accelo's mobile app architecture
- Thanks to the Accelo API team for comprehensive documentation

---

*This dashboard is not officially affiliated with or endorsed by Accelo.*
