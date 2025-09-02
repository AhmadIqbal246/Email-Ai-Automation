#!/usr/bin/env python3
"""
Test script to validate OpenAI/OpenRouter API key
"""
import os
import requests
import json
from openai import OpenAI

def test_openai_direct():
    """Test direct OpenAI API"""
    print("🧪 Testing Direct OpenAI API...")
    api_key = os.environ.get('OPENAI_API_KEY')
    
    if not api_key:
        print("❌ No OPENAI_API_KEY found in environment")
        return False
        
    # Test with direct OpenAI endpoint
    try:
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Say 'API test successful'"}],
            max_tokens=20
        )
        print("✅ Direct OpenAI API works!")
        print(f"Response: {response.choices[0].message.content}")
        return True
    except Exception as e:
        print(f"❌ Direct OpenAI API failed: {str(e)}")
        return False

def test_openrouter_api():
    """Test OpenRouter API"""
    print("\n🧪 Testing OpenRouter API...")
    api_key = os.environ.get('OPENAI_API_KEY')
    
    if not api_key:
        print("❌ No OPENAI_API_KEY found in environment")
        return False
        
    # Test with OpenRouter endpoint
    try:
        client = OpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1",
        )
        response = client.chat.completions.create(
            model="openai/gpt-4o-mini",
            messages=[{"role": "user", "content": "Say 'OpenRouter test successful'"}],
            max_tokens=20
        )
        print("✅ OpenRouter API works!")
        print(f"Response: {response.choices[0].message.content}")
        return True
    except Exception as e:
        print(f"❌ OpenRouter API failed: {str(e)}")
        return False

def test_manual_request():
    """Test with manual HTTP request"""
    print("\n🧪 Testing Manual HTTP Request...")
    api_key = os.environ.get('OPENAI_API_KEY')
    
    try:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        
        data = {
            "model": "openai/gpt-4o-mini",
            "messages": [{"role": "user", "content": "Say 'Manual request test successful'"}],
            "max_tokens": 20
        }
        
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=data,
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Manual HTTP request works!")
            print(f"Response: {result['choices'][0]['message']['content']}")
            return True
        else:
            print(f"❌ HTTP Error {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Manual HTTP request failed: {str(e)}")
        return False

def main():
    print("🔑 API Key Validation Test")
    print("=" * 50)
    
    api_key = os.environ.get('OPENAI_API_KEY', '')
    print(f"API Key: {api_key[:20]}...{api_key[-10:] if len(api_key) > 30 else api_key}")
    
    if api_key.startswith('sk-or-v1-'):
        print("🔍 Detected OpenRouter API key")
        
        # Only test OpenRouter for OR keys
        openrouter_works = test_openrouter_api()
        manual_works = test_manual_request()
        
        if openrouter_works:
            print("\n✅ CONCLUSION: API key is working with OpenRouter!")
        else:
            print("\n❌ CONCLUSION: API key is NOT working properly!")
            
    elif api_key.startswith('sk-'):
        print("🔍 Detected OpenAI API key")
        
        # Test both for regular OpenAI keys
        openai_works = test_openai_direct()
        openrouter_works = test_openrouter_api()
        
        if openai_works or openrouter_works:
            print("\n✅ CONCLUSION: API key is working!")
        else:
            print("\n❌ CONCLUSION: API key is NOT working properly!")
    else:
        print("❌ Invalid API key format!")

if __name__ == "__main__":
    main()
