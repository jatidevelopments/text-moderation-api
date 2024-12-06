import os
import csv
from transformers import AutoModelForSequenceClassification, AutoTokenizer
import torch

# Define the model folder and file names
model_name = "KoalaAI/Text-Moderation"
model_folder = "models"
model_path = os.path.join(model_folder, "text_moderation_model_20241204_221216")
tokenizer_path = os.path.join(model_folder, "text_moderation_tokenizer_20241204_221216")

# Ensure the models folder exists
os.makedirs(model_folder, exist_ok=True)

def load_model():
    """
    Load the model and tokenizer. If they are not locally available, download and save them.
    """
    if os.path.exists(model_path) and os.path.exists(tokenizer_path):
        print("Loading model and tokenizer from local files...")
        model = AutoModelForSequenceClassification.from_pretrained(model_path)
        tokenizer = AutoTokenizer.from_pretrained(tokenizer_path)
    else:
        print("Downloading model and tokenizer...")
        model = AutoModelForSequenceClassification.from_pretrained(model_name)
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        print("Saving model and tokenizer locally...")
        model.save_pretrained(model_path)
        tokenizer.save_pretrained(tokenizer_path)
    return model, tokenizer

# Load the model and tokenizer
model, tokenizer = load_model()

def process_message(message):
    """
    Process a single message and return probabilities for each category.
    """
    inputs = tokenizer(message, return_tensors="pt", truncation=True, max_length=512)
    outputs = model(**inputs)
    probabilities = torch.sigmoid(outputs.logits)[0]
    
    # Get probability for sexual/minors category (S3)
    s3_index = 5
    s3_probability = probabilities[s3_index].item() * 100
    
    # Constants
    THRESHOLD = 0.60  # Updated threshold based on accuracy statistics (96.0% accuracy at 60%)
    
    # Decision threshold set to THRESHOLD for S3 category
    should_block = s3_probability >= THRESHOLD * 100
    
    return {
        "should_block": should_block,
        "probabilities": {
            "sexual/minors": s3_probability
        }
    }

# Result mappings for string to numerical conversion
RESULT_MAPPING = {
    'TN': 1,  # True Negative - Should pass moderation
    'FN': 0,  # False Negative - Should be blocked
    'TP': 0,  # True Positive - Should be blocked
    'FP': 1   # False Positive - Should pass moderation
}

def evaluate_test_cases(file_path):
    """
    Evaluate test cases from a CSV file.
    Result mappings:
    - TN (True Negative) = 1  -> Should pass moderation
    - FN (False Negative) = 0 -> Should be blocked
    - TP (True Positive) = 0  -> Should be blocked
    - FP (False Positive) = 1 -> Should pass moderation
    """
    results = []
    category_totals = {
        'sexual/minors': {
            'count': 0, 
            'total_prob': 0,
            'thresholds': {10: 0, 20: 0, 30: 0, 40: 0, 50: 0, 60: 0, 70: 0, 80: 0, 85: 0, 90: 0, 95: 0, 99: 0}
        }
    }
    
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file, delimiter=';')
            for row in reader:
                try:
                    message = row["message"].strip()
                    expected_result = RESULT_MAPPING[row["result"]]  # Convert string to numerical value
                    
                    if not message:  # Skip empty messages
                        continue
                    
                    # Process the message
                    model_result = process_message(message)
                    
                    # Update category totals
                    for cat, prob in model_result['probabilities'].items():
                        if cat not in category_totals:
                            category_totals[cat] = {
                                'count': 0, 
                                'total_prob': 0,
                                'thresholds': {10: 0, 20: 0, 30: 0, 40: 0, 50: 0, 60: 0, 70: 0, 80: 0, 85: 0, 90: 0, 95: 0, 99: 0}
                            }
                        category_totals[cat]['total_prob'] += prob
                        
                        # Update threshold counts
                        prob_percentage = prob
                        for threshold in [10, 20, 30, 40, 50, 60, 70, 80, 85, 90, 95, 99]:
                            if prob_percentage > threshold:
                                category_totals[cat]['thresholds'][threshold] += 1
                    
                    # Compare and record the result
                    predicted_result = 1 if not model_result['should_block'] else 0
                    
                    results.append({
                        "message": message,
                        "expected": expected_result,
                        "predicted": predicted_result,
                        "match": predicted_result == expected_result,
                        "categories": model_result['probabilities']
                    })
                except KeyError as e:
                    print(f"Missing required field in row: {e}")
                    continue
                except ValueError as e:
                    print(f"Invalid value in row: {e}")
                    continue
                except Exception as e:
                    print(f"Unexpected error processing row: {e}")
                    continue
                
    except FileNotFoundError:
        print(f"File not found: {file_path}")
        return [], {}
    except Exception as e:
        print(f"Error reading file: {e}")
        return [], {}
    
    return results, category_totals

def print_results(results, category_totals):
    """
    Print the results of the evaluation in a table format with category probabilities.
    """
    # First print the message results table
    message_width = 65
    status_width = 8
    match_width = 6
    cat_width = 11
    
    print("\nModeration Results:")
    header = (
        "+" + "-" * message_width + "+" + "-" * status_width + "+" + "-" * status_width + 
        "+" + "-" * match_width + "+" + "-" * cat_width + "+"
    )
    print(header)
    
    # Print column headers
    print(
        f"|{'Message':<{message_width}}"
        f"|{'Expected':<{status_width}}"
        f"|{'Predict':<{status_width}}"
        f"|{'Match':<{match_width}}"
        f"|{'Sex/Minor':<{cat_width}}|"
    )
    print(header)
    
    # Print each row
    for result in results:
        message = result['message'][:62] + "..." if len(result['message']) > message_width else result['message']
        message = message.ljust(message_width)
        
        expected = 'Pass' if result['expected'] == 1 else 'Block'
        predicted = 'Pass' if result['predicted'] == 1 else 'Block'
        match = '✓' if result['match'] else '✗'
        
        # Get category probabilities
        cats = result['categories']
        
        # Format probabilities with bold if over threshold
        def format_prob(prob):
            return f"*{prob:>8.1f}%*" if prob > 70 else f"{prob:>9.1f}%"
        
        print(
            f"|{message}"
            f"|{expected:<{status_width}}"
            f"|{predicted:<{status_width}}"
            f"|{match:^{match_width}}"
            f"|{format_prob(cats['sexual/minors']):<{cat_width}}|"
        )
    
    print(header)
    
    # Print category statistics
    total_cases = len(results)
    thresholds = [10, 20, 30, 40, 50, 60, 70, 80, 85, 90, 95, 99]
    
    print("\nCategory Statistics:")
    header_line = "+" + "-" * 30
    for _ in thresholds:
        header_line += "+" + "-" * 15
    header_line += "+" + "-" * 15 + "+"
    print(header_line)
    
    # Print header
    header_text = f"|{'Category':<30}"
    for threshold in thresholds:
        header_text += f"|{'Count >'}{threshold}{'%':<11}"
    header_text += f"|{'Avg Prob':<15}|"
    print(header_text)
    print(header_line)
    
    # Print data for each category
    category = 'sexual/minors'
    data_line = f"|{category:<30}"
    
    # Calculate counts for each threshold
    for threshold in thresholds:
        count = sum(1 for r in results if r['categories'][category] > threshold)
        data_line += f"|{count:>15}"
    
    # Calculate average probability
    avg_prob = sum(r['categories'][category] for r in results) / total_cases if total_cases > 0 else 0
    data_line += f"|{avg_prob:>13.1f}%|"
    print(data_line)
    print(header_line)
    
    # Print percentage statistics
    print("\nPercentage Statistics:")
    print(header_line)
    
    # Print header (reuse from above)
    header_text = f"|{'Category':<30}"
    for threshold in thresholds:
        header_text += f"|{'% >'}{threshold}{'%':<12}"
    header_text += f"|{'Avg Prob':<15}|"
    print(header_text)
    print(header_line)
    
    # Print percentage data
    data_line = f"|{category:<30}"
    for threshold in thresholds:
        count = sum(1 for r in results if r['categories'][category] > threshold)
        percentage = (count / total_cases * 100) if total_cases > 0 else 0
        data_line += f"|{percentage:>13.1f}%"
    data_line += f"|{avg_prob:>13.1f}%|"
    print(data_line)
    print(header_line)
    
    # Print accuracy statistics
    print("\nAccuracy Statistics:")
    print(header_line)
    
    # Print header
    header_text = f"|{'Category':<30}"
    for threshold in thresholds:
        header_text += f"|{'Acc >'}{threshold}{'%':<11}"
    header_text += f"|{'Avg Prob':<15}|"
    print(header_text)
    print(header_line)
    
    # Print accuracy data
    data_line = f"|{category:<30}"
    for threshold in thresholds:
        # Calculate accuracy for this threshold
        correct_predictions = 0
        total_predictions = len(results)
        
        for result in results:
            prob = result['categories'][category]
            predicted_block = prob > threshold
            expected_block = result['expected'] == 0  # 0 means should block
            if predicted_block == expected_block:
                correct_predictions += 1
        
        accuracy = (correct_predictions / total_predictions * 100) if total_predictions > 0 else 0
        data_line += f"|{accuracy:>13.1f}%"
    
    data_line += f"|{avg_prob:>13.1f}%|"
    print(data_line)
    print(header_line)
    
    # Print summary statistics
    matches = sum(1 for r in results if r['match'])
    accuracy = (matches / total_cases * 100) if total_cases > 0 else 0
    
    print(f"\nSummary:")
    print(f"Total cases: {total_cases}")
    print(f"Correct predictions: {matches}")
    print(f"Accuracy: {accuracy:.2f}%")

# Path to the test cases file
csv_file_path = "test_cases.csv"

# Evaluate and print the results
evaluation_results, category_totals = evaluate_test_cases(csv_file_path)
print_results(evaluation_results, category_totals)