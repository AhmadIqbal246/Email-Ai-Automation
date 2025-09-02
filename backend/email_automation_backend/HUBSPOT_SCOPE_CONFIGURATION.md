# HubSpot OAuth Scope Configuration Guide

## Current Issue: Scope Mismatch Error

You're getting the error: "Authorization failed because there is a mismatch between the scopes in the install URL and the app's configured scopes."

This happens when the scopes we request in the OAuth URL don't exactly match what's configured in your HubSpot app settings.

## How to Fix This

### Step 1: Check Your HubSpot App Scopes

1. Go to your HubSpot Developer Account
2. Navigate to your app settings
3. Look at the "Scopes" section
4. Note down EXACTLY what scopes are listed there

### Step 2: Update Django Settings

In your `settings.py` file, update the `HUBSPOT_OAUTH_SCOPES` list to match exactly what you see in your HubSpot app:

```python
# Example configurations (uncomment the one that matches your app):

# Option 1: If you only have basic contacts scope
HUBSPOT_OAUTH_SCOPES = [
    'contacts'
]

# Option 2: If you have the new v3 scopes
HUBSPOT_OAUTH_SCOPES = [
    'crm.objects.contacts.read',
    'crm.objects.contacts.write'
]

# Option 3: If you have all the scopes you mentioned before
HUBSPOT_OAUTH_SCOPES = [
    'oauth',
    'crm.export',
    'crm.import', 
    'crm.lists.read',
    'crm.lists.write',
    'crm.objects.contacts.read',
    'crm.objects.contacts.write',
    'crm.schemas.contacts.read',
    'crm.schemas.contacts.write'
]

# Option 4: If you have a mix (common case)
HUBSPOT_OAUTH_SCOPES = [
    'contacts',
    'oauth'
]
```

### Step 3: Test the Configuration

1. Start your Django server: `python manage.py runserver`
2. Go to the debug endpoint: `http://localhost:8000/api/hubspot/debug/oauth-url/`
3. This will show you the exact OAuth URL being generated
4. Check if the scopes in the URL match your HubSpot app scopes

### Step 4: Try the OAuth Flow

Once the scopes match, try connecting to HubSpot again from your frontend.

## Common HubSpot App Scope Configurations

### For Contact Management Apps (Most Common):
```
- contacts
- oauth (sometimes)
```

### For Advanced Contact Management:
```
- crm.objects.contacts.read
- crm.objects.contacts.write
- crm.schemas.contacts.read
- crm.schemas.contacts.write
```

### For Full CRM Access:
```
- oauth
- crm.export
- crm.import
- crm.lists.read
- crm.lists.write
- crm.objects.contacts.read
- crm.objects.contacts.write
- crm.schemas.contacts.read
- crm.schemas.contacts.write
```

## Important Notes

1. **Exact Match Required**: The scopes must match EXACTLY - no extra scopes, no missing scopes
2. **Case Sensitive**: Make sure the case matches exactly
3. **Order Doesn't Matter**: But all scopes must be present
4. **OAuth Scope**: Some apps require the `oauth` scope, others don't

## Testing Steps

1. Update settings.py with the correct scopes
2. Restart Django server
3. Try the OAuth connection
4. If it still fails, double-check your HubSpot app scopes
5. Use the debug endpoint to verify the OAuth URL

## Debug Endpoint

Use this endpoint to check what OAuth URL is being generated:
`GET /api/hubspot/debug/oauth-url/`

This will show you:
- The complete OAuth URL
- The scopes being requested
- Your client ID and redirect URI

Make sure everything matches your HubSpot app configuration.
