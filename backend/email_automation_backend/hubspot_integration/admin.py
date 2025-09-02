from django.contrib import admin
from .models import HubSpotAccount, HubSpotContact, HubSpotSyncLog

admin.site.register(HubSpotAccount)
admin.site.register(HubSpotContact)
admin.site.register(HubSpotSyncLog)
