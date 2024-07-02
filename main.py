from fastapi import FastAPI, HTTPException
import webbrowser
import pyautogui
import boto3
import time
import requests
from bs4 import BeautifulSoup
from pydantic import BaseModel
from requests.exceptions import RequestException

userManagementIP = "http://umc-dev.ap-southeast-1.elasticbeanstalk.com"
myIp = "http://159.65.132.139:8000"

class Item(BaseModel):
    url: str
    id: str
    chatId: str
    userId: str


def is_save_as_window_open() -> bool:
    return "Save As" in pyautogui.getAllTitles()


def is_error_page_open() -> bool:
    return "Error Page" in pyautogui.getAllTitles()


def wait_for_save_as_or_error_page_window(timeout=120) -> bool:
    start_time = time.time()
    while not is_save_as_window_open() and not is_error_page_open():
        if time.time() - start_time > timeout:
            return False
        time.sleep(1)
    return True


def Delete_Class_And_Nav(namaFIle: str):
    with open(namaFIle, "r", encoding='utf-8') as file:
        html_content = file.read()

    soup = BeautifulSoup(html_content, "html.parser")

    for tag in soup.find_all(attrs={"class": "kIxuFz"}):
        del tag["class"]

    for tag in soup.find_all(attrs={"class": "fRedwX"}):
        del tag["class"]

    for aside_tag in soup.find_all("aside"):
        aside_tag.decompose()

    for tag in soup.find_all(attrs={"class": "kHGFJH"}):
        tag["class"] = "Kdhtc"

    for tag in soup.find_all(attrs={"class": "fLuQaU"}):
        tag["class"] = "kuEBJH"

    for div_tag in soup.find_all("div", class_="gMfyqv"):
        div_tag.decompose()

    with open(namaFIle, "w", encoding='utf-8') as file:
        file.write(str(soup))


def getQueue():
    data = {'ip': myIp}
    headers = {
        'Content-Type': 'application/json'
    }

    try:
        response = requests.post('http://umc-dev.ap-southeast-1.elasticbeanstalk.com/VPS/getQueue', json=data, headers=headers, timeout=30)
        response.raise_for_status()  # Raise an error for bad status codes
        response_data = response.json()
        return response_data
    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error occurred: {http_err}")
    except requests.exceptions.ConnectionError as conn_err:
        print(f"Connection error occurred: {conn_err}")
    except requests.exceptions.Timeout as timeout_err:
        print(f"Timeout error occurred: {timeout_err}")
    except RequestException as e:
        print(f"An error occurred: {e}")

    response_data = {'message': "Error"}
    return response_data


def requestPerDay(item: Item, myIp: str) -> dict:
    data = {
        'userId': item.userId,
        'updateId': item.id,
        "url": item.url,
        "chatId": item.chatId,
        "ip": myIp
    }
    try:
        response = requests.post(
            userManagementIP + '/VPS/requestPerDay', json=data, timeout=30)
        response_data = response.json()
    except RequestException as e:
        print(f"Error in requestPerDay: {e}")
        response_data = {'message': 'Error'}
    return response_data


def run(item: Item, myIp: str):
    pyautogui.FAILSAFE = False
    chrome_path = 'C:/Program Files/Google/Chrome/Application/chrome.exe %s'
    url_post = item.url
    id_update = item.id
    input_file_path = item.id + ".html"
    webbrowser.get(chrome_path).open(url_post)

    if not wait_for_save_as_or_error_page_window():
        pyautogui.hotkey('ctrl', 'r')
        if not wait_for_save_as_or_error_page_window():
            urlTelegram = 'https://api.telegram.org/bot6740331088:AAHkgEEOjVkKLBhvpcHhTZw-o4Iq7CM4pzc/sendMessage'
            awsstring = f'Mohon maaf server kami sedang mengalami error, mohon coba kembali beberapa saat.'
            payload_telegram_bot = {
                'chat_id': item.chatId,
                'text': awsstring
            }
            requests.post(urlTelegram, json=payload_telegram_bot)
            return True

    if is_error_page_open():
        pyautogui.hotkey('alt', 'f4')
        pyautogui.hotkey('ctrl', 'w')
        urlTelegram = 'https://api.telegram.org/bot6740331088:AAHkgEEOjVkKLBhvpcHhTZw-o4Iq7CM4pzc/sendMessage'
        awsstring = f'Mohon maaf, halaman error terdeteksi. Mohon coba kembali beberapa saat.'
        payload_telegram_bot = {
            'chat_id': item.chatId,
            'text': awsstring
        }
        requests.post(urlTelegram, json=payload_telegram_bot)
        return True

    time.sleep(1)
    pyautogui.typewrite(id_update)
    pyautogui.press('enter')
    time.sleep(4)
    pyautogui.hotkey('ctrl', 'w')
    Delete_Class_And_Nav(input_file_path)
    s3 = boto3.resource('s3')
    s3.meta.client.upload_file(
        Filename=input_file_path,
        Bucket='chegg-bucket2',
        Key=input_file_path,
        ExtraArgs={
            'ACL': 'public-read',
            'ContentType': 'text/html'
        }
    )
    urlTelegram = 'https://api.telegram.org/bot6740331088:AAHkgEEOjVkKLBhvpcHhTZw-o4Iq7CM4pzc/sendMessage'
    awsstring = f'https://chegg-bucket2.s3.ap-southeast-1.amazonaws.com/{item.id}.html'
    payload_telegram_bot = {
        'chat_id': item.chatId,
        'text': awsstring
    }
    requests.post(urlTelegram, json=payload_telegram_bot)
    requestPerDay(item, myIp)
    return True


app = FastAPI()
@app.post("/")
def create_item(item: Item):
    run(item, myIp)
    
    while True:
        queue_item = getQueue()
        if queue_item['message'] == "Error" or queue_item['message'] == "No Queue":
            print("Tidak ada antrian yang tersedia. Berhenti menjalankan.")
            break
        else:
            try:
                run(Item(
                    userId=queue_item['userId'],
                    id=queue_item['updateId'],
                    url=queue_item['url'],
                    chatId=queue_item['chatId']
                ), myIp)
            except HTTPException as e:
                return {"statusCode": e.status_code, "detail": e.detail}
                
    return {"statusCode": 200}