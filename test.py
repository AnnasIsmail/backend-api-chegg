import json
import requests
import re

def is_guid(input_string):
    guid_pattern = re.compile(r'^[{]?[0-9a-fA-F]{8}[-]?[0-9a-fA-F]{4}[-]?[0-9a-fA-F]{4}[-]?[0-9a-fA-F]{4}[-]?[0-9a-fA-F]{12}[}]?$')
    match = guid_pattern.match(input_string)
    return match is not None

def lambda_handler(event, context):
    print(event)
    try:
        body=json.loads(event['body'])
        update_id=body['update_id']
        chat_id=body['message']['chat']['id']
        user_id=body['message']['from']['id']
        firstName=body['message']['from']['first_name']
        lastName=body['message']['from']['last_name']
        message_part=body['message'].get('text')
        print(str(message_part))
        url = f'https://api.telegram.org/bot6740331088:AAHkgEEOjVkKLBhvpcHhTZw-o4Iq7CM4pzc/sendMessage'
        
        if is_guid(str(message_part)):
            code=body['message'].get('text')

            data={  
                'userId': str(user_id),
                'firstName': str(firstName),
                'lastName': str(lastName),
                'code': str(code)
            }
            response = requests.post('http://umc-dev.ap-southeast-1.elasticbeanstalk.com/lambda/userRegister', json=data)
            response_data = response.json()
    
            payload_telegram_bot = {
                'chat_id' : chat_id,
                'text' : str(response_data['message'])
            }
            requests.post(url,json=payload_telegram_bot)
    
            return  {"statusCode": 200}
            
        elif message_part == '/start':
            payload_telegram_bot = {
                'chat_id': chat_id,
                'text': (
                    f'Halo {firstName} {lastName} Warm Greetings from Technology Solution ID ✨. Kindly contant us with https://linktr.ee/techsolutionid\n'

                    'One Stop Solution for your Productivity Tools!\n'
                    '📢 Admin Support 24/7\n'
                    '❤ Full Warranty Claim\n'
                    '🤝 50% Discount for Resellers'
                )
            }
            requests.post(url,json=payload_telegram_bot)
            
            return  {"statusCode": 200}
        elif message_part == '/durasi':
            firstName=body['message']['from']['first_name']
            lastName=body['message']['from']['last_name']
            code=body['message'].get('text')

            data={  
                'userId': str(user_id),
            }
            response = requests.post('http://umc-dev.ap-southeast-1.elasticbeanstalk.com/lambda/durasiUser', json=data)
            response_data = response.json()
    
            payload_telegram_bot = {
                'chat_id' : chat_id,
                'text' : str(response_data['message'])
            }
            requests.post(url,json=payload_telegram_bot)
    
            return  {"statusCode": 200}
        elif "https://www.chegg.com" in message_part:

            data={  
                'updateId': str(update_id),
                'userId': str(user_id),
                'url': str(message_part),
                'chatId': str(chat_id)
            }
            response = requests.post('http://umc-dev.ap-southeast-1.elasticbeanstalk.com/lambda/check', json=data)
            response_data = response.json()
            print("Response:", response_data)

            payload_telegram_bot = {
                'chat_id' : chat_id,
                'text' : str(response_data['message'])
            }
            requests.post(url,json=payload_telegram_bot)

            return  {"statusCode": 200}
        else:
            payload_linktidakditerima = {
                'chat_id' : chat_id,
                'text' : "Something wrong with the URL, kindly check typing of the url and try again. Thank you"
                }
            requests.post(url,json=payload_linktidakditerima)
            return  {"statusCode": 200}
            
    except:
        return  {"statusCode": 200}