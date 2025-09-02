#!/usr/bin/env python
"""
Test the robust OAuth endpoint
"""

import requests
import json

def test_oauth_endpoint():
    print("=== Testing Robust OAuth Endpoint ===")
    
    # You'll need to replace this with a valid token
    # Get token by logging in to your app first
    headers = {
        'Authorization': 'Token YOUR_TOKEN_HERE',  # Replace with actual token
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.post(
            'http://localhost:8000/api/hubspot/oauth/init-robust/',
            headers=headers
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n=== SUCCESS ===")
            print(f"Authorization URL: {data.get('authorization_url')}")
            print(f"State: {data.get('state')}")
            print(f"Instructions: {data.get('instructions')}")
        else:
            print(f"\n=== ERROR ===")
            print(f"Error: {response.json()}")
            
    except requests.exceptions.ConnectionError:
        print("ERROR: Could not connect to Django server. Make sure it's running on port 8000")
    except Exception as e:
        print(f"ERROR: {str(e)}")

if __name__ == '__main__':
    test_oauth_endpoint()
