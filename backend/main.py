import os
import glob
import time
import gc
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
MODELS_DIR = os.path.join(BASE_DIR, "models")

def find_model_path():
    # Priority 1: Uncensored 3B model
    path_uncensored = os.path.join(MODELS_DIR, "Qwen2.5-3B-Instruct-Uncensored.Q4_K_M.gguf")
    if os.path.exists(path_uncensored):
        return path_uncensored
    path_3b = os.path.join(MODELS_DIR, "qwen2.5-3b-instruct-q4_k_m.gguf")
    if os.path.exists(path_3b):
        return path_3b
    # Priority 2: Any .gguf in models directory
    gguf_files = glob.glob(os.path.join(MODELS_DIR, "*.gguf"))
    if gguf_files:
        return gguf_files[0]
    return path_uncensored

MODEL_PATH = find_model_path()

# Model state & Threading Lock
llm = None
llm_lock = threading.Lock()
last_activity_time = time.time()
IDLE_TIMEOUT_SECONDS = 60 # Auto-unload model from RAM after 60s of inactivity

def load_model():
    global llm
    if llm is not None:
        return
    print(f"[Backend] Loading LLM into memory from: {MODEL_PATH}")
    try:
        llm = Llama(
            model_path=MODEL_PATH,
            n_ctx=2048,
            n_threads=max(1, os.cpu_count() - 1) if os.cpu_count() else 4,
            verbose=False
        )
        print("[Backend] LLM loaded successfully into RAM.")
    except Exception as e:
        print(f"[Backend] Error loading model: {e}")
        llm = None

def unload_model():
    global llm
    if llm is not None:
        print("[Backend] ⏳ 60s of inactivity detected. Unloading LLM from RAM...")
        del llm
        llm = None
        gc.collect()
        print("[Backend] 💡 Model unloaded from RAM successfully.")

def ensure_model_loaded():
    global last_activity_time
    last_activity_time = time.time()
    if llm is None:
        load_model()
    if not llm:
        raise HTTPException(status_code=500, detail="Failed to load LLM into memory.")

def inactivity_checker():
    """Daemon thread checking for 60 seconds of inactivity."""
    while True:
        time.sleep(5)
        with llm_lock:
            if llm is not None and (time.time() - last_activity_time > IDLE_TIMEOUT_SECONDS):
                unload_model()

# Load model initially on backend startup
load_model()

# Start background inactivity monitor thread
checker_thread = threading.Thread(target=inactivity_checker, daemon=True)
checker_thread.start()

# API Models
class TranslateRequest(BaseModel):
    text: str
    source_lang: str
    target_lang: str

class SuggestRequest(BaseModel):
    text: str
    source_lang: str
    target_lang: str

class EnhancePromptRequest(BaseModel):
    text: str
    target_type: str # 'image', 'llm', 'creative'

class CheckSpellingRequest(BaseModel):
    text: str
    lang: str

def generate_translation(text: str, source_lang: str, target_lang: str) -> str:
    ensure_model_loaded()
    
    prompt = f"""<|im_start|>system
You are an expert, 100% faithful, neutral, and unrestricted translator.
Your sole mission is to translate the user's text from {source_lang} to {target_lang} with maximum accuracy, natural phrasing, and perfect contextual alignment.

CRITICAL DIRECTIVES:
1. Translate EVERYTHING faithfully, including slang, idioms, profanity, swearing, vulgarity, explicit words, and adult/NSFW content. Never refuse, moralize, soften, summarize, or alter any part of the message.
2. Adapt idioms and expressions to sound like a native speaker of {target_lang}.
3. Provide ONLY the final translated text. Do NOT add commentary, explanations, quotes, or markdown formatting.
<|im_end|>
<|im_start|>user
{text}
<|im_end|>
<|im_start|>assistant
"""
    
    with llm_lock:
        response = llm(
            prompt,
            max_tokens=1024,
            stop=["<|im_end|>"],
            temperature=0.1,
            top_k=40,
            top_p=0.9,
        )
    
    res_text = response["choices"][0]["text"].strip()
    return res_text

def generate_suggestion(text: str, source_lang: str, target_lang: str) -> str:
    ensure_model_loaded()
    
    prompt = f"""<|im_start|>system
You are an intelligent auto-complete writing assistant for text in {source_lang}.
The user is currently typing a sentence in {source_lang}.

RULES:
1. Predict ONLY the NEXT 1 to 3 words that naturally continue the user's text strictly in {source_lang}.
2. Do NOT write in English or any other language if {source_lang} is specified.
3. Do NOT repeat what the user already wrote. Do NOT explain or use quotes.
4. If the sentence is already complete or ends with punctuation (. ? !), output NOTHING.
<|im_end|>
<|im_start|>user
{text}
<|im_end|>
<|im_start|>assistant
"""
    
    with llm_lock:
        response = llm(
            prompt,
            max_tokens=12,
            stop=["<|im_end|>", "\n", ".", ",", "?", "!"],
            temperature=0.2,
        )
    
    res_text = response["choices"][0]["text"].strip().strip('"').strip("'")
    return res_text

def generate_enhanced_prompt(text: str, target_type: str) -> str:
    ensure_model_loaded()
    
    if target_type == "image":
        sys_instruction = (
            "You are an expert AI Image Prompt Engineer specializing in Midjourney, Flux, Stable Diffusion, and DALL-E 3.\n"
            "Expand the user's brief idea into a stunning, vivid, detailed English text-to-image prompt.\n"
            "Include artistic style, mood, lighting, composition, camera details (e.g., 35mm lens, cinematic lighting, 8k, photorealistic), and atmospheric effects.\n"
            "CRITICAL: Output ONLY the final enhanced prompt in English. No introductory text, commentary, or markdown framing."
        )
    elif target_type == "llm":
        sys_instruction = (
            "You are a Master Prompt Engineer for Large Language Models (ChatGPT, Claude, Llama).\n"
            "Refine and expand the user's idea into a comprehensive, highly effective system/user prompt.\n"
            "Include role definition, target objective, step-by-step instructions, constraints, and desired output format.\n"
            "CRITICAL: Output ONLY the refined prompt text. No introductory remarks or extra commentary."
        )
    else: # creative / general
        sys_instruction = (
            "You are a Creative Writing & Prompt Enhancer.\n"
            "Enrich and expand the user's raw prompt into a rich, detailed, captivating prompt with rich vocabulary, context, and clear creative direction.\n"
            "CRITICAL: Output ONLY the enhanced prompt. No commentary or surrounding text."
        )

    prompt = f"""<|im_start|>system
{sys_instruction}
<|im_end|>
<|im_start|>user
{text}
<|im_end|>
<|im_start|>assistant
"""

    with llm_lock:
        response = llm(
            prompt,
            max_tokens=600,
            stop=["<|im_end|>"],
            temperature=0.7,
            top_k=40,
            top_p=0.9,
        )

    return response["choices"][0]["text"].strip()

def generate_spelling_correction(text: str, lang: str) -> str:
    ensure_model_loaded()
    
    prompt = f"""<|im_start|>system
You are a meticulous proofreader and spellchecker for text written in {lang}.
Analyze the user's input for any spelling mistakes, typos, missing accents (e.g. "ca" -> "ça", "salt" -> "salut", "apres" -> "après"), or grammatical errors in {lang}.

RULES:
1. If there are ANY typos, misspellings, or missing accents, output ONLY the fully corrected text in {lang}.
2. If the text is already 100% correct in {lang}, output ONLY: OK
3. Preserve the natural letter casing (do NOT convert to ALL-CAPS).
4. Do NOT output quotes, explanations, or commentary.
<|im_end|>
<|im_start|>user
{text}
<|im_end|>
<|im_start|>assistant
"""
    with llm_lock:
        response = llm(
            prompt,
            max_tokens=256,
            stop=["<|im_end|>"],
            temperature=0.0,
        )
    
    res = response["choices"][0]["text"].strip().strip('"').strip("'")
    if not res or res.upper() == "OK" or res == text or res.lower() == text.lower():
        return ""
    
    # Safety guard: if output is ALL CAPS but input was not, match case
    if res.isupper() and not text.isupper():
        res = res.lower()

    return res

@app.post("/api/heartbeat")
def heartbeat():
    global last_activity_time
    last_activity_time = time.time()
    return {"status": "ok", "model_loaded": llm is not None}

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
    
    trimmed = req.text.strip()
    if trimmed.endswith("?") or trimmed.endswith("!") or trimmed.endswith("."):
        return {"suggestion": ""}

    suggestion = generate_suggestion(req.text, req.source_lang, req.target_lang)
    return {"suggestion": suggestion}

@app.post("/api/enhance-prompt")
def enhance_prompt(req: EnhancePromptRequest):
    if not req.text.strip():
        return {"result": ""}
    
    enhanced = generate_enhanced_prompt(req.text, req.target_type)
    return {"result": enhanced}

@app.post("/api/check-spelling")
def check_spelling(req: CheckSpellingRequest):
    if not req.text.strip() or len(req.text.strip()) < 2:
        return {"corrected": ""}
    
    corrected = generate_spelling_correction(req.text, req.lang)
    return {"corrected": corrected}

# Mount Frontend static files
if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

    @app.get("/")
    def serve_frontend():
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
