from django.db import models
from django.utils import timezone
import uuid
import json
from User.models import EmailAccount, EmailMessage
from Accounts.models import User


class AIProcessingSettings(models.Model):
    """Global AI processing settings for users"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='ai_settings')
    
    # AI Processing Configuration
    is_enabled = models.BooleanField(default=False, help_text="Enable AI processing for this user")
    auto_reply_enabled = models.BooleanField(default=False, help_text="Enable automated replies")
    
    # Default AI Instructions
    default_prompt = models.TextField(
        default="You are a professional email assistant. Analyze the email and draft a helpful, polite, and appropriate response. Be concise but complete in your response.",
        help_text="Default prompt for AI processing"
    )
    
    # Processing Options
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
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "AI Processing Settings"
        verbose_name_plural = "AI Processing Settings"
    
    def __str__(self):
        return f"AI Settings for {self.user.get_full_name()}"


class EmailProcessingLog(models.Model):
    """Log of email processing operations by AI"""
    
    class ProcessingStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PROCESSING = 'processing', 'Processing'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'
        SKIPPED = 'skipped', 'Skipped'
    
    class ProcessingType(models.TextChoices):
        ANALYSIS = 'analysis', 'Analysis Only'
        REPLY_GENERATION = 'reply_generation', 'Reply Generation'
        AUTO_REPLY = 'auto_reply', 'Automated Reply'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email_message = models.ForeignKey(EmailMessage, on_delete=models.CASCADE, related_name='processing_logs')
    
    # Processing Details
    processing_type = models.CharField(max_length=20, choices=ProcessingType.choices, default=ProcessingType.ANALYSIS)
    status = models.CharField(max_length=20, choices=ProcessingStatus.choices, default=ProcessingStatus.PENDING)
    
    # AI Analysis Results
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
    
    # Generated Reply Details
    generated_reply_subject = models.CharField(max_length=500, blank=True)
    generated_reply_body = models.TextField(blank=True)
    reply_sent = models.BooleanField(default=False)
    reply_sent_at = models.DateTimeField(blank=True, null=True)
    
    # Processing Metrics
    processing_duration = models.FloatField(blank=True, null=True, help_text="Processing duration in seconds")
    tokens_used = models.IntegerField(blank=True, null=True, help_text="AI tokens consumed")
    
    # Error Handling
    error_message = models.TextField(blank=True)
    error_details = models.JSONField(blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email_message', '-created_at']),
            models.Index(fields=['status', 'processing_type']),
            models.Index(fields=['reply_sent']),
        ]
    
    def __str__(self):
        return f"{self.processing_type} for {self.email_message.subject} - {self.status}"
    
    @classmethod
    def log_processing_start(cls, email_message, processing_type):
        """Log the start of email processing"""
        return cls.objects.create(
            email_message=email_message,
            processing_type=processing_type,
            status=cls.ProcessingStatus.PROCESSING
        )
    
    @classmethod
    def log_processing_success(cls, email_message, processing_type, ai_analysis=None, 
                              generated_reply_subject='', generated_reply_body='', 
                              processing_duration=None, tokens_used=None):
        """Log successful email processing"""
        return cls.objects.create(
            email_message=email_message,
            processing_type=processing_type,
            status=cls.ProcessingStatus.COMPLETED,
            ai_analysis=ai_analysis,
            generated_reply_subject=generated_reply_subject,
            generated_reply_body=generated_reply_body,
            processing_duration=processing_duration,
            tokens_used=tokens_used
        )
    
    @classmethod
    def log_processing_failure(cls, email_message, processing_type, error_message, error_details=None):
        """Log failed email processing"""
        return cls.objects.create(
            email_message=email_message,
            processing_type=processing_type,
            status=cls.ProcessingStatus.FAILED,
            error_message=error_message,
            error_details=error_details
        )


class AIPromptTemplate(models.Model):
    """AI prompt templates for different email scenarios"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ai_prompts')
    
    # Template Details
    name = models.CharField(max_length=255, help_text="Template name")
    description = models.TextField(blank=True, help_text="Template description")
    
    # Template Content
    prompt_text = models.TextField(help_text="AI prompt template")
    
    # Template Conditions
    email_keywords = models.TextField(blank=True, help_text="Keywords that trigger this template (comma-separated)")
    sender_patterns = models.TextField(blank=True, help_text="Sender email patterns (comma-separated)")
    
    # Settings
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)
    priority = models.IntegerField(default=0, help_text="Higher priority templates are checked first")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-priority', 'name']
        unique_together = ['user', 'name']
    
    def __str__(self):
        return f"{self.name} - {self.user.get_full_name()}"
    
    def get_keywords_list(self):
        """Parse keywords and return list"""
        if not self.email_keywords:
            return []
        return [keyword.strip().lower() for keyword in self.email_keywords.split(',')]
    
    def get_sender_patterns_list(self):
        """Parse sender patterns and return list"""
        if not self.sender_patterns:
            return []
        return [pattern.strip().lower() for pattern in self.sender_patterns.split(',')]
