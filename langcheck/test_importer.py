import sys
import os
import asyncio
from dotenv import load_dotenv

# --- Path Setup ---
# Get the absolute path of the project root directory
project_root = os.path.abspath(os.path.dirname(__file__))
# Add the project root to the Python path
sys.path.insert(0, project_root)
print(f"Project root added to path: {project_root}")

# --- Environment Variable Setup ---
# Construct the path to the .env file located in the 'backend' subdirectory
dotenv_path = os.path.join(project_root, 'backend', '.env')
if os.path.exists(dotenv_path):
    print(f"Loading .env file from: {dotenv_path}")
    load_dotenv(dotenv_path=dotenv_path)
else:
    print(f"❌ CRITICAL: .env file not found at {dotenv_path}")

print("--- 🧪 Vision Service Test Start ---")
try:
    print("Attempting to import vision_service...")
    # Now we can import using the backend module
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
    print("--- 🧪 Vision Service Test End ---")
