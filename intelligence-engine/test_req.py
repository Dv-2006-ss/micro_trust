import requests

files = {'passbook_file': ('test.txt', b'test', 'text/plain')}
data = {'merchant_id': 'M_54GHA6L'}
response = requests.post('http://localhost:8000/analyze', files=files, data=data)
print(response.status_code)
print(response.text)
