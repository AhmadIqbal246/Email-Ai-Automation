import logging
from celery import shared_task
from django.utils import timezone
from .models import HubSpotAccount
from .services import HubSpotContactService
from .utils import is_connected
from User.models import EmailMessage

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def sync_email_sender_to_hubspot(self, email_message_id, user_id):
    """
    Celery task to sync email sender information to HubSpot
    This task is called after an email is processed by AI
    """
    try:
        # Get the email message
        try:
            email_message = EmailMessage.objects.get(id=email_message_id)
        except EmailMessage.DoesNotExist:
            logger.error(f"Email message {email_message_id} not found")
            return {"status": "error", "message": "Email message not found"}
        
        # Get the user and their HubSpot account
        from Accounts.models import User
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            logger.error(f"User {user_id} not found")
            return {"status": "error", "message": "User not found"}
        
        # Check if user has HubSpot account connected
        try:
            hubspot_account = user.hubspot_account
            if not is_connected(hubspot_account):
                logger.info(f"User {user.email} does not have HubSpot connected or token expired")
                return {"status": "skipped", "message": "HubSpot not connected"}
        except HubSpotAccount.DoesNotExist:
            logger.info(f"User {user.email} has no HubSpot account")
            return {"status": "skipped", "message": "No HubSpot account"}
        
        # Check if auto-sync is enabled
        if not hubspot_account.auto_sync_contacts:
            logger.info(f"Auto-sync disabled for user {user.email}")
            return {"status": "skipped", "message": "Auto-sync disabled"}
        
        # Initialize contact service and sync
        contact_service = HubSpotContactService(user)
        hubspot_contact = contact_service.sync_email_sender(email_message)
        
        logger.info(f"Successfully synced email sender {email_message.sender} to HubSpot for user {user.email}")
        
        return {
            "status": "success",
            "message": f"Synced contact {email_message.sender}",
            "contact_id": str(hubspot_contact.id),
            "hubspot_contact_id": hubspot_contact.hubspot_contact_id
        }
        
    except Exception as e:
        logger.error(f"Failed to sync email sender to HubSpot: {str(e)}")
        
        # Retry the task if we haven't exceeded max retries
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying HubSpot sync task (attempt {self.request.retries + 1})")
            raise self.retry(exc=e, countdown=60 * (self.request.retries + 1))
        
        return {
            "status": "error", 
            "message": str(e),
            "retries": self.request.retries
        }


@shared_task
def bulk_sync_contacts_to_hubspot(user_id, email_addresses=None):
    """
    Bulk sync multiple contacts to HubSpot
    Can be used for manual syncing or initial setup
    """
    try:
        from Accounts.models import User
        user = User.objects.get(id=user_id)
        
        # Check if user has HubSpot account
        try:
            hubspot_account = user.hubspot_account
            if not is_connected(hubspot_account):
                return {"status": "error", "message": "HubSpot not connected"}
        except HubSpotAccount.DoesNotExist:
            return {"status": "error", "message": "No HubSpot account"}
        
        contact_service = HubSpotContactService(user)
        
        # Get contacts to sync
        if email_addresses:
            # Sync specific email addresses
            contacts_to_sync = hubspot_account.contacts.filter(
                email_address__in=email_addresses,
                sync_status__in=['pending', 'failed']
            )
        else:
            # Sync all pending/failed contacts
            contacts_to_sync = hubspot_account.contacts.filter(
                sync_status__in=['pending', 'failed']
            )
        
        synced_count = 0
        failed_count = 0
        results = []
        
        for contact in contacts_to_sync:
            try:
                contact_service._sync_contact_to_hubspot(contact)
                synced_count += 1
                results.append({
                    "email": contact.email_address,
                    "status": "success"
                })
                logger.info(f"Successfully synced contact {contact.email_address}")
                
            except Exception as e:
                failed_count += 1
                results.append({
                    "email": contact.email_address,
                    "status": "failed",
                    "error": str(e)
                })
                logger.error(f"Failed to sync contact {contact.email_address}: {str(e)}")
        
        # Update last sync time
        hubspot_account.last_sync_at = timezone.now()
        hubspot_account.save()
        
        logger.info(f"Bulk sync completed for user {user.email}: {synced_count} synced, {failed_count} failed")
        
        return {
            "status": "completed",
            "synced_count": synced_count,
            "failed_count": failed_count,
            "total_processed": len(contacts_to_sync),
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Bulk sync failed for user {user_id}: {str(e)}")
        return {"status": "error", "message": str(e)}


@shared_task
def cleanup_old_sync_logs(days=30):
    """
    Clean up old synchronization logs
    Run this periodically to keep the database clean
    """
    try:
        from datetime import timedelta
        cutoff_date = timezone.now() - timedelta(days=days)
        
        from .models import HubSpotSyncLog
        deleted_count = HubSpotSyncLog.objects.filter(
            created_at__lt=cutoff_date
        ).delete()[0]
        
        logger.info(f"Cleaned up {deleted_count} old HubSpot sync logs")
        
        return {
            "status": "success",
            "deleted_count": deleted_count,
            "cutoff_date": cutoff_date.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to cleanup old sync logs: {str(e)}")
        return {"status": "error", "message": str(e)}


@shared_task
def refresh_hubspot_tokens():
    """
    Periodic task to refresh HubSpot tokens that are about to expire
    """
    try:
        from datetime import timedelta
        
        # Find accounts with tokens expiring in the next hour
        expiry_threshold = timezone.now() + timedelta(hours=1)
        
        accounts_to_refresh = HubSpotAccount.objects.filter(
            status='connected',
            token_expires_at__lte=expiry_threshold,
            refresh_token__isnull=False
        ).exclude(refresh_token='')
        
        refreshed_count = 0
        failed_count = 0
        
        for account in accounts_to_refresh:
            try:
                from .services import HubSpotAPIService
                api_service = HubSpotAPIService(account)
                api_service._refresh_token()
                refreshed_count += 1
                logger.info(f"Refreshed token for user {account.user.email}")
                
            except Exception as e:
                failed_count += 1
                logger.error(f"Failed to refresh token for user {account.user.email}: {str(e)}")
        
        logger.info(f"Token refresh completed: {refreshed_count} refreshed, {failed_count} failed")
        
        return {
            "status": "completed",
            "refreshed_count": refreshed_count,
            "failed_count": failed_count,
            "total_processed": len(accounts_to_refresh)
        }
        
    except Exception as e:
        logger.error(f"Token refresh task failed: {str(e)}")
        return {"status": "error", "message": str(e)}
