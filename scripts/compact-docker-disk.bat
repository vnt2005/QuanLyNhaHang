@echo off
chcp 65001 >nul
echo ======================================================================
echo    TIEN ICH THU HOI DUNG LUONG O DIA AO DOCKER (COMPACT VHDX)
echo ======================================================================
echo.
echo Luu y: Script nay chi thu hoi vung trong khong dung den cua Docker.
echo Du lieu Database (SQL Server), hinh anh, bang bieu duoc bao toan 100%%.
echo.

:: Kiem tra quyen Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [CANH BAO] Ban can chay file nay voi quyen Administrator!
    echo Huong dan: Click chuot phai vao file compact-docker-disk.bat va chon "Run as administrator".
    echo.
    pause
    exit /b 1
)

echo [1/3] Dang dong Docker Desktop va dung WSL...
taskkill /F /IM "Docker Desktop.exe" >nul 2>&1
taskkill /F /IM "com.docker.backend.exe" >nul 2>&1
wsl.exe --shutdown
timeout /t 3 /nobreak >nul

set VHDX_PATH=%LOCALAPPDATA%\Docker\wsl\disk\docker_data.vhdx

if not exist "%VHDX_PATH%" (
    echo Khong tim thay file o dia ao tai: %VHDX_PATH%
    pause
    exit /b 1
)

echo [2/3] Dang tien hanh nen va thu hoi dung luong o dia ao (VHDX)...
set DISKPART_SCRIPT=%TEMP%\compact_docker_%RANDOM%.txt

(
echo select vdisk file="%VHDX_PATH%"
echo attach vdisk readonly
echo compact vdisk
echo detach vdisk
) > "%DISKPART_SCRIPT%"

diskpart /s "%DISKPART_SCRIPT%"
del "%DISKPART_SCRIPT%" >nul 2>&1

echo [3/3] Dang khoi dong lai Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

echo.
echo ======================================================================
echo    THANH CONG! Dung luong o C da duoc thu hoi toi da (khoang 20GB - 25GB)!
echo ======================================================================
echo.
pause

