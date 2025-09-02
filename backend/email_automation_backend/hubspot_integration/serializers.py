from rest_framework import serializers
from .models import HubSpotAccount, HubSpotContact, HubSpotSyncLog


class HubSpotAccountSerializer(serializers.ModelSerializer):
    """Serializer for HubSpot account information"""
    
    is_connected = serializers.SerializerMethodField()
    is_token_expired = serializers.SerializerMethodField()
    
    class Meta:
        model = HubSpotAccount
        fields = [
            'id', 'hubspot_user_id', 'portal_id', 'hub_id', 'hub_domain',
            'status', 'last_sync_at', 'auto_sync_contacts', 'sync_company_data',
            'is_connected', 'is_token_expired', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'hubspot_user_id', 'portal_id', 'hub_id', 'hub_domain',
            'status', 'last_sync_at', 'is_connected', 'is_token_expired', 
            'created_at', 'updated_at'
        ]
    
    def get_is_connected(self, obj):
        return obj.is_connected()
    
    def get_is_token_expired(self, obj):
        return obj.is_token_expired()


class HubSpotContactSerializer(serializers.ModelSerializer):
    """Serializer for HubSpot contact information"""
    
    class Meta:
        model = HubSpotContact
        fields = [
            'id', 'email_address', 'hubspot_contact_id', 'first_name', 
            'last_name', 'company_name', 'phone', 'sync_status', 
            'last_synced_at', 'sync_error_message', 'first_email_date',
            'last_email_date', 'total_emails_received', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'hubspot_contact_id', 'sync_status', 'last_synced_at',
            'sync_error_message', 'first_email_date', 'last_email_date',
            'total_emails_received', 'created_at', 'updated_at'
        ]


class HubSpotSyncLogSerializer(serializers.ModelSerializer):
    """Serializer for HubSpot sync log entries"""
    
    class Meta:
        model = HubSpotSyncLog
        fields = [
            'id', 'operation_type', 'status', 'contact_email', 
            'hubspot_contact_id', 'error_message', 'error_code',
            'retry_count', 'processing_duration', 'created_at'
        ]
        read_only_fields = fields


class HubSpotConnectionStatusSerializer(serializers.Serializer):
    """Serializer for HubSpot connection status"""
    
    is_connected = serializers.BooleanField()
    status = serializers.CharField()
    portal_id = serializers.CharField(allow_blank=True)
    hub_domain = serializers.CharField(allow_blank=True)
    last_sync_at = serializers.DateTimeField(allow_null=True)
    auto_sync_contacts = serializers.BooleanField()
    sync_company_data = serializers.BooleanField()


class HubSpotSyncStatsSerializer(serializers.Serializer):
    """Serializer for HubSpot synchronization statistics"""
    
    total_contacts = serializers.IntegerField()
    synced_contacts = serializers.IntegerField()
    failed_contacts = serializers.IntegerField()
    pending_contacts = serializers.IntegerField()
    last_sync = serializers.DateTimeField(allow_null=True)


class HubSpotOAuthInitSerializer(serializers.Serializer):
    """Serializer for OAuth initialization response"""
    
    authorization_url = serializers.URLField()
    state = serializers.CharField()


class HubSpotOAuthCallbackSerializer(serializers.Serializer):
    """Serializer for OAuth callback data"""
    
    code = serializers.CharField()
    state = serializers.CharField(required=False)
    error = serializers.CharField(required=False)
    error_description = serializers.CharField(required=False)
