import asyncio
import logging
import traceback
import sys
import os

logging.basicConfig(level=logging.DEBUG, stream=sys.stdout)
sys.path.append(os.path.abspath('intelligence-engine'))

import api.main as app_main

app_main.ocr_processor.process_image = lambda f, p: {
    "raw_text": "Retail merchant bank UPI",
    "raw_text_length": 50,
    "transactions": [],
    "daily_transaction_spikes": 1.0,
    "average_balance": 10000.0,
    "monthly_revenue": 50000.0,
    "shop_type": "Retail",
    "merchant_category": "Grocery",
    "has_swiggy_addiction": False
}

class MockUploadFile:
    async def read(self):
        return b"fake image"

async def run_test():
    try:
        mock_file = MockUploadFile()
        print("Invoking analyze_data with mocked OCR...")
        res = await app_main.analyze_data(
            merchant_id="M_TEST123",
            username="testuser",
            pdf_password=None,
            primary_bank="HDFC",
            passbook_file=mock_file
        )
        print("Success! Response Keys:", res.keys())
        import json
        print(json.dumps(res, indent=2))
    except Exception as e:
        print("ERROR IN ANALYZE_DATA:")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run_test())
