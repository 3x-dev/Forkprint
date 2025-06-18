#!/usr/bin/env python3
"""
Simple CodeCarbon test without external API calls
"""

from codecarbon import track_emissions
import time
import os

@track_emissions()
def simple_computation():
    """A simple computation to test carbon tracking"""
    print("🧮 Running simple computation...")
    
    # Simulate some work
    result = 0
    for i in range(1000000):
        result += i * 2
    
    print(f"✅ Computation complete: {result}")
    return result

def main():
    print("🌱 Testing CodeCarbon tracking...")
    print(f"Experiment ID: {os.getenv('CODECARBON_EXPERIMENT_ID', 'Not set')}")
    
    # Run the tracked computation
    result = simple_computation()
    
    print("✅ Test completed!")
    print("📊 Check for emissions.csv file in the current directory")
    print("🌐 Check your CodeCarbon dashboard for data")

if __name__ == "__main__":
    main() 