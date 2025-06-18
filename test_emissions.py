#!/usr/bin/env python3
"""
Simple test to generate emissions data
"""

import requests
import json
import time

def test_emissions():
    print("🧪 Testing emissions generation...")
    
    # Test data
    test_data = {
        "stats": {
            "totalItems": 10,
            "lowWasteItems": 7,
            "sustainableSwitches": 3,
            "commonHighWastePackaging": ["plastic bags"],
            "mostLoggedFoods": {"bananas": 5, "apples": 3}
        }
    }
    
    try:
        print("📡 Making API call to generate emissions...")
        response = requests.post(
            'http://localhost:5001/api/sustainability-insights',
            headers={'Content-Type': 'application/json'},
            json=test_data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ API call successful!")
            print(f"📊 Generated insights: {len(result.get('insights', []))}")
            print("🌱 Emissions should now be tracked!")
            return True
        else:
            print(f"❌ API call failed: {response.status_code}")
            print(f"Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    test_emissions() 