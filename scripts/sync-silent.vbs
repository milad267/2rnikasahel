' اجرای sync-once.bat به‌صورت کاملاً پنهان (بدون پنجره)
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
batPath = fso.BuildPath(scriptDir, "sync-once.bat")

Set WshShell = CreateObject("WScript.Shell")
WshShell.Run """" & batPath & """", 0, False
Set WshShell = Nothing
