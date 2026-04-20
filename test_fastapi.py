import asyncio
from fastapi import UploadFile
from fastapi.datastructures import FormData
from intelligence_engine.api.main import analyze_data

async def run_test():
    with open("c:/Users/dhair/S117 Data Science project/backend/package.json", "rb") as f:
        content = f.read()
    
    class MockUploadFile:
        async def read(self):
            return content
            
    try:
        res = await analyze_data(
            merchant_id="M_TEST123",
            username="testuser",
            pdf_password=None,
            primary_bank="HDFC",
            passbook_file=MockUploadFile()
        )
        print("SUCCESS:", res)
    except Exception as e:
        print("FAILED:", type(e), str(e))
        import traceback
        traceback.print_exc()

asyncio.run(run_test())
