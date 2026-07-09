@echo off
REM حذف فایل‌های حجیم/اضافی از کل تاریخچهٔ git
set FILTER_BRANCH_SQUELCH_WARNING=1

git filter-branch --force --index-filter ^
 "git rm -r --cached --ignore-unmatch .next postgresql node_modules upload download backups dev.log dev-server.log tsconfig.tsbuildinfo chat_extracted_1.txt chat_extracted_2.txt page.tsx route.ts" ^
 --prune-empty --tag-name-filter cat -- --all

echo FILTER_BRANCH_DONE
