from celery import shared_task
from django.utils import timezone
from datetime import datetime
import logging

from .models import EmailAccount, EmailMessage, EmailFetchLog
from .views import GmailService
from hubspot_integration.models import HubSpotAccount
from hubspot_integration.services import HubSpotContactService

# Set up logging
logger = logging.getLogger(__name__)

@shared_task(bind=True)
def fetch_all_emails_task(self):
    """
    Periodic task to fetch new emails from all active email accounts.
    This task runs every 20 seconds as configured in Celery Beat.
    """
    logger.info("Starting automatic email fetch task")
    
    total_accounts_processed = 0
    total_emails_fetched = 0
    total_emails_processed = 0
    errors = []
    
    try:
        # Get all active email accounts
        active_accounts = EmailAccount.objects.filter(
            is_active=True,
            access_token__isnull=False
        ).exclude(access_token='')
        
        logger.info(f"Found {active_accounts.count()} active email accounts to process")
        
        for account in active_accounts:
            try:
                total_accounts_processed += 1
                logger.info(f"Processing email account: {account.email_address}")
                
                # Initialize Gmail service
                gmail_service = GmailService(
                    account.access_token,
                    account.refresh_token
                )
                
                # Fetch emails (limit to 10 for performance)
                start_time = datetime.now()
                emails_data = gmail_service.fetch_emails(max_results=10)
                
                if not emails_data:
                    logger.info(f"No new emails found for {account.email_address}")
                    continue
                
                logger.info(f"Fetched {len(emails_data)} emails for {account.email_address}")
                total_emails_fetched += len(emails_data)
                
                # Process and store emails
                messages_processed_for_account = 0
                for email_data in emails_data:
                    try:
                        # Check if email already exists
                        existing_email = EmailMessage.objects.filter(
                            gmail_message_id=email_data['gmail_message_id']
                        ).first()
                        
                        if not existing_email:
                            # Create new email message
                            new_email = EmailMessage.objects.create(
                                email_account=account,
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
                            messages_processed_for_account += 1
                            total_emails_processed += 1
                            
                            # Trigger AI processing for the new email
                            try:
                                from Ai_processing.tasks import process_new_email_with_ai
                                process_new_email_with_ai.delay(str(new_email.id))
                                logger.info(f"🤖 Queued AI processing for new email: {new_email.subject}")
                            except Exception as ai_error:
                                logger.error(f"❌ Failed to queue AI processing: {str(ai_error)}")
                            
                            # Trigger HubSpot sender sync for the new email
                            try:
                                # Try async first
                                sync_email_sender_to_hubspot.delay(str(new_email.id))
                                logger.info(f"📧 Queued HubSpot sender sync for email from: {new_email.sender}")
                            except Exception as hubspot_queue_error:
                                # Fallback to synchronous execution if Celery is not available
                                logger.warning(f"⚠️ Celery unavailable, running HubSpot sync synchronously: {str(hubspot_queue_error)}")
                                try:
                                    sync_result = sync_email_sender_to_hubspot(str(new_email.id))
                                    logger.info(f"📧 Completed synchronous HubSpot sender sync: {sync_result.get('status', 'unknown')}")
                                except Exception as sync_error:
                                    logger.error(f"❌ Failed to sync HubSpot sender synchronously: {str(sync_error)}")
                            
                    except Exception as e:
                        error_msg = f"Error processing email {email_data.get('gmail_message_id', 'unknown')} for {account.email_address}: {str(e)}"
                        logger.error(error_msg)
                        errors.append(error_msg)
                        continue
                
                # Calculate fetch duration
                fetch_duration = (datetime.now() - start_time).total_seconds()
                
                # Log the successful fetch operation
                EmailFetchLog.objects.create(
                    email_account=account,
                    fetch_type='scheduled',
                    status='success',
                    messages_fetched=len(emails_data),
                    messages_processed=messages_processed_for_account,
                    fetch_duration=fetch_duration,
                    last_message_date=emails_data[0]['received_at'] if emails_data else None
                )
                
                logger.info(f"Successfully processed {messages_processed_for_account} new emails for {account.email_address}")
                
            except Exception as e:
                error_msg = f"Error processing account {account.email_address}: {str(e)}"
                logger.error(error_msg)
                errors.append(error_msg)
                
                # Log the failure
                try:
                    EmailFetchLog.objects.create(
                        email_account=account,
                        fetch_type='scheduled',
                        status='failed',
                        error_message=str(e)
                    )
                except Exception as log_error:
                    logger.error(f"Failed to log error for account {account.email_address}: {str(log_error)}")
                
                continue
        
        # Log summary
        summary_msg = f"Automatic email fetch completed. Processed {total_accounts_processed} accounts, fetched {total_emails_fetched} emails, processed {total_emails_processed} new emails"
        if errors:
            summary_msg += f". {len(errors)} errors occurred."
            logger.warning(summary_msg)
        else:
            logger.info(summary_msg)
        
        return {
            'status': 'completed',
            'accounts_processed': total_accounts_processed,
            'emails_fetched': total_emails_fetched,
            'emails_processed': total_emails_processed,
            'errors': errors
        }
        
    except Exception as e:
        error_msg = f"Critical error in automatic email fetch task: {str(e)}"
        logger.error(error_msg)
        
        # Retry the task in case of critical errors
        raise self.retry(exc=e, countdown=60, max_retries=3)


@shared_task
def fetch_single_account_emails_task(email_account_id, fetch_type='manual'):
    """
    Task to fetch emails for a single email account.
    This can be triggered manually or as part of other operations.
    """
    logger.info(f"Starting email fetch for account ID: {email_account_id}")
    
    try:
        # Get the email account
        try:
            account = EmailAccount.objects.get(
                id=email_account_id,
                is_active=True
            )
        except EmailAccount.DoesNotExist:
            error_msg = f"Email account {email_account_id} not found or not active"
            logger.error(error_msg)
            return {'status': 'error', 'message': error_msg}
        
        # Check if we have valid tokens
        if not account.access_token:
            error_msg = f"No access token available for account {account.email_address}"
            logger.error(error_msg)
            return {'status': 'error', 'message': error_msg}
        
        # Initialize Gmail service
        gmail_service = GmailService(
            account.access_token,
            account.refresh_token
        )
        
        # Fetch emails (limit to 10 for performance)
        start_time = datetime.now()
        emails_data = gmail_service.fetch_emails(max_results=10)
        
        if not emails_data:
            logger.info(f"No new emails found for {account.email_address}")
            return {
                'status': 'success',
                'message': f'No new emails found for {account.email_address}',
                'emails_fetched': 0,
                'emails_processed': 0
            }
        
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
                    new_email = EmailMessage.objects.create(
                        email_account=account,
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
                    
                    # Trigger AI processing for the new email
                    try:
                        from Ai_processing.tasks import process_new_email_with_ai
                        process_new_email_with_ai.delay(str(new_email.id))
                        logger.info(f"🤖 Queued AI processing for new email: {new_email.subject}")
                    except Exception as ai_error:
                        logger.error(f"❌ Failed to queue AI processing: {str(ai_error)}")
                    
                    # Trigger HubSpot sender sync for the new email
                    try:
                        # Try async first
                        sync_email_sender_to_hubspot.delay(str(new_email.id))
                        logger.info(f"📧 Queued HubSpot sender sync for email from: {new_email.sender}")
                    except Exception as hubspot_queue_error:
                        # Fallback to synchronous execution if Celery is not available
                        logger.warning(f"⚠️ Celery unavailable, running HubSpot sync synchronously: {str(hubspot_queue_error)}")
                        try:
                            sync_result = sync_email_sender_to_hubspot(str(new_email.id))
                            logger.info(f"📧 Completed synchronous HubSpot sender sync: {sync_result.get('status', 'unknown')}")
                        except Exception as sync_error:
                            logger.error(f"❌ Failed to sync HubSpot sender synchronously: {str(sync_error)}")
                    
            except Exception as e:
                logger.error(f"Error processing email {email_data.get('gmail_message_id', 'unknown')}: {str(e)}")
                continue
        
        # Calculate fetch duration
        fetch_duration = (datetime.now() - start_time).total_seconds()
        
        # Log the fetch operation
        EmailFetchLog.objects.create(
            email_account=account,
            fetch_type=fetch_type,
            status='success',
            messages_fetched=len(emails_data),
            messages_processed=messages_processed,
            fetch_duration=fetch_duration,
            last_message_date=emails_data[0]['received_at'] if emails_data else None
        )
        
        result = {
            'status': 'success',
            'message': f'Successfully fetched {len(emails_data)} emails, processed {messages_processed} new emails for {account.email_address}',
            'emails_fetched': len(emails_data),
            'emails_processed': messages_processed,
            'fetch_duration': fetch_duration
        }
        
        logger.info(result['message'])
        return result
        
    except Exception as e:
        error_msg = f"Error fetching emails for account {email_account_id}: {str(e)}"
        logger.error(error_msg)
        
        # Log the failure if we have the account
        if 'account' in locals():
            try:
                EmailFetchLog.objects.create(
                    email_account=account,
                    fetch_type=fetch_type,
                    status='failed',
                    error_message=str(e)
                )
            except Exception as log_error:
                logger.error(f"Failed to log error: {str(log_error)}")
        
        return {'status': 'error', 'message': error_msg}


@shared_task
def sync_email_sender_to_hubspot(email_message_id):
    """
    Task to sync email sender information to HubSpot contacts.
    This task is triggered for each new email received.
    """
    logger.info(f"Starting HubSpot sender sync for email ID: {email_message_id}")
    
    try:
        # Get the email message
        try:
            email_message = EmailMessage.objects.get(id=email_message_id)
        except EmailMessage.DoesNotExist:
            error_msg = f"Email message {email_message_id} not found"
            logger.error(error_msg)
            return {'status': 'error', 'message': error_msg}
        
        # Get the user from the email account
        user = email_message.email_account.user
        
        # Check if user has HubSpot account connected
        try:
            hubspot_account = user.hubspot_account
            if not hubspot_account.is_connected():
                logger.info(f"User {user.email} doesn't have HubSpot connected - skipping sync")
                return {
                    'status': 'skipped',
                    'message': 'User does not have HubSpot connected',
                    'email_sender': email_message.sender
                }
        except HubSpotAccount.DoesNotExist:
            logger.info(f"User {user.email} doesn't have HubSpot account - skipping sync")
            return {
                'status': 'skipped',
                'message': 'User does not have HubSpot account',
                'email_sender': email_message.sender
            }
        
        # Extract and enhance sender details
        sender_details = extract_enhanced_sender_details(email_message)
        logger.info(f"Extracted sender details: {sender_details}")
        
        # Initialize HubSpot contact service
        try:
            hubspot_service = HubSpotContactService(user)
            
            # Sync sender to HubSpot
            hubspot_contact = hubspot_service.sync_email_sender_with_details(
                email_message=email_message,
                sender_details=sender_details
            )
            
            # Log email interaction in HubSpot (if supported)
            try:
                hubspot_service.log_email_interaction(
                    hubspot_contact=hubspot_contact,
                    email_message=email_message,
                    interaction_type='received'
                )
            except Exception as interaction_error:
                logger.warning(f"Failed to log email interaction: {str(interaction_error)}")
            
            success_msg = f"Successfully synced sender {sender_details['email']} to HubSpot"
            logger.info(success_msg)
            
            return {
                'status': 'success',
                'message': success_msg,
                'hubspot_contact_id': hubspot_contact.hubspot_contact_id,
                'sender_details': sender_details,
                'email_subject': email_message.subject
            }
            
        except Exception as hubspot_error:
            error_msg = f"HubSpot sync error for {email_message.sender}: {str(hubspot_error)}"
            logger.error(error_msg)
            return {
                'status': 'error',
                'message': error_msg,
                'sender_details': sender_details
            }
        
    except Exception as e:
        error_msg = f"Critical error syncing email sender to HubSpot: {str(e)}"
        logger.error(error_msg)
        return {'status': 'error', 'message': error_msg}


def extract_enhanced_sender_details(email_message):
    """
    Enhanced sender detail extraction from email message.
    Extracts name, email, company, phone, and other details from email content.
    """
    import re
    from email.utils import parseaddr
    
    sender_info = {
        'email': '',
        'full_name': '',
        'first_name': '',
        'last_name': '',
        'company': '',
        'phone': '',
        'job_title': '',
        'website': '',
        'received_at': email_message.received_at
    }
    
    try:
        # Extract email and name from sender field
        sender = email_message.sender.strip()
        
        # Parse email address - handle formats like "Name <email@domain.com>" or just "email@domain.com"
        if '<' in sender and '>' in sender:
            # Format: "John Doe <john@example.com>"
            name_part = sender.split('<')[0].strip().strip('"\'')
            email_part = sender.split('<')[1].split('>')[0].strip()
        else:
            # Just email address or name followed by email
            parsed_name, parsed_email = parseaddr(sender)
            name_part = parsed_name.strip().strip('"\'')
            email_part = parsed_email.strip() if parsed_email else sender
        
        sender_info['email'] = email_part
        sender_info['full_name'] = name_part
        
        # Parse name into first and last
        if name_part:
            name_parts = name_part.strip().split()
            if len(name_parts) == 1:
                sender_info['first_name'] = name_parts[0]
            elif len(name_parts) >= 2:
                sender_info['first_name'] = name_parts[0]
                sender_info['last_name'] = ' '.join(name_parts[1:])
        
        # Extract company from email domain
        if sender_info['email'] and '@' in sender_info['email']:
            domain = sender_info['email'].split('@')[1].lower()
            
            # Skip common email providers
            common_providers = [
                'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
                'aol.com', 'icloud.com', 'protonmail.com', 'mail.com',
                'live.com', 'msn.com', 'yandex.com', 'zoho.com'
            ]
            
            if domain not in common_providers:
                # Extract company name from domain
                company_name = domain.split('.')[0]
                sender_info['company'] = company_name.replace('-', ' ').replace('_', ' ').title()
        
        # Extract additional details from email signature (if available)
        email_body = email_message.body_plain or email_message.body_html or ''
        if email_body:
            signature_details = extract_signature_details(email_body)
            
            # Update sender info with signature details (only if not already set)
            if signature_details.get('company') and not sender_info['company']:
                sender_info['company'] = signature_details['company']
            if signature_details.get('phone'):
                sender_info['phone'] = signature_details['phone']
            if signature_details.get('job_title'):
                sender_info['job_title'] = signature_details['job_title']
            if signature_details.get('website'):
                sender_info['website'] = signature_details['website']
            
            # If we have better name from signature, use it
            if signature_details.get('full_name') and len(signature_details['full_name']) > len(sender_info['full_name']):
                sender_info['full_name'] = signature_details['full_name']
                name_parts = signature_details['full_name'].strip().split()
                if len(name_parts) >= 2:
                    sender_info['first_name'] = name_parts[0]
                    sender_info['last_name'] = ' '.join(name_parts[1:])
        
        logger.debug(f"Extracted enhanced sender details: {sender_info}")
        return sender_info
        
    except Exception as e:
        logger.error(f"Error extracting sender details: {str(e)}")
        # Return basic info even if enhancement fails
        return {
            'email': email_message.sender,
            'full_name': '',
            'first_name': '',
            'last_name': '',
            'company': '',
            'phone': '',
            'job_title': '',
            'website': '',
            'received_at': email_message.received_at
        }


def extract_signature_details(email_body):
    """
    Extract contact details from email signature.
    Looks for patterns like phone numbers, job titles, company names, etc.
    """
    import re
    
    signature_info = {
        'full_name': '',
        'company': '',
        'phone': '',
        'job_title': '',
        'website': ''
    }
    
    try:
        # Clean HTML if needed
        if '<' in email_body and '>' in email_body:
            import html
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(email_body, 'html.parser')
            email_body = soup.get_text()
        
        # Phone number patterns
        phone_patterns = [
            r'(?:phone|tel|mobile|cell)\s*:?\s*([\d\s\-\(\)\+\.]{10,})',
            r'([\+]?[1-9]?[\s\-\.]?\(?[0-9]{3}\)?[\s\-\.]?[0-9]{3}[\s\-\.]?[0-9]{4})',
            r'([\+]?[0-9]{1,3}[\s\-\.]?\(?[0-9]{2,4}\)?[\s\-\.][0-9]{3,4}[\s\-\.][0-9]{3,4})'
        ]
        
        for pattern in phone_patterns:
            matches = re.findall(pattern, email_body, re.IGNORECASE)
            if matches:
                # Clean up the phone number
                phone = re.sub(r'[^\d\+]', '', matches[0])
                if len(phone) >= 10:
                    signature_info['phone'] = matches[0].strip()
                    break
        
        # Job title patterns
        title_patterns = [
            r'(?:title|position|role)\s*:?\s*([^\n\r]{2,50})',
            r'\b(CEO|CTO|CFO|Manager|Director|Developer|Engineer|Analyst|Specialist|Consultant|President|Vice President)\b[^\n\r]{0,30}',
            r'([A-Z][a-z]+\s+(?:Manager|Director|Engineer|Developer|Analyst|Specialist|Consultant|Officer))'
        ]
        
        for pattern in title_patterns:
            matches = re.findall(pattern, email_body, re.IGNORECASE)
            if matches:
                title = matches[0].strip()
                if len(title) < 50:  # Reasonable title length
                    signature_info['job_title'] = title
                    break
        
        # Website patterns
        website_patterns = [
            r'(?:website|web|url)\s*:?\s*((?:https?://)?[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,})',
            r'((?:https?://)?www\.[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,})',
            r'(https?://[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,})'
        ]
        
        for pattern in website_patterns:
            matches = re.findall(pattern, email_body, re.IGNORECASE)
            if matches:
                website = matches[0].strip()
                if not website.startswith('http'):
                    website = 'https://' + website
                signature_info['website'] = website
                break
        
        # Company name patterns (look for common signature patterns)
        company_patterns = [
            r'(?:company|organization|corp|inc|ltd)\s*:?\s*([^\n\r]{2,50})',
            r'\n([A-Z][a-zA-Z\s&,.-]+(?:Inc|LLC|Corp|Company|Corporation|Ltd|Limited))\n',
            r'([A-Z][a-zA-Z\s&,.-]+(?:Inc|LLC|Corp|Company|Corporation|Ltd|Limited))\s*\n'
        ]
        
        for pattern in company_patterns:
            matches = re.findall(pattern, email_body, re.IGNORECASE)
            if matches:
                company = matches[0].strip()
                if len(company) < 50:  # Reasonable company name length
                    signature_info['company'] = company
                    break
        
        logger.debug(f"Extracted signature details: {signature_info}")
        
    except Exception as e:
        logger.error(f"Error extracting signature details: {str(e)}")
    
    return signature_info
