from django.db import models
from django.utils import timezone
import uuid
import json
from Accounts.models import User


class EmailAccount(models.Model):
    """Connected email accounts for users"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='email_accounts')
    
    # Email Details
    email_address = models.EmailField()
    provider = models.CharField(max_length=20, default='gmail')
    display_name = models.CharField(max_length=255, blank=True)
    
    # OAuth Credentials (will be encrypted)
    access_token = models.TextField(blank=True, null=True)
    refresh_token = models.TextField(blank=True, null=True)
    
    # Settings
    is_primary = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['user', 'email_address']


class EmailMessage(models.Model):
    """Stored email messages from connected accounts"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email_account = models.ForeignKey(EmailAccount, on_delete=models.CASCADE, related_name='messages')
    
    # Gmail specific
    gmail_message_id = models.CharField(max_length=100, unique=True)
    gmail_thread_id = models.CharField(max_length=100, blank=True)
    
    # Email threading and conversation tracking
    parent_email = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    conversation_id = models.CharField(max_length=100, blank=True)  # For grouping related emails
    message_type = models.CharField(max_length=20, default='received')
    in_reply_to = models.CharField(max_length=255, blank=True)  # Original message ID header
    references = models.TextField(blank=True)  # Full chain of message references
    
    # Email content
    subject = models.CharField(max_length=500)
    sender = models.EmailField()
    recipients = models.TextField()  # JSON field for multiple recipients
    cc = models.TextField(blank=True)  # JSON field for CC recipients
    bcc = models.TextField(blank=True)  # JSON field for BCC recipients
    
    # Email body
    body_html = models.TextField(blank=True)
    body_plain = models.TextField(blank=True)
    
    # Metadata
    received_at = models.DateTimeField()
    importance = models.CharField(max_length=10, default='normal')
    is_read = models.BooleanField(default=False)
    is_starred = models.BooleanField(default=False)
    has_attachments = models.BooleanField(default=False)
    has_ai_reply = models.BooleanField(default=False)  # Whether this email has been replied to by AI
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-received_at']
        indexes = [
            models.Index(fields=['email_account', '-received_at']),
            models.Index(fields=['gmail_message_id']),
            models.Index(fields=['is_read']),
        ]


class EmailFetchLog(models.Model):
    """Log of email fetching operations"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email_account = models.ForeignKey(EmailAccount, on_delete=models.CASCADE, related_name='fetch_logs')
    
    # Fetch details
    fetch_type = models.CharField(max_length=20)
    status = models.CharField(max_length=20)
    messages_fetched = models.IntegerField(default=0)
    messages_processed = models.IntegerField(default=0)
    
    # Error handling
    error_message = models.TextField(blank=True)
    error_details = models.JSONField(blank=True, null=True)
    
    # Performance metrics
    fetch_duration = models.FloatField(blank=True, null=True)  # in seconds
    last_message_date = models.DateTimeField(blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email_account', '-created_at']),
            models.Index(fields=['fetch_type', 'status']),
        ]
