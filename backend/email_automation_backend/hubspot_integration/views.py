import logging
import uuid
import requests
from datetime import timedelta
from django.utils import timezone
from django.shortcuts import redirect
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from .models import HubSpotAccount, HubSpotContact, HubSpotSyncLog
from .serializers import (
    HubSpotAccountSerializer, HubSpotContactSerializer, HubSpotSyncLogSerializer,
    HubSpotConnectionStatusSerializer, HubSpotSyncStatsSerializer,
    HubSpotOAuthInitSerializer, HubSpotOAuthCallbackSerializer
)
from .services import HubSpotOAuthService, HubSpotContactService
from .utils import is_connected, is_token_expired

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def debug_oauth_logs(request):
    """Debug endpoint to check recent OAuth logs"""
    try:
        import os
        log_file = settings.BASE_DIR / 'logs' / 'django.log'
        if os.path.exists(log_file):
            # Read last 50 lines of the log file
            with open(log_file, 'r') as f:
                lines = f.readlines()
                last_lines = lines[-50:] if len(lines) > 50 else lines
                return Response({
                    'log_entries': [line.strip() for line in last_lines if 'hubspot' in line.lower() or 'oauth' in line.lower()],
                    'total_lines': len(lines),
                    'showing_last': len(last_lines)
                })
        else:
            return Response({'error': 'Log file not found', 'log_path': str(log_file)})
    except Exception as e:
        return Response({'error': f'Failed to read logs: {str(e)}'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def hubspot_debug_oauth_url(request):
    """Debug endpoint to check OAuth URL generation"""
    try:
        oauth_service = HubSpotOAuthService()
        auth_url = oauth_service.get_authorization_url(state=str(request.user.id))
        
        return Response({
            'auth_url': auth_url,
            'client_id': settings.HUBSPOT_CLIENT_ID,
            'redirect_uri': settings.HUBSPOT_REDIRECT_URI,
            'scopes_requested': settings.HUBSPOT_OAUTH_SCOPES,
            'scope_string': ' '.join(settings.HUBSPOT_OAUTH_SCOPES)
        })
        
    except Exception as e:
        logger.error(f"Error generating OAuth URL: {str(e)}")
        return Response(
            {'error': f'Failed to generate OAuth URL: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def hubspot_status(request):
    """Get user's HubSpot connection status"""
    try:
        hubspot_account = request.user.hubspot_account
        serializer = HubSpotAccountSerializer(hubspot_account)
        return Response(serializer.data)
    except HubSpotAccount.DoesNotExist:
        return Response({
            'is_connected': False,
            'status': 'disconnected',
            'message': 'No HubSpot account connected'
        })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def init_hubspot_oauth_robust(request):
    """Initialize HubSpot OAuth flow with robust state handling"""
    try:
        # Create a composite state that includes user info
        import time
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
        
        logger.info(f"Generated robust OAuth URL for user {request.user.email}: {auth_url}")
        
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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def init_hubspot_oauth(request):
    """Initialize HubSpot OAuth flow"""
    try:
        oauth_service = HubSpotOAuthService()
        
        # Generate a unique state parameter for security
        state = str(uuid.uuid4())
        
        # Store state in session for verification
        request.session['hubspot_oauth_state'] = state
        request.session['hubspot_oauth_user'] = str(request.user.id)
        
        # Generate authorization URL
        auth_url = oauth_service.get_authorization_url(state=state)
        
        serializer = HubSpotOAuthInitSerializer({
            'authorization_url': auth_url,
            'state': state
        })
        
        return Response(serializer.data)
        
    except Exception as e:
        logger.error(f"Failed to initialize HubSpot OAuth for user {request.user.email}: {str(e)}")
        return Response(
            {'error': 'Failed to initialize HubSpot connection'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def test_hubspot_connection(request):
    """Test HubSpot connection and return detailed status information"""
    try:
        # Check if user has HubSpot account
        try:
            hubspot_account = request.user.hubspot_account
        except HubSpotAccount.DoesNotExist:
            return Response({
                'connected': False,
                'error': 'No HubSpot account found',
                'error_type': 'no_account',
                'recommendation': 'Initialize OAuth flow to connect HubSpot account',
                'next_step': 'Call /api/hubspot/oauth/init/ to start connection process'
            })
        
        # Test basic connection status
        connection_info = {
            'connected': is_connected(hubspot_account),
            'status': hubspot_account.status,
            'hub_id': hubspot_account.hub_id,
            'portal_id': hubspot_account.portal_id,
            'hub_domain': hubspot_account.hub_domain,
            'token_expires_at': hubspot_account.token_expires_at,
            'is_token_expired': is_token_expired(hubspot_account),
            'last_sync_at': hubspot_account.last_sync_at,
            'auto_sync_contacts': hubspot_account.auto_sync_contacts
        }
        
        # If not connected, return status without testing API
        if not is_connected(hubspot_account):
            connection_info.update({
                'error': 'Account not connected or token expired',
                'error_type': 'disconnected',
                'recommendation': 'Reconnect your HubSpot account',
                'next_step': 'Call /api/hubspot/oauth/init/ to reconnect'
            })
            return Response(connection_info)
        
        # Test API connectivity
        try:
            from .services import HubSpotAPIService
            api_service = HubSpotAPIService(hubspot_account)
            
            # Try to make a simple API call to test connectivity
            headers = api_service._get_headers()
            response = requests.get(
                f"{api_service.base_url}/crm/v3/objects/contacts",
                headers=headers,
                params={'limit': 1}
            )
            
            if response.status_code == 200:
                connection_info.update({
                    'api_test': 'success',
                    'api_response_status': response.status_code,
                    'recommendation': 'Connection is working properly'
                })
            else:
                connection_info.update({
                    'api_test': 'failed',
                    'api_response_status': response.status_code,
                    'api_error': response.text,
                    'recommendation': 'API access failed - check scopes and permissions'
                })
                
        except Exception as api_error:
            connection_info.update({
                'api_test': 'failed',
                'api_error': str(api_error),
                'recommendation': 'API test failed - token may be invalid or scopes insufficient'
            })
        
        return Response(connection_info)
        
    except Exception as e:
        logger.error(f"Failed to test HubSpot connection for user {request.user.email}: {str(e)}")
        return Response({
            'connected': False,
            'error': 'Connection test failed',
            'error_type': 'test_error',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([])  # No authentication required for OAuth callback
def hubspot_oauth_callback(request):
    """Handle HubSpot OAuth callback"""
    try:
        # Extract callback parameters
        code = request.GET.get('code')
        state = request.GET.get('state')
        error = request.GET.get('error')
        error_description = request.GET.get('error_description')
        
        logger.info(f"HubSpot OAuth callback received - Code: {'present' if code else 'missing'}, State: {state}, Error: {error}")
        
        # Handle OAuth errors
        if error:
            logger.error(f"HubSpot OAuth error: {error} - {error_description}")
            return redirect(f"{settings.FRONTEND_URL}/dashboard?hubspot_error={error}&error_description={error_description}")
        
        # Check if code is present
        if not code:
            logger.error("Authorization code missing from callback")
            return redirect(f"{settings.FRONTEND_URL}/dashboard?hubspot_error=no_code")
        
        # Validate state parameter with improved handling
        session_state = request.session.get('hubspot_oauth_state')
        session_user_id = request.session.get('hubspot_oauth_user')
        
        logger.info(f"State validation - Session state: {session_state}, Callback state: {state}")
        
        # Extract user ID from state parameter as primary method
        user_id = None
        
        logger.info(f"DEBUG: Received state: {state}")
        logger.info(f"DEBUG: Session user ID: {session_user_id}")
        logger.info(f"DEBUG: State contains colon: {':' in str(state) if state else False}")
        
        if state and ':' in state:
            try:
                state_parts = state.split(':')
                logger.info(f"DEBUG: State parts: {state_parts}, length: {len(state_parts)}")
                if len(state_parts) >= 3:
                    user_id = state_parts[0]
                    timestamp = int(state_parts[1])
                    
                    # Check if state is not too old (1 hour limit)
                    import time
                    current_time = int(time.time())
                    if current_time - timestamp > 3600:  # 1 hour
                        logger.error(f"OAuth state expired - timestamp: {timestamp}, current: {current_time}")
                        return redirect(f"{settings.FRONTEND_URL}/dashboard?hubspot_error=state_expired&details=oauth_timeout")
                        
                    logger.info(f"Extracted user ID from state: {user_id}")
                else:
                    logger.warning(f"State parameter has wrong format: {state}")
            except (ValueError, IndexError) as e:
                logger.error(f"Failed to parse state parameter: {state} - {str(e)}")
        else:
            logger.warning(f"State parameter is empty or doesn't contain colon: {state}")
        
        # Fallback to session if state parsing failed
        if not user_id and session_user_id:
            user_id = session_user_id
            logger.info(f"Using user ID from session: {user_id}")
        
        # Final validation
        if not user_id:
            logger.error(f"No user ID found - State: {state}, Session User ID: {session_user_id}")
            return redirect(f"{settings.FRONTEND_URL}/dashboard?hubspot_error=no_user&details=no_user_found")
            
        # Optional: Validate against session state if available
        if session_state and session_state != state:
            logger.warning(f"State mismatch - Session: {session_state}, Callback: {state} - but continuing with state user ID")
        
        # Get user
        from Accounts.models import User
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            logger.error(f"User {user_id} not found")
            return redirect(f"{settings.FRONTEND_URL}/dashboard?hubspot_error=user_not_found")
        
        # Exchange code for tokens
        oauth_service = HubSpotOAuthService()
        token_data = oauth_service.exchange_code_for_tokens(code)
        
        # Get account information
        account_info = oauth_service.get_account_info(token_data['access_token'])
        
        # Create or update HubSpot account
        hubspot_account, created = HubSpotAccount.objects.get_or_create(
            user=user,
            defaults={
                'hubspot_user_id': account_info.get('user', ''),
                'portal_id': account_info.get('portalId', ''),
                'hub_id': token_data.get('hub_id', account_info.get('portalId', '')),
                'hub_domain': token_data.get('hub_domain') or account_info.get('hub_domain'),
                'access_token': token_data['access_token'],
                'refresh_token': token_data['refresh_token'],
                'token_expires_at': timezone.now() + timedelta(seconds=token_data.get('expires_in', 3600)),
                'status': 'connected'
            }
        )
        
        if not created:
            # Update existing account
            hubspot_account.hubspot_user_id = account_info.get('user', '')
            hubspot_account.portal_id = account_info.get('portalId', '')
            hubspot_account.hub_id = token_data.get('hub_id', account_info.get('portalId', ''))
            hubspot_account.hub_domain = token_data.get('hub_domain') or account_info.get('hub_domain')
            hubspot_account.access_token = token_data['access_token']
            hubspot_account.refresh_token = token_data['refresh_token']
            hubspot_account.token_expires_at = timezone.now() + timedelta(seconds=token_data.get('expires_in', 3600))
            hubspot_account.status = 'connected'
            hubspot_account.save()
        
        # Clean up session
        request.session.pop('hubspot_oauth_state', None)
        request.session.pop('hubspot_oauth_user', None)
        
        logger.info(f"Successfully connected HubSpot account for user {user.email}")
        
        # Redirect to frontend with success
        return redirect(f"{settings.FRONTEND_URL}/dashboard?hubspot_connected=true")
        
    except Exception as e:
        logger.error(f"HubSpot OAuth callback error: {str(e)}")
        return redirect(f"{settings.FRONTEND_URL}/dashboard?hubspot_error=connection_failed")


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def disconnect_hubspot(request):
    """Disconnect user's HubSpot account"""
    try:
        hubspot_account = request.user.hubspot_account
        hubspot_account.status = 'disconnected'
        hubspot_account.access_token = ''
        hubspot_account.refresh_token = ''
        hubspot_account.token_expires_at = None
        hubspot_account.save()
        
        logger.info(f"Disconnected HubSpot account for user {request.user.email}")
        
        return Response({'message': 'HubSpot account disconnected successfully'})
        
    except HubSpotAccount.DoesNotExist:
        return Response(
            {'error': 'No HubSpot account found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Failed to disconnect HubSpot account for user {request.user.email}: {str(e)}")
        return Response(
            {'error': 'Failed to disconnect HubSpot account'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_hubspot_contacts(request):
    """Get user's HubSpot contacts"""
    try:
        hubspot_account = request.user.hubspot_account
        contacts = hubspot_account.contacts.all().order_by('-created_at')
        
        # Pagination
        page_size = int(request.GET.get('page_size', 20))
        page = int(request.GET.get('page', 1))
        start = (page - 1) * page_size
        end = start + page_size
        
        paginated_contacts = contacts[start:end]
        serializer = HubSpotContactSerializer(paginated_contacts, many=True)
        
        return Response({
            'contacts': serializer.data,
            'total': contacts.count(),
            'page': page,
            'page_size': page_size,
            'has_next': end < contacts.count()
        })
        
    except HubSpotAccount.DoesNotExist:
        return Response(
            {'error': 'No HubSpot account found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Failed to get HubSpot contacts for user {request.user.email}: {str(e)}")
        return Response(
            {'error': 'Failed to retrieve contacts'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_sync_statistics(request):
    """Get HubSpot synchronization statistics"""
    try:
        # Check if user has a HubSpot account first
        try:
            hubspot_account = request.user.hubspot_account
        except HubSpotAccount.DoesNotExist:
            return Response({
                'error': 'No HubSpot account connected',
                'error_type': 'no_account',
                'message': 'Please connect your HubSpot account first to view statistics.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if account is properly connected
        if not is_connected(hubspot_account):
            return Response({
                'error': 'HubSpot account not connected or token expired',
                'error_type': 'disconnected',
                'status': hubspot_account.status,
                'is_token_expired': is_token_expired(hubspot_account),
                'message': 'Your HubSpot connection has expired. Please reconnect your account.'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Get statistics
        contact_service = HubSpotContactService(request.user)
        stats = contact_service.get_sync_statistics()
        
        serializer = HubSpotSyncStatsSerializer(stats)
        return Response(serializer.data)
        
    except Exception as e:
        logger.error(f"Failed to get sync statistics for user {request.user.email}: {str(e)}")
        return Response(
            {
                'error': 'Failed to retrieve statistics', 
                'error_type': 'server_error',
                'details': str(e)
            }, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_sync_logs(request):
    """Get HubSpot synchronization logs"""
    try:
        hubspot_account = request.user.hubspot_account
        logs = hubspot_account.sync_logs.all().order_by('-created_at')
        
        # Pagination
        page_size = int(request.GET.get('page_size', 20))
        page = int(request.GET.get('page', 1))
        start = (page - 1) * page_size
        end = start + page_size
        
        paginated_logs = logs[start:end]
        serializer = HubSpotSyncLogSerializer(paginated_logs, many=True)
        
        return Response({
            'logs': serializer.data,
            'total': logs.count(),
            'page': page,
            'page_size': page_size,
            'has_next': end < logs.count()
        })
        
    except HubSpotAccount.DoesNotExist:
        return Response(
            {'error': 'No HubSpot account found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Failed to get sync logs for user {request.user.email}: {str(e)}")
        return Response(
            {'error': 'Failed to retrieve logs'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_sync_settings(request):
    """Update HubSpot sync settings"""
    try:
        hubspot_account = request.user.hubspot_account
        
        # Update settings from request data
        auto_sync_contacts = request.data.get('auto_sync_contacts')
        sync_company_data = request.data.get('sync_company_data')
        
        if auto_sync_contacts is not None:
            hubspot_account.auto_sync_contacts = auto_sync_contacts
        
        if sync_company_data is not None:
            hubspot_account.sync_company_data = sync_company_data
            
        hubspot_account.save()
        
        serializer = HubSpotAccountSerializer(hubspot_account)
        return Response(serializer.data)
        
    except HubSpotAccount.DoesNotExist:
        return Response(
            {'error': 'No HubSpot account found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Failed to update sync settings for user {request.user.email}: {str(e)}")
        return Response(
            {'error': 'Failed to update settings'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def manual_sync_contact(request):
    """Manually sync a specific contact to HubSpot"""
    try:
        contact_id = request.data.get('contact_id')
        if not contact_id:
            return Response(
                {'error': 'Contact ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        hubspot_account = request.user.hubspot_account
        contact = hubspot_account.contacts.get(id=contact_id)
        
        # Initialize contact service and sync
        contact_service = HubSpotContactService(request.user)
        contact_service._sync_contact_to_hubspot(contact)
        
        # Return updated contact data
        serializer = HubSpotContactSerializer(contact)
        return Response(serializer.data)
        
    except HubSpotAccount.DoesNotExist:
        return Response(
            {'error': 'No HubSpot account found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except HubSpotContact.DoesNotExist:
        return Response(
            {'error': 'Contact not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Failed to sync contact {contact_id} for user {request.user.email}: {str(e)}")
        return Response(
            {'error': f'Failed to sync contact: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
