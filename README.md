# Accelo API Dashboard

A comprehensive dashboard application for Accelo that displays companies, projects, and agreements with real-time progress tracking.

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

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Accelo account with administrator access
- Service Application registered in Accelo

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

3. **Start the server**
   ```bash
   npm start
   ```

4. **Access the application**
   - Open http://localhost:8080 in your browser
   - You'll be prompted to configure settings on first visit

5. **Configure API Settings**
   - Go to Settings (gear icon in top right)
   - Enter your Service Application credentials:
     - Deployment name (e.g., "stp")
     - Client ID
     - Client Secret
   - Click "Connect to Accelo"

## Usage Guide

### Adding Companies to Dashboard

1. Click the "Add Item" button in the navigation bar
2. Search for companies by name
3. Select companies from the search results
4. Click "Add Selected Items"

### Viewing Company Data

- Click on any company in the sidebar
- View all active projects and agreements
- Monitor hours usage and progress

### Understanding Progress Blocks

**Project Blocks** show:
- Total logged hours
- Billable vs non-billable breakdown
- Project status and due dates

**Agreement Blocks** show:
- Current period usage
- Time allowance and remaining hours
- Visual progress bar with color coding:
  - Green: Under 75% usage
  - Yellow: 75-90% usage
  - Red: Over 90% usage

## Technical Architecture

### Frontend
- Vanilla JavaScript with modular components
- CSS Grid and Flexbox for responsive layouts
- Real-time search with debouncing
- Local storage for dashboard state

### Backend
- Express.js server
- Proxy for CORS handling
- In-memory settings storage (extend for production)
- Structured API client with caching

### API Integration
- Service Application authentication
- Automatic token management
- Rate limit awareness (5000 requests/hour)
- Comprehensive error handling

## Project Structure

```
accelo-dashboard-prototype/
├── index.html          # Main dashboard page
├── settings.html       # Settings configuration page
├── server.js           # Express server with API proxy
├── package.json        # Node.js dependencies
├── src/
│   ├── api-client.js   # Accelo API wrapper with caching
│   ├── dashboard.js    # Dashboard main functionality
│   ├── settings.js     # Settings page logic
│   └── components.js   # Reusable UI components
├── styles/
│   ├── main.css        # Global styles
│   └── dashboard.css   # Dashboard-specific styles
└── public/             # Static assets
```

## API Endpoints Used

- `/companies` - List and search companies
- `/jobs` - Get projects (filtered by company)
- `/contracts` - Get agreements (filtered by company)
- `/activities/allocations` - Get logged hours for projects
- `/contracts/{id}/periods` - Get usage data for agreements

## Security Considerations

- Client credentials are never exposed to the frontend
- All API calls go through the server proxy
- Token expiry is monitored and displayed
- Settings can be cleared at any time

## Extending the Application

### Adding New Features

1. **Additional Metrics**: Extend the progress blocks to show more data
2. **Filtering**: Add filters for project/agreement status
3. **Export**: Add functionality to export dashboard data
4. **Notifications**: Implement alerts for high usage agreements

### Production Deployment

For production use:
1. Use environment variables for sensitive configuration
2. Implement proper database storage for settings
3. Add user authentication and multi-tenancy
4. Set up HTTPS with proper certificates
5. Implement token refresh logic
6. Add comprehensive logging and monitoring

## Troubleshooting

### Common Issues

1. **"No settings configured" error**
   - Visit /settings and configure your API credentials

2. **CORS errors**
   - Ensure you're accessing via http://localhost:8080
   - Check that the proxy server is running

3. **Authentication failures**
   - Verify your Service Application is active
   - Check that the Execute As user has proper permissions
   - Ensure credentials are entered correctly

### Debug Mode

The Settings page includes a debug log that shows:
- API request details
- Authentication flow
- Error messages
- Response data

## Support

For issues specific to this dashboard application, check the debug logs in Settings.

For Accelo API documentation, visit: https://api.accelo.com/docs/

## License

MIT License - See LICENSE file for details

## Acknowledgments

Built using the proven authentication patterns from the accelo-api-tester project.
