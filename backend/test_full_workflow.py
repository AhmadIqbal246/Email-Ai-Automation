#!/usr/bin/env python3
"""
Full workflow test - simulating exactly what the frontend does
"""
import os
import sys
import django

# Add the Django project to the path
sys.path.insert(0, 'email_automation_backend')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'email_automation_backend.settings')
django.setup()

# Now import Django models and services
from Accounts.models import User
from User.models import EmailMessage, EmailAccount
from Ai_processing.models import AIProcessingSettings
from Ai_processing.ai_service import AIEmailProcessor
from django.contrib.auth import get_user_model

def test_full_ai_workflow():
    """Test the complete AI workflow as used by frontend"""
    print("🧪 Testing Full AI Workflow (Frontend Simulation)")
    print("=" * 60)
    
    # Step 1: Check if we have users
    User = get_user_model()
    users = User.objects.all()
    
    if not users.exists():
        print("❌ No users found in database. Creating test user...")
        user = User.objects.create_user(
            email="test@example.com",
            first_name="Test",
            last_name="User",
            password="testpass123"
        )
        print("✅ Created test user")
    else:
        user = users.first()
        print(f"✅ Using existing user: {user.email}")
    
    # Step 2: Check/Create AI Settings
    ai_settings, created = AIProcessingSettings.objects.get_or_create(
        user=user,
        defaults={
            'is_enabled': True,
            'auto_reply_enabled': True,
            'default_prompt': """
            You are a professional and helpful email assistant. 
            Analyze the incoming email and generate an appropriate response.
            Be concise, helpful, and maintain a professional tone.
            """,
            'max_response_length': 500,
            'response_tone': 'professional'
        }
    )
    
    if created:
        print("✅ Created AI settings for user")
    else:
        print("✅ Using existing AI settings")
    
    print(f"   - AI Enabled: {ai_settings.is_enabled}")
    print(f"   - Auto Reply: {ai_settings.auto_reply_enabled}")
    print(f"   - Prompt: {ai_settings.default_prompt[:50]}...")
    
    # Step 3: Create/Get test email account
    email_account, created = EmailAccount.objects.get_or_create(
        user=user,
        email_address="test@example.com",
        defaults={
            'provider': 'gmail',
            'display_name': 'Test Account',
            'is_primary': True,
            'is_active': True,
            'access_token': 'test_token',
        }
    )
    
    if created:
        print("✅ Created test email account")
    else:
        print("✅ Using existing email account")
    
    # Step 4: Create test email message
    test_email = EmailMessage.objects.create(
        email_account=email_account,
        gmail_message_id="test_msg_123",
        gmail_thread_id="test_thread_123",
        subject="I want company info",
        sender="1141ahmad2m@gmail.com",
        recipients="ahmadiqbalhsp@gmail.com",
        body_plain="""
        i have heard about your company on linked in and i have seen your post..
        can you share more details about your company. i am seeking opportunities
        as junior developer inform me if there is any job at your company
        """,
        received_at="2025-09-01T20:00:00Z",
        is_read=False
    )
    
    print(f"✅ Created test email: {test_email.subject}")
    
    # Step 5: Test AI Processor (this is what GenerateReplyView does)
    print("\n🤖 Testing AI Email Processor...")
    
    try:
        ai_processor = AIEmailProcessor(user=user)
        print("✅ AI Processor initialized")
        
        # Check if AI processing is enabled
        if not ai_processor.is_processing_enabled():
            print("❌ AI processing is disabled for this user")
            return False
        
        print("✅ AI processing is enabled")
        
        # Process email with AI (this is the exact call GenerateReplyView makes)
        result = ai_processor.process_email_with_ai(test_email, 'reply_generation')
        
        print(f"\n📧 Processing Result:")
        print(f"   Status: {result.get('status', 'unknown')}")
        
        if result.get('status') == 'success':
            print("✅ AI processing successful!")
            
            # Check analysis
            if 'analysis' in result:
                analysis = result['analysis']
                print(f"   📊 Analysis Summary: {analysis.get('summary', 'N/A')}")
                print(f"   😊 Sentiment: {analysis.get('sentiment', 'N/A')}")
                print(f"   📂 Category: {analysis.get('category', 'N/A')}")
            
            # Check reply generation
            if 'generated_reply' in result:
                reply = result['generated_reply']
                print(f"   📝 Generated Reply Subject: {reply.get('subject', 'N/A')}")
                print(f"   📄 Generated Reply Body:")
                print("   " + "="*50)
                print(f"   {reply.get('body', 'N/A')}")
                print("   " + "="*50)
                
                # Check if it's the fallback message
                reply_body = reply.get('body', '')
                if "Thank you for your email" in reply_body and "will respond soon" in reply_body:
                    print("❌ WARNING: AI returned fallback message! API might not be working in Django context.")
                    return False
                else:
                    print("✅ AI generated a custom response (not fallback)!")
                    return True
            else:
                print("❌ No generated reply in result")
                return False
        else:
            print(f"❌ AI processing failed: {result.get('error', 'Unknown error')}")
            return False
            
    except Exception as e:
        print(f"❌ AI Processor test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        # Cleanup test email
        test_email.delete()
        print("🧹 Cleaned up test email")

def main():
    print("🔍 Full AI Workflow Test (Simulating Frontend)")
    print("This test simulates exactly what happens when you click 'Generate AI Reply'")
    print()
    
    try:
        success = test_full_ai_workflow()
        
        if success:
            print("\n✅ CONCLUSION: AI workflow is working! The issue might be in frontend.")
            print("💡 Check browser console for errors when clicking 'Generate AI Reply'")
        else:
            print("\n❌ CONCLUSION: AI workflow has issues in Django context.")
            print("💡 Check Django logs and API key configuration.")
            
    except Exception as e:
        print(f"\n❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
