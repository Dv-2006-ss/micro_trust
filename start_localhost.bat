@echo off
setlocal EnableDelayedExpansion

echo ========================================================
echo Micro-Trust V2: Localhost Startup Sequence
echo ========================================================

:: 1. Cleanup Old Processes First
echo.
echo [CHECK] Ensuring ports are free to prevent EADDRINUSE errors...
call npx kill-port 3000 4200 8000 >nul 2>&1

:: 2. Tesseract Sanity Check
echo.
echo [CHECK] Verifying Tesseract OCR...
tesseract --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [OK] Tesseract PATH check bypassed. Relying on processor's hardcoded binary path...
) else (
    echo [OK] Tesseract is installed in PATH.
)

:: 2. Python Intelligence Engine
echo.
echo [1/3] Booting Python Intelligence Engine...
cd intelligence-engine
if not exist "venv" (
    echo Creating Python Virtual Environment...
    python -m venv venv
)
call venv\Scripts\activate
echo Installing pip requirements (this may take a minute on first run)...
python -m pip install --upgrade pip >nul
pip install -r requirements.txt >nul
start "Micro-Trust: FastAPI Boilerplate" cmd /c "call venv\Scripts\activate && uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload"
cd ..

:: 3. Node.js API Orchestrator
echo.
echo [2/3] Booting Node.js Orchestrator...
cd backend
if not exist "node_modules" (
    echo Running npm install in backend...
    call npm install >nul
)
start "Micro-Trust: Node.js Backend" cmd /c "npm run dev"
cd ..

:: 4. Angular 21 (Zoneless) UI
echo.
echo [3/3] Booting Angular UI...
cd frontend
if not exist "node_modules" (
    echo Running npm install in frontend...
    call npm install --legacy-peer-deps >nul
)
start "Micro-Trust: Angular Frontend" cmd /c "npx ng serve --port 4200 --open"
cd ..

echo.
echo ========================================================
echo SYSTEM BOOT COMPLETE!
echo.
echo FastAPI Docs:   http://localhost:8000/docs
echo Node Wrapper:   http://localhost:3000/
echo Angular App:    http://localhost:4200/
echo ========================================================
echo Press any key to close this launcher. The servers will continue running in new windows.
pause >nul
