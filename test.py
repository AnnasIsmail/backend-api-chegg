import requests
import time
from datetime import datetime

# URL API endpoint
api_url = "http://159.65.132.139:8000"

# Parameter POST
post_data = {
    'userId': "5157078824",
    'updateId': "",
    "url": "",
    "chatId": "5157078824",
}

# Fungsi untuk melakukan panggilan API
def hit_api():
    try:
        print(f"{datetime.now()} - Start Calling API...")
        start_time = time.time()
        response = requests.post(api_url, json=post_data, timeout=240)  # Timeout 4 menit
        elapsed_time = time.time() - start_time

        if response.status_code == 200:
            print(f"{datetime.now()} - Response received: {response.json()} (Elapsed time: {elapsed_time:.2f} seconds)")
        else:
            print(f"{datetime.now()} - Error: Received status code {response.status_code} (Elapsed time: {elapsed_time:.2f} seconds)")
    except requests.exceptions.Timeout:
        print(f"{datetime.now()} - Timeout after 4 minutes.")
    except requests.exceptions.RequestException as e:
        print(f"{datetime.now()} - Request failed: {e}")

# Fungsi utama untuk menjalankan panggilan API berulang setiap 5 menit
def main():
    while True:
        hit_api()
        time.sleep(300)  # Tunggu 5 menit sebelum melakukan panggilan API berikutnya

if __name__ == "__main__":
    main()
