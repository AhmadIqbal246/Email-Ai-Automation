from rest_framework import serializers
from .models import User, Company, Invitation


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ['id', 'name', 'domain', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class UserSerializer(serializers.ModelSerializer):
    company = CompanySerializer(read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 
            'phone_number', 'role', 'status', 'company', 
            'ai_instructions', 'created_at', 'last_login'
        ]
        read_only_fields = ['id', 'created_at', 'last_login']


class InvitationSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)
    invited_by_name = serializers.SerializerMethodField()
    employee_email = serializers.CharField(source='email_address', read_only=True)
    
    class Meta:
        model = Invitation
        fields = [
            'id', 'email_address', 'role', 'status', 'company_name',
            'invited_by_name', 'employee_email',
            'expires_at', 'created_at', 'accepted_at'
        ]
        read_only_fields = ['id', 'created_at', 'accepted_at']
    
    def get_invited_by_name(self, obj):
        return f"{obj.invited_by.first_name} {obj.invited_by.last_name}"
