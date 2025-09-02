#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'email_automation_backend.settings')
django.setup()

from django.conf import settings
from urllib.parse import urlencode

def main():
    print('=== HubSpot Configuration ===')
    print(f'Client ID: {settings.HUBSPOT_CLIENT_ID}')
    print(f'Redirect URI: {settings.HUBSPOT_REDIRECT_URI}')
    print(f'Scopes: {settings.HUBSPOT_OAUTH_SCOPES}')
    print(f'Scope String: {" ".join(settings.HUBSPOT_OAUTH_SCOPES)}')

    # Generate the OAuth URL
    auth_params = {
        'client_id': settings.HUBSPOT_CLIENT_ID,
        'redirect_uri': settings.HUBSPOT_REDIRECT_URI,
        'scope': ' '.join(settings.HUBSPOT_OAUTH_SCOPES),
        'response_type': 'code',
        'state': 'test-state'
    }
    auth_url = 'https://app.hubspot.com/oauth/authorize?' + urlencode(auth_params)
    print(f'\nOAuth URL:')
    print(auth_url)
    
    print('\n=== Next Steps ===')
    print('1. The scope issue has been fixed (changed from "contacts" to "crm.objects.contacts.read")')
    print('2. However, you cannot test on a developer account (account ID: 243759707)')
    print('3. You need to test on a regular HubSpot account or create a test account')
    print('4. The OAuth URL above should work with a non-developer account')

if __name__ == '__main__':
    main()
