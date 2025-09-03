from django.apps import AppConfig


class HubspotIntegrationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'hubspot_integration'
    verbose_name = 'HubSpot Integration'
    
    def ready(self):
        # App ready - no model patching needed with simplified approach
        pass
