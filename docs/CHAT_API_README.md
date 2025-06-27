# Accelo Dashboard Chat API

This document describes the Chat API functionality that enables AI assistants to interact with your Accelo data through the dashboard application.

## Overview

The Chat API provides structured endpoints that allow AI assistants to:
- Check connection status and credentials
- Search and retrieve company information
- Access detailed project and agreement data
- Perform ad-hoc API testing
- Handle errors gracefully with actionable feedback

## Prerequisites

1. **Dashboard Server Running**: The main dashboard server must be running on `http://localhost:8080`
2. **API Credentials Configured**: You must have valid Accelo API credentials configured through the Settings page (`/settings`)
3. **Valid Access Token**: Your OAuth token must not be expired

## Authentication & Security

- **No Direct API Keys**: The Chat API never exposes your Accelo credentials
- **Server-Side Storage**: All credentials remain in server memory
- **Token Validation**: Each request validates token expiry
- **Secure Proxy**: All Accelo API calls go through the existing secure proxy

## Available Endpoints

### 1. Status Check
**GET** `/api/chat/status`

Check if API credentials are configured and valid.

**Response (Success):**
```json
{
  "status": "connected",
  "deployment": "yourcompany",
  "user": {
    "name": "John Doe",
    "email": "john@yourcompany.com"
  },
  "token_expires": "2024-01-15T10:30:00Z",
  "time_remaining": "25 days"
}
```

**Response (Error):**
```json
{
  "error": "No API credentials configured",
  "message": "Please configure your Accelo API credentials in the Settings page first",
  "action": "Visit /settings to configure credentials"
}
```

### 2. List Companies
**GET** `/api/chat/companies`

Retrieve a list of companies, with optional search and pagination.

**Query Parameters:**
- `search` (optional): Search term to filter companies
- `limit` (optional): Number of results (default: 10, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Example:**
```bash
GET /api/chat/companies?search=acme&limit=5
```

**Response:**
```json
{
  "success": true,
  "companies": [
    {
      "id": 123,
      "name": "Acme Corporation",
      "website": "https://acme.com",
      "phone": "+1-555-0123",
      "standing": "active",
      "status": 1,
      "date_created": 1640995200,
      "date_modified": 1641081600
    }
  ],
  "meta": {
    "count": 1,
    "search_term": "acme",
    "pagination": {
      "limit": 5,
      "offset": 0
    }
  }
}
```

### 3. Company Details
**GET** `/api/chat/company/:id`

Get comprehensive details for a specific company including all projects and agreements.

**Example:**
```bash
GET /api/chat/company/123
```

**Response:**
```json
{
  "success": true,
  "company": {
    "id": 123,
    "name": "Acme Corporation",
    "website": "https://acme.com",
    "phone": "+1-555-0123",
    "standing": "active"
  },
  "projects": [
    {
      "id": 456,
      "title": "Website Redesign",
      "status": 2,
      "standing": "active",
      "manager": { "id": 10, "name": "Jane Manager" },
      "date_started": 1640995200,
      "date_due": 1643673600,
      "billable_seconds": 144000,
      "unbillable_seconds": 36000
    }
  ],
  "agreements": [
    {
      "id": 789,
      "title": "Support Retainer",
      "status": 1,
      "standing": "active",
      "retainer_type": "time",
      "budgetType": "TIME_BUDGET",
      "timeAllowance": 144000,
      "timeUsed": 36000,
      "valueAllowance": 5000.00,
      "valueUsed": 1250.00,
      "percentageUsed": 25.0,
      "current_period": {
        "id": 101,
        "date_commenced": 1640995200,
        "date_expires": 1643673600,
        "contract_budget": {
          "time": 144000,
          "time_used": 36000,
          "time_remaining": 108000,
          "value": 5000.00,
          "value_used": 1250.00
        }
      }
    }
  ],
  "summary": {
    "total_projects": 3,
    "active_projects": 2,
    "total_agreements": 2,
    "active_agreements": 1
  }
}
```

### 4. Project Details
**GET** `/api/chat/project/:id`

Get detailed information about a specific project including time tracking.

**Example:**
```bash
GET /api/chat/project/456
```

**Response:**
```json
{
  "success": true,
  "project": {
    "id": 456,
    "title": "Website Redesign",
    "description": "Complete overhaul of company website",
    "status": 2,
    "standing": "active",
    "manager": { "id": 10, "name": "Jane Manager" },
    "against": { "id": 123, "name": "Acme Corporation" },
    "date_started": 1640995200,
    "date_due": 1643673600,
    "billable_seconds": 144000,
    "unbillable_seconds": 36000
  },
  "time_summary": {
    "billable_hours": "508.92",
    "unbillable_hours": "0.00",
    "total_hours": "508.92",
    "allocation_details": {
      "billable": 1832112,
      "nonbillable": 0,
      "logged": 1832112,
      "charged": 120000
    },
    "calculation_breakdown": {
      "project_direct_time": "82.60",
      "task_time": "133.50",
      "milestone_time": "292.82",
      "components_included": {
        "tasks": [
          { "id": 4136, "title": "Meetings & PM", "hours": "56.17" },
          { "id": 4444, "title": "Discovery", "hours": "26.42" }
        ],
        "milestones": [
          { 
            "id": 2087, 
            "title": "Implementation",
            "milestone_time": "0.00",
            "tasks": [
              { "id": 4654, "title": "Technical Uplift", "hours": "292.82" },
              { "id": 4655, "title": "Feature Enhancements", "hours": "133.50" },
              { "id": 4705, "title": "Buffer", "hours": "0.00" }
            ]
          }
        ]
      }
    }
  }
}
```

#### Project Time Calculation Notes

The project time calculation in the Chat API uses the **comprehensive calculation method** that matches Accelo's project summary view. This includes:

- **Project Direct Time**: Time logged directly against the project
- **Task Time**: Time from all tasks associated with the project  
- **Milestone Time**: Time from milestones and their sub-tasks

The `calculation_breakdown` field shows exactly how the total was calculated, making it transparent which components contributed to the final hours. This ensures the dashboard matches what users see in Accelo's interface.

For example, a project showing "508h 55m" in Accelo will now correctly show the same total through this API, rather than the old method which only showed direct project allocations (~82h).

### 5. Agreement Details
**GET** `/api/chat/agreement/:id`

Get detailed information about a specific agreement including current period usage.

**Example:**
```bash
GET /api/chat/agreement/789
```

**Response:**
```json
{
  "success": true,
  "agreement": {
    "id": 789,
    "title": "Support Retainer",
    "description": "Monthly support agreement",
    "status": 1,
    "standing": "active",
    "against": { "id": 123, "name": "Acme Corporation" },
    "date_started": 1640995200,
    "date_expires": 1672531200,
    "retainer_type": "time",
    "retainer_value": 5000.00
  },
  "current_period": {
    "id": 101,
    "date_commenced": 1640995200,
    "date_expires": 1643673600,
    "contract_budget": {
      "time": 144000,
      "time_used": 36000,
      "time_remaining": 108000,
      "value": 5000.00,
      "value_used": 1250.00
    }
  },
  "usage_summary": {
    "time_allowance_hours": "40.00",
    "time_used_hours": "10.00",
    "time_remaining_hours": "30.00",
    "usage_percentage": "25.0%",
    "value_budget": 5000.00,
    "value_used": 1250.00,
    "period_start": "2022-01-01",
    "period_end": "2022-01-31"
  }
}
```

### 6. Generic API Test
**GET** `/api/chat/test/{endpoint}`

Test any Accelo API endpoint with custom parameters.

**Example:**
```bash
GET /api/chat/test/jobs?_limit=5&_fields=id,title,status
```

**Response:**
```json
{
  "success": true,
  "endpoint": "jobs",
  "url": "https://yourcompany.api.accelo.com/api/v0/jobs?_limit=5&_fields=id,title,status",
  "response": {
    "response": [...],
    "meta": {...}
  }
}
```

## Error Handling

All endpoints return consistent error structures:

```json
{
  "error": "Error type",
  "message": "Detailed error description",
  "action": "Suggested next step",
  "additional_field": "context-specific data"
}
```

### Common Error Types

1. **No Credentials Configured**
   ```json
   {
     "error": "No API credentials configured",
     "action": "Visit /settings to configure credentials"
   }
   ```

2. **Token Expired**
   ```json
   {
     "error": "Access token expired",
     "expiry": "2024-01-01T00:00:00Z",
     "action": "Visit /settings to refresh your credentials"
   }
   ```

3. **API Errors**
   ```json
   {
     "error": "Failed to fetch company details",
     "message": "API Error 404: Company not found",
     "company_id": "123",
     "action": "Verify the company ID exists and try again"
   }
   ```

## Usage Examples for AI Assistants

### Example 1: Check Status
```bash
curl http://localhost:8080/api/chat/status
```

### Example 2: Search for Companies
```bash
curl "http://localhost:8080/api/chat/companies?search=acme&limit=5"
```

### Example 3: Get Company with All Details
```bash
curl http://localhost:8080/api/chat/company/123
```

### Example 4: Check Agreement Usage
```bash
curl http://localhost:8080/api/chat/agreement/789
```

### Example 5: Test Custom Endpoint
```bash
curl "http://localhost:8080/api/chat/test/contacts?_limit=10&_search=john"
```

## Known Test Data for STP Deployment

When testing with the STP deployment, the following known items can be used for verification:

### Known Company
- **Name**: Talleys Group
- **Search Test**: 
  ```bash
  curl "http://localhost:8080/api/chat/companies?search=talleys"
  ```

### Known Project
- **Name**: Mussels App 2025
- **Company**: Talleys Group
- **ID**: 268 (confirmed working)
- **Expected Total Time**: ~508h (comprehensive calculation)
- **Search Test**:
  ```bash
  curl "http://localhost:8080/api/chat/test/jobs?_search=mussels&_limit=5"
  ```
- **Direct Project Test**:
  ```bash
  curl "http://localhost:8080/api/chat/project/268"
  ```

### Known Agreement
- **Name**: Talleys | WetFish Proactive Maintenance
- **Company**: Talleys Group
- **Search Test**:
  ```bash
  curl "http://localhost:8080/api/chat/test/contracts?_search=wetfish&_limit=5"
  ```

### Full Test Sequence
Once connected to office VPN, test in this order:

1. **Connection Test**:
   ```bash
   curl http://localhost:8080/api/chat/status
   ```

2. **Find Talleys Group**:
   ```bash
   curl "http://localhost:8080/api/chat/companies?search=talleys"
   ```

3. **Get Talleys Company Details** (replace {id} with actual ID from step 2):
   ```bash
   curl http://localhost:8080/api/chat/company/{id}
   ```

4. **Search for Mussels App Project**:
   ```bash
   curl "http://localhost:8080/api/chat/test/jobs?_search=mussels&_fields=id,title,against&_limit=10"
   ```

5. **Search for WetFish Agreement**:
   ```bash
   curl "http://localhost:8080/api/chat/test/contracts?_search=wetfish&_fields=id,title,against&_limit=10"
   ```

## Agreement Budget Types

The Chat API automatically detects and returns different types of agreements based on their Period Budget settings in Accelo:

### Budget Type Detection

All agreement responses include a `budgetType` field with one of three values:

- **`TIME_BUDGET`**: Agreements with time-based budgets (Period Budget "On" with hour allowance)
- **`VALUE_BUDGET`**: Agreements with monetary budgets (Period Budget "On" with value allowance)  
- **`NO_BUDGET`**: Time & Materials agreements (Period Budget "Off")

### Response Fields

For each agreement, the API returns:

```javascript
{
  "id": 789,
  "title": "Agreement Name",
  "budgetType": "TIME_BUDGET" | "VALUE_BUDGET" | "NO_BUDGET",
  "timeAllowance": 144000,     // seconds (for TIME_BUDGET)
  "timeUsed": 36000,           // seconds (for all types)
  "valueAllowance": 5000.00,   // dollars (for VALUE_BUDGET)
  "valueUsed": 1250.00,        // dollars (for VALUE_BUDGET)
  "percentageUsed": 25.0,      // percentage (for budgeted types)
  // ... other fields
}
```

### Display Recommendations

Based on `budgetType`, display agreements as:

- **TIME_BUDGET**: "Agreement | Time Budget" with hour progress bar
- **VALUE_BUDGET**: "Agreement | Value Budget" with monetary progress
- **NO_BUDGET**: "Agreement" with only time worked (no progress bar)

### Example Usage

```bash
# Get company with agreements showing budget types
curl "http://localhost:8080/api/chat/company/123"

# Response includes:
{
  "agreements": [
    {
      "id": 456,
      "title": "Seeds Online Support", 
      "budgetType": "TIME_BUDGET",
      "timeAllowance": 108000,
      "timeUsed": 52200,
      "percentageUsed": 48.3
    },
    {
      "id": 789,
      "title": "Alpine LMS Support",
      "budgetType": "NO_BUDGET", 
      "timeUsed": 5400,
      "percentageUsed": null
    }
  ]
}
```

## Rate Limiting & Performance

- **Accelo API Limits**: 5,000 requests per hour (shared across all applications)
- **No Additional Throttling**: Chat API inherits the same limits as the main dashboard
- **Caching**: No additional caching beyond what's in the main application
- **Parallel Requests**: Company details endpoint makes parallel API calls for efficiency

## Security Considerations

1. **Local Network Only**: Chat API only accessible on localhost
2. **No Authentication**: Relies on physical access to the machine
3. **Credential Protection**: API keys never exposed in responses
4. **Request Logging**: All requests logged for debugging
5. **URL Validation**: Only allows requests to Accelo API domains

## Troubleshooting

### Server Not Responding
1. Ensure the dashboard server is running: `npm start`
2. Check that port 8080 is not blocked
3. Verify no other services are using port 8080

### API Errors
1. Check credentials are configured: `GET /api/chat/status`
2. Verify token hasn't expired
3. Check the server logs for detailed error information
4. Test with the main dashboard UI to isolate issues

### VPN/Network Access Issues
If you see "Your domain does not have permission to access this resource" errors:

1. **Check VPN Connection**: Many Accelo deployments restrict API access to office networks
2. **Verify IP Whitelist**: Ensure your current IP is allowed in Accelo's security settings
3. **Test from Office**: Try accessing from the office network directly
4. **Service Application Permissions**: Verify the Service Application has proper resource permissions in Accelo admin

**Error Pattern for VPN Issues**:
```json
{
  "error": "Test endpoint failed",
  "message": "API Error 401: Your domain does not have permission to access this resource."
}
```

This typically indicates network-level restrictions rather than credential issues.

### Invalid Responses
1. Ensure you're using the correct HTTP method (all endpoints are GET)
2. Check parameter formatting (use URL encoding)
3. Verify the resource IDs exist in your Accelo deployment

## Logging & Debugging

All Chat API requests are logged with the prefix `Chat API` in the server logs. Enable debug logging in the Settings page to see detailed API request/response information.

Example log entry:
```
[2024-01-01 10:30:00] [INFO] Chat API - Companies request: search=acme, limit=5
[2024-01-01 10:30:01] [ERROR] Chat API - Company Details Error: API Error 404: Company not found
```

## Future Enhancements

Potential future additions to the Chat API:
- POST endpoints for creating/updating records
- Bulk operations for multiple companies
- Real-time webhooks integration
- Custom report generation
- Advanced filtering and search capabilities

---

For questions about the Chat API, check the main application logs or refer to the main README.md for general troubleshooting steps. 