# Glocal Translate

A completely private, open-source, and local translation application running on your CPU. It uses the `llama-cpp-python` backend and `Qwen2.5-1.5B-Instruct-GGUF` to provide blazing fast translations and context-aware word suggestions entirely offline.

![Glocal Translate UI Demo](file:///C:/Users/guill/.gemini/antigravity/brain/c1e38a62-4388-49a6-9f83-6640f4196980/237-0.png)

## Features

- **100% Offline & Private:** No API keys, no cloud servers. All requests run locally on your hardware.
- **CPU Optimized:** Uses GGUF quantification and pre-compiled CPU wheels for maximum performance on standard machines.
- **Auto-Debounce Translation:** Translates automatically as you type, exactly like Google Translate.
- **Context-Aware Suggestions:** The AI suggests the next words for your sentence to help you write faster.
- **One-Click Launcher:** `start.bat` handles virtual environment creation, pip installs, model downloading (HuggingFace), and server launching automatically.
- **Slick UI:** Beautiful Dark Mode interface built in Vanilla HTML/CSS/JS.

## Prerequisites

- **Python 3.10+** installed on your system.
- Ensure Python is added to your Windows `PATH`.

## Installation & Usage

1. **Clone the repository** (or download as ZIP).
2. **Run the application**:
   - Double-click on `start.bat`.
3. **Wait for setup** (First launch only):
   - The script will automatically create a Python virtual environment.
   - It will download the necessary model (~1.1GB) from Hugging Face into a `models/` folder.
4. **Translate**:
   - The UI will automatically pop open in your default browser at `http://127.0.0.1:8000/`.
   - Start typing!

## Project Structure

```text
├── backend/
│   ├── main.py          # FastAPI application
│   └── downloader.py    # Hugging Face model downloader script
├── frontend/
│   ├── index.html       # Translation UI
│   ├── style.css        # Stylesheet
│   └── app.js           # Client-side logic
├── models/              # Directory where the GGUF model is stored
├── start.bat            # Windows one-click execution script
└── requirements.txt     # Python dependencies
```

## Stopping the App

Leave the black console window open while using the app. To stop it, simply **close the console window** or press `CTRL+C` inside it.

## Troubleshooting

- **Server crashes while typing:** Ensure the `threading.Lock()` is present in `backend/main.py` if you edited it. This prevents concurrent inference requests from crashing `llama.cpp`.
- **ModuleNotFoundError:** Try deleting the `venv` folder and run `start.bat` again to trigger a clean install.

## License

MIT License. You are free to modify and distribute this software.
