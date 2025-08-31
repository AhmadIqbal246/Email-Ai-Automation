from rest_framework import serializers
from .models import EmailAccount


class EmailAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailAccount
        fields = [
            'id', 'email_address', 'provider', 'display_name', 
            'is_primary', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
