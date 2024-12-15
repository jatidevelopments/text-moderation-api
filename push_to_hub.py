from transformers import AutoModelForSequenceClassification, AutoTokenizer
from huggingface_hub import HfApi

def push_to_hub():
    # Load the model and tokenizer
    model_name = "./models/text_moderation_model_20241211_201421"
    tokenizer_name = "./models/text_moderation_tokenizer_20241211_201421"
    
    print("Loading model and tokenizer...")
    model = AutoModelForSequenceClassification.from_pretrained(model_name)
    tokenizer = AutoTokenizer.from_pretrained(tokenizer_name)
    
    # Set your Hugging Face username and model name
    username = "elonmaxhimself"  # Your Hugging Face username
    model_id = f"{username}/text-moderation-model"
    
    print(f"Pushing model to {model_id}...")
    
    # Push the model and tokenizer to the hub
    model.push_to_hub(model_id)
    tokenizer.push_to_hub(model_id)
    
    print("Model and tokenizer successfully pushed to Hugging Face Hub!")

if __name__ == "__main__":
    push_to_hub()
