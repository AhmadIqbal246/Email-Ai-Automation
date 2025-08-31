from django.urls import path
from . import views

urlpatterns = [
    # Authentication endpoints
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/refresh/', views.RefreshTokenView.as_view(), name='refresh_token'),
    path('auth/logout/', views.LogoutView.as_view(), name='logout'),
    path('auth/company-signup/', views.CompanySignupView.as_view(), name='company_signup'),
    path('auth/employee-signup/', views.EmployeeSignupView.as_view(), name='employee_signup'),
    path('auth/verify/', views.VerifyAuthView.as_view(), name='verify_auth'),
    path('auth/verify-invitation/', views.VerifyInvitationView.as_view(), name='verify_invitation'),
    
    # Admin endpoints
    path('send-invitation/', views.SendInvitationView.as_view(), name='send_invitation'),
    path('employees/', views.GetEmployeesView.as_view(), name='get_employees'),
    path('invitations/', views.GetInvitationsView.as_view(), name='get_invitations'),
    path('resend-invitation/<uuid:invitation_id>/', views.ResendInvitationView.as_view(), name='resend_invitation'),
    
    # Gmail OAuth endpoints
    path('auth/gmail/', views.GmailOAuthView.as_view(), name='gmail_oauth'),
    path('auth/gmail/callback/', views.GmailOAuthCallbackView.as_view(), name='gmail_oauth_callback'),
    
    # Employee endpoints
    path('email-accounts/', views.GetEmailAccountsView.as_view(), name='get_email_accounts'),
    path('ai-rules/', views.GetAiRulesView.as_view(), name='get_ai_rules'),
    path('ai-rules/<uuid:rule_id>/', views.DeleteAiRuleView.as_view(), name='delete_ai_rule'),
    path('connect-email/', views.ConnectEmailView.as_view(), name='connect_email'),
    path('fetch-emails/', views.FetchEmailsView.as_view(), name='fetch_emails'),
    path('get-emails/', views.GetEmailsView.as_view(), name='get_emails'),
    path('email-content/<uuid:email_id>/', views.GetEmailContentView.as_view(), name='get_email_content'),
    path('mark-email-read/<uuid:email_id>/', views.MarkEmailAsReadView.as_view(), name='mark_email_read'),
    path('mark-all-emails-read/', views.MarkAllEmailsAsReadView.as_view(), name='mark_all_emails_read'),
]
