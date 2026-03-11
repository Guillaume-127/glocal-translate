import os
from huggingface_hub import hf_hub_download

MODEL_REPO = "Qwen/Qwen2.5-1.5B-Instruct-GGUF"
MODEL_FILE = "qwen2.5-1.5b-instruct-q4_k_m.gguf"
MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models")

def download_model():
    if not os.path.exists(MODEL_DIR):
        os.makedirs(MODEL_DIR)

    local_path = os.path.join(MODEL_DIR, MODEL_FILE)
    
    if os.path.exists(local_path):
        print(f"[Model Download] Model already exists at {local_path}")
        return

    print(f"[Model Download] Downloading model {MODEL_FILE} from {MODEL_REPO}... This may take a while.")
    try:
        downloaded_file = hf_hub_download(
            repo_id=MODEL_REPO,
            filename=MODEL_FILE,
            local_dir=MODEL_DIR
        )
        print(f"[Model Download] Download complete: {downloaded_file}")
    except Exception as e:
        print(f"[Model Download] Error downloading model: {e}")
        exit(1)

if __name__ == "__main__":
    download_model()
