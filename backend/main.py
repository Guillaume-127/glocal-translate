import os
import threading
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from llama_cpp import Llama

app = FastAPI(title="Glocal Translate")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
MODEL_PATH = os.path.join(BASE_DIR, "models", "qwen2.5-1.5b-instruct-q4_k_m.gguf")

# Load Model
print("[Backend] Loading LLM into memory...")
try:
    llm = Llama(
        model_path=MODEL_PATH,
        n_ctx=2048,
        n_threads=max(1, os.cpu_count() - 1) if os.cpu_count() else 4,
        verbose=False # Set to True for debugging llama.cpp logs
    )
    print("[Backend] LLM loaded successfully.")
except Exception as e:
    print(f"[Backend] Error loading model: {e}")
    llm = None

llm_lock = threading.Lock()

# API Models
class TranslateRequest(BaseModel):
    text: str
    source_lang: str
    target_lang: str

class SuggestRequest(BaseModel):
    text: str
    source_lang: str
    target_lang: str

def generate_translation(text: str, source_lang: str, target_lang: str) -> str:
    if not llm:
        raise HTTPException(status_code=500, detail="Model is not loaded.")
    
    prompt = f"""<|im_start|>system
You are an expert, bilingual translator. Translate the following text from {source_lang} to {target_lang}.
CRITICAL INSTRUCTION: Do NOT translate word-for-word. Focus entirely on the CONTEXT, MEANING, and TONE. Provide a natural, fluent, and idiomatic translation that sounds like a native speaker wrote it. Provide ONLY the translated text, without explanation, quotes, or markdown formatting.
<|im_end|>
<|im_start|>user
{text}
<|im_end|>
<|im_start|>assistant
"""
    
    with llm_lock:
        response = llm(
            prompt,
            max_tokens=512,
            stop=["<|im_end|>"],
            temperature=0.25, # Slightly higher temperature for more natural/contextual phrasing
            top_k=40,
            top_p=0.9,
        )
    
    res_text = response["choices"][0]["text"].strip()
    return res_text

def generate_suggestion(text: str, source_lang: str, target_lang: str) -> str:
    if not llm:
        raise HTTPException(status_code=500, detail="Model is not loaded.")
    
    # Context-aware completion to help user write their sentence
    prompt = f"""<|im_start|>system
You are a writing assistant helping the user type a sentence in {source_lang} that they want to translate to {target_lang}. Given their current incomplete text, suggest the next 1 to 3 words to naturally continue the sentence. Provide ONLY the suggested words, nothing else.
<|im_end|>
<|im_start|>user
{text}
<|im_end|>
<|im_start|>assistant
"""
    
    with llm_lock:
        response = llm(
            prompt,
            max_tokens=15,
            stop=["<|im_end|>", "\n", ".", ","],
            temperature=0.3,
        )
    
    res_text = response["choices"][0]["text"].strip()
    return res_text

@app.post("/api/translate")
def translate(req: TranslateRequest):
    if not req.text.strip():
        return {"result": ""}
    
    translation = generate_translation(req.text, req.source_lang, req.target_lang)
    return {"result": translation}

@app.post("/api/suggest")
def suggest_words(req: SuggestRequest):
    if not req.text.strip() or len(req.text.strip().split()) < 1:
        return {"suggestion": ""}
    
    suggestion = generate_suggestion(req.text, req.source_lang, req.target_lang)
    return {"suggestion": suggestion}

# Mount Frontend static files
if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

    @app.get("/")
    def serve_frontend():
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
