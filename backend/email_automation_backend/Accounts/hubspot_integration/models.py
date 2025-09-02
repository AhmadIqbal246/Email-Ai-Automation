from django.db import models
from django.utils import timezone
import uuid
import json
from Accounts.models import User, Company


class HubSpotAccount(models.Model):
    """HubSpot account connection for users"""
    
    class ConnectionStatus(models.TextChoices):
        CONNECTED = 'connected', 'Connected'
        DISCONNECTED = 'disconnected', 'Disconnected'
        ERROR = 'error', 'Error'
        EXPIRED = 'expired', 'Token Expired'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='hubspot_account')
    
    # HubSpot Account Details
    hubspot_user_id = models.CharField(max_length=100, blank=True)
    portal_id = models.CharField(max_length=100, blank=True)
    hub_id = models.CharField(max_length=100, blank=True)
    hub_domain = models.CharField(max_length=255, blank=True, null=True)
    
    # OAuth Credentials
    access_token = models.TextField(blank=True, null=True)
    refresh_token = models.TextField(blank=True, null=True)
    token_expires_at = models.DateTimeField(blank=True, null=True)
    
    # Connection Status
    status = models.CharField(
        max_length=20, 
        choices=ConnectionStatus.choices, 
        default=ConnectionStatus.DISCONNECTED
    )
    last_sync_at = models.DateTimeField(blank=True, null=True)
    
    # Settings
    auto_sync_contacts = models.BooleanField(default=True)
    sync_company_data = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "HubSpot Account"
        verbose_name_plural = "HubSpot Accounts"
    
    def __str__(self):
        return f"HubSpot Account for {self.user.get_full_name()}"
    
    def is_token_expired(self):
        if not self.token_expires_at:
            return True
        return timezone.now() >= self.token_expires_at
    
    def is_connected(self):
        return self.status == self.ConnectionStatus.CONNECTED and not self.is_token_expired()


class HubSpotContact(models.Model):
    """Mapping between email senders and HubSpot contacts"""
    
    class SyncStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        SYNCED = 'synced', 'Synced'
        FAILED = 'failed', 'Failed'
        UPDATED = 'updated', 'Updated'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    hubspot_account = models.ForeignKey(HubSpotAccount, on_delete=models.CASCADE, related_name='contacts')
    
    # Contact Identification
    email_address = models.EmailField()
    hubspot_contact_id = models.CharField(max_length=100, blank=True)
    
    # Contact Information (extracted from emails)
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    company_name = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    job_title = models.CharField(max_length=255, blank=True)
    website = models.URLField(blank=True)
    
    # Sync Information
    sync_status = models.CharField(max_length=20, choices=SyncStatus.choices, default=SyncStatus.PENDING)
    last_synced_at = models.DateTimeField(blank=True, null=True)
    sync_error_message = models.TextField(blank=True)
    
    # Email Interaction Tracking
    first_email_date = models.DateTimeField(blank=True, null=True)
    last_email_date = models.DateTimeField(blank=True, null=True)
    total_emails_received = models.IntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['hubspot_account', 'email_address']
        indexes = [
            models.Index(fields=['email_address']),
            models.Index(fields=['hubspot_contact_id']),
            models.Index(fields=['sync_status']),
        ]
    
    def __str__(self):
        return f"{self.email_address} -> HubSpot Contact {self.hubspot_contact_id}"


class HubSpotSyncLog(models.Model):
    """Log of HubSpot synchronization operations"""
    
    class OperationType(models.TextChoices):
        CREATE_CONTACT = 'create_contact', 'Create Contact'
        UPDATE_CONTACT = 'update_contact', 'Update Contact'
        CREATE_COMPANY = 'create_company', 'Create Company'
        TOKEN_REFRESH = 'token_refresh', 'Token Refresh'
    
    class Status(models.TextChoices):
        SUCCESS = 'success', 'Success'
        FAILED = 'failed', 'Failed'
        RETRY = 'retry', 'Retry'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    hubspot_account = models.ForeignKey(HubSpotAccount, on_delete=models.CASCADE, related_name='sync_logs')
    
    # Operation Details
    operation_type = models.CharField(max_length=20, choices=OperationType.choices)
    status = models.CharField(max_length=20, choices=Status.choices)
    
    # Related Data
    contact_email = models.EmailField(blank=True)  # For contact operations
    hubspot_contact_id = models.CharField(max_length=100, blank=True)
    
    # Request/Response Data
    request_data = models.JSONField(blank=True, null=True)
    response_data = models.JSONField(blank=True, null=True)
    
    # Error Handling
    error_message = models.TextField(blank=True)
    error_code = models.CharField(max_length=50, blank=True)
    retry_count = models.IntegerField(default=0)
    
    # Performance Metrics
    processing_duration = models.FloatField(blank=True, null=True)  # in seconds
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['hubspot_account', '-created_at']),
            models.Index(fields=['operation_type', 'status']),
            models.Index(fields=['contact_email']),
        ]
    
    def __str__(self):
        return f"{self.operation_type} - {self.status} ({self.created_at})"
    
    @classmethod
    def log_success(cls, hubspot_account, operation_type, contact_email='', 
                   hubspot_contact_id='', request_data=None, response_data=None, duration=None):
        """Log a successful HubSpot operation"""
        return cls.objects.create(
            hubspot_account=hubspot_account,
            operation_type=operation_type,
            status=cls.Status.SUCCESS,
            contact_email=contact_email,
            hubspot_contact_id=hubspot_contact_id,
            request_data=request_data,
            response_data=response_data,
            processing_duration=duration
        )
    
    @classmethod
    def log_failure(cls, hubspot_account, operation_type, error_message, 
                   contact_email='', error_code='', request_data=None, retry_count=0):
        """Log a failed HubSpot operation"""
        return cls.objects.create(
            hubspot_account=hubspot_account,
            operation_type=operation_type,
            status=cls.Status.FAILED,
            contact_email=contact_email,
            error_message=error_message,
            error_code=error_code,
            request_data=request_data,
            retry_count=retry_count
        )
