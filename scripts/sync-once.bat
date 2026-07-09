@echo off
REM ============================================================
REM  sync-once.bat — یک بار sync می‌کند (بدون حلقه)
REM  توسط Task Scheduler هر ۵ دقیقه صدا زده می‌شود
REM ============================================================

cd /d "%~dp0\.."

REM اگر تغییری نبود، خارج شو
git status --porcelain > "%TEMP%\gitchk.txt"
for %%A in ("%TEMP%\gitchk.txt") do set size=%%~zA
if "%size%"=="0" exit /b 0

git add -A
git commit -m "auto-sync: %date% %time%"
git push origin main
exit /b 0
