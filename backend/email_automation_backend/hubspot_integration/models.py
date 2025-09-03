from django.db import models
import uuid
from Accounts.models import User, Company


class HubSpotAccount(models.Model):
    """HubSpot account connection for users"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='hubspot_account')
    hubspot_user_id = models.CharField(max_length=100, blank=True)
    portal_id = models.CharField(max_length=100, blank=True)
    hub_id = models.CharField(max_length=100, blank=True)
    hub_domain = models.CharField(max_length=255, blank=True, null=True)
    access_token = models.TextField(blank=True, null=True)
    refresh_token = models.TextField(blank=True, null=True)
    token_expires_at = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=20, blank=True, default='disconnected')
    last_sync_at = models.DateTimeField(blank=True, null=True)
    auto_sync_contacts = models.BooleanField(default=True)
    sync_company_data = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class HubSpotContact(models.Model):
    """Mapping between email senders and HubSpot contacts"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    hubspot_account = models.ForeignKey(HubSpotAccount, on_delete=models.CASCADE, related_name='contacts')
    email_address = models.EmailField()
    hubspot_contact_id = models.CharField(max_length=100, blank=True)
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    company_name = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    job_title = models.CharField(max_length=255, blank=True)
    website = models.URLField(blank=True)
    sync_status = models.CharField(max_length=20, blank=True, default='pending')
    last_synced_at = models.DateTimeField(blank=True, null=True)
    sync_error_message = models.TextField(blank=True)
    first_email_date = models.DateTimeField(blank=True, null=True)
    last_email_date = models.DateTimeField(blank=True, null=True)
    total_emails_received = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class HubSpotSyncLog(models.Model):
    """Log of HubSpot synchronization operations"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    hubspot_account = models.ForeignKey(HubSpotAccount, on_delete=models.CASCADE, related_name='sync_logs')
    operation_type = models.CharField(max_length=20, blank=True)
    status = models.CharField(max_length=20, blank=True)
    contact_email = models.EmailField(blank=True)
    hubspot_contact_id = models.CharField(max_length=100, blank=True)
    request_data = models.JSONField(blank=True, null=True)
    response_data = models.JSONField(blank=True, null=True)
    error_message = models.TextField(blank=True)
    error_code = models.CharField(max_length=50, blank=True)
    retry_count = models.IntegerField(default=0)
    processing_duration = models.FloatField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
