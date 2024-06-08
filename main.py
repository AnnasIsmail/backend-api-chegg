from fastapi import FastAPI
import webbrowser
import pyautogui
import boto3
import time
import requests
from bs4 import BeautifulSoup
from pydantic import BaseModel

def is_save_as_window_open():
    # Check if the Save As window is open by looking for its title
    return "Save As" in pyautogui.getAllTitles()

def wait_for_save_as_window():
    while not is_save_as_window_open():
        time.sleep(1)  # Wait for 1 second before checking again

def Delete_Class_And_Nav(namaFIle):
    with open(namaFIle, "r", encoding='utf-8') as file:
        html_content = file.read()

    soup = BeautifulSoup(html_content, "html.parser")

    for tag in soup.find_all(attrs={"class": "kIxuFz"}):
        del tag["class"]

    for tag in soup.find_all(attrs={"class": "fRedwX"}):
        del tag["class"]

    for aside_tag in soup.find_all("aside"):
        aside_tag.decompose()

    with open(namaFIle, "w", encoding='utf-8') as file:
        file.write(str(soup))

def getQueue(myIP):
    data = {
        'ip' : myIP
    }
    response = requests.post('http://139.162.86.177:5000/VPS/getQueue', json=data)
    response_data = response.json()    
    return response_data

def getQueue(userId, id):
    data = {
        'userId': userId, 
        'updateId': id
    }
    response = requests.post('http://139.162.86.177:5000/VPS/requestPerDay', json=data)
    response_data = response.json()    
    return response_data

def run(item):
    pyautogui.FAILSAFE = False
    chrome_path = 'C:/Program Files/Google/Chrome/Application/chrome.exe %s'
    url_post = item.url
    id_update = item.id
    input_file_path = item.id + ".html"
    webbrowser.get(chrome_path).open(url_post)
    
    time.sleep(12)
    pyautogui.hotkey('ctrl','down')
    wait_for_save_as_window()
    time.sleep(1)
    pyautogui.typewrite(id_update)
    pyautogui.press('enter')    
    time.sleep(2)
    pyautogui.hotkey('ctrl','w')

    Delete_Class_And_Nav(input_file_path)
    s3 = boto3.resource('s3')
    s3.meta.client.upload_file(
        Filename=input_file_path,
        Bucket='chegg-bucket2',
        Key=input_file_path,
        ExtraArgs={
            		'ACL': 'public-read',
			'ContentType':'text/html'
       	}
    )
    urlTelegram = f'https://api.telegram.org/bot6740331088:AAHkgEEOjVkKLBhvpcHhTZw-o4Iq7CM4pzc/sendMessage'
    awsstring=f'https://chegg-bucket2.s3.ap-southeast-1.amazonaws.com/{item.update_id}.html'
    payload_telegram_bot = {
        'chat_id' : item.chat_id,
        'text' : awsstring
    }
    requests.post(urlTelegram,json=payload_telegram_bot)

app = FastAPI()

class Item(BaseModel):
    url: str
    id: str
    chatId: str
    userId: str

@app.post("/")
def create_item(item: Item):
    myIp = "http://38.46.220.8:8000/"
    run(item)
    print(getQueue(myIp))
    # run(item)
    # while True:
    # item = getQueue(myIP)
    # if item is None:
    #     print("Tidak ada antrian yang tersedia. Berhenti menjalankan.")
    #     break 
    # else:
    #     run(item)
    return {"statusCode": 200}