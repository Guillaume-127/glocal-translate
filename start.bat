@echo off
setlocal

echo =======================================================
echo Local Translation AI - CPU Edition
echo =======================================================

cd /d "%~dp0"

IF NOT EXIST "venv" (
    echo [INFO] Creating Python virtual environment...
    python -m venv venv
    IF ERRORLEVEL 1 (
        echo [ERROR] Failed to create virtual environment. Ensure Python is installed and in PATH.
        pause
        exit /b 1
    )
)

echo [INFO] Activating virtual environment...
call venv\Scripts\activate.bat

echo [INFO] Installing/Updating dependencies...
pip install -r requirements.txt
IF ERRORLEVEL 1 (
        echo [ERROR] Failed to install base dependencies.
        pause
        exit /b 1
)

echo [INFO] Installing llama-cpp-python (pre-built CPU wheel for Windows)...
pip install llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cpu
IF ERRORLEVEL 1 (
        echo [ERROR] Failed to install llama-cpp-python.
        pause
        exit /b 1
)

echo [INFO] Checking / downloading LLM Model...
python backend\downloader.py
IF ERRORLEVEL 1 (
        echo [ERROR] Failed to download model.
        pause
        exit /b 1
)

echo [INFO] Opening user interface in 3 seconds...
start /b powershell -WindowStyle Hidden -Command "Start-Sleep -Seconds 3; Start-Process 'http://127.0.0.1:8080/'"

echo [INFO] Starting FastAPI backend...
echo =======================================================
echo [SUCCESS] The application is now running.
echo [IMPORTANT] DO NOT close this window. Minimalize it if you want.
echo [IMPORTANT] To completely stop the app, press CTRL+C or close this window.
echo =======================================================
"venv\Scripts\uvicorn.exe" backend.main:app --host 127.0.0.1 --port 8080

exit /b 0
