from celery import shared_task
from django.utils import timezone
from datetime import datetime
import logging
import json

from User.models import EmailMessage, EmailAccount
from User.views import GmailService
from .models import EmailProcessingLog, AIProcessingSettings
from .ai_service import AIEmailProcessor

# Set up logging
logger = logging.getLogger(__name__)

@shared_task(bind=True)
def process_new_email_with_ai(self, email_message_id):
    """
    Process a new email with AI analysis and potentially generate an automated reply.
    This task is triggered when a new email is received.
    
    Args:
        email_message_id: UUID of the EmailMessage to process
    """
    logger.info(f"Starting AI processing task for email ID: {email_message_id}")
    
    try:
        # Get the email message
        try:
            email_message = EmailMessage.objects.select_related('email_account', 'email_account__user').get(
                id=email_message_id
            )
        except EmailMessage.DoesNotExist:
            error_msg = f"Email message with ID {email_message_id} not found"
            logger.error(f"❌ {error_msg}")
            return {'status': 'error', 'message': error_msg}
        
        logger.info(f"Processing email: '{email_message.subject}' from {email_message.sender}")
        
        # Get the user and check if AI processing is enabled
        user = email_message.email_account.user
        ai_processor = AIEmailProcessor(user=user)
        
        if not ai_processor.is_processing_enabled():
            logger.info(f"AI processing disabled for user {user.get_full_name()}")
            return {
                'status': 'skipped',
                'message': 'AI processing disabled for this user',
                'email_id': str(email_message.id)
            }
        
        # Check if this email has already been processed
        existing_log = EmailProcessingLog.objects.filter(
            email_message=email_message,
            status=EmailProcessingLog.ProcessingStatus.COMPLETED
        ).first()
        
        if existing_log:
            logger.info(f"Email already processed, skipping")
            return {
                'status': 'already_processed',
                'message': 'Email has already been processed',
                'email_id': str(email_message.id),
                'existing_log_id': str(existing_log.id)
            }
        
        # Determine processing type
        processing_type = 'auto_reply' if ai_processor.is_auto_reply_enabled() else 'analysis'
        
        # Process the email with AI
        logger.info(f"Processing email with type: {processing_type}")
        processing_result = ai_processor.process_email_with_ai(email_message, processing_type)
        
        # If auto reply is enabled and we generated a reply, send it
        if (processing_type == 'auto_reply' and 
            processing_result.get('status') == 'success' and 
            'generated_reply' in processing_result):
            
            logger.info("Auto reply enabled, attempting to send reply...")
            
            # Trigger the send reply task
            send_result = send_automated_reply.delay(
                email_message_id,
                processing_result['generated_reply']['subject'],
                processing_result['generated_reply']['body']
            )
            
            processing_result['reply_task_id'] = send_result.id
            logger.info(f"Send reply task queued with ID: {send_result.id}")
        
        # Trigger HubSpot sync for email sender if processing was successful
        if processing_result.get('status') == 'success':
            try:
                # Import HubSpot sync task
                from User.tasks import sync_email_sender_to_hubspot
                
                # Queue HubSpot sync task (fire and forget)
                sync_email_sender_to_hubspot.delay(
                    str(email_message.id)
                )
                logger.info(f"✅ Queued HubSpot sync task for email sender: {email_message.sender}")
            except Exception as hubspot_error:
                # Don't fail the main task if HubSpot sync fails to queue
                logger.warning(f"⚠️ Failed to queue HubSpot sync: {str(hubspot_error)}")
        
        logger.info(f"AI processing task completed for email: {email_message.subject}")
        return processing_result
        
    except Exception as e:
        error_msg = f"Critical error in AI processing task: {str(e)}"
        logger.error(f"{error_msg}")
        
        # Retry the task in case of critical errors
        raise self.retry(exc=e, countdown=60, max_retries=3)

@shared_task(bind=True)
def send_automated_reply(self, original_email_id, reply_subject, reply_body):
    """
    Send an automated AI-generated reply to an email.
    
    Args:
        original_email_id: UUID of the original email message
        reply_subject: Generated reply subject
        reply_body: Generated reply body
    """
    logger.info(f"Starting automated reply task for email ID: {original_email_id}")
    
    try:
        # Get the original email message
        try:
            original_email = EmailMessage.objects.select_related('email_account', 'email_account__user').get(
                id=original_email_id
            )
        except EmailMessage.DoesNotExist:
            error_msg = f"Original email with ID {original_email_id} not found"
            logger.error(f"{error_msg}")
            return {'status': 'error', 'message': error_msg}
        
        logger.info(f"Sending automated reply to: {original_email.sender}")
        logger.info(f"Reply subject: {reply_subject}")
        
        # Get email account and check tokens
        email_account = original_email.email_account
        if not email_account.access_token:
            error_msg = f"No access token available for account {email_account.email_address}"
            logger.error(f"{error_msg}")
            return {'status': 'error', 'message': error_msg}
        
        # Initialize Gmail service
        gmail_service = GmailService(
            email_account.access_token,
            email_account.refresh_token
        )
        
        # Prepare original email data for reply
        original_email_data = {
            'subject': original_email.subject,
            'sender': original_email.sender,
            'recipients': original_email.get_recipients_list(),
            'cc': original_email.get_cc_list(),
            'body_html': original_email.body_html,
            'body_plain': original_email.body_plain,
            'gmail_message_id': original_email.gmail_message_id,
            'gmail_thread_id': original_email.gmail_thread_id,
            'references': original_email.references
        }
        
        # Create proper reply message structure
        reply_message_data = gmail_service.create_reply_message(
            original_email_data, 
            reply_body, 
            'reply'
        )
        
        if not reply_message_data:
            error_msg = "Failed to create reply message structure"
            logger.error(f"{error_msg}")
            return {'status': 'error', 'message': error_msg}
        
        # Override with AI-generated subject if provided
        if reply_subject:
            reply_message_data['subject'] = reply_subject
        
        # Send the automated reply
        try:
            send_result = gmail_service.send_email(
                from_email=email_account.email_address,
                to_emails=reply_message_data['to_emails'],
                subject=reply_message_data['subject'],
                body_html=reply_message_data['body_html'],
                body_plain=reply_message_data['body_plain'],
                cc_emails=reply_message_data['cc_emails'],
                in_reply_to=reply_message_data['in_reply_to'],
                references=reply_message_data['references'],
                thread_id=reply_message_data['thread_id']
            )
        except Exception as send_error:
            error_msg = f"Failed to send automated reply: {str(send_error)}"
            logger.error(f"{error_msg}")
            
            # Update processing log
            processing_log = EmailProcessingLog.objects.filter(
                email_message=original_email,
                processing_type=EmailProcessingLog.ProcessingType.AUTO_REPLY
            ).first()
            
            if processing_log:
                processing_log.error_message = error_msg
                processing_log.save()
            
            return {'status': 'error', 'message': error_msg}
        
        if not send_result:
            error_msg = "No result returned from Gmail API"
            logger.error(f"{error_msg}")
            return {'status': 'error', 'message': error_msg}
        
        logger.info(f"✅ Automated reply sent successfully: {send_result}")
        
        # Store the reply in our database
        reply_email = EmailMessage.objects.create(
            email_account=email_account,
            gmail_message_id=send_result.get('id', ''),
            gmail_thread_id=send_result.get('threadId', original_email.gmail_thread_id),
            subject=reply_message_data['subject'],
            sender=email_account.email_address,
            recipients=json.dumps(reply_message_data['to_emails']),
            cc=json.dumps(reply_message_data['cc_emails']) if reply_message_data['cc_emails'] else '',
            body_html=reply_message_data['body_html'],
            body_plain=reply_message_data['body_plain'],
            received_at=timezone.now(),
            message_type='reply',
            parent_email=original_email,
            conversation_id=original_email.gmail_thread_id,
            in_reply_to=original_email.gmail_message_id,
            references=reply_message_data['references'],
            is_read=True  # Our own sent emails are marked as read
        )
        
        # Update the processing log to mark reply as sent
        processing_log = EmailProcessingLog.objects.filter(
            email_message=original_email,
            processing_type=EmailProcessingLog.ProcessingType.AUTO_REPLY
        ).first()
        
        if processing_log:
            processing_log.reply_sent = True
            processing_log.reply_sent_at = timezone.now()
            processing_log.save()
            logger.info(f"📋 Updated processing log to mark reply as sent")
        
        result = {
            'status': 'success',
            'message': 'Automated reply sent successfully',
            'reply_email_id': str(reply_email.id),
            'gmail_message_id': send_result.get('id', ''),
            'thread_id': send_result.get('threadId', ''),
            'recipients': reply_message_data['to_emails'],
            'cc_recipients': reply_message_data['cc_emails'],
            'original_email_id': str(original_email.id)
        }
        
        logger.info(f"✅ Automated reply task completed successfully")
        return result
        
    except Exception as e:
        error_msg = f"Critical error in automated reply task: {str(e)}"
        logger.error(f"❌ {error_msg}")
        
        # Update processing log with error
        try:
            processing_log = EmailProcessingLog.objects.filter(
                email_message_id=original_email_id,
                processing_type=EmailProcessingLog.ProcessingType.AUTO_REPLY
            ).first()
            
            if processing_log:
                processing_log.error_message = error_msg
                processing_log.save()
        except:
            pass  # Don't fail the task if we can't update the log
        
        # Retry the task in case of critical errors
        raise self.retry(exc=e, countdown=120, max_retries=2)

@shared_task(bind=True)
def bulk_process_emails_with_ai(self, user_id, email_account_ids=None, processing_type='analysis'):
    """
    Bulk process multiple emails with AI for a specific user.
    
    Args:
        user_id: UUID of the user
        email_account_ids: List of email account IDs to process (optional, processes all if None)
        processing_type: 'analysis', 'reply_generation', or 'auto_reply'
    """
    logger.info(f"🔄 Starting bulk AI processing task for user ID: {user_id}")
    
    try:
        from Accounts.models import User
        
        # Get the user
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            error_msg = f"User with ID {user_id} not found"
            logger.error(f"❌ {error_msg}")
            return {'status': 'error', 'message': error_msg}
        
        # Check if AI processing is enabled for this user
        ai_processor = AIEmailProcessor(user=user)
        if not ai_processor.is_processing_enabled():
            logger.info(f"⏭️ AI processing disabled for user {user.get_full_name()}")
            return {
                'status': 'skipped',
                'message': 'AI processing disabled for this user',
                'user_id': str(user.id)
            }
        
        # Get email accounts to process
        email_accounts_query = EmailAccount.objects.filter(
            user=user,
            is_active=True
        )
        
        if email_account_ids:
            email_accounts_query = email_accounts_query.filter(id__in=email_account_ids)
        
        email_accounts = email_accounts_query.all()
        
        if not email_accounts:
            logger.info(f"📭 No active email accounts found for processing")
            return {
                'status': 'no_accounts',
                'message': 'No active email accounts found',
                'user_id': str(user.id)
            }
        
        # Get unprocessed emails from these accounts
        unprocessed_emails = EmailMessage.objects.filter(
            email_account__in=email_accounts,
            message_type='received'  # Only process received emails
        ).exclude(
            # Exclude already processed emails
            processing_logs__status=EmailProcessingLog.ProcessingStatus.COMPLETED
        ).order_by('-received_at')[:50]  # Limit to 50 emails per batch
        
        if not unprocessed_emails:
            logger.info(f"📭 No unprocessed emails found")
            return {
                'status': 'no_emails',
                'message': 'No unprocessed emails found',
                'user_id': str(user.id)
            }
        
        logger.info(f"📧 Found {len(unprocessed_emails)} unprocessed emails")
        
        # Process emails in batches
        results = []
        processed_count = 0
        error_count = 0
        
        for email in unprocessed_emails:
            try:
                logger.info(f"🔄 Processing email {processed_count + 1}/{len(unprocessed_emails)}: {email.subject}")
                
                # Process with AI
                result = ai_processor.process_email_with_ai(email, processing_type)
                results.append(result)
                
                if result.get('status') == 'success':
                    processed_count += 1
                    
                    # If this is auto_reply and we have a generated reply, queue send task
                    if (processing_type == 'auto_reply' and 
                        ai_processor.is_auto_reply_enabled() and 
                        'generated_reply' in result):
                        
                        send_automated_reply.delay(
                            str(email.id),
                            result['generated_reply']['subject'],
                            result['generated_reply']['body']
                        )
                        logger.info(f"🚀 Queued automated reply for email: {email.subject}")
                else:
                    error_count += 1
                
            except Exception as e:
                logger.error(f"❌ Error processing email {email.subject}: {str(e)}")
                error_count += 1
                results.append({
                    'status': 'error',
                    'email_id': str(email.id),
                    'error': str(e)
                })
        
        summary = {
            'status': 'completed',
            'user_id': str(user.id),
            'processing_type': processing_type,
            'total_emails': len(unprocessed_emails),
            'processed_successfully': processed_count,
            'errors': error_count,
            'results': results
        }
        
        logger.info(f"✅ Bulk processing completed: {processed_count} successful, {error_count} errors")
        return summary
        
    except Exception as e:
        error_msg = f"Critical error in bulk processing task: {str(e)}"
        logger.error(f"❌ {error_msg}")
        
        # Retry the task in case of critical errors
        raise self.retry(exc=e, countdown=300, max_retries=1)

@shared_task
def cleanup_old_processing_logs():
    """
    Clean up old processing logs to prevent database bloat.
    Runs periodically to remove logs older than 30 days.
    """
    logger.info("🧹 Starting cleanup of old processing logs")
    
    try:
        from datetime import timedelta
        
        # Delete logs older than 30 days
        cutoff_date = timezone.now() - timedelta(days=30)
        
        deleted_count = EmailProcessingLog.objects.filter(
            created_at__lt=cutoff_date
        ).delete()[0]
        
        logger.info(f"✅ Cleaned up {deleted_count} old processing logs")
        return {
            'status': 'success',
            'deleted_count': deleted_count,
            'cutoff_date': cutoff_date.isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Error cleaning up processing logs: {str(e)}")
        return {
            'status': 'error',
            'error': str(e)
        }

@shared_task
def generate_ai_reply_for_email(email_message_id):
    """
    Generate an AI reply for a specific email (without sending it).
    This can be used for manual review before sending.
    
    Args:
        email_message_id: UUID of the EmailMessage to generate reply for
    """
    logger.info(f"✍️ Generating AI reply for email ID: {email_message_id}")
    
    try:
        # Get the email message
        try:
            email_message = EmailMessage.objects.select_related('email_account', 'email_account__user').get(
                id=email_message_id
            )
        except EmailMessage.DoesNotExist:
            error_msg = f"Email message with ID {email_message_id} not found"
            logger.error(f"❌ {error_msg}")
            return {'status': 'error', 'message': error_msg}
        
        # Process with AI for reply generation only
        user = email_message.email_account.user
        ai_processor = AIEmailProcessor(user=user)
        
        if not ai_processor.is_processing_enabled():
            return {
                'status': 'disabled',
                'message': 'AI processing disabled for this user',
                'email_id': str(email_message.id)
            }
        
        result = ai_processor.process_email_with_ai(email_message, 'reply_generation')
        
        logger.info(f"✅ AI reply generation completed for email: {email_message.subject}")
        return result
        
    except Exception as e:
        error_msg = f"Error generating AI reply: {str(e)}"
        logger.error(f"❌ {error_msg}")
        return {
            'status': 'error',
            'error': error_msg,
            'email_id': email_message_id
        }
