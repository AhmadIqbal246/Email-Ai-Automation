#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'email_automation_backend.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.conf import settings

print('HubSpot OAuth Scopes configured:')
for scope in settings.HUBSPOT_OAUTH_SCOPES:
    print(f'  - {scope}')

scope_string = ' '.join(settings.HUBSPOT_OAUTH_SCOPES)
print(f'\nScope string: "{scope_string}"')

# Also show the OAuth URL that would be generated
from Accounts.hubspot_integration.services import HubSpotOAuthService
oauth_service = HubSpotOAuthService()
auth_url = oauth_service.get_authorization_url(state='test_state')
print(f'\nGenerated OAuth URL:')
print(f'{auth_url}')
