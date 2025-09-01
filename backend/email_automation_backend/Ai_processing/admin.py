from django.contrib import admin
from .models import AIProcessingSettings, EmailProcessingLog, AIPromptTemplate

@admin.register(AIProcessingSettings)
class AIProcessingSettingsAdmin(admin.ModelAdmin):
    list_display = ['user', 'is_enabled', 'auto_reply_enabled', 'response_tone', 'created_at']
    list_filter = ['is_enabled', 'auto_reply_enabled', 'response_tone', 'created_at']
    search_fields = ['user__email', 'user__first_name', 'user__last_name']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Processing Settings', {
            'fields': ('is_enabled', 'auto_reply_enabled', 'response_tone', 'max_response_length')
        }),
        ('AI Prompt', {
            'fields': ('default_prompt',),
            'classes': ('wide',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

@admin.register(EmailProcessingLog)
class EmailProcessingLogAdmin(admin.ModelAdmin):
    list_display = ['email_message', 'processing_type', 'status', 'ai_sentiment', 'reply_sent', 'created_at']
    list_filter = ['processing_type', 'status', 'ai_sentiment', 'ai_priority', 'reply_sent', 'created_at']
    search_fields = [
        'email_message__subject', 'email_message__sender', 'ai_category', 'ai_summary'
    ]
    readonly_fields = [
        'created_at', 'updated_at', 'processing_duration', 'tokens_used'
    ]
    
    fieldsets = (
        ('Email Information', {
            'fields': ('email_message',)
        }),
        ('Processing Details', {
            'fields': ('processing_type', 'status')
        }),
        ('AI Analysis', {
            'fields': ('ai_summary', 'ai_sentiment', 'ai_category', 'ai_priority', 'ai_analysis'),
            'classes': ('wide',)
        }),
        ('Generated Reply', {
            'fields': ('generated_reply_subject', 'generated_reply_body', 'reply_sent', 'reply_sent_at'),
            'classes': ('wide',)
        }),
        ('Performance Metrics', {
            'fields': ('processing_duration', 'tokens_used'),
            'classes': ('collapse',)
        }),
        ('Error Information', {
            'fields': ('error_message', 'error_details'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

@admin.register(AIPromptTemplate)
class AIPromptTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'is_active', 'is_default', 'priority', 'created_at']
    list_filter = ['is_active', 'is_default', 'created_at']
    search_fields = ['name', 'description', 'user__email', 'email_keywords', 'sender_patterns']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Template Info', {
            'fields': ('user', 'name', 'description')
        }),
        ('Template Content', {
            'fields': ('prompt_text',),
            'classes': ('wide',)
        }),
        ('Trigger Conditions', {
            'fields': ('email_keywords', 'sender_patterns'),
            'classes': ('wide',)
        }),
        ('Settings', {
            'fields': ('is_active', 'is_default', 'priority')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
