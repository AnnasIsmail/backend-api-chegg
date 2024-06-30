import pyautogui
import time

def is_save_as_window_open() -> bool:
    return "Error Page" in pyautogui.getAllTitles()

start_time = time.time()
while not is_save_as_window_open():
    if time.time() - start_time > 120:
        print(False)
    time.sleep(1)
print(True)
pyautogui.hotkey('alt', 'f4')
