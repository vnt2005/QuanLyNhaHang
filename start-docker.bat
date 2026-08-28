@echo off
setlocal
cd /d "%~dp0"

echo =============================================
echo  QuanLyNhaHang - Khoi dong toan bo bang Docker
echo =============================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-docker.ps1"
set EXIT_CODE=%ERRORLEVEL%

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Khoi dong that bai. Nhan phim bat ky de dong cua so nay.
  pause >nul
)

exit /b %EXIT_CODE%
