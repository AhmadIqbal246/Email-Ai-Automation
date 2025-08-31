from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from datetime import timedelta
import uuid
import secrets
import json


class Company(models.Model):
    """Represents a company that uses the email automation system"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    domain = models.CharField(max_length=100, unique=True)  # company.com
    
    # HubSpot Integration
    hubspot_api_key = models.CharField(max_length=500, blank=True, null=True)
    
    # Company Settings
    is_active = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name_plural = "Companies"
    
    def __str__(self):
        return self.name


class User(AbstractUser):
    """Extended user model for email automation system"""
    
    class Role(models.TextChoices):
        COMPANY_ADMIN = 'company_admin', 'Company Admin'
        EMPLOYEE = 'employee', 'Employee'
    
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        INACTIVE = 'inactive', 'Inactive'
        PENDING = 'pending', 'Pending Invitation'
    
    # Core User Info
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='users', null=True, blank=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.EMPLOYEE)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)
    
    # Additional Info
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    
    # AI Settings
    ai_instructions = models.TextField(
        blank=True, 
        help_text="Custom AI instructions for email responses"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"
    
    def is_company_admin(self):
        return self.role == self.Role.COMPANY_ADMIN


class Invitation(models.Model):
    """Email invitations for employees to join company"""
    
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ACCEPTED = 'accepted', 'Accepted'
        EXPIRED = 'expired', 'Expired'
        CANCELLED = 'cancelled', 'Cancelled'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='invitations')
    invited_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_invitations')
    
    # Invitation Details
    email_address = models.EmailField()
    token = models.CharField(max_length=100, unique=True, default=secrets.token_urlsafe)
    role = models.CharField(max_length=20, choices=User.Role.choices, default=User.Role.EMPLOYEE)
    
    # Status and Timing
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(blank=True, null=True)
    accepted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='accepted_invitation')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['company', 'email_address']
    
    def __str__(self):
        return f"Invitation to {self.email_address} from {self.company.name}"
    
    def is_expired(self):
        return timezone.now() > self.expires_at
    
    def is_valid(self):
        return self.status == self.Status.PENDING and not self.is_expired()


class RefreshToken(models.Model):
    """Refresh tokens for authentication"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='refresh_tokens')
    token = models.CharField(max_length=500, unique=True, default=secrets.token_urlsafe)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Refresh token for {self.user.email}"
    
    def is_expired(self):
        return timezone.now() > self.expires_at
    
    def is_valid(self):
        return self.is_active and not self.is_expired()
    
    @classmethod
    def create_for_user(cls, user):
        """Create a new refresh token for user and deactivate old ones"""
        # Deactivate existing refresh tokens for this user
        cls.objects.filter(user=user, is_active=True).update(is_active=False)
        
        # Create new refresh token (expires in 30 days)
        return cls.objects.create(
            user=user,
            expires_at=timezone.now() + timedelta(days=30)
        )
