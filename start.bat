@echo off
rem ---------------------------------------------------------------------------
rem  Scopeo - lanceur Windows
rem  Double-cliquez sur ce fichier. Au premier lancement, il installe ce qui
rem  manque ; ensuite, il demarre l'application et ouvre le navigateur.
rem ---------------------------------------------------------------------------
setlocal
chcp 65001 >nul
cd /d "%~dp0"

if "%SCOPEO_PORT%"=="" set SCOPEO_PORT=8000
set VENV_PY=server\.venv\Scripts\python.exe

rem --- Python ----------------------------------------------------------------
if not exist "%VENV_PY%" (
  set PY=
  where py >nul 2>nul && set PY=py -3
  if not defined PY ( where python >nul 2>nul && set PY=python )
  if not defined PY (
    echo.
    echo  Python 3.11 ou plus recent est requis : https://www.python.org/downloads/
    echo  Cochez "Add python.exe to PATH" pendant l'installation, puis relancez.
    echo.
    pause
    exit /b 1
  )
  echo Installation du serveur local...
  call %PY% -m venv server\.venv || goto :error
)

rem Composants du serveur : installes au premier lancement, puis a chaque
rem changement de server\requirements.txt (nouvelle version de l'archive).
fc /b server\requirements.txt server\.venv\requirements.txt >nul 2>nul
if errorlevel 1 (
  echo Installation des composants du serveur...
  "%VENV_PY%" -m pip install --disable-pip-version-check -q -r server\requirements.txt || goto :error
  copy /y server\requirements.txt server\.venv\requirements.txt >nul
)

rem --- Interface (deja compilee dans les versions publiees) -----------------
if not exist "dist\index.html" (
  where npm >nul 2>nul || (
    echo.
    echo  L'interface n'est pas compilee et Node.js est introuvable.
    echo  Telechargez la version "portable" depuis la page Releases du projet,
    echo  ou installez Node.js 20+ : https://nodejs.org
    echo.
    pause
    exit /b 1
  )
  echo Compilation de l'interface...
  call npm ci --no-audit --no-fund || goto :error
  call npx vite build || goto :error
)

echo.
echo  Scopeo : http://127.0.0.1:%SCOPEO_PORT%
echo  Fermez cette fenetre pour arreter l'application.
echo.
start "" cmd /c "timeout /t 3 >nul & start http://127.0.0.1:%SCOPEO_PORT%"
"%VENV_PY%" -m uvicorn app.main:app --app-dir server --host 127.0.0.1 --port %SCOPEO_PORT%
exit /b 0

:error
echo.
echo  L'installation a echoue. Consultez les messages ci-dessus.
pause
exit /b 1
