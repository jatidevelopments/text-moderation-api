# Text Moderation Model

This model is designed to detect and flag inappropriate content in text, with a particular focus on identifying harmful, sexual, or violent content. It's fine-tuned on a custom dataset and optimized for high precision in content moderation tasks.

## Model Description

- **Model Type:** Fine-tuned DistilBERT for sequence classification
- **Task:** Multi-label text content moderation
- **Primary Use Case:** Content moderation for text-based platforms, chat applications, and user-generated content
- **Language:** English

## Intended Use

This model is intended for:
- Content moderation systems
- User-generated content filtering
- Text safety verification
- Online platform protection

## Model Performance

The model uses a confidence threshold of 0.60 (60%) for flagging content, which was chosen based on accuracy statistics and the need to balance precision with recall.

### Categories

The model can detect multiple categories of potentially inappropriate content:
- S: Sexual content
- H: Hate speech
- V: Violence
- HR: High risk
- SH: Self-harm
- S3: Sexual content involving minors (highest priority)
- H2: Severe hate speech
- V2: Severe violence
- OK: Safe content

## Usage

```python
from transformers import AutoModelForSequenceClassification, AutoTokenizer

# Load model and tokenizer
model = AutoModelForSequenceClassification.from_pretrained("elonmaxhimself/text-moderation-model")
tokenizer = AutoTokenizer.from_pretrained("elonmaxhimself/text-moderation-model")

# Prepare your text
text = "Text to moderate"
inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=256)

# Run inference
import torch
with torch.no_grad():
    outputs = model(**inputs)
    probabilities = torch.sigmoid(outputs.logits)

# Check if content should be flagged (example for S3 category)
S3_INDEX = 5  # Index for sexual/minors category
THRESHOLD = 0.60
s3_probability = probabilities[0][S3_INDEX].item()
should_block = s3_probability >= THRESHOLD
```

## Limitations

- The model is primarily trained on English text
- Performance may vary for:
  - Very long text sequences (>256 tokens)
  - Non-English content
  - Highly contextual content
  - Novel forms of inappropriate content
- The model should be used as part of a broader content moderation strategy, not as the sole decision maker

## Ethical Considerations

This model is designed to help create safer online spaces, but it should be used responsibly:
- False positives may occur and human review is recommended for borderline cases
- The model should not be used as the sole decision-maker for content moderation
- Regular monitoring and updating of the model is recommended to maintain effectiveness
- Consider privacy implications when processing user content

## Citation

If you use this model in your research or application, please cite:

```
@misc{text-moderation-model,
  author = {elonmaxhimself},
  title = {Text Moderation Model},
  year = {2023},
  publisher = {HuggingFace},
  journal = {HuggingFace Hub},
  howpublished = {\url{https://huggingface.co/elonmaxhimself/text-moderation-model}}
}
