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
    path('admin/send-invitation/', views.SendInvitationView.as_view(), name='send_invitation'),
    path('admin/resend-invitation/<uuid:invitation_id>/', views.ResendInvitationView.as_view(), name='resend_invitation'),
    path('admin/employees/', views.GetEmployeesView.as_view(), name='get_employees'),
    path('admin/invitations/', views.GetInvitationsView.as_view(), name='get_invitations'),
    
    # Employee endpoints
    path('email-accounts/', views.GetEmailAccountsView.as_view(), name='get_email_accounts'),
    path('ai-rules/', views.GetAiRulesView.as_view(), name='get_ai_rules'),
    path('ai-rules/<uuid:rule_id>/', views.DeleteAiRuleView.as_view(), name='delete_ai_rule'),
    path('connect-email/', views.ConnectEmailView.as_view(), name='connect_email'),
]
