from django.utils import timezone


def is_token_expired(hubspot_account):
    """Check if HubSpot account token is expired"""
    if not hubspot_account.token_expires_at:
        return True
    return timezone.now() >= hubspot_account.token_expires_at


def is_connected(hubspot_account):
    """Check if HubSpot account is connected and token is valid"""
    return hubspot_account.status == 'connected' and not is_token_expired(hubspot_account)


def log_success(hubspot_account, operation_type, contact_email='', 
               hubspot_contact_id='', request_data=None, response_data=None, duration=None):
    """Log a successful HubSpot operation"""
    from .models import HubSpotSyncLog
    
    return HubSpotSyncLog.objects.create(
        hubspot_account=hubspot_account,
        operation_type=operation_type,
        status='success',
        contact_email=contact_email,
        hubspot_contact_id=hubspot_contact_id,
        request_data=request_data,
        response_data=response_data,
        processing_duration=duration
    )


def log_failure(hubspot_account, operation_type, error_message, 
               contact_email='', error_code='', request_data=None, retry_count=0):
    """Log a failed HubSpot operation"""
    from .models import HubSpotSyncLog
    
    return HubSpotSyncLog.objects.create(
        hubspot_account=hubspot_account,
        operation_type=operation_type,
        status='failed',
        contact_email=contact_email,
        error_message=error_message,
        error_code=error_code,
        request_data=request_data,
        retry_count=retry_count
    )
