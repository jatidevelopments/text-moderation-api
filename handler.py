import openai
import json
import logging
from colorama import Fore, Style, init

# Initialize colorama for Windows compatibility
init(autoreset=True)

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(message)s')

# Define color codes
INFO_COLOR = Fore.CYAN
WARNING_COLOR = Fore.YELLOW
ERROR_COLOR = Fore.RED
RESET_COLOR = Style.RESET_ALL

# Set your OpenAI API key
openai.api_key = ''  # Replace with your actual API key

# Function to call OpenAI Moderation API using the omni-moderation-latest model
def check_moderation(content):
    response = openai.moderations.create(
        model="omni-moderation-latest",
        input=content
    )

    # Convert response to a dictionary for JSON serialization
    response_dict = response.to_dict()

    # Log the response for debugging
    logging.info(f"{INFO_COLOR}OpenAI Moderation API Response: {json.dumps(response_dict, indent=2)}{RESET_COLOR}")

    # Access the first result in the moderation response
    return response_dict['results'][0]

def lambda_handler(event, context):
    logging.info(f"{INFO_COLOR}Received event - {json.dumps(event, indent=2)}{RESET_COLOR}")

    # Parse input message
    try:
        body = json.loads(event.get("body", "{}"))
        message = body.get("message", "")
    except json.JSONDecodeError as e:
        logging.error(f"{ERROR_COLOR}Error - JSON Decoding: {e}{RESET_COLOR}")
        return {"statusCode": 400, "body": json.dumps({"error": "Invalid JSON in request body."})}
    
    if not message:
        logging.warning(f"{WARNING_COLOR}Warning - No message provided in the request.{RESET_COLOR}")
        return {"statusCode": 400, "body": json.dumps({"error": "Message required"})}

    logging.info(f"{INFO_COLOR}Processing message - '{message}'{RESET_COLOR}")

    # Call OpenAI's Moderation API
    try:
        moderation_result = check_moderation(message)
        flagged = moderation_result["flagged"]
        categories = moderation_result["categories"]
        category_scores = moderation_result["category_scores"]
        logging.info(f"{INFO_COLOR}Moderation results - Flagged: {flagged}, Categories: {categories}{RESET_COLOR}")
    except Exception as e:
        logging.error(f"{ERROR_COLOR}Error - Model Inference: {e}{RESET_COLOR}")
        return {"statusCode": 500, "body": json.dumps({"error": "Model inference failed."})}

    # Define a threshold for high-risk content
    threshold = 0.8
    flagged_label = None
    flagged_probability = None

    # Identify high-risk category if above the threshold
    for category, score in category_scores.items():
        if score > threshold:
            flagged_label = category
            flagged_probability = score
            logging.info(f"{INFO_COLOR}Flagged label - {flagged_label} with probability - {flagged_probability:.4f}{RESET_COLOR}")
            break

    # Format the response based on classification
    if flagged:
        response_body = {
            "message": "High-risk content detected",
            "is_flagged": True,
            "flagged_type": flagged_label,
            "probability": flagged_probability,
            "details": categories
        }
        response = {
            "statusCode": 200,
            "body": response_body
        }
        logging.info(f"{INFO_COLOR}Response: {json.dumps(response, indent=2)}{RESET_COLOR}")
        return {"statusCode": response["statusCode"], "body": json.dumps(response_body, indent=2)}
    else:
        response_body = {
            "message": "Content approved",
            "is_flagged": False,
            "details": categories
        }
        response = {
            "statusCode": 200,
            "body": response_body
        }
        logging.info(f"{INFO_COLOR}Response: {json.dumps(response, indent=2)}{RESET_COLOR}")
        return {"statusCode": response["statusCode"], "body": json.dumps(response_body, indent=2)}