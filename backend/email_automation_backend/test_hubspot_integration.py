#!/usr/bin/env python
"""
Test script for HubSpot email sender sync integration.
This script tests the complete flow from email creation to HubSpot contact sync.
"""

import os
import sys
import django
from datetime import datetime
from django.utils import timezone

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'email_automation_backend.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

from User.models import EmailAccount, EmailMessage
from User.tasks import sync_email_sender_to_hubspot, extract_enhanced_sender_details
from Accounts.models import User
from Accounts.hubspot_integration.models import HubSpotAccount, HubSpotContact


def test_sender_detail_extraction():
    """Test the sender detail extraction functionality"""
    print("\n=== Testing Sender Detail Extraction ===")
    
    # Create a test user and email account
    user, created = User.objects.get_or_create(
        email='1141ahmad2m@gmail.com',
        defaults={
            'first_name': 'Test',
            'last_name': 'User',
            'is_verified': True
        }
    )
    
    email_account, created = EmailAccount.objects.get_or_create(
        user=user,
        email_address='1141ahmad2m@gmail.com',
        defaults={
            'provider': EmailAccount.Provider.GMAIL,
            'display_name': 'Test Account',
            'is_primary': True,
            'access_token': 'test_token'
        }
    )
    
    # Test different sender formats
    test_cases = [
        {
            'sender': 'John Doe <john.doe@acmecorp.com>',
            'subject': 'Meeting Request',
            'body_plain': '''Hi there,

I hope this email finds you well. I wanted to reach out regarding our upcoming project.

Best regards,
John Doe
Senior Manager
Acme Corporation
Phone: +1 (555) 123-4567
Website: https://www.acmecorp.com
john.doe@acmecorp.com''',
            'expected': {
                'email': 'john.doe@acmecorp.com',
                'first_name': 'John',
                'last_name': 'Doe',
                'company': 'Acmecorp',
                'phone': '+1 (555) 123-4567',
                'job_title': 'Senior Manager',
                'website': 'https://www.acmecorp.com'
            }
        },
        {
            'sender': 'jane.smith@techstartup.io',
            'subject': 'Partnership Proposal',
            'body_plain': '''Hello,

I'm Jane Smith, CTO at TechStartup Inc. 

We're interested in exploring a partnership opportunity.

Jane Smith
Chief Technology Officer
TechStartup Inc.
Mobile: (555) 987-6543
www.techstartup.io''',
            'expected': {
                'email': 'jane.smith@techstartup.io',
                'first_name': '',
                'last_name': '',
                'company': 'Techstartup',
                'phone': '(555) 987-6543',
                'job_title': 'Chief Technology Officer',
                'website': 'https://www.techstartup.io'
            }
        },
        {
            'sender': 'support@gmail.com',
            'subject': 'Account Update',
            'body_plain': 'This is a simple email without signature',
            'expected': {
                'email': 'support@gmail.com',
                'first_name': '',
                'last_name': '',
                'company': '',  # Gmail is a common provider, should be skipped
                'phone': '',
                'job_title': '',
                'website': ''
            }
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\nTest Case {i}: {test_case['sender']}")
        
        # Create a test email message
        email_message = EmailMessage.objects.create(
            email_account=email_account,
            gmail_message_id=f'test_message_{i}_{int(timezone.now().timestamp())}',
            gmail_thread_id=f'thread_{i}',
            subject=test_case['subject'],
            sender=test_case['sender'],
            recipients='["test@example.com"]',
            body_plain=test_case['body_plain'],
            received_at=timezone.now(),
            has_attachments=False
        )
        
        # Extract sender details
        sender_details = extract_enhanced_sender_details(email_message)
        
        print(f"  Extracted: {sender_details}")
        
        # Verify key fields
        expected = test_case['expected']
        for key, expected_value in expected.items():
            actual_value = sender_details.get(key, '')
            if key in ['phone', 'website']:
                # For phone and website, check if we found something (might be formatted differently)
                status = "✓" if (actual_value and expected_value) or (not actual_value and not expected_value) else "✗"
            else:
                status = "✓" if actual_value == expected_value else "✗"
            
            print(f"    {key}: {actual_value} {status}")
        
        # Clean up
        email_message.delete()
    
    print("\n=== Sender Detail Extraction Test Complete ===")


def test_hubspot_sync():
    """Test the HubSpot sync functionality"""
    print("\n=== Testing HubSpot Sync ===")
    
    # Check if user has HubSpot connected
    try:
        user = User.objects.get(email='1141ahmad2m@gmail.com')
        hubspot_account = user.hubspot_account
        
        if not hubspot_account.is_connected():
            print("❌ HubSpot account not connected. Please connect HubSpot first.")
            return
        
        print(f"✓ HubSpot account connected: {hubspot_account.portal_id}")
        
        # Get or create email account
        email_account = user.email_accounts.first()
        if not email_account:
            print("❌ No email account found for user")
            return
        
        # Create a test email with rich sender information
        test_sender = 'Alice Johnson <alice.johnson@innovatetech.com>'
        test_body = '''Dear Team,

I hope this message finds you well. I'm reaching out to discuss potential collaboration opportunities.

Best regards,
Alice Johnson
VP of Business Development
InnovateTech Solutions LLC
Direct: +1 (555) 234-5678
Website: https://www.innovatetech.com
alice.johnson@innovatetech.com

InnovateTech Solutions LLC
Innovation Drive, Tech Valley, CA 95014'''
        
        email_message = EmailMessage.objects.create(
            email_account=email_account,
            gmail_message_id=f'hubspot_test_{int(timezone.now().timestamp())}',
            gmail_thread_id='hubspot_test_thread',
            subject='Partnership Discussion - Test Email',
            sender=test_sender,
            recipients='["1141ahmad2m@gmail.com"]',
            body_plain=test_body,
            received_at=timezone.now(),
            has_attachments=False
        )
        
        print(f"✓ Created test email: {email_message.id}")
        print(f"  Subject: {email_message.subject}")
        print(f"  Sender: {email_message.sender}")
        
        # Test the sync task
        print("\n  Running HubSpot sync task...")
        result = sync_email_sender_to_hubspot(str(email_message.id))
        
        print(f"  Sync Result: {result}")
        
        if result.get('status') == 'success':
            print("✓ HubSpot sync completed successfully!")
            
            # Check if contact was created in local database
            hubspot_contacts = HubSpotContact.objects.filter(
                hubspot_account=hubspot_account,
                email_address='alice.johnson@innovatetech.com'
            )
            
            if hubspot_contacts.exists():
                contact = hubspot_contacts.first()
                print(f"✓ Contact created in local database:")
                print(f"    Name: {contact.first_name} {contact.last_name}")
                print(f"    Company: {contact.company_name}")
                print(f"    Phone: {contact.phone}")
                print(f"    Job Title: {contact.job_title}")
                print(f"    Website: {contact.website}")
                print(f"    HubSpot ID: {contact.hubspot_contact_id}")
                print(f"    Sync Status: {contact.sync_status}")
                print(f"    Total Emails: {contact.total_emails_received}")
            
        elif result.get('status') == 'skipped':
            print(f"ℹ️  Sync skipped: {result.get('message')}")
        else:
            print(f"❌ Sync failed: {result.get('message')}")
        
        # Clean up test email
        email_message.delete()
        print("\n✓ Test cleanup completed")
        
    except User.DoesNotExist:
        print("❌ Test user not found. Please ensure user exists.")
    except Exception as e:
        print(f"❌ Error during HubSpot sync test: {str(e)}")
    
    print("\n=== HubSpot Sync Test Complete ===")


def show_hubspot_contacts():
    """Show current HubSpot contacts in the system"""
    print("\n=== Current HubSpot Contacts ===")
    
    try:
        user = User.objects.get(email='1141ahmad2m@gmail.com')
        hubspot_account = user.hubspot_account
        
        contacts = HubSpotContact.objects.filter(hubspot_account=hubspot_account).order_by('-created_at')
        
        print(f"Total contacts: {contacts.count()}")
        
        for i, contact in enumerate(contacts[:10], 1):  # Show first 10
            print(f"\n{i}. {contact.email_address}")
            print(f"   Name: {contact.first_name} {contact.last_name}")
            print(f"   Company: {contact.company_name}")
            print(f"   Phone: {contact.phone}")
            print(f"   Job Title: {contact.job_title}")
            print(f"   Website: {contact.website}")
            print(f"   HubSpot ID: {contact.hubspot_contact_id}")
            print(f"   Status: {contact.sync_status}")
            print(f"   Emails Received: {contact.total_emails_received}")
            print(f"   Last Email: {contact.last_email_date}")
            print(f"   Created: {contact.created_at}")
        
        if contacts.count() > 10:
            print(f"\n... and {contacts.count() - 10} more contacts")
            
    except User.DoesNotExist:
        print("❌ Test user not found")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
    
    print("\n=== End HubSpot Contacts ===")


if __name__ == '__main__':
    print("🚀 Starting HubSpot Integration Tests")
    
    # Test 1: Sender detail extraction
    test_sender_detail_extraction()
    
    # Test 2: HubSpot sync functionality
    test_hubspot_sync()
    
    # Show current contacts
    show_hubspot_contacts()
    
    print("\n🎉 All tests completed!")
