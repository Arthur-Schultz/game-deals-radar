@echo off
cd /d "%~dp0"
echo Subindo o n8n do Game Deals Radar...
docker compose up -d
if errorlevel 1 (
  echo.
  echo Erro: confira se o Docker Desktop esta aberto e se o .env existe.
  pause
  exit /b 1
)
echo.
echo Pronto! Abrindo http://localhost:5679 ...
timeout /t 8 /nobreak >nul
start http://localhost:5679
pause
