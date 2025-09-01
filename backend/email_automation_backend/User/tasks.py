from celery import shared_task
from django.utils import timezone
from datetime import datetime
import logging

from .models import EmailAccount, EmailMessage, EmailFetchLog
from .views import GmailService

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
                            EmailMessage.objects.create(
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
                            
                    except Exception as e:
                        error_msg = f"Error processing email {email_data.get('gmail_message_id', 'unknown')} for {account.email_address}: {str(e)}"
                        logger.error(error_msg)
                        errors.append(error_msg)
                        continue
                
                # Calculate fetch duration
                fetch_duration = (datetime.now() - start_time).total_seconds()
                
                # Log the successful fetch operation
                EmailFetchLog.log_success(
                    email_account=account,
                    fetch_type='scheduled',
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
                    EmailFetchLog.log_failure(
                        email_account=account,
                        fetch_type='scheduled',
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
                    EmailMessage.objects.create(
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
                    
            except Exception as e:
                logger.error(f"Error processing email {email_data.get('gmail_message_id', 'unknown')}: {str(e)}")
                continue
        
        # Calculate fetch duration
        fetch_duration = (datetime.now() - start_time).total_seconds()
        
        # Log the fetch operation
        EmailFetchLog.log_success(
            email_account=account,
            fetch_type=fetch_type,
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
                EmailFetchLog.log_failure(
                    email_account=account,
                    fetch_type=fetch_type,
                    error_message=str(e)
                )
            except Exception as log_error:
                logger.error(f"Failed to log error: {str(log_error)}")
        
        return {'status': 'error', 'message': error_msg}
