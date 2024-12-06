import os
import json
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

class TextModerationLambda:
    def __init__(self):
        self.model_dir = os.path.join(os.path.dirname(__file__), "models")
        self.model_path = os.path.join(self.model_dir, "model")
        self.tokenizer_path = os.path.join(self.model_dir, "tokenizer")
        
        # Initialize model and tokenizer
        print("Loading model and tokenizer...")
        print(f"Model path: {self.model_path}")
        print(f"Tokenizer path: {self.tokenizer_path}")
        
        # Load model and tokenizer directly from local paths
        print("Loading model from local files...")
        self.model = AutoModelForSequenceClassification.from_pretrained(self.model_path)
        
        print("Loading tokenizer from local files...")
        self.tokenizer = AutoTokenizer.from_pretrained(self.tokenizer_path)
        
        self.model.eval()  # Set to evaluation mode
        
        # Constants
        self.THRESHOLD = 0.60  # 60% threshold based on accuracy statistics
        self.S3_INDEX = 5     # Index for sexual/minors category
        
    def predict(self, text):
        """
        Run prediction on the input text
        """
        # Tokenize input
        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=256
        )
        
        # Run inference
        with torch.no_grad():
            outputs = self.model(**inputs)
            probabilities = torch.sigmoid(outputs.logits)
        
        # Get probability for S3 category
        s3_probability = probabilities[0][self.S3_INDEX].item() * 100
        should_block = s3_probability >= (self.THRESHOLD * 100)
        
        return {
            "should_block": should_block,
            "probability": s3_probability,
            "category": "sexual/minors"
        }

def lambda_handler(event, context):
    """
    AWS Lambda handler function for API Gateway integration
    
    Expected request format:
    {
        "message": "Text to moderate"
    }
    
    Returns:
    {
        "message": "High-risk content detected" | "Content appears safe",
        "is_flagged": boolean,
        "probability": float,
        "category": string
    }
    """
    # CORS headers for API Gateway
    headers = {
        'Access-Control-Allow-Origin': '*',  # Configure this to your domain in production
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    }
    
    # Handle OPTIONS request (CORS preflight)
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': ''
        }
    
    try:
        # Attempt to parse the input message from the event body
        message = event.get('message')
        if not message:
            # If not directly available, parse the body as JSON
            body = json.loads(event.get('body', '{}'))
            message = body.get('message')
        
        # Validate input
        if not message:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'error': 'Message field is required'
                })
            }
        
        if not isinstance(message, str):
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'error': 'Message must be a string'
                })
            }
        
        # Initialize model if not already initialized
        global model
        if not globals().get('model'):
            model = TextModerationLambda()
        
        # Get prediction
        result = model.predict(message)
        
        # Prepare response
        response = {
            'message': 'High-risk content detected' if result['should_block'] else 'Content appears safe',
            'is_flagged': result['should_block'],
            'probability': result['probability'],
            'category': result['category']
        }
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(response)
        }
        
    except Exception as e:
        print(f"Error processing request: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'error': f'Internal server error: {str(e)}'
            })
        }

if __name__ == "__main__":
    # Test the API locally
    model = TextModerationLambda()
    
    # Test case 1: Valid request
    test_event = {
        'httpMethod': 'POST',
        'body': json.dumps({
            'message': "This is a test message"
        })
    }
    result = lambda_handler(test_event, None)
    print(f"Test 1 - Valid request: {json.dumps(result, indent=2)}")
    
    # Test case 2: Missing message
    test_event = {
        'httpMethod': 'POST',
        'body': json.dumps({})
    }
    result = lambda_handler(test_event, None)
    print(f"\nTest 2 - Missing message: {json.dumps(result, indent=2)}")
    
    # Test case 3: Invalid JSON
    test_event = {
        'httpMethod': 'POST',
        'body': 'invalid json'
    }
    result = lambda_handler(test_event, None)
    print(f"\nTest 3 - Invalid JSON: {json.dumps(result, indent=2)}")