#!/usr/bin/env python3
"""
Test script for CodeCarbon integration
"""

import requests
import json
import time

def test_health_endpoint():
    """Test the health endpoint"""
    print("🔍 Testing health endpoint...")
    try:
        response = requests.get('http://localhost:5001/health')
        if response.status_code == 200:
            print("✅ Health endpoint working")
            print(f"   Response: {response.json()}")
            return True
        else:
            print(f"❌ Health endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health endpoint error: {e}")
        return False

def test_sustainability_insights():
    """Test the sustainability insights endpoint with carbon tracking"""
    print("\n🔍 Testing sustainability insights with carbon tracking...")
    
    test_data = {
        "stats": {
            "totalItems": 15,
            "lowWasteItems": 12,
            "sustainableSwitches": 5,
            "commonHighWastePackaging": ["plastic bags", "styrofoam containers"],
            "mostLoggedFoods": {
                "bananas": 8,
                "apples": 6,
                "bread": 4,
                "milk": 3,
                "eggs": 2
            }
        }
    }
    
    try:
        start_time = time.time()
        response = requests.post(
            'http://localhost:5001/api/sustainability-insights',
            headers={'Content-Type': 'application/json'},
            json=test_data
        )
        end_time = time.time()
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Sustainability insights endpoint working")
            print(f"   Response time: {end_time - start_time:.2f} seconds")
            print(f"   Insights count: {len(result.get('insights', []))}")
            print(f"   First insight: {result.get('insights', [{}])[0].get('title', 'N/A')}")
            return True
        else:
            print(f"❌ Sustainability insights failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Sustainability insights error: {e}")
        return False

def check_emissions_file():
    """Check if emissions.csv file is being created"""
    print("\n🔍 Checking for emissions tracking...")
    try:
        import os
        if os.path.exists('emissions.csv'):
            print("✅ Emissions file found: emissions.csv")
            # Read and display the last few lines
            with open('emissions.csv', 'r') as f:
                lines = f.readlines()
                if len(lines) > 1:
                    print(f"   Total emissions records: {len(lines) - 1}")
                    print(f"   Latest record: {lines[-1].strip()}")
                else:
                    print("   No emissions data recorded yet")
            return True
        else:
            print("⚠️  Emissions file not found yet (may appear after first API call)")
            return False
    except Exception as e:
        print(f"❌ Error checking emissions file: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 CodeCarbon Integration Test Suite")
    print("=" * 50)
    
    # Wait a moment for service to be ready
    print("⏳ Waiting for service to be ready...")
    time.sleep(2)
    
    tests = [
        test_health_endpoint,
        test_sustainability_insights,
        check_emissions_file
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        time.sleep(1)  # Brief pause between tests
    
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! CodeCarbon integration is working correctly.")
        print("\n📈 Next steps:")
        print("   1. Check your CodeCarbon dashboard for emissions data")
        print("   2. Run 'carbonboard --filepath=\"emissions.csv\"' to view local data")
        print("   3. Continue using your application - all AI calls are now tracked!")
    else:
        print("⚠️  Some tests failed. Check the service logs and configuration.")
        print("\n🔧 Troubleshooting:")
        print("   1. Ensure Python service is running on port 5001")
        print("   2. Check ANTHROPIC_API_KEY is set in environment")
        print("   3. Verify .codecarbon.config file exists")

if __name__ == "__main__":
    main() 