from django.urls import path
from .views import (
    AISettingsView,
    ProcessEmailWithAIView,
    GetProcessingLogsView,
    GenerateReplyView,
    BulkProcessEmailsView,
    EmailAnalysisView,
    AIProcessingStatsView
)

urlpatterns = [
    # AI Settings
    path('settings/', AISettingsView.as_view(), name='ai_settings'),
    
    # Email Processing
    path('process-email/<uuid:email_id>/', ProcessEmailWithAIView.as_view(), name='process_email_with_ai'),
    path('generate-reply/<uuid:email_id>/', GenerateReplyView.as_view(), name='generate_ai_reply'),
    path('bulk-process/', BulkProcessEmailsView.as_view(), name='bulk_process_emails'),
    
    # Analysis and Logs
    path('analysis/<uuid:email_id>/', EmailAnalysisView.as_view(), name='email_analysis'),
    path('logs/', GetProcessingLogsView.as_view(), name='processing_logs'),
    path('stats/', AIProcessingStatsView.as_view(), name='processing_stats'),
]
