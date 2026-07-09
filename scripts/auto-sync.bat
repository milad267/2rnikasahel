@echo off
REM ============================================================
REM  auto-sync.bat — همگام‌سازی خودکار با GitHub هر ۵ دقیقه
REM  هر ۳۰۰ ثانیه: اگر تغییری وجود داشته باشد commit و push می‌کند
REM  برای توقف: پنجره را ببند یا Ctrl+C بزن
REM ============================================================

cd /d "%~dp0\.."

echo ============================================
echo   Auto-Sync GitHub  (هر 5 دقیقه)
echo   Repo: 2rnikasahel  ^|  Branch: main
echo   برای توقف: Ctrl+C یا بستن پنجره
echo ============================================
echo.

:loop
REM بررسی وجود تغییر
git status --porcelain > "%TEMP%\gitchk.txt"
for %%A in ("%TEMP%\gitchk.txt") do set size=%%~zA

if "%size%"=="0" (
    echo [%date% %time%]  تغییری نبود — رد شد.
) else (
    echo [%date% %time%]  تغییر پیدا شد — در حال commit و push...
    git add -A
    git commit -m "auto-sync: %date% %time%"
    git push origin main
    echo [%date% %time%]  انجام شد.
)

echo.
echo منتظر 5 دقیقه بعدی...
timeout /t 300 /nobreak > nul
goto loop
