#!/usr/bin/env python3
"""
Startup script for the CodeCarbon tracking service
"""

import subprocess
import sys
import os
from dotenv import load_dotenv

def install_dependencies():
    """Install required Python packages"""
    print("Installing Python dependencies...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Dependencies installed successfully")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        sys.exit(1)

def check_environment():
    """Check if required environment variables are set"""
    print("Checking environment variables...")
    
    # Load environment variables from .env file
    load_dotenv()
    
    required_vars = ['ANTHROPIC_API_KEY']
    missing_vars = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Missing required environment variables: {', '.join(missing_vars)}")
        print("Please ensure your .env file exists and contains:")
        print("ANTHROPIC_API_KEY=your_api_key_here")
        print("PYTHON_SERVICE_URL=http://localhost:5001")
        sys.exit(1)
    
    print("✅ Environment variables configured")
    print(f"   API Key found: {os.getenv('ANTHROPIC_API_KEY')[:10]}...")

def start_service():
    """Start the carbon tracking service"""
    print("Starting CodeCarbon tracking service...")
    print("Service will be available at: http://localhost:5001")
    print("Health check: http://localhost:5001/health")
    print("Press Ctrl+C to stop the service")
    
    try:
        subprocess.run([sys.executable, "carbon_service.py"])
    except KeyboardInterrupt:
        print("\n🛑 Service stopped by user")
    except Exception as e:
        print(f"❌ Failed to start service: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("🚀 Starting CodeCarbon Integration Setup")
    print("=" * 50)
    
    install_dependencies()
    check_environment()
    start_service() 