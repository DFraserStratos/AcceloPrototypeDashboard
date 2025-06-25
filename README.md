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
- [Chat API for AI Integration](#chat-api-for-ai-integration)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)
- [Current Limitations](#current-limitations)
- [Roadmap](#roadmap)

## Features

- **Company-Grouped Layout**: Organized view with company blocks on the left and their related progress items on the right
- **Drag & Drop Interface**: Reorder progress blocks within companies and reorder companies themselves
- **Compact Progress Tracking**: View up to 10+ projects and agreements on screen simultaneously
- **Project Tracking**: Monitor project hours (billable and non-billable) with visual progress bars
- **Agreement Management**: Track agreement usage and allowances with percentage indicators
- **Intelligent Type Detection**: Automatically identifies projects vs agreements with correct icons and labels
- **Search & Add**: Easily search and add companies, projects, and agreements to your dashboard
- **Full-Width Layout**: Progress blocks stretch across available width for optimal space utilization
- **Secure Authentication**: Service Application OAuth 2.0 with 30-day tokens
- **Real-time Updates**: Automatic data refresh with caching
- **Responsive Design**: Works on desktop and tablet devices
- **Persistent Layout**: Dashboard order and configuration saved to localStorage

## Screenshots

### Main Dashboard
- Company-grouped layout with company blocks on the left
- Compact progress blocks stretching full-width on the right
- Height-matched company blocks that adjust to their content
- Visual progress bars and percentage indicators
- Proper project (📋) and agreement (📄) type identification

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

The dashboard features a company-grouped layout with two main areas:
1. **Navigation Bar**: Dashboard title, Add Item button, Settings link
2. **Company-Grouped Content Area**: 
   - **Left**: Company blocks (fixed 120px width, height adjusts to content)
   - **Right**: Full-width progress blocks for projects and agreements
   - **Layout**: All items displayed simultaneously, no selection required

### Adding Items to Dashboard

1. Click the "Add Item" button in the navigation bar
2. **Step 1**: Search and select companies by name (minimum 2 characters)
3. **Step 2**: Choose specific projects and agreements from selected companies
4. Click "Add Selected Items"
5. Items appear grouped by company in the main content area

### Viewing Dashboard Data

1. All added projects and agreements are visible simultaneously
2. Items are organized in rows by company (company block + progress blocks)
3. Company blocks on the left adjust height to match their content

### Drag & Drop Functionality

#### Reordering Progress Blocks
- **Within Same Company**: Drag any progress block (project or agreement) to reorder it within its company
- **Visual Feedback**: 
  - Insertion marker shows exactly where the item will be placed
  - Only the source company's drop zone is highlighted
  - Items become semi-transparent while dragging
- **Restrictions**: Progress blocks cannot be moved between different companies
- **Persistence**: New order is automatically saved and maintained across page refreshes

#### Reordering Companies
- **Company Blocks**: Drag company blocks to reorder the entire company sections
- **Associated Items**: When a company is moved, all its progress blocks move with it
- **Visual Feedback**: 
  - Company blocks show dragging state with reduced opacity
  - Insertion marker indicates drop position
- **Auto-Adjustment**: Company block heights automatically adjust after reordering

#### Interaction Details
- **Grab Cursor**: Hover over draggable elements to see grab cursor
- **Drop Zones**: Only valid drop areas are highlighted during drag
- **Warning Messages**: Attempting invalid moves (like cross-company transfers) shows a warning toast
- **Smooth Animations**: All movements include smooth transitions for better user experience
4. Progress blocks show compact, essential information in a single row
5. No company selection required - everything is always visible

### Understanding Progress Blocks

All progress blocks use a **compact, single-row layout** showing:
- Icon (📋 for projects, 📄 for agreements) + Title + Type label
- Hours display: "XXh XXm / XXh XXm" format 
- Percentage indicator (large, bold)
- Visual progress bar (200px width)
- Remove button (appears on hover)

**Project Blocks** (📋 icon):
- Display logged hours vs. total/budget hours
- Type label: "PROJECT"
- Automatic detection based on project-specific fields

**Agreement Blocks** (📄 icon):
- Display used hours vs. allowance hours
- Type label: "AGREEMENT" 
- Automatic detection based on contract-specific fields

**Layout Features**:
- Designed to fit 10+ items on screen simultaneously
- Full-width blocks that stretch across available space
- Company names not shown (grouped by company block on left)
- Minimal height for maximum density

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
getProjectHours(projectId) // Get comprehensive project time (see below)
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

## Comprehensive Project Time Calculation

### Overview

One of the key features of this dashboard is **accurate project time tracking** that matches what you see in Accelo's interface. The dashboard calculates the complete project time by including:

- **Direct project time**: Time logged directly against the project
- **Task time**: Time logged against individual tasks within the project
- **Milestone time**: Time logged against milestones and their sub-tasks
- **Nested structure**: Tasks that belong to milestones

This ensures the dashboard shows the same total hours as Accelo's project summary view.

### Why This Matters

When you view a project in Accelo, you see the **total time across all components**:
- Project Summary: "508h 55m / 572h 0m" 
- But the simple allocations API only returns: "82h 36m"

The difference is that Accelo's summary includes time from tasks and milestones, while the basic allocations endpoint only shows direct project time.

### How It Works

The `getProjectHours()` function in `api-client.js` performs a comprehensive calculation:

```javascript
async getProjectHours(projectId) {
  // 1. Get direct project allocations
  const projectTime = await getProjectAllocations(projectId);
  
  // 2. Get all tasks for this project
  const tasks = await getTasks(`against_type(job),against_id(${projectId})`);
  
  // 3. Get all milestones for this project  
  const milestones = await getMilestones(projectId);
  
  // 4. Sum time from each task
  for (const task of tasks) {
    const taskTime = await getTaskTimeEntries(task.id);
    totalTime += taskTime;
  }
  
  // 5. Sum time from each milestone (including their sub-tasks)
  for (const milestone of milestones) {
    const milestoneTime = await getMilestoneAllocations(milestone.id);
    const milestoneTasks = await getTasksUnderMilestone(milestone.id);
    
    totalTime += milestoneTime;
    for (const mTask of milestoneTasks) {
      totalTime += await getTaskTimeEntries(mTask.id);
    }
  }
  
  return totalTime; // Now matches Accelo's project summary!
}
```

### API Endpoints Used

The calculation uses multiple Accelo API endpoints:

1. **Project Allocations**: `/activities/allocations?_filters=against_type(job),against_id({id})`
2. **Project Tasks**: `/tasks?_filters=against_type(job),against_id({id})`
3. **Project Milestones**: `/jobs/{id}/milestones`
4. **Task Time Entries**: `/activities?_filters=against_type(task),against_id({id}),type(time)`
5. **Milestone Allocations**: `/activities/allocations?_filters=against_type(milestone),against_id({id})`
6. **Milestone Tasks**: `/tasks?_filters=against_type(milestone),against_id({id})`

### Performance Considerations

- **Parallel Processing**: Tasks and milestones are processed concurrently
- **Rate Limiting**: 50ms delays between requests to avoid API limits
- **Batch Processing**: Groups multiple API calls where possible
- **Caching**: Results are cached for 5 minutes like other API calls
- **Graceful Degradation**: Falls back to basic allocations if advanced calculation fails

### Console Logging

When debug logging is enabled, you'll see detailed output showing the breakdown:

```
Project 268 Getting complete project hours...
Found 2 tasks and 1 milestones for project 268
Project direct time: 82.6h
Task "Mussels App | Meetings & PM": 56.2h
Task "Mussels App | Discovery": 26.4h
Milestone "Implementation": 
  Milestone task "Technical Uplift": 292.8h
  Milestone task "Feature Enhancements": 133.5h
  Milestone task "Buffer": 0.0h
Project 268 TOTAL hours: {billableHours: 508.9, loggedHours: 508.9}
```

### Project Budget Handling

The dashboard also includes intelligent project budget calculation:

#### Known Project Budgets
```javascript
const knownBudgets = {
  '415': 200, // PGG002 - 200h budget
  '423': 40,  // DLF - 40h budget  
  '268': 572, // Mussels App - 572h budget (from Project Plan)
  '352': 80,  // LMS Feature Requests Q1 2025 - 80h budget
};
```

#### Smart Fallback Budgets
For unknown projects, the system uses intelligent defaults based on project size:
- **Small projects** (<10h logged): `loggedHours × 2` (minimum 20h)
- **Medium projects** (10-50h): `loggedHours × 1.15` (15% buffer)
- **Large projects** (50-100h): `loggedHours × 1.1` (10% buffer)
- **Very large projects** (>100h): `loggedHours × 1.05` (5% buffer)

#### Budget Warning System
When a budget appears to be calculated (rather than real), the dashboard shows a ⚠️ warning icon with tooltip: "Budget may be estimated. Consider setting actual project budget."

### Adding New Known Budgets

To add budget information for new projects:

1. **Open `src/dashboard.js`**
2. **Find the `getProjectBudget()` function**
3. **Add to `knownBudgets` object**:
   ```javascript
   const knownBudgets = {
     // existing budgets...
     '999': 120,  // New Project - 120h budget
   };
   ```
4. **Or add pattern matching**:
   ```javascript
   if (titleLower.includes('new project pattern')) {
     return 120;
   }
   ```

This ensures accurate progress calculations that match Accelo's interface exactly.

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

## Chat API for AI Integration

The dashboard includes a specialized Chat API that enables AI assistants to interact with your Accelo data programmatically. This API provides structured endpoints for:

- **Status Checking**: Verify API credentials and connection status
- **Company Management**: Search and retrieve company information
- **Project Access**: Get detailed project data including time tracking
- **Agreement Monitoring**: Access contract details and usage metrics
- **Generic Testing**: Test any Accelo API endpoint with custom parameters

### Quick Start

1. **Prerequisites**: Ensure your dashboard server is running and API credentials are configured
2. **Status Check**: `GET http://localhost:8080/api/chat/status`
3. **Search Companies**: `GET http://localhost:8080/api/chat/companies?search=acme`
4. **Get Company Details**: `GET http://localhost:8080/api/chat/company/123`

### Key Features

- **Secure**: Uses existing credential storage, never exposes API keys
- **Error-Friendly**: Provides actionable error messages for troubleshooting
- **Comprehensive**: Access to all major Accelo resources
- **Flexible**: Generic test endpoint for any API exploration

### Full Documentation

For complete Chat API documentation, examples, and troubleshooting, see **[CHAT_API_README.md](CHAT_API_README.md)**.

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
2. **No Filtering**: Cannot filter projects by status
3. **Fixed Metrics**: Cannot customize displayed data

## Recent Updates

### Dashboard Layout Redesign (v2.0)

**Major Changes**:
- **New Layout**: Replaced sidebar + main content with company-grouped rows
- **Compact Design**: Progress blocks now fit 10+ items on screen
- **Full-Width Blocks**: Items stretch across available width
- **Height-Matched Companies**: Company blocks adjust to match their content height
- **Improved Type Detection**: Enhanced logic to properly identify projects vs agreements
- **Single-Row Format**: All essential information displayed horizontally

**Visual Improvements**:
- Proper icons: 📋 for projects, 📄 for agreements
- Consistent "XXh XXm / XXh XXm" hours formatting
- Large percentage indicators for quick scanning
- Remove company names from blocks (shown in company grouping instead)
- 200px progress bars with gradient styling

**User Experience**:
- No company selection required - everything visible at once
- Optimized for viewing many items simultaneously
- Better use of screen real estate
- Cleaner, more professional appearance

**Technical Changes**:
- Enhanced type detection with explicit type setting
- Improved data flow with proper type assignment
- New CSS architecture for company-grouped layout
- Better responsive design for different screen sizes

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
