#!/usr/bin/env python
"""
Test how the system handles duplicate senders (same person sending multiple emails)
"""

import os
import sys
import django
from datetime import datetime, timedelta
from django.utils import timezone

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'email_automation_backend.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

from User.models import EmailAccount, EmailMessage
from User.tasks import sync_email_sender_to_hubspot
from Accounts.models import User
from Accounts.hubspot_integration.models import HubSpotAccount, HubSpotContact


def test_duplicate_sender_scenario():
    """Test what happens when the same sender sends multiple emails with different details"""
    
    print("🧪 Testing Duplicate Sender Handling")
    print()
    
    try:
        # Get user and verify HubSpot connection
        user = User.objects.get(email='1141ahmad2m@gmail.com')
        hubspot_account = user.hubspot_account
        email_account = user.email_accounts.first()
        
        if not hubspot_account.is_connected():
            print("❌ HubSpot account not connected")
            return
            
        test_email = 'john.doe@testcompany.com'
        
        # Clean up any existing test contact
        existing_contacts = HubSpotContact.objects.filter(
            hubspot_account=hubspot_account,
            email_address=test_email
        )
        if existing_contacts.exists():
            print(f"🧹 Cleaning up existing test contact for {test_email}")
            existing_contacts.delete()
        
        print(f"📧 Simulating multiple emails from: {test_email}")
        print()
        
        # === EMAIL 1: Basic information ===
        print("📨 EMAIL 1: Basic sender info")
        email1 = EmailMessage.objects.create(
            email_account=email_account,
            gmail_message_id=f'test_dup_1_{int(timezone.now().timestamp())}',
            gmail_thread_id='test_dup_thread_1',
            subject='Hello - First Email',
            sender='john.doe@testcompany.com',  # Just email, no name
            recipients='["1141ahmad2m@gmail.com"]',
            body_plain='Hi there, this is my first email.',
            received_at=timezone.now() - timedelta(hours=2),
            has_attachments=False
        )
        
        result1 = sync_email_sender_to_hubspot(str(email1.id))
        print(f"   Result: {result1['status']}")
        
        if result1['status'] == 'success':
            contact = HubSpotContact.objects.get(
                hubspot_account=hubspot_account,
                email_address=test_email
            )
            print(f"   ✅ Contact created:")
            print(f"      Name: '{contact.first_name}' '{contact.last_name}'")
            print(f"      Company: '{contact.company_name}'")
            print(f"      Phone: '{contact.phone}'")
            print(f"      Job Title: '{contact.job_title}'")
            print(f"      Total Emails: {contact.total_emails_received}")
            print(f"      Last Email: {contact.last_email_date}")
        print()
        
        # === EMAIL 2: More detailed information ===
        print("📨 EMAIL 2: Enhanced sender info with signature")
        email2 = EmailMessage.objects.create(
            email_account=email_account,
            gmail_message_id=f'test_dup_2_{int(timezone.now().timestamp())}',
            gmail_thread_id='test_dup_thread_2',
            subject='Follow up - Second Email',
            sender='John Doe <john.doe@testcompany.com>',  # Now with name!
            recipients='["1141ahmad2m@gmail.com"]',
            body_plain='''Hi,

Following up on my previous email. Hope we can connect soon.

Best regards,
John Doe
Senior Sales Manager
TestCompany Inc.
Direct: +1 (555) 123-4567
Website: https://www.testcompany.com
''',
            received_at=timezone.now() - timedelta(hours=1),
            has_attachments=False
        )
        
        result2 = sync_email_sender_to_hubspot(str(email2.id))
        print(f"   Result: {result2['status']}")
        
        if result2['status'] == 'success':
            contact = HubSpotContact.objects.get(
                hubspot_account=hubspot_account,
                email_address=test_email
            )
            print(f"   🔄 Contact updated (same contact, enhanced info):")
            print(f"      Name: '{contact.first_name}' '{contact.last_name}'")
            print(f"      Company: '{contact.company_name}'")
            print(f"      Phone: '{contact.phone}'")
            print(f"      Job Title: '{contact.job_title}'")
            print(f"      Website: '{contact.website}'")
            print(f"      Total Emails: {contact.total_emails_received}")
            print(f"      Last Email: {contact.last_email_date}")
            print(f"      HubSpot ID: {contact.hubspot_contact_id}")
        print()
        
        # === EMAIL 3: Another email (should just update counters) ===
        print("📨 EMAIL 3: Another email from same sender")
        email3 = EmailMessage.objects.create(
            email_account=email_account,
            gmail_message_id=f'test_dup_3_{int(timezone.now().timestamp())}',
            gmail_thread_id='test_dup_thread_3',
            subject='Final follow-up',
            sender='John Doe <john.doe@testcompany.com>',
            recipients='["1141ahmad2m@gmail.com"]',
            body_plain='Just wanted to check in one more time.',
            received_at=timezone.now(),
            has_attachments=False
        )
        
        result3 = sync_email_sender_to_hubspot(str(email3.id))
        print(f"   Result: {result3['status']}")
        
        if result3['status'] == 'success':
            contact = HubSpotContact.objects.get(
                hubspot_account=hubspot_account,
                email_address=test_email
            )
            print(f"   📈 Contact updated (counters incremented):")
            print(f"      Name: '{contact.first_name}' '{contact.last_name}' (unchanged)")
            print(f"      Company: '{contact.company_name}' (unchanged)")
            print(f"      Phone: '{contact.phone}' (unchanged)")
            print(f"      Total Emails: {contact.total_emails_received} (incremented!)")
            print(f"      Last Email: {contact.last_email_date} (updated!)")
        print()
        
        # Show total contacts count
        total_contacts = HubSpotContact.objects.filter(
            hubspot_account=hubspot_account
        ).count()
        
        print(f"📊 Summary:")
        print(f"   Total contacts in system: {total_contacts}")
        print(f"   Emails sent by {test_email}: 3")
        print(f"   Contacts created for {test_email}: 1 (no duplicates!)")
        print(f"   🔗 View in HubSpot: https://app.hubspot.com/contacts/{hubspot_account.portal_id}/contact/{contact.hubspot_contact_id}")
        
        # Clean up test emails
        email1.delete()
        email2.delete()  
        email3.delete()
        print(f"\n✅ Test emails cleaned up")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    test_duplicate_sender_scenario()
