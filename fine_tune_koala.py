import torch
from transformers import Trainer, TrainingArguments, AutoModelForSequenceClassification, AutoTokenizer, AutoConfig
import pandas as pd
from sklearn.model_selection import train_test_split
from datasets import Dataset
from torch.nn import BCEWithLogitsLoss
import datetime

# Load the model and tokenizer with memory optimizations
model_name = "./models/text_moderation_model_20241204_221216"
tokenizer_name = "./models/text_moderation_tokenizer_20241204_221216"

# Configure model settings
config = AutoConfig.from_pretrained(model_name)
config.hidden_dropout_prob = 0.2    # Increase dropout
config.attention_probs_dropout_prob = 0.2
config.layer_norm_eps = 1e-7        # More precise layer normalization
config.gradient_checkpointing = True

model = AutoModelForSequenceClassification.from_pretrained(
    model_name,
    config=config,
    torch_dtype=torch.float32    # Back to float32 since MPS doesn't support fp16
)
tokenizer = AutoTokenizer.from_pretrained(tokenizer_name)
# Enable gradient checkpointing after model creation
model.gradient_checkpointing_enable()

# Define category indices and result mappings
CATEGORIES = ['S', 'H', 'V', 'HR', 'SH', 'S3', 'H2', 'V2', 'OK']
S3_INDEX = CATEGORIES.index('S3')  # Index for sexual/minors category

# Result mappings:
# TN (True Negative) = 1  -> Should pass moderation
# FN (False Negative) = 0 -> Should be blocked
# TP (True Positive) = 0  -> Should be blocked
# FP (False Positive) = 1 -> Should pass moderation
RESULT_MAPPING = {
    'TN': 1,
    'FN': 0,
    'TP': 0,
    'FP': 1
}

def augment_text(text):
    """
    Apply simple text augmentation techniques.
    """
    augmented = []
    # Original text
    augmented.append(text)
    # Lowercase version
    augmented.append(text.lower())
    # Remove extra spaces
    augmented.append(' '.join(text.split()))
    # Add periods if missing
    if not text.strip().endswith(('.', '!', '?')):
        augmented.append(text + '.')
    return augmented

# Load and prepare the data
def load_data(file_path):
    df = pd.read_csv(file_path, delimiter=';')
    df = df.dropna(subset=['message', 'result'])
    
    # Map string results to numerical values
    df['result'] = df['result'].map(RESULT_MAPPING)
    
    # Augment the data
    augmented_messages = []
    augmented_results = []
    
    for idx, row in df.iterrows():
        augmented_texts = augment_text(row['message'])
        augmented_messages.extend(augmented_texts)
        augmented_results.extend([row['result']] * len(augmented_texts))
    
    # Create new dataframe with augmented data
    augmented_df = pd.DataFrame({
        'message': augmented_messages,
        'result': augmented_results
    })
    
    # Create multi-label format
    labels = [[0] * len(CATEGORIES) for _ in range(len(augmented_df))]
    for i, result in enumerate(augmented_df['result']):
        labels[i][S3_INDEX] = 1 if result == 0 else 0
    
    augmented_df['labels'] = labels
    return augmented_df

# Tokenize the dataset
def tokenize_function(examples):
    tokenized = tokenizer(
        examples['message'],
        truncation=True,
        padding='max_length',
        max_length=256  # Reduced from 512
    )
    tokenized['labels'] = examples['labels']
    return tokenized

# Custom Trainer class with weighted loss
class CustomTrainer(Trainer):
    def compute_loss(self, model, inputs, return_outputs=False, **kwargs):
        labels = inputs.pop("labels")
        outputs = model(**inputs)
        logits = outputs.get("logits")
        
        # Calculate class weights based on label distribution
        pos_weight = torch.tensor([(1 - labels[:, S3_INDEX].float().mean()) / 
                                 (labels[:, S3_INDEX].float().mean() + 1e-7)])  # Add small epsilon to prevent division by zero
        
        # Use weighted BCE loss
        loss_fct = BCEWithLogitsLoss(pos_weight=pos_weight.to(logits.device))
        loss = loss_fct(logits[:, S3_INDEX], labels[:, S3_INDEX].float())
        
        return (loss, outputs) if return_outputs else loss

# Fine-tune the model
def fine_tune_model(data_file):
    # Load data
    df = load_data(data_file)
    
    # Split the data
    train_df, eval_df = train_test_split(df, test_size=0.2, random_state=42)
    train_dataset = Dataset.from_pandas(train_df)
    eval_dataset = Dataset.from_pandas(eval_df)
    
    # Tokenize datasets
    train_dataset = train_dataset.map(tokenize_function, batched=True)
    eval_dataset = eval_dataset.map(tokenize_function, batched=True)
    
    # Define training arguments with improvements
    training_args = TrainingArguments(
        output_dir="./results",
        eval_strategy="steps",
        eval_steps=50,
        learning_rate=2e-5,
        per_device_train_batch_size=2,
        per_device_eval_batch_size=2,
        num_train_epochs=3,
        weight_decay=0.1,
        logging_dir='./logs',
        logging_steps=10,
        gradient_accumulation_steps=8,
        warmup_ratio=0.1,
        save_strategy="steps",
        save_steps=50,
        dataloader_pin_memory=True,
        optim="adamw_torch",
        lr_scheduler_type="cosine",
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        greater_is_better=False,
        fp16=False,               # Disable fp16 since MPS doesn't support it
        dataloader_num_workers=1,
        gradient_checkpointing=True
    )
    
    # Initialize CustomTrainer
    trainer = CustomTrainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
    )
    
    # Fine-tune the model
    trainer.train()
    
    # Save the fine-tuned model with timestamp
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    model_save_path = f"./models/text_moderation_model_{timestamp}"
    tokenizer_save_path = f"./models/text_moderation_tokenizer_{timestamp}"
    
    model.save_pretrained(model_save_path)
    tokenizer.save_pretrained(tokenizer_save_path)
    
    print(f"\nFine-tuning complete! The model has been saved to:")
    print(f"Model: {model_save_path}")
    print(f"Tokenizer: {tokenizer_save_path}")
    print("\nTo use this version, update the paths in koala.py")

if __name__ == "__main__":
    data_file_path = "./test_cases.csv"
    fine_tune_model(data_file_path)
