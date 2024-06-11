import requests

data = {
    'userId': "askdjakldja",
    'updateId': "68656567567",
    "url": "89as7d8asd",
    "chatId": "ajdhady89",
    "ip": "http://139.162.86.177:8000"
}
response = requests.post(
    'http://139.162.86.177:5000/VPS/getQueue', json=data, timeout=30)
response.raise_for_status()
response.message = "not Error"
print(response.message)