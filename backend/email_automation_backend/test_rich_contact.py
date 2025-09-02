#!/usr/bin/env python
"""
Comprehensive test to create a rich HubSpot contact with detailed information
that will be visible in the HubSpot contacts section.
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
from User.tasks import sync_email_sender_to_hubspot
from Accounts.models import User
from Accounts.hubspot_integration.models import HubSpotAccount, HubSpotContact


def create_rich_hubspot_contact():
    """Create a contact with comprehensive details that will show up nicely in HubSpot"""
    
    print("🚀 Creating Rich HubSpot Contact Test")
    
    try:
        # Get the user and verify HubSpot connection
        user = User.objects.get(email='1141ahmad2m@gmail.com')
        hubspot_account = user.hubspot_account
        
        if not hubspot_account.is_connected():
            print("❌ HubSpot account not connected.")
            return
        
        print(f"✅ HubSpot account connected: Portal {hubspot_account.portal_id}")
        
        # Get email account
        email_account = user.email_accounts.first()
        if not email_account:
            print("❌ No email account found")
            return
        
        # Create a test email with very rich sender information
        rich_sender = 'Sarah Martinez <sarah.martinez@techcorp.solutions>'
        rich_email_body = '''Hello,

I hope this email finds you well. I'm reaching out regarding a potential collaboration opportunity between our companies.

As discussed in our previous conversation, I believe there's significant value in exploring a strategic partnership.

I would love to schedule a brief call to discuss this further. Please let me know your availability for next week.

Best regards,

Sarah Martinez
Chief Marketing Officer
TechCorp Solutions Inc.
Direct: +1 (555) 789-0123
Mobile: +1 (555) 789-0124
Email: sarah.martinez@techcorp.solutions
Website: https://www.techcorp.solutions
LinkedIn: linkedin.com/in/sarahmartinez

TechCorp Solutions Inc.
Innovation Hub, Floor 15
1234 Technology Drive
San Francisco, CA 94105

This email and any attachments are confidential and may be legally privileged.'''
        
        # Clean up any existing contact first
        existing_contacts = HubSpotContact.objects.filter(
            hubspot_account=hubspot_account,
            email_address='sarah.martinez@techcorp.solutions'
        )
        if existing_contacts.exists():
            print("🧹 Cleaning up existing test contact...")
            existing_contacts.delete()
        
        # Create the test email
        timestamp = int(timezone.now().timestamp())
        email_message = EmailMessage.objects.create(
            email_account=email_account,
            gmail_message_id=f'rich_test_{timestamp}',
            gmail_thread_id=f'rich_thread_{timestamp}',
            subject='Strategic Partnership Opportunity - TechCorp Solutions',
            sender=rich_sender,
            recipients='["1141ahmad2m@gmail.com"]',
            body_plain=rich_email_body,
            received_at=timezone.now(),
            has_attachments=False
        )
        
        print(f"📧 Created rich test email:")
        print(f"   Subject: {email_message.subject}")
        print(f"   Sender: {email_message.sender}")
        print(f"   Email ID: {email_message.id}")
        
        # Run the HubSpot sync
        print(f"\n🔄 Syncing to HubSpot...")
        result = sync_email_sender_to_hubspot(str(email_message.id))
        
        print(f"📊 Sync Result: {result['status'].upper()}")
        
        if result.get('status') == 'success':
            hubspot_contact_id = result.get('hubspot_contact_id')
            sender_details = result.get('sender_details')
            
            print(f"✅ SUCCESS! Contact created in HubSpot")
            print(f"🆔 HubSpot Contact ID: {hubspot_contact_id}")
            print(f"📧 Email: {sender_details['email']}")
            print(f"👤 Name: {sender_details['first_name']} {sender_details['last_name']}")
            print(f"🏢 Company: {sender_details['company']}")
            print(f"📞 Phone: {sender_details['phone']}")
            print(f"🌐 Website: {sender_details['website']}")
            
            # Get the local contact record
            local_contact = HubSpotContact.objects.get(
                hubspot_account=hubspot_account,
                email_address=sender_details['email']
            )
            
            print(f"\n📋 Local Contact Details:")
            print(f"   Name: {local_contact.first_name} {local_contact.last_name}")
            print(f"   Company: {local_contact.company_name}")
            print(f"   Phone: {local_contact.phone}")
            print(f"   Job Title: {local_contact.job_title}")
            print(f"   Website: {local_contact.website}")
            print(f"   Sync Status: {local_contact.sync_status}")
            print(f"   Total Emails: {local_contact.total_emails_received}")
            print(f"   Last Email: {local_contact.last_email_date}")
            
            # Provide instructions for viewing in HubSpot
            print(f"\n🎯 TO VIEW IN HUBSPOT:")
            print(f"1. Go to: https://app.hubspot.com/contacts/{hubspot_account.portal_id}/contact/{hubspot_contact_id}")
            print(f"2. Or search for 'sarah.martinez@techcorp.solutions' in your HubSpot contacts")
            print(f"3. You should see:")
            print(f"   ✓ First Name: Sarah")
            print(f"   ✓ Last Name: Martinez") 
            print(f"   ✓ Email: sarah.martinez@techcorp.solutions")
            print(f"   ✓ Company: Techcorp")
            print(f"   ✓ Phone: +1 (555) 789-0123")
            print(f"   ✓ Website: https://www.techcorp.solutions")
            print(f"   ✓ Lead Status: NEW")
            print(f"   ✓ Lifecycle Stage: Lead")
            print(f"   ✓ Source: EMAIL_AUTOMATION")
            
        else:
            print(f"❌ FAILED: {result.get('message')}")
        
        # Clean up
        email_message.delete()
        print(f"\n✅ Test email cleaned up")
        
    except User.DoesNotExist:
        print("❌ User not found")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
    
    print(f"\n🏁 Rich Contact Test Complete!")


def show_all_contacts_in_hubspot():
    """Show all contacts currently synced to HubSpot"""
    print(f"\n📊 Current HubSpot Contacts Summary")
    
    try:
        user = User.objects.get(email='1141ahmad2m@gmail.com')
        hubspot_account = user.hubspot_account
        
        contacts = HubSpotContact.objects.filter(
            hubspot_account=hubspot_account
        ).order_by('-created_at')
        
        print(f"Total contacts in system: {contacts.count()}")
        
        for i, contact in enumerate(contacts, 1):
            print(f"\n{i}. 📧 {contact.email_address}")
            print(f"   👤 {contact.first_name} {contact.last_name}")
            if contact.company_name:
                print(f"   🏢 {contact.company_name}")
            if contact.phone:
                print(f"   📞 {contact.phone}")
            if contact.website:
                print(f"   🌐 {contact.website}")
            if contact.job_title:
                print(f"   💼 {contact.job_title}")
            print(f"   🔄 Status: {contact.sync_status}")
            if contact.hubspot_contact_id:
                print(f"   🆔 HubSpot ID: {contact.hubspot_contact_id}")
                print(f"   🔗 HubSpot URL: https://app.hubspot.com/contacts/{hubspot_account.portal_id}/contact/{contact.hubspot_contact_id}")
            print(f"   📈 Total Emails: {contact.total_emails_received}")
            print(f"   📅 Last Email: {contact.last_email_date}")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")


if __name__ == '__main__':
    # Run the rich contact test
    create_rich_hubspot_contact()
    
    # Show summary
    show_all_contacts_in_hubspot()
