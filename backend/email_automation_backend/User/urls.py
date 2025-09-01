from django.urls import path
from . import views

urlpatterns = [
    # Gmail OAuth endpoints
    path('auth/gmail/', views.GmailOAuthView.as_view(), name='gmail_oauth'),
    path('auth/gmail/callback/', views.GmailOAuthCallbackView.as_view(), name='gmail_oauth_callback'),
    
    # Email functionality endpoints
    path('email-accounts/', views.GetEmailAccountsView.as_view(), name='get_email_accounts'),
    path('ai-rules/', views.GetAiRulesView.as_view(), name='get_ai_rules'),
    path('ai-rules/<uuid:rule_id>/', views.DeleteAiRuleView.as_view(), name='delete_ai_rule'),
    path('connect-email/', views.ConnectEmailView.as_view(), name='connect_email'),
    path('fetch-emails/', views.FetchEmailsView.as_view(), name='fetch_emails'),
    path('get-emails/', views.GetEmailsView.as_view(), name='get_emails'),
    path('email-content/<uuid:email_id>/', views.GetEmailContentView.as_view(), name='get_email_content'),
    path('mark-email-read/<uuid:email_id>/', views.MarkEmailAsReadView.as_view(), name='mark_email_read'),
    path('mark-all-emails-read/', views.MarkAllEmailsAsReadView.as_view(), name='mark_all_emails_read'),
    path('manual-email-refresh/', views.ManualEmailRefreshView.as_view(), name='manual_email_refresh'),
    path('disconnect-email-account/', views.DisconnectEmailAccountView.as_view(), name='disconnect_email_account'),
    
    # Email reply endpoints
    path('reply-to-email/<uuid:email_id>/', views.ReplyToEmailView.as_view(), name='reply_to_email'),
    path('email-replies/<uuid:email_id>/', views.GetEmailRepliesView.as_view(), name='get_email_replies'),
]
