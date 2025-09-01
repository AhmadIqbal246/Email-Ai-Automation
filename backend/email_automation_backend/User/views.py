from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.views import APIView

import json
import os
import requests
from datetime import datetime, timezone as dt_timezone
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from Accounts.models import User
from .models import EmailAccount, EmailMessage, EmailFetchLog
from .serializers import EmailAccountSerializer


# Gmail Utility Functions
class GmailService:
    """Utility class for Gmail API operations"""
    
    def __init__(self, access_token, refresh_token=None):
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.credentials = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=os.environ.get('GOOGLE_CLIENT_ID'),
            client_secret=os.environ.get('GOOGLE_CLIENT_SECRET'),
            scopes=['https://www.googleapis.com/auth/gmail.readonly']
        )
        self.service = None
    
    def build_service(self):
        """Build Gmail API service"""
        try:
            self.service = build('gmail', 'v1', credentials=self.credentials)
            return True
        except Exception as e:
            print(f"Error building Gmail service: {e}")
            return False
    
    def get_user_profile(self):
        """Get Gmail user profile"""
        try:
            if not self.service:
                if not self.build_service():
                    return None
            
            profile = self.service.users().getProfile(userId='me').execute()
            return profile
        except Exception as e:
            print(f"Error getting user profile: {e}")
            return None
    
    def fetch_emails(self, max_results=10, query=''):
        """Fetch emails from Gmail"""
        try:
            if not self.service:
                if not self.build_service():
                    return []
            
            # Build query for unread emails if no specific query
            if not query:
                query = 'is:unread'
            
            # Get message IDs
            results = self.service.users().messages().list(
                userId='me', 
                q=query, 
                maxResults=max_results
            ).execute()
            
            messages = results.get('messages', [])
            email_data = []
            
            for message in messages:
                try:
                    # Get full message details
                    msg = self.service.users().messages().get(
                        userId='me', 
                        id=message['id'], 
                        format='full'
                    ).execute()
                    
                    # Extract email data
                    email_info = self._parse_email_message(msg)
                    if email_info:
                        email_data.append(email_info)
                        
                except Exception as e:
                    print(f"Error processing message {message['id']}: {e}")
                    continue
            
            return email_data
            
        except Exception as e:
            print(f"Error fetching emails: {e}")
            return []
    
    def _parse_email_message(self, msg):
        """Parse Gmail message into structured data"""
        try:
            headers = msg['payload']['headers']
            
            # Extract header information
            subject = next((h['value'] for h in headers if h['name'] == 'Subject'), 'No Subject')
            sender = next((h['value'] for h in headers if h['name'] == 'From'), '')
            recipients = next((h['value'] for h in headers if h['name'] == 'To'), '')
            cc = next((h['value'] for h in headers if h['name'] == 'Cc'), '')
            date = next((h['value'] for h in headers if h['name'] == 'Date'), '')
            
            # Parse date
            try:
                from email.utils import parsedate_to_datetime
                received_at = parsedate_to_datetime(date)
            except:
                received_at = datetime.now(dt_timezone.utc)
            
            # Extract body
            body_html, body_plain = self._extract_body(msg['payload'])
            
            return {
                'gmail_message_id': msg['id'],
                'gmail_thread_id': msg.get('threadId', ''),
                'subject': subject,
                'sender': sender,
                'recipients': recipients,
                'cc': cc,
                'body_html': body_html,
                'body_plain': body_plain,
                'received_at': received_at,
                'has_attachments': self._has_attachments(msg['payload'])
            }
            
        except Exception as e:
            print(f"Error parsing email message: {e}")
            return None
    
    def _extract_body(self, payload):
        """Extract HTML and plain text body from message payload"""
        body_html = ''
        body_plain = ''
        
        if 'parts' in payload:
            for part in payload['parts']:
                if part['mimeType'] == 'text/html':
                    body_html = part['body'].get('data', '')
                elif part['mimeType'] == 'text/plain':
                    body_plain = part['body'].get('data', '')
        else:
            if payload['mimeType'] == 'text/html':
                body_html = payload['body'].get('data', '')
            elif payload['mimeType'] == 'text/plain':
                body_plain = payload['body'].get('data', '')
        
        # Decode base64 data
        import base64
        if body_html:
            try:
                body_html = base64.urlsafe_b64decode(body_html).decode('utf-8')
            except:
                body_html = ''
        
        if body_plain:
            try:
                body_plain = base64.urlsafe_b64decode(body_plain).decode('utf-8')
            except:
                body_plain = ''
        
        return body_html, body_plain
    
    def _has_attachments(self, payload):
        """Check if message has attachments"""
        if 'parts' in payload:
            for part in payload['parts']:
                if part.get('filename'):
                    return True
        return False


# Gmail OAuth Views


# Gmail OAuth Views
class GmailOAuthView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Initiate Gmail OAuth flow"""
        try:
            # Google OAuth 2.0 configuration
            client_id = os.environ.get('GOOGLE_CLIENT_ID')
            redirect_uri = 'http://localhost:8000/api/auth/gmail/callback/'
            scope = 'https://www.googleapis.com/auth/gmail.readonly'
            
            # Generate OAuth URL
            oauth_url = (
                f'https://accounts.google.com/o/oauth2/v2/auth?'
                f'client_id={client_id}&'
                f'redirect_uri={redirect_uri}&'
                f'scope={scope}&'
                f'response_type=code&'
                f'access_type=offline&'
                f'prompt=consent'
            )
            
            return Response({
                'auth_url': oauth_url,
                'message': 'Redirect user to this URL to authorize Gmail access'
            })
            
        except Exception as e:
            return Response({
                'message': f'Failed to generate OAuth URL: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class GmailOAuthCallbackView(APIView):
    permission_classes = [AllowAny]  # Allow any for OAuth callback
    
    def get(self, request):
        """Handle OAuth callback from Google"""
        try:
            code = request.GET.get('code')
            state = request.GET.get('state')  # We'll use this to identify the user
            
            if not code:
                return Response({
                    'message': 'Authorization code not received'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Exchange code for tokens
            client_id = os.environ.get('GOOGLE_CLIENT_ID')
            client_secret = os.environ.get('GOOGLE_CLIENT_SECRET')
            redirect_uri = 'http://localhost:8000/api/auth/gmail/callback/'
            
            # Token exchange request
            token_url = 'https://oauth2.googleapis.com/token'
            token_data = {
                'client_id': client_id,
                'client_secret': client_secret,
                'code': code,
                'grant_type': 'authorization_code',
                'redirect_uri': redirect_uri
            }
            
            response = requests.post(token_url, data=token_data)
            if response.status_code != 200:
                return Response({
                    'message': 'Failed to exchange code for tokens'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            tokens = response.json()
            access_token = tokens.get('access_token')
            refresh_token = tokens.get('refresh_token')
            
            if not access_token:
                return Response({
                    'message': 'Access token not received'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get user email from Gmail API
            gmail_service = GmailService(access_token, refresh_token)
            profile = gmail_service.get_user_profile()
            
            if not profile:
                return Response({
                    'message': 'Failed to get Gmail profile'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            gmail_email = profile.get('emailAddress', '')
            
            # Redirect to frontend callback page with tokens
            from django.shortcuts import redirect
            from urllib.parse import urlencode
            
            # Encode the tokens and email for the frontend
            params = urlencode({
                'access_token': access_token,
                'refresh_token': refresh_token,
                'gmail_email': gmail_email,
                'status': 'success'
            })
            
            # Redirect to frontend callback page
            frontend_callback_url = f"http://localhost:5173/oauth-callback.html?{params}"
            return redirect(frontend_callback_url)
            
        except Exception as e:
            return Response({
                'message': f'Failed to process OAuth callback: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class GetEmailAccountsView(APIView):
    """Get email accounts for the authenticated user"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            email_accounts = EmailAccount.objects.filter(user=request.user)
            return Response({
                'email_accounts': [
                    {
                        'id': account.id,
                        'email': account.email_address,  # Frontend expects 'email' property
                        'email_address': account.email_address,  # Keep both for compatibility
                        'provider': account.provider,
                        'display_name': account.display_name,
                        'is_primary': account.is_primary,
                        'is_active': account.is_active
                    }
                    for account in email_accounts
                ]
            })
        except Exception as e:
            return Response({
                'message': f'Failed to fetch email accounts: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class GetAiRulesView(APIView):
    """Get AI rules for the authenticated user"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # For now, return empty rules since we haven't implemented the AI rules model yet
            return Response({
                'rules': []
            })
        except Exception as e:
            return Response({
                'message': f'Failed to fetch AI rules: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class ConnectEmailView(APIView):
    """Initiate email account connection"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            # Check if this is a direct connection with tokens or OAuth initiation
            action = request.data.get('action', 'oauth_init')
            
            if action == 'oauth_init':
                # Initiate OAuth flow - return the OAuth URL
                client_id = os.environ.get('GOOGLE_CLIENT_ID')
                redirect_uri = 'http://localhost:8000/api/auth/gmail/callback/'
                scope = 'https://www.googleapis.com/auth/gmail.readonly'
                
                # Add state parameter to identify the user
                state = str(request.user.id)
                
                oauth_url = (
                    f'https://accounts.google.com/o/oauth2/v2/auth?'
                    f'client_id={client_id}&'
                    f'redirect_uri={redirect_uri}&'
                    f'scope={scope}&'
                    f'response_type=code&'
                    f'access_type=offline&'
                    f'prompt=consent&'
                    f'state={state}'
                )
                
                return Response({
                    'message': 'OAuth flow initiated',
                    'auth_url': oauth_url,
                    'action': 'redirect_to_oauth'
                })
            
            elif action == 'connect_with_tokens':
                # Handle direct connection with tokens from localStorage
                # Check for both possible token names
                access_token = request.data.get('access_token') or request.data.get('authtoken')
                refresh_token = request.data.get('refresh_token') or request.data.get('refresh_token')
                gmail_email = request.data.get('gmail_email')
                
                if not all([access_token, gmail_email]):
                    return Response({
                        'message': 'Access token and Gmail email are required'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Check if email account already exists
                existing_account = EmailAccount.objects.filter(
                    user=request.user,
                    email_address=gmail_email
                ).first()
                
                if existing_account:
                    # Update existing account
                    existing_account.access_token = access_token
                    if refresh_token:
                        existing_account.refresh_token = refresh_token
                    existing_account.is_active = True
                    existing_account.save()
                    
                    return Response({
                        'message': 'Gmail account updated successfully',
                        'email_account_id': existing_account.id
                    })
                
                # Create new email account
                email_account = EmailAccount.objects.create(
                    user=request.user,
                    email_address=gmail_email,
                    provider='gmail',
                    display_name=gmail_email.split('@')[0],
                    access_token=access_token,
                    refresh_token=refresh_token,
                    is_primary=True,  # Make this the primary account
                    is_active=True
                )
                
                # Set other accounts as non-primary
                EmailAccount.objects.filter(
                    user=request.user,
                    is_primary=True
                ).exclude(id=email_account.id).update(is_primary=False)
                
                return Response({
                    'message': 'Gmail account connected successfully',
                    'email_account_id': email_account.id,
                    'email_address': gmail_email
                })
            
            else:
                return Response({
                    'message': 'Invalid action. Use "oauth_init" or "connect_with_tokens"'
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'message': f'Failed to connect email: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class DeleteAiRuleView(APIView):
    """Delete an AI rule"""
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, rule_id):
        try:
            # For now, return success since we haven't implemented the AI rules model yet
            return Response({
                'message': 'Rule deleted successfully'
            })
        except Exception as e:
            return Response({
                'message': f'Failed to delete rule: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class FetchEmailsView(APIView):
    """Fetch emails from connected Gmail accounts"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            # Get email account ID from request
            email_account_id = request.data.get('email_account_id')
            
            if not email_account_id:
                return Response({
                    'message': 'Email account ID is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get the email account
            try:
                email_account = EmailAccount.objects.get(
                    id=email_account_id,
                    user=request.user,
                    is_active=True
                )
            except EmailAccount.DoesNotExist:
                return Response({
                    'message': 'Email account not found or not active'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Check if we have valid tokens
            if not email_account.access_token:
                return Response({
                    'message': 'No access token available for this account'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Initialize Gmail service
            gmail_service = GmailService(
                email_account.access_token,
                email_account.refresh_token
            )
            
            # Fetch emails (limit to 10 for better performance)
            start_time = datetime.now()
            emails_data = gmail_service.fetch_emails(max_results=10)
            
            # Process and store emails
            messages_processed = 0
            for email_data in emails_data:
                try:
                    # Check if email already exists
                    existing_email = EmailMessage.objects.filter(
                        gmail_message_id=email_data['gmail_message_id']
                    ).first()
                    
                    if not existing_email:
                        # Create new email message
                        EmailMessage.objects.create(
                            email_account=email_account,
                            gmail_message_id=email_data['gmail_message_id'],
                            gmail_thread_id=email_data['gmail_thread_id'],
                            subject=email_data['subject'],
                            sender=email_data['sender'],
                            recipients=email_data['recipients'],
                            cc=email_data['cc'],
                            body_html=email_data['body_html'],
                            body_plain=email_data['body_plain'],
                            received_at=email_data['received_at'],
                            has_attachments=email_data['has_attachments']
                        )
                        messages_processed += 1
                        
                except Exception as e:
                    print(f"Error processing email {email_data.get('gmail_message_id', 'unknown')}: {e}")
                    continue
            
            # Calculate fetch duration
            fetch_duration = (datetime.now() - start_time).total_seconds()
            
            # Log the fetch operation
            EmailFetchLog.log_success(
                email_account=email_account,
                fetch_type='manual',
                messages_fetched=len(emails_data),
                messages_processed=messages_processed,
                fetch_duration=fetch_duration,
                last_message_date=emails_data[0]['received_at'] if emails_data else None
            )
            
            return Response({
                'message': f'Successfully fetched {len(emails_data)} emails, processed {messages_processed} new emails',
                'emails_fetched': len(emails_data),
                'emails_processed': messages_processed,
                'fetch_duration': fetch_duration
            })
            
        except Exception as e:
            # Log the failure
            if 'email_account' in locals():
                EmailFetchLog.log_failure(
                    email_account=email_account,
                    fetch_type='manual',
                    error_message=str(e)
                )
            
            return Response({
                'message': f'Failed to fetch emails: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class GetEmailsView(APIView):
    """Get fetched emails for the authenticated user"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Get query parameters
            email_account_id = request.GET.get('email_account_id')
            limit = int(request.GET.get('limit', 50))
            offset = int(request.GET.get('offset', 0))
            
            # Build query
            emails_query = EmailMessage.objects.filter(
                email_account__user=request.user
            ).select_related('email_account')
            
            # Filter by email account if specified
            if email_account_id:
                emails_query = emails_query.filter(email_account_id=email_account_id)
            
            # Get total count
            total_count = emails_query.count()
            
            # Apply pagination
            emails = emails_query.order_by('-received_at')[offset:offset + limit]
            
            # Format response
            emails_data = []
            for email in emails:
                emails_data.append({
                    'id': email.id,
                    'subject': email.subject,
                    'sender': email.sender,
                    'recipients': email.get_recipients_list(),
                    'cc': email.get_cc_list(),
                    'received_at': email.received_at.isoformat(),
                    'is_read': email.is_read,
                    'is_starred': email.is_starred,
                    'has_attachments': email.has_attachments,
                    'email_account': {
                        'id': email.email_account.id,
                        'email_address': email.email_account.email_address,
                        'provider': email.email_account.provider
                    }
                })
            
            return Response({
                'emails': emails_data,
                'total_count': total_count,
                'limit': limit,
                'offset': offset
            })
            
        except Exception as e:
            return Response({
                'message': f'Failed to fetch emails: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class GetEmailContentView(APIView):
    """Get full content of a specific email"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, email_id):
        try:
            # Get the email
            try:
                email = EmailMessage.objects.select_related('email_account').get(
                    id=email_id,
                    email_account__user=request.user
                )
            except EmailMessage.DoesNotExist:
                return Response({
                    'message': 'Email not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Return email content
            return Response({
                'id': email.id,
                'subject': email.subject,
                'sender': email.sender,
                'recipients': email.get_recipients_list(),
                'cc': email.get_cc_list(),
                'received_at': email.received_at.isoformat(),
                'is_read': email.is_read,
                'is_starred': email.is_starred,
                'has_attachments': email.has_attachments,
                'body_html': email.body_html,
                'body_plain': email.body_plain,
                'content': email.body_html or email.body_plain or 'No content available',
                'gmail_message_id': email.gmail_message_id,
                'gmail_thread_id': email.gmail_thread_id,
                'importance': email.importance,
                'email_account': {
                    'id': email.email_account.id,
                    'email_address': email.email_account.email_address,
                    'provider': email.email_account.provider
                }
            })
            
        except Exception as e:
            return Response({
                'message': f'Failed to get email content: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class MarkEmailAsReadView(APIView):
    """Mark an email as read"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, email_id):
        try:
            # Get the email
            try:
                email = EmailMessage.objects.select_related('email_account').get(
                    id=email_id,
                    email_account__user=request.user
                )
            except EmailMessage.DoesNotExist:
                return Response({
                    'message': 'Email not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Mark as read
            email.is_read = True
            email.save(update_fields=['is_read', 'updated_at'])
            
            return Response({
                'message': 'Email marked as read successfully',
                'email_id': email.id,
                'is_read': email.is_read
            })
            
        except Exception as e:
            return Response({
                'message': f'Failed to mark email as read: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class MarkAllEmailsAsReadView(APIView):
    """Mark all emails as read for the authenticated user"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            # Get all unread emails for the user
            unread_emails = EmailMessage.objects.filter(
                email_account__user=request.user,
                is_read=False
            )
            
            # Count unread emails
            unread_count = unread_emails.count()
            
            if unread_count == 0:
                return Response({
                    'message': 'No unread emails found',
                    'emails_updated': 0
                })
            
            # Mark all as read
            updated_count = unread_emails.update(
                is_read=True,
                updated_at=timezone.now()
            )
            
            return Response({
                'message': f'Successfully marked {updated_count} emails as read',
                'emails_updated': updated_count
            })
            
        except Exception as e:
            return Response({
                'message': f'Failed to mark all emails as read: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class ManualEmailRefreshView(APIView):
    """Manually trigger email refresh for all user's email accounts"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            from .tasks import fetch_single_account_emails_task
            
            # Get all active email accounts for the user
            email_accounts = EmailAccount.objects.filter(
                user=request.user,
                is_active=True,
                access_token__isnull=False
            ).exclude(access_token='')
            
            if not email_accounts.exists():
                return Response({
                    'message': 'No active email accounts found'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Trigger Celery tasks for each email account
            task_results = []
            for account in email_accounts:
                try:
                    # Trigger the Celery task
                    task = fetch_single_account_emails_task.delay(
                        str(account.id), 
                        'manual'
                    )
                    task_results.append({
                        'account_id': str(account.id),
                        'email_address': account.email_address,
                        'task_id': task.id,
                        'status': 'queued'
                    })
                except Exception as e:
                    task_results.append({
                        'account_id': str(account.id),
                        'email_address': account.email_address,
                        'task_id': None,
                        'status': 'error',
                        'error': str(e)
                    })
            
            return Response({
                'message': f'Email refresh initiated for {len(email_accounts)} accounts',
                'accounts_processed': len(email_accounts),
                'tasks': task_results
            })
            
        except Exception as e:
            return Response({
                'message': f'Failed to initiate email refresh: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class DisconnectEmailAccountView(APIView):
    """Disconnect a Gmail account and delete all associated emails"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            email_account_id = request.data.get('email_account_id')
            
            if not email_account_id:
                return Response({
                    'message': 'Email account ID is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get the email account
            try:
                email_account = EmailAccount.objects.get(
                    id=email_account_id,
                    user=request.user
                )
            except EmailAccount.DoesNotExist:
                return Response({
                    'message': 'Email account not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Store email address for response message
            email_address = email_account.email_address
            
            # Count associated emails before deletion
            emails_count = EmailMessage.objects.filter(email_account=email_account).count()
            
            # Delete all associated emails first
            EmailMessage.objects.filter(email_account=email_account).delete()
            
            # Delete the email account
            email_account.delete()
            
            return Response({
                'message': f'Successfully disconnected {email_address} and removed {emails_count} associated emails',
                'disconnected_account': email_address,
                'emails_removed': emails_count
            })
            
        except Exception as e:
            return Response({
                'message': f'Failed to disconnect email account: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
