import requests

with open('test.jpg', 'rb') as f:
    files = {'passbook_file': ('test.jpg', f, 'image/jpeg')}
    data = {'merchant_id': 'M_54GHA6L'}
    response = requests.post('http://localhost:8000/analyze', files=files, data=data)
    print("STATUS:", response.status_code)
    print("TEXT:", response.text)
