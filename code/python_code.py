from datasets import load_dataset
from utils_jsonl import read_jsonl 

#--- Configuration ---
# Your Hugging Face username or organization name and desired dataset name. 
# Replace 'your-username' with your actual username or organization.
repo_id = "your-username/my-awesome-viewable-dataset"

# The path to your local JSONL file.
local_file_path = "my_dataset.jsonl"

# --- Load the local JSONL file into a Dataset ---
dataset = load_dataset('json', data_files=local_file_path, split='train')
print(f"Dataset loaded from {local_file_path}:")
print(dataset)
print(dataset[0])

# --- Push the dataset to Hugging Face Hub --- 
print(f"Attempting to push dataset to {repo_id}...")
dataset.push_to_hub(repo_id)
print(f"Successfully pushed dataset to '{repo_id}'")
print(f"You can view your dataset here: https://huggingface.co/datasets/{repo_id}")