import requests
import csv
import json

# Define the API endpoint
url = "https://x4qw-4hla-af5x.f2.xano.io/api:v_TzjXqA/message_prohibited"

# Send a GET request to retrieve the messages
response = requests.get(url)

# Check if the request was successful
if response.status_code == 200:
    # Parse JSON response and filter messages with role "user"
    messages = response.json()
    user_messages = [msg for msg in messages if msg.get("role") == "user"]

    # Save filtered data to JSON file
    with open("user_prohibited_messages.json", "w") as json_file:
        json.dump(user_messages, json_file, indent=4)

    # Save filtered data to CSV file
    if user_messages:
        with open("user_prohibited_messages.csv", "w", newline="") as csv_file:
            csv_writer = csv.writer(csv_file)
            
            # Write headers based on JSON keys
            headers = user_messages[0].keys()
            csv_writer.writerow(headers)

            # Write message data
            for message in user_messages:
                csv_writer.writerow(message.values())
    
    print("Filtered messages saved to 'user_prohibited_messages.json' and 'user_prohibited_messages.csv'")
else:
    print(f"Failed to retrieve messages. Status code: {response.status_code}")
