from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.views import APIView

import uuid

from .models import User, Company, Invitation, RefreshToken
from .serializers import UserSerializer, CompanySerializer, InvitationSerializer


class CompanySignupView(APIView):
    """Company admin registration"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            data = request.data
            
            # Check if user with this email already exists
            if User.objects.filter(email=data['email']).exists():
                return Response({
                    'message': 'An account with this email already exists'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if company domain already exists
            if Company.objects.filter(domain=data['companyDomain']).exists():
                return Response({
                    'message': 'A company with this domain already exists'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create company
            company = Company.objects.create(
                name=data['companyName'],
                domain=data['companyDomain'],
                hubspot_api_key=data.get('hubspotApiKey', '')
            )
            
            # Generate unique username from email (in case email is reused as username)
            username = data['email']
            if User.objects.filter(username=username).exists():
                username = f"{data['email']}_{str(uuid.uuid4())[:8]}"
            
            # Create admin user
            user = User.objects.create_user(
                username=username,
                email=data['email'],
                password=data['password'],
                first_name=data['firstName'],
                last_name=data['lastName'],
                phone_number=data.get('phoneNumber', ''),
                company=company,
                role=User.Role.COMPANY_ADMIN,
                status=User.Status.ACTIVE
            )
            
            # Generate auth token
            token, created = Token.objects.get_or_create(user=user)
            
            return Response({
                'message': 'Company and admin account created successfully',
                'token': token.key,
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                'message': f'Registration failed: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class EmployeeSignupView(APIView):
    """Employee registration via invitation token"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            data = request.data
            token = data.get('token')
            
            # Verify invitation token
            try:
                invitation = Invitation.objects.get(
                    token=token,
                    status=Invitation.Status.PENDING
                )
                
                if invitation.is_expired():
                    return Response({
                        'message': 'Invitation has expired'
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
            except Invitation.DoesNotExist:
                return Response({
                    'message': 'Invalid invitation token'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create employee user
            user = User.objects.create_user(
                username=data['username'],
                email=invitation.email_address,
                password=data['password'],
                first_name=data['firstName'],
                last_name=data['lastName'],
                phone_number=data.get('phoneNumber', ''),
                company=invitation.company,
                role=invitation.role,
                status=User.Status.ACTIVE
            )
            
            # Mark invitation as accepted
            invitation.status = Invitation.Status.ACCEPTED
            invitation.accepted_at = timezone.now()
            invitation.accepted_by = user
            invitation.save()
            
            # Generate auth token
            token, created = Token.objects.get_or_create(user=user)
            
            return Response({
                'message': 'Account created successfully',
                'token': token.key,
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                'message': f'Registration failed: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    """User login"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            email = request.data.get('email')
            password = request.data.get('password')
            
            # Find user by email
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                return Response({
                    'message': 'Invalid credentials'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Authenticate
            user = authenticate(username=user.username, password=password)
            if user:
                # Get or create access token
                token, created = Token.objects.get_or_create(user=user)
                
                # Create refresh token
                refresh_token = RefreshToken.create_for_user(user)
                
                return Response({
                    'message': 'Login successful',
                    'token': token.key,
                    'refresh_token': refresh_token.token,
                    'user': UserSerializer(user).data
                })
            else:
                return Response({
                    'message': 'Invalid credentials'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'message': f'Login failed: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class VerifyInvitationView(APIView):
    """Verify invitation token and return invitation details"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            token = request.data.get('token')
            
            try:
                invitation = Invitation.objects.select_related('company').get(
                    token=token,
                    status=Invitation.Status.PENDING
                )
                
                if invitation.is_expired():
                    return Response({
                        'message': 'Invitation has expired'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                return Response({
                    'message': 'Valid invitation',
                    'invitation': {
                        'email_address': invitation.email_address,
                        'company_name': invitation.company.name,
                        'role': invitation.role,
                        'expires_at': invitation.expires_at
                    }
                })
                
            except Invitation.DoesNotExist:
                return Response({
                    'message': 'Invalid invitation token'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'message': f'Verification failed: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class RefreshTokenView(APIView):
    """Refresh access token using refresh token"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            refresh_token_value = request.data.get('refresh_token')
            
            if not refresh_token_value:
                return Response({
                    'message': 'Refresh token required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                refresh_token = RefreshToken.objects.get(
                    token=refresh_token_value,
                    is_active=True
                )
                
                if refresh_token.is_expired():
                    refresh_token.is_active = False
                    refresh_token.save()
                    return Response({
                        'message': 'Refresh token expired'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Generate new access token
                access_token, created = Token.objects.get_or_create(user=refresh_token.user)
                
                # Optionally create new refresh token (rotate refresh tokens)
                new_refresh_token = RefreshToken.create_for_user(refresh_token.user)
                
                return Response({
                    'message': 'Token refreshed successfully',
                    'token': access_token.key,
                    'refresh_token': new_refresh_token.token,
                    'user': UserSerializer(refresh_token.user).data
                })
                
            except RefreshToken.DoesNotExist:
                return Response({
                    'message': 'Invalid refresh token'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'message': f'Token refresh failed: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    """Logout user and invalidate tokens"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            # Invalidate access token
            try:
                token = Token.objects.get(user=request.user)
                token.delete()
            except Token.DoesNotExist:
                pass
            
            # Invalidate all refresh tokens for this user
            RefreshToken.objects.filter(user=request.user, is_active=True).update(is_active=False)
            
            return Response({
                'message': 'Logout successful'
            })
            
        except Exception as e:
            return Response({
                'message': f'Logout failed: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class VerifyAuthView(APIView):
    """Verify authentication token and return user data"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        return Response({
            'user': UserSerializer(request.user).data
        })


class SendInvitationView(APIView):
    """Send invitation email (Admin only)"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            # Check if user is admin
            if not request.user.is_company_admin():
                return Response({
                    'message': 'Permission denied. Only company admins can send invitations.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            email_address = request.data.get('email_address')
            
            # Check if invitation already exists
            existing_invitation = Invitation.objects.filter(
                company=request.user.company,
                email_address=email_address,
                status=Invitation.Status.PENDING
            ).first()
            
            if existing_invitation and not existing_invitation.is_expired():
                return Response({
                    'message': 'Invitation already sent to this email'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create new invitation
            invitation = Invitation.objects.create(
                company=request.user.company,
                invited_by=request.user,
                email_address=email_address,
                expires_at=timezone.now() + timedelta(days=7)
            )
            
            # Send invitation email
            invitation_url = f"{settings.FRONTEND_URL}/signup/employee?token={invitation.token}"
            
            email_subject = f"Invitation to join {request.user.company.name} - AI Email Automation"
            email_body = f"""
Hi there!

You've been invited to join {request.user.company.name}'s AI Email Automation system.

{request.user.first_name} {request.user.last_name} has invited you to be part of their team.

Click the link below to create your account:
{invitation_url}

This invitation will expire in 7 days.

Best regards,
AI Email Automation Team
            """
            
            try:
                send_mail(
                    subject=email_subject,
                    message=email_body,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[email_address],
                    fail_silently=False
                )
            except Exception as email_error:
                # Log the email error but don't fail the invitation creation
                print(f"Failed to send invitation email: {email_error}")
                # You might want to log this to a proper logging system
            
            return Response({
                'message': f'Invitation created successfully for {email_address}. Check console for email status.',
                'invitation': InvitationSerializer(invitation).data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                'message': f'Failed to send invitation: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class GetEmployeesView(APIView):
    """Get all employees for company admin"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            if not request.user.is_company_admin():
                return Response({
                    'message': 'Permission denied'
                }, status=status.HTTP_403_FORBIDDEN)
            
            employees = User.objects.filter(
                company=request.user.company,
                role=User.Role.EMPLOYEE
            ).select_related('company')
            
            return Response({
                'employees': UserSerializer(employees, many=True).data
            })
            
        except Exception as e:
            return Response({
                'message': f'Failed to fetch employees: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class GetInvitationsView(APIView):
    """Get all invitations for company admin"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            if not request.user.is_company_admin():
                return Response({
                    'message': 'Permission denied'
                }, status=status.HTTP_403_FORBIDDEN)
            
            invitations = Invitation.objects.filter(
                company=request.user.company
            ).select_related('company', 'invited_by')
            
            return Response({
                'invitations': InvitationSerializer(invitations, many=True).data
            })
            
        except Exception as e:
            return Response({
                'message': f'Failed to fetch invitations: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class ResendInvitationView(APIView):
    """Resend invitation email"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, invitation_id):
        try:
            if not request.user.is_company_admin():
                return Response({
                    'message': 'Permission denied. Only company admins can resend invitations.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            try:
                invitation = Invitation.objects.get(
                    id=invitation_id,
                    company=request.user.company
                )
            except Invitation.DoesNotExist:
                return Response({
                    'message': 'Invitation not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            if invitation.status != Invitation.Status.PENDING:
                return Response({
                    'message': 'Can only resend pending invitations'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if invitation.is_expired():
                return Response({
                    'message': 'Cannot resend expired invitation'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Send invitation email
            invitation_url = f"{settings.FRONTEND_URL}/signup/employee?token={invitation.token}"
            
            email_subject = f"Invitation to join {request.user.company.name} - AI Email Automation"
            email_body = f"""
Hi there!

You've been invited to join {request.user.company.name}'s AI Email Automation system.

{request.user.first_name} {request.user.last_name} has invited you to be part of their team.

Click the link below to create your account:
{invitation_url}

This invitation will expire in 7 days.

Best regards,
AI Email Automation Team
            """
            
            send_mail(
                subject=email_subject,
                message=email_body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[invitation.email_address],
                fail_silently=False
            )
            
            return Response({
                'message': f'Invitation resent successfully to {invitation.email_address}'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'message': f'Failed to resend invitation: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
