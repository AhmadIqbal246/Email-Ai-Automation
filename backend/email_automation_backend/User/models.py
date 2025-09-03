from django.db import models
from django.utils import timezone
import uuid
import json
from Accounts.models import User


class EmailAccount(models.Model):
    """Connected email accounts for users"""
    
    class Provider(models.TextChoices):
        GMAIL = 'gmail', 'Gmail'
        OUTLOOK = 'outlook', 'Outlook'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='email_accounts')
    
    # Email Details
    email_address = models.EmailField()
    provider = models.CharField(max_length=20, choices=Provider.choices, default=Provider.GMAIL)
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
    
    def __str__(self):
        return f"{self.email_address} ({self.user.get_full_name()})"


class EmailMessage(models.Model):
    """Stored email messages from connected accounts"""
    
    class Importance(models.TextChoices):
        LOW = 'low', 'Low'
        NORMAL = 'normal', 'Normal'
        HIGH = 'high', 'High'
    
    class MessageType(models.TextChoices):
        RECEIVED = 'received', 'Received'
        SENT = 'sent', 'Sent'
        REPLY = 'reply', 'Reply'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email_account = models.ForeignKey(EmailAccount, on_delete=models.CASCADE, related_name='messages')
    
    # Gmail specific
    gmail_message_id = models.CharField(max_length=100, unique=True)
    gmail_thread_id = models.CharField(max_length=100, blank=True)
    
    # Email threading and conversation tracking
    parent_email = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    conversation_id = models.CharField(max_length=100, blank=True)  # For grouping related emails
    message_type = models.CharField(max_length=20, choices=MessageType.choices, default=MessageType.RECEIVED)
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
    importance = models.CharField(max_length=10, choices=Importance.choices, default=Importance.NORMAL)
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
    
    def __str__(self):
        return f"{self.subject} from {self.sender}"
    
    def get_recipients_list(self):
        """Parse recipients JSON and return list"""
        try:
            return json.loads(self.recipients)
        except (json.JSONDecodeError, TypeError):
            return [self.recipients] if self.recipients else []
    
    def get_cc_list(self):
        """Parse CC JSON and return list"""
        try:
            return json.loads(self.cc)
        except (json.JSONDecodeError, TypeError):
            return [self.cc] if self.cc else []
    
    def get_bcc_list(self):
        """Parse BCC JSON and return list"""
        try:
            return json.loads(self.bcc)
        except (json.JSONDecodeError, TypeError):
            return [self.bcc] if self.bcc else []


class EmailFetchLog(models.Model):
    """Log of email fetching operations"""
    
    class FetchType(models.TextChoices):
        MANUAL = 'manual', 'Manual'
        SCHEDULED = 'scheduled', 'Scheduled'
        WEBHOOK = 'webhook', 'Webhook'
    
    class Status(models.TextChoices):
        SUCCESS = 'success', 'Success'
        FAILED = 'failed', 'Failed'
        PARTIAL = 'partial', 'Partial'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email_account = models.ForeignKey(EmailAccount, on_delete=models.CASCADE, related_name='fetch_logs')
    
    # Fetch details
    fetch_type = models.CharField(max_length=20, choices=FetchType.choices)
    status = models.CharField(max_length=20, choices=Status.choices)
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
    
    def __str__(self):
        return f"{self.fetch_type} fetch for {self.email_account.email_address} - {self.status}"
    
    @classmethod
    def log_success(cls, email_account, fetch_type, messages_fetched, messages_processed, 
                    fetch_duration=None, last_message_date=None):
        """Log a successful fetch operation"""
        return cls.objects.create(
            email_account=email_account,
            fetch_type=fetch_type,
            status=cls.Status.SUCCESS,
            messages_fetched=messages_fetched,
            messages_processed=messages_processed,
            fetch_duration=fetch_duration,
            last_message_date=last_message_date
        )
    
    @classmethod
    def log_failure(cls, email_account, fetch_type, error_message, error_details=None):
        """Log a failed fetch operation"""
        return cls.objects.create(
            email_account=email_account,
            fetch_type=fetch_type,
            status=cls.Status.FAILED,
            error_message=error_message,
            error_details=error_details
        )
