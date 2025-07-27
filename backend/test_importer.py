import sys
import os
import asyncio
from dotenv import load_dotenv

# Load environment variables from .env file in the backend directory
dotenv_path = os.path.join(os.path.dirname(__file__), 'backend', '.env')
if os.path.exists(dotenv_path):
    print(f"Loading .env file from: {dotenv_path}")
    load_dotenv(dotenv_path=dotenv_path)
else:
    print(f"Warning: .env file not found at {dotenv_path}")

# Add backend to path to allow for direct import
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

print("--- 🧪 Importer Test Start ---")
try:
    print("Attempting to import vision_service...")
    from backend.services import vision_service
    print("✅ Import successful.")
    
    print("Attempting to run test_vision_service...")
    # To run the async function, we need an event loop
    asyncio.run(vision_service.test_vision_service())
    print("✅ test_vision_service finished.")

except Exception as e:
    import traceback
    print(f"❌ An error occurred during import or execution:")
    traceback.print_exc()

finally:
    print("--- 🧪 Importer Test End ---")
