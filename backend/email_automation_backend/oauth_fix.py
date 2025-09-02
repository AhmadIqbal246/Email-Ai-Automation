#!/usr/bin/env python
"""
Quick fix for OAuth session expiration issue
This provides an alternative OAuth initialization that's more resilient
"""

from django.conf import settings
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
import uuid
import time
import logging

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def init_hubspot_oauth_robust(request):
    """Initialize HubSpot OAuth flow with robust state handling"""
    try:
        # Create a composite state that includes user info
        timestamp = str(int(time.time()))
        random_part = str(uuid.uuid4())[:8]
        user_id = str(request.user.id)
        
        # Format: userid:timestamp:random
        state = f"{user_id}:{timestamp}:{random_part}"
        
        # Store in session as backup
        request.session['hubspot_oauth_state'] = state
        request.session['hubspot_oauth_user'] = user_id
        request.session['hubspot_oauth_timestamp'] = timestamp
        request.session.set_expiry(3600)  # 1 hour
        
        # Build OAuth URL manually for clarity
        from urllib.parse import urlencode
        oauth_params = {
            'client_id': settings.HUBSPOT_CLIENT_ID,
            'redirect_uri': settings.HUBSPOT_REDIRECT_URI,
            'scope': ' '.join(settings.HUBSPOT_OAUTH_SCOPES),
            'response_type': 'code',
            'state': state
        }
        
        auth_url = 'https://app.hubspot.com/oauth/authorize?' + urlencode(oauth_params)
        
        logger.info(f"Generated OAuth URL for user {request.user.email}: {auth_url}")
        
        return Response({
            'authorization_url': auth_url,
            'state': state,
            'expires_in': 3600,
            'instructions': [
                'Click the authorization_url immediately',
                'Complete the HubSpot authorization within 1 hour',
                'Make sure you are not using a HubSpot developer account for testing'
            ]
        })
        
    except Exception as e:
        logger.error(f"Failed to initialize robust OAuth for user {request.user.email}: {str(e)}")
        return Response(
            {'error': f'Failed to initialize HubSpot connection: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

# Usage instructions:
# 1. Add this to your urls.py: 
#    path('oauth/init-robust/', init_hubspot_oauth_robust, name='hubspot-oauth-init-robust'),
# 
# 2. Use this endpoint instead of the regular init endpoint:
#    POST /api/hubspot/oauth/init-robust/
#
# 3. This creates a more robust state parameter that doesn't rely solely on Django sessions
