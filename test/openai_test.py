import openai
import pandas as pd
import csv

# Set your OpenAI API key
openai.api_key = ''

# Load the CSV file
file_path = 'sample_prohibited_messages.csv'  # Adjust the path as needed
data = pd.read_csv(file_path)

# Function to call OpenAI Moderation API using the omni-moderation-latest model
def check_moderation(content):
    response = openai.moderations.create(
        model="omni-moderation-latest",
        input=content
    )

    # log the response
    print(response)

    # Access the results from the response object using .data
    return response.results[0]  # Access the first item from the list of results

# List to store the results
results = []

# Iterate through each message in the CSV and classify it using the OpenAI API
for index, row in data.iterrows():
    content = row['content']
    moderation_result = check_moderation(content)
    
    # Extract moderation results using attribute access
    flagged = moderation_result.flagged
    categories = moderation_result.categories
    category_scores = moderation_result.category_scores
    
    # Create a result dictionary for each message
    result = {
        'content': content,
        'flagged': flagged,
        'harassment': categories.harassment,
        'harassment_threatening': categories.harassment_threatening,
        'hate': categories.hate,
        'hate_threatening': categories.hate_threatening,
        'illicit': categories.illicit,
        'illicit_violent': categories.illicit_violent,
        'self_harm': categories.self_harm,
        'self_harm_intent': categories.self_harm_intent,
        'self_harm_instructions': categories.self_harm_instructions,
        'sexual': categories.sexual,
        'sexual_minors': categories.sexual_minors,
        'violence': categories.violence,
        'violence_graphic': categories.violence_graphic,
        'category_scores': category_scores
    }
    
    results.append(result)

# Save the results to a CSV file
output_file = 'moderation_results.csv'
with open(output_file, 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=['content', 'flagged', 'harassment', 'harassment_threatening', 'hate', 'hate_threatening', 'illicit', 'illicit_violent', 'self_harm', 'self_harm_intent', 'self_harm_instructions', 'sexual', 'sexual_minors', 'violence', 'violence_graphic', 'category_scores'])
    writer.writeheader()
    writer.writerows(results)

print(f'Results saved to {output_file}')