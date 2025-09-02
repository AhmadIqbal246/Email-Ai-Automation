# HubSpot Connection Troubleshooting Guide

## Issues Fixed

### 1. **"invalid_state" Error**
**Root Cause:** OAuth state parameter validation was failing due to:
- Incorrect redirect URI configuration
- Poor session handling during OAuth flow

**Fix Applied:**
- Updated redirect URI from `http://localhost:8000/oauth/hubspot/callback` to `http://localhost:8000/api/hubspot/oauth/callback/`
- Improved state validation with detailed logging
- Added better error messages for different failure scenarios

### 2. **"Failed to retrieve statistics" Error**  
**Root Cause:** The statistics endpoint was not properly handling cases where:
- No HubSpot account exists for the user
- HubSpot account exists but is disconnected/expired

**Fix Applied:**
- Added proper account existence checks
- Added connection status validation
- Improved error responses with specific error types and recommendations

## Updated Configuration

### OAuth Scopes
Updated the HubSpot OAuth scopes to include proper permissions:
```python
HUBSPOT_OAUTH_SCOPES = [
    'contacts',  # Legacy contacts scope (most common)
    'oauth'      # Required for authentication
]
```

### Redirect URI
Fixed the redirect URI to match the Django URL pattern:
```python
HUBSPOT_REDIRECT_URI = 'http://localhost:8000/api/hubspot/oauth/callback/'
```

## New Endpoints Added

### 1. **Connection Test Endpoint**
`GET /api/hubspot/test-connection/`

This endpoint provides detailed connection diagnostics:
- Checks if HubSpot account exists
- Validates token status
- Tests API connectivity
- Provides specific recommendations for fixing issues

Example response:
```json
{
  "connected": true,
  "status": "connected",
  "hub_id": "123456",
  "portal_id": "987654",
  "api_test": "success",
  "recommendation": "Connection is working properly"
}
```

## Step-by-Step Connection Process

### 1. **Initialize OAuth Flow**
```javascript
// Frontend code
const response = await fetch('/api/hubspot/oauth/init/', {
  method: 'POST',
  credentials: 'include'
});
const data = await response.json();
// Redirect user to data.authorization_url
```

### 2. **Handle OAuth Callback**
The callback is automatically handled by Django and redirects back to your frontend with status parameters.

### 3. **Check Connection Status**
```javascript
// After OAuth flow completes
const response = await fetch('/api/hubspot/status/', {
  credentials: 'include'
});
const status = await response.json();
```

### 4. **Test Connection (Optional)**
```javascript
// For debugging connection issues
const response = await fetch('/api/hubspot/test-connection/', {
  credentials: 'include'
});
const testResult = await response.json();
```

## Frontend Error Handling

### Updated Error Response Format
All endpoints now return structured error responses:
```json
{
  "error": "Human-readable error message",
  "error_type": "specific_error_type",
  "message": "User-friendly explanation",
  "recommendation": "What to do next"
}
```

### Error Types to Handle

1. **`no_account`** - User has no HubSpot account
   - Action: Show "Connect HubSpot" button
   
2. **`disconnected`** - Account exists but is disconnected/expired
   - Action: Show "Reconnect HubSpot" button
   
3. **`invalid_state`** - OAuth state validation failed
   - Action: Restart OAuth flow
   
4. **`session_expired`** - OAuth session expired
   - Action: Start new OAuth flow
   
5. **`server_error`** - General server error
   - Action: Show error message and retry option

### Frontend Integration Example
```javascript
async function handleHubSpotConnection() {
  try {
    // Test connection first
    const testResponse = await fetch('/api/hubspot/test-connection/', {
      credentials: 'include'
    });
    const testResult = await testResponse.json();
    
    if (testResult.connected) {
      console.log('HubSpot is connected and working');
      return;
    }
    
    // Start OAuth flow if not connected
    const oauthResponse = await fetch('/api/hubspot/oauth/init/', {
      method: 'POST',
      credentials: 'include'
    });
    const oauthData = await oauthResponse.json();
    
    // Redirect to HubSpot for authorization
    window.location.href = oauthData.authorization_url;
    
  } catch (error) {
    console.error('HubSpot connection error:', error);
  }
}

// Handle OAuth callback results
function handleOAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  
  if (urlParams.get('hubspot_connected') === 'true') {
    // Success - show success message
    showSuccessMessage('HubSpot connected successfully!');
  } else if (urlParams.get('hubspot_error')) {
    const error = urlParams.get('hubspot_error');
    const details = urlParams.get('details');
    
    switch (error) {
      case 'invalid_state':
        showErrorMessage('Security validation failed. Please try connecting again.');
        break;
      case 'session_expired':
        showErrorMessage('Session expired. Please try connecting again.');
        break;
      case 'no_user':
        showErrorMessage('User session lost. Please log in again.');
        break;
      default:
        showErrorMessage(`Connection failed: ${error}`);
    }
  }
}
```

## Important Notes

### 1. **HubSpot App Configuration**
Make sure your HubSpot app configuration matches the settings:
- **Redirect URI:** `http://localhost:8000/api/hubspot/oauth/callback/`
- **Scopes:** `contacts` and `oauth`

### 2. **Session Requirements**
- Django sessions must be enabled
- Session cookies must be accessible during OAuth flow
- Frontend must include credentials in requests (`credentials: 'include'`)

### 3. **Environment Variables**
Create a `.env` file with your HubSpot credentials:
```env
HUBSPOT_CLIENT_ID=your_hubspot_client_id
HUBSPOT_CLIENT_SECRET=your_hubspot_client_secret
HUBSPOT_REDIRECT_URI=http://localhost:8000/api/hubspot/oauth/callback/
```

## Testing Your Connection

### 1. **Test OAuth URL Generation**
```bash
curl -X GET "http://localhost:8000/api/hubspot/debug/oauth-url/" \
  -H "Authorization: Token your_auth_token"
```

### 2. **Test Connection Status**
```bash
curl -X GET "http://localhost:8000/api/hubspot/test-connection/" \
  -H "Authorization: Token your_auth_token"
```

### 3. **Check Statistics**
```bash
curl -X GET "http://localhost:8000/api/hubspot/statistics/" \
  -H "Authorization: Token your_auth_token"
```

## Common Issues and Solutions

### Issue 1: "Scope mismatch" error
**Solution:** Update your HubSpot app scopes to match `HUBSPOT_OAUTH_SCOPES` in settings

### Issue 2: "Redirect URI mismatch" error  
**Solution:** Update your HubSpot app redirect URI to match `HUBSPOT_REDIRECT_URI` in settings

### Issue 3: Sessions not persisting
**Solution:** Ensure Django sessions are properly configured and frontend includes credentials

### Issue 4: Token expires quickly
**Solution:** The refresh token mechanism is implemented - tokens will auto-refresh when needed

## Next Steps

1. Update your HubSpot app configuration to match the new settings
2. Restart your Django server to apply configuration changes
3. Test the connection using the new test endpoint
4. Update your frontend to use the improved error handling
5. Monitor the logs for any remaining issues

The connection should now work properly with better error reporting for any remaining issues.
