import requests
import logging
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
from urllib.parse import urlencode
import time
from .models import HubSpotAccount, HubSpotContact, HubSpotSyncLog

logger = logging.getLogger(__name__)


class HubSpotOAuthService:
    """Service for handling HubSpot OAuth operations"""
    
    def __init__(self):
        self.client_id = settings.HUBSPOT_CLIENT_ID
        self.client_secret = settings.HUBSPOT_CLIENT_SECRET
        self.redirect_uri = settings.HUBSPOT_REDIRECT_URI
        self.base_url = "https://api.hubapi.com"
        self.auth_url = "https://app-na2.hubspot.com/oauth/authorize"
        self.token_url = "https://api.hubapi.com/oauth/v1/token"
    
    def get_authorization_url(self, state=None):
        """Generate HubSpot OAuth authorization URL"""
        # Use scopes from Django settings - these MUST match exactly what's configured in your HubSpot app
        scopes = settings.HUBSPOT_OAUTH_SCOPES
        
        params = {
            'client_id': self.client_id,
            'redirect_uri': self.redirect_uri,
            'scope': ' '.join(scopes),
            'response_type': 'code'
        }
        
        if state:
            params['state'] = state
            
        return f"{self.auth_url}?{urlencode(params)}"
    
    def exchange_code_for_tokens(self, authorization_code):
        """Exchange authorization code for access and refresh tokens"""
        try:
            data = {
                'grant_type': 'authorization_code',
                'client_id': self.client_id,
                'client_secret': self.client_secret,
                'redirect_uri': self.redirect_uri,
                'code': authorization_code
            }
            
            response = requests.post(self.token_url, data=data)
            response.raise_for_status()
            
            token_data = response.json()
            return {
                'access_token': token_data.get('access_token'),
                'refresh_token': token_data.get('refresh_token'),
                'expires_in': token_data.get('expires_in', 3600),
                'token_type': token_data.get('token_type'),
                'hub_id': token_data.get('hub_id'),
                'hub_domain': token_data.get('hub_domain')
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to exchange code for tokens: {str(e)}")
            raise Exception(f"OAuth token exchange failed: {str(e)}")
    
    def refresh_access_token(self, refresh_token):
        """Refresh access token using refresh token"""
        try:
            data = {
                'grant_type': 'refresh_token',
                'client_id': self.client_id,
                'client_secret': self.client_secret,
                'refresh_token': refresh_token
            }
            
            response = requests.post(self.token_url, data=data)
            response.raise_for_status()
            
            token_data = response.json()
            return {
                'access_token': token_data.get('access_token'),
                'refresh_token': token_data.get('refresh_token'),
                'expires_in': token_data.get('expires_in', 3600)
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to refresh token: {str(e)}")
            raise Exception(f"Token refresh failed: {str(e)}")
    
    def get_account_info(self, access_token):
        """Get HubSpot account information"""
        try:
            headers = {'Authorization': f'Bearer {access_token}'}
            response = requests.get(f"{self.base_url}/account-info/v3/details", headers=headers)
            response.raise_for_status()
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to get account info: {str(e)}")
            raise Exception(f"Failed to get account info: {str(e)}")


class HubSpotAPIService:
    """Service for HubSpot API operations"""
    
    def __init__(self, hubspot_account):
        self.hubspot_account = hubspot_account
        self.base_url = "https://api.hubapi.com"
        self.oauth_service = HubSpotOAuthService()
    
    def _get_headers(self):
        """Get authorization headers with valid token"""
        if self.hubspot_account.is_token_expired():
            self._refresh_token()
        
        return {
            'Authorization': f'Bearer {self.hubspot_account.access_token}',
            'Content-Type': 'application/json'
        }
    
    def _refresh_token(self):
        """Refresh the access token if needed"""
        try:
            start_time = time.time()
            token_data = self.oauth_service.refresh_access_token(self.hubspot_account.refresh_token)
            
            # Update the account with new tokens
            self.hubspot_account.access_token = token_data['access_token']
            if token_data.get('refresh_token'):
                self.hubspot_account.refresh_token = token_data['refresh_token']
            
            expires_in = token_data.get('expires_in', 3600)
            self.hubspot_account.token_expires_at = timezone.now() + timedelta(seconds=expires_in)
            self.hubspot_account.status = HubSpotAccount.ConnectionStatus.CONNECTED
            self.hubspot_account.save()
            
            # Log successful token refresh
            duration = time.time() - start_time
            HubSpotSyncLog.log_success(
                self.hubspot_account,
                HubSpotSyncLog.OperationType.TOKEN_REFRESH,
                duration=duration
            )
            
            logger.info(f"Successfully refreshed HubSpot token for {self.hubspot_account.user.email}")
            
        except Exception as e:
            # Mark account as having error
            self.hubspot_account.status = HubSpotAccount.ConnectionStatus.ERROR
            self.hubspot_account.save()
            
            # Log the failure
            HubSpotSyncLog.log_failure(
                self.hubspot_account,
                HubSpotSyncLog.OperationType.TOKEN_REFRESH,
                str(e)
            )
            
            logger.error(f"Failed to refresh HubSpot token for {self.hubspot_account.user.email}: {str(e)}")
            raise
    
    def search_contact_by_email(self, email):
        """Search for a contact by email address"""
        try:
            headers = self._get_headers()
            url = f"{self.base_url}/crm/v3/objects/contacts/search"
            
            payload = {
                "filterGroups": [
                    {
                        "filters": [
                            {
                                "propertyName": "email",
                                "operator": "EQ",
                                "value": email
                            }
                        ]
                    }
                ],
                "properties": ["email", "firstname", "lastname", "company", "phone", "createdate"],
                "limit": 1
            }
            
            response = requests.post(url, json=payload, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            if data.get('total', 0) > 0:
                return data['results'][0]
            return None
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to search contact by email {email}: {str(e)}")
            raise Exception(f"Contact search failed: {str(e)}")
    
    def create_contact(self, email, first_name='', last_name='', company='', phone=''):
        """Create a new contact in HubSpot"""
        try:
            start_time = time.time()
            headers = self._get_headers()
            url = f"{self.base_url}/crm/v3/objects/contacts"
            
            # Prepare contact properties
            properties = {
                'email': email
            }
            
            if first_name:
                properties['firstname'] = first_name
            if last_name:
                properties['lastname'] = last_name
            if company:
                properties['company'] = company
            if phone:
                properties['phone'] = phone
            
            # Add source tracking
            properties['hs_lead_status'] = 'NEW'
            properties['lifecyclestage'] = 'lead'
            
            payload = {'properties': properties}
            
            response = requests.post(url, json=payload, headers=headers)
            response.raise_for_status()
            
            contact_data = response.json()
            duration = time.time() - start_time
            
            # Log successful operation
            HubSpotSyncLog.log_success(
                self.hubspot_account,
                HubSpotSyncLog.OperationType.CREATE_CONTACT,
                contact_email=email,
                hubspot_contact_id=contact_data.get('id'),
                request_data=payload,
                response_data=contact_data,
                duration=duration
            )
            
            logger.info(f"Successfully created HubSpot contact for {email}")
            return contact_data
            
        except requests.exceptions.RequestException as e:
            error_msg = f"Failed to create contact for {email}: {str(e)}"
            logger.error(error_msg)
            
            # Log the failure
            HubSpotSyncLog.log_failure(
                self.hubspot_account,
                HubSpotSyncLog.OperationType.CREATE_CONTACT,
                error_msg,
                contact_email=email,
                request_data=payload if 'payload' in locals() else None
            )
            
            raise Exception(error_msg)
    
    
    def update_contact(self, contact_id, properties):
        """Update an existing contact in HubSpot"""
        try:
            start_time = time.time()
            headers = self._get_headers()
            url = f"{self.base_url}/crm/v3/objects/contacts/{contact_id}"
            
            payload = {'properties': properties}
            
            response = requests.patch(url, json=payload, headers=headers)
            response.raise_for_status()
            
            contact_data = response.json()
            duration = time.time() - start_time
            
            # Log successful operation
            HubSpotSyncLog.log_success(
                self.hubspot_account,
                HubSpotSyncLog.OperationType.UPDATE_CONTACT,
                hubspot_contact_id=contact_id,
                request_data=payload,
                response_data=contact_data,
                duration=duration
            )
            
            logger.info(f"Successfully updated HubSpot contact {contact_id}")
            return contact_data
            
        except requests.exceptions.RequestException as e:
            error_msg = f"Failed to update contact {contact_id}: {str(e)}"
            logger.error(error_msg)
            
            # Log the failure
            HubSpotSyncLog.log_failure(
                self.hubspot_account,
                HubSpotSyncLog.OperationType.UPDATE_CONTACT,
                error_msg,
                hubspot_contact_id=contact_id,
                request_data=payload if 'payload' in locals() else None
            )
            
            raise Exception(error_msg)
    
    def create_or_update_contact(self, email, first_name='', last_name='', company='', phone=''):
        """Create a new contact or update existing one"""
        try:
            # First, search for existing contact
            existing_contact = self.search_contact_by_email(email)
            
            if existing_contact:
                # Update existing contact
                contact_id = existing_contact['id']
                properties = {}
                
                if first_name and not existing_contact.get('properties', {}).get('firstname'):
                    properties['firstname'] = first_name
                if last_name and not existing_contact.get('properties', {}).get('lastname'):
                    properties['lastname'] = last_name
                if company and not existing_contact.get('properties', {}).get('company'):
                    properties['company'] = company
                if phone and not existing_contact.get('properties', {}).get('phone'):
                    properties['phone'] = phone
                
                if properties:
                    return self.update_contact(contact_id, properties)
                else:
                    return existing_contact
            else:
                # Create new contact
                return self.create_contact(email, first_name, last_name, company, phone)
                
        except Exception as e:
            logger.error(f"Failed to create or update contact for {email}: {str(e)}")
            raise


class HubSpotContactService:
    """Service for managing HubSpot contact synchronization"""
    
    def __init__(self, user):
        self.user = user
        self.hubspot_account = None
        
        try:
            self.hubspot_account = user.hubspot_account
            if not self.hubspot_account.is_connected():
                raise Exception("HubSpot account not connected or token expired")
        except HubSpotAccount.DoesNotExist:
            raise Exception("User has no HubSpot account connected")
    
    def sync_email_sender(self, email_message):
        """Sync email sender information to HubSpot"""
        try:
            # Extract sender information
            sender_email = email_message.sender
            sender_name = self._extract_sender_name(email_message)
            first_name, last_name = self._parse_name(sender_name)
            company_name = self._extract_company_from_email(sender_email)
            
            # Check if we already have this contact
            hubspot_contact, created = HubSpotContact.objects.get_or_create(
                hubspot_account=self.hubspot_account,
                email_address=sender_email,
                defaults={
                    'first_name': first_name,
                    'last_name': last_name,
                    'company_name': company_name,
                    'first_email_date': email_message.received_at,
                    'last_email_date': email_message.received_at,
                    'total_emails_received': 1
                }
            )
            
            if not created:
                # Update existing contact
                hubspot_contact.last_email_date = email_message.received_at
                hubspot_contact.total_emails_received += 1
                hubspot_contact.save()
            
            # Sync to HubSpot if not already synced or needs update
            if hubspot_contact.sync_status in [HubSpotContact.SyncStatus.PENDING, HubSpotContact.SyncStatus.FAILED]:
                self._sync_contact_to_hubspot(hubspot_contact)
            
            return hubspot_contact
            
        except Exception as e:
            logger.error(f"Failed to sync email sender {email_message.sender}: {str(e)}")
            raise
    
    def _sync_contact_to_hubspot(self, hubspot_contact):
        """Sync a contact record to HubSpot"""
        try:
            api_service = HubSpotAPIService(self.hubspot_account)
            
            # Create or update contact in HubSpot
            hubspot_data = api_service.create_or_update_contact(
                email=hubspot_contact.email_address,
                first_name=hubspot_contact.first_name,
                last_name=hubspot_contact.last_name,
                company=hubspot_contact.company_name,
                phone=hubspot_contact.phone
            )
            
            # Update local contact record
            hubspot_contact.hubspot_contact_id = hubspot_data.get('id')
            hubspot_contact.sync_status = HubSpotContact.SyncStatus.SYNCED
            hubspot_contact.last_synced_at = timezone.now()
            hubspot_contact.sync_error_message = ''
            hubspot_contact.save()
            
            logger.info(f"Successfully synced contact {hubspot_contact.email_address} to HubSpot")
            
        except Exception as e:
            # Update contact with error status
            hubspot_contact.sync_status = HubSpotContact.SyncStatus.FAILED
            hubspot_contact.sync_error_message = str(e)
            hubspot_contact.save()
            
            logger.error(f"Failed to sync contact {hubspot_contact.email_address}: {str(e)}")
            raise
    
    def _extract_sender_name(self, email_message):
        """Extract sender name from email message"""
        # Try to extract name from sender field if it contains both name and email
        sender = email_message.sender
        if '<' in sender and '>' in sender:
            # Format: "John Doe <john@example.com>"
            name_part = sender.split('<')[0].strip().strip('"\'')
            return name_part if name_part else ''
        return ''
    
    def _parse_name(self, full_name):
        """Parse full name into first and last name"""
        if not full_name:
            return '', ''
        
        name_parts = full_name.strip().split()
        if len(name_parts) == 1:
            return name_parts[0], ''
        elif len(name_parts) >= 2:
            return name_parts[0], ' '.join(name_parts[1:])
        
        return '', ''
    
    def _extract_company_from_email(self, email):
        """Extract company name from email domain"""
        try:
            domain = email.split('@')[1].lower()
            
            # Skip common email providers
            common_providers = [
                'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
                'aol.com', 'icloud.com', 'protonmail.com', 'mail.com'
            ]
            
            if domain not in common_providers:
                # Extract company name from domain (remove .com, .org, etc.)
                company_name = domain.split('.')[0]
                return company_name.replace('-', ' ').replace('_', ' ').title()
            
            return ''
            
        except (IndexError, AttributeError):
            return ''
    
    def get_sync_statistics(self):
        """Get synchronization statistics for this user"""
        total_contacts = self.hubspot_account.contacts.count()
        synced_contacts = self.hubspot_account.contacts.filter(
            sync_status=HubSpotContact.SyncStatus.SYNCED
        ).count()
        failed_contacts = self.hubspot_account.contacts.filter(
            sync_status=HubSpotContact.SyncStatus.FAILED
        ).count()
        pending_contacts = self.hubspot_account.contacts.filter(
            sync_status=HubSpotContact.SyncStatus.PENDING
        ).count()
        
        return {
            'total_contacts': total_contacts,
            'synced_contacts': synced_contacts,
            'failed_contacts': failed_contacts,
            'pending_contacts': pending_contacts,
            'last_sync': self.hubspot_account.last_sync_at
        }
