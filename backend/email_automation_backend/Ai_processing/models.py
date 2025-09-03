from django.db import models
import uuid
from User.models import EmailAccount, EmailMessage
from Accounts.models import User


class AIProcessingSettings(models.Model):
    """Global AI processing settings for users"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='ai_settings')
    is_enabled = models.BooleanField(default=False, help_text="Enable AI processing for this user")
    auto_reply_enabled = models.BooleanField(default=False, help_text="Enable automated replies")
    default_prompt = models.TextField(
        default="You are a professional email assistant. Analyze the email and draft a helpful, polite, and appropriate response. Be concise but complete in your response.",
        help_text="Default prompt for AI processing"
    )
    max_response_length = models.IntegerField(default=500, help_text="Maximum length of AI-generated responses")
    response_tone = models.CharField(
        max_length=20,
        choices=[
            ('professional', 'Professional'),
            ('friendly', 'Friendly'),
            ('formal', 'Formal'),
            ('casual', 'Casual')
        ],
        default='professional'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class EmailProcessingLog(models.Model):
    """Log of email processing operations by AI"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email_message = models.ForeignKey(EmailMessage, on_delete=models.CASCADE, related_name='processing_logs')
    processing_type = models.CharField(max_length=20, blank=True, default='analysis')
    status = models.CharField(max_length=20, blank=True, default='pending')
    ai_analysis = models.JSONField(blank=True, null=True, help_text="AI analysis results")
    ai_summary = models.TextField(blank=True, help_text="AI-generated email summary")
    ai_sentiment = models.CharField(
        max_length=20,
        choices=[
            ('positive', 'Positive'),
            ('neutral', 'Neutral'),
            ('negative', 'Negative'),
            ('urgent', 'Urgent')
        ],
        blank=True
    )
    ai_category = models.CharField(max_length=100, blank=True, help_text="AI-detected email category")
    ai_priority = models.CharField(
        max_length=20,
        choices=[
            ('low', 'Low'),
            ('medium', 'Medium'),
            ('high', 'High'),
            ('urgent', 'Urgent')
        ],
        blank=True
    )
    generated_reply_subject = models.CharField(max_length=500, blank=True)
    generated_reply_body = models.TextField(blank=True)
    reply_sent = models.BooleanField(default=False)
    reply_sent_at = models.DateTimeField(blank=True, null=True)
    processing_duration = models.FloatField(blank=True, null=True, help_text="Processing duration in seconds")
    tokens_used = models.IntegerField(blank=True, null=True, help_text="AI tokens consumed")
    error_message = models.TextField(blank=True)
    error_details = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


