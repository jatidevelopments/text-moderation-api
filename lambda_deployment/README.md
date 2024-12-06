# Lambda Deployment for Koala Text Moderation

This directory contains the optimized version of the Koala text moderation model for AWS Lambda deployment using ONNX runtime.

## Directory Structure
```
lambda_deployment/
├── koala_lambda.py      # Main Lambda function with ONNX optimized model
├── requirements.txt     # Python dependencies
├── Dockerfile          # Container configuration for Lambda
└── models/            # Directory for model files
    ├── model.onnx     # ONNX optimized model
    └── tokenizer/     # Tokenizer files
```

## Deployment Steps

1. **Export Model to ONNX**
   ```python
   from koala import export_to_onnx
   export_to_onnx("../models/text_moderation_model", "../models/text_moderation_tokenizer", "models/model.onnx")
   ```

2. **Build Docker Image**
   ```bash
   docker build -t koala-moderation .
   ```

3. **Push to Amazon ECR**
   ```bash
   aws ecr get-login-password --region REGION | docker login --username AWS --password-stdin ACCOUNT.dkr.ecr.REGION.amazonaws.com
   docker tag koala-moderation:latest ACCOUNT.dkr.ecr.REGION.amazonaws.com/koala-moderation:latest
   docker push ACCOUNT.dkr.ecr.REGION.amazonaws.com/koala-moderation:latest
   ```

4. **Create Lambda Function**
   - Create new Lambda function from container image
   - Set memory to 256MB
   - Set timeout to 30 seconds
   - Configure environment variables if needed

## Performance
- Average inference time: ~100-200ms
- Memory usage: ~256MB
- Cold start time: ~1-2 seconds

## API Usage
```json
// Request
{
    "message": "Text to moderate"
}

// Response
{
    "message": "High-risk content detected",
    "is_flagged": true,
    "probability": 85.5,
    "category": "sexual/minors"
}
```
