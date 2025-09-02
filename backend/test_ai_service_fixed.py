#!/usr/bin/env python3

import os
import sys
import django

# Add the Django project directory to the Python path
django_project_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'email_automation_backend')
if django_project_path not in sys.path:
    sys.path.append(django_project_path)

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'email_automation_backend.settings')

# Setup Django
django.setup()

from Ai_processing.ai_service import AIEmailProcessor
from Accounts.models import User

def test_ai_reply_generation():
    """Test AI reply generation with various email scenarios"""
    
    print("🧪 Testing AI Reply Generation - Fixed Version")
    print("=" * 60)
    
    # Get a test user (or create one)
    try:
        user = User.objects.first()
        if not user:
            print("❌ No users found in database")
            return
    except Exception as e:
        print(f"❌ Error getting user: {e}")
        return
    
    # Initialize AI processor
    ai_processor = AIEmailProcessor(user=user)
    
    # Check if AI processing is enabled
    if not ai_processor.is_processing_enabled():
        print("❌ AI processing is not enabled for this user")
        return
    
    # Test different email scenarios
    test_cases = [
        {
            "name": "Product Inquiry",
            "subject": "Question about your software pricing",
            "body": "Hi, I'm interested in learning more about your email automation software. Could you provide pricing information and details about the features included in each plan? Thank you!",
            "sender": "potential.customer@email.com"
        },
        {
            "name": "Technical Support",
            "subject": "Issue with email sync",
            "body": "Hello, I'm having trouble with email synchronization. My emails are not showing up in the dashboard and I'm getting timeout errors. Can you help me troubleshoot this issue?",
            "sender": "user.support@company.com"
        },
        {
            "name": "Meeting Request", 
            "subject": "Schedule a demo meeting",
            "body": "Dear Team, I would like to schedule a demo meeting to see your email automation platform in action. I'm available next week on Tuesday or Wednesday afternoon. Please let me know what works best for you.",
            "sender": "business@enterprise.com"
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n📧 Test Case {i}: {test_case['name']}")
        print("-" * 40)
        print(f"From: {test_case['sender']}")
        print(f"Subject: {test_case['subject']}")
        print(f"Body: {test_case['body'][:100]}...")
        
        try:
            # Generate reply
            reply_subject, reply_body = ai_processor.generate_reply(
                test_case['subject'],
                test_case['body'],
                test_case['sender']
            )
            
            print("\n✅ AI Reply Generated:")
            print(f"Subject: {reply_subject}")
            print(f"Body: {reply_body}")
            
            # Check for fallback phrases
            fallback_phrases = [
                "Thank you for your email",
                "I've received your message", 
                "will respond soon",
                "will get back to you"
            ]
            
            is_fallback = any(phrase in reply_body for phrase in fallback_phrases)
            
            if is_fallback:
                print("⚠️  WARNING: This looks like a fallback reply!")
            else:
                print("✅ Reply appears to be AI-generated (not a fallback)")
            
        except Exception as e:
            print(f"❌ Error generating reply: {e}")
        
        print("-" * 40)
    
    print("\n🧪 AI Reply Generation Test Complete!")

if __name__ == "__main__":
    # Check environment variables
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("❌ OPENAI_API_KEY environment variable not found!")
        sys.exit(1)
    
    print(f"✅ OPENAI_API_KEY found: {api_key[:10]}...")
    
    # Run the test
    test_ai_reply_generation()
