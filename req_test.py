import requests

try:
    with open("c:/Users/dhair/S117 Data Science project/backend/package.json", "rb") as f:
        files = {"passbook_file": f}
        data = {
            "merchant_id": "M_TEST123",
            "username": "testuser",
        }
        r = requests.post("http://127.0.0.1:8000/analyze", files=files, data=data)
        print("Status:", r.status_code)
        print("Response:", r.text)
except Exception as e:
    print("Error:", e)
