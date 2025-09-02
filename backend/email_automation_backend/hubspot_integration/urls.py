from django.urls import path
from . import views

urlpatterns = [
    # Debug
    path('debug/oauth-url/', views.hubspot_debug_oauth_url, name='hubspot_debug_oauth_url'),
    path('debug/logs/', views.debug_oauth_logs, name='debug_oauth_logs'),
    
    # OAuth Flow
    path('oauth/init/', views.init_hubspot_oauth_robust, name='init_hubspot_oauth'),  # Use robust version as default
    path('oauth/init-robust/', views.init_hubspot_oauth_robust, name='init_hubspot_oauth_robust'),
    path('oauth/init-legacy/', views.init_hubspot_oauth, name='init_hubspot_oauth_legacy'),  # Keep old version as fallback
    path('oauth/callback/', views.hubspot_oauth_callback, name='hubspot_oauth_callback'),
    
    # Account Management
    path('status/', views.hubspot_status, name='hubspot_status'),
    path('test-connection/', views.test_hubspot_connection, name='test_hubspot_connection'),
    path('disconnect/', views.disconnect_hubspot, name='disconnect_hubspot'),
    path('settings/', views.update_sync_settings, name='update_sync_settings'),
    
    # Contact Management
    path('contacts/', views.get_hubspot_contacts, name='get_hubspot_contacts'),
    path('contacts/sync/', views.manual_sync_contact, name='manual_sync_contact'),
    
    # Statistics and Logs
    path('statistics/', views.get_sync_statistics, name='get_sync_statistics'),
    path('logs/', views.get_sync_logs, name='get_sync_logs'),
]
