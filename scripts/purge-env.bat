@echo off
REM حذف کامل .env از تاریخچهٔ git
set FILTER_BRANCH_SQUELCH_WARNING=1

git filter-branch --force --index-filter ^
 "git rm --cached --ignore-unmatch .env .env.bak" ^
 --prune-empty --tag-name-filter cat -- --all

echo PURGE_ENV_DONE
