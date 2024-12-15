import os
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

def export_model():
    # Load the model and tokenizer
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    model_name = os.path.join(base_dir, "models", "text_moderation_model_20241204_221216")
    tokenizer_name = os.path.join(base_dir, "models", "text_moderation_tokenizer_20241204_221216")
    
    print(f"Loading model from {model_name}")
    model = AutoModelForSequenceClassification.from_pretrained(model_name)
    print(f"Loading tokenizer from {tokenizer_name}")
    tokenizer = AutoTokenizer.from_pretrained(tokenizer_name)
    
    # Create output directories
    os.makedirs("models", exist_ok=True)
    model_output_dir = os.path.join("models", "model")
    tokenizer_output_dir = os.path.join("models", "tokenizer")
    os.makedirs(model_output_dir, exist_ok=True)
    os.makedirs(tokenizer_output_dir, exist_ok=True)
    
    # Save the model and tokenizer
    print(f"Saving model to {model_output_dir}")
    model.save_pretrained(model_output_dir)
    print(f"Saving tokenizer to {tokenizer_output_dir}")
    tokenizer.save_pretrained(tokenizer_output_dir)
    
    print("Model and tokenizer exported successfully!")

if __name__ == "__main__":
    export_model()
