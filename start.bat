@echo off
if not "%1"=="hidden" (
    start /b powershell -WindowStyle Hidden -Command "Start-Process cmd.exe -ArgumentList '/c \"\"%~f0\" hidden\"' -WindowStyle Hidden"
    exit /b
)

setlocal
cd /d "%~dp0"

echo =======================================================
echo Local Translation AI & Prompt Enhancer - Hidden CPU Mode
echo =======================================================

IF NOT EXIST "venv" (
    echo [INFO] Creating Python virtual environment...
    python -m venv venv
    IF ERRORLEVEL 1 (
        exit /b 1
    )
)

call venv\Scripts\activate.bat

pip install -r requirements.txt
IF ERRORLEVEL 1 (
    exit /b 1
)

pip install llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cpu
IF ERRORLEVEL 1 (
    exit /b 1
)

python backend\downloader.py
IF ERRORLEVEL 1 (
    exit /b 1
)

start /b powershell -WindowStyle Hidden -Command "Start-Sleep -Seconds 3; Start-Process 'http://127.0.0.1:8080/'"

"venv\Scripts\uvicorn.exe" backend.main:app --host 127.0.0.1 --port 8080

exit /b 0
