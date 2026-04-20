import asyncio
import logging
import traceback
import sys

# Setup logging manually
logging.basicConfig(level=logging.DEBUG, stream=sys.stdout)
import os
sys.path.append(os.path.abspath('.'))

# Import the application elements
from api.main import analyze_data

# Create a mock upload file
class MockUploadFile:
    def __init__(self, content):
        self.content = content
    async def read(self):
        return self.content

async def run_test():
    try:
        # Load a dummy file
        with open("c:/Users/dhair/S117 Data Science project/backend/package.json", "rb") as f:
            content = f.read()
            
        mock_file = MockUploadFile(content)
        
        print("Invoking analyze_data...")
        res = await analyze_data(
            merchant_id="M_TEST123",
            username="testuser",
            pdf_password=None,
            primary_bank="HDFC",
            passbook_file=mock_file
        )
        print("Success!")
        print(res)
    except Exception as e:
        print("ERROR IN ANALYZE_DATA:")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run_test())
