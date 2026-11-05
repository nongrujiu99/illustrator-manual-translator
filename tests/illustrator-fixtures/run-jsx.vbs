Option Explicit
Dim appRef, filePath
Set appRef = CreateObject("Illustrator.Application.CC.2019")
filePath = CreateObject("Scripting.FileSystemObject").GetAbsolutePathName(WScript.Arguments(0))
appRef.DoJavaScript "$.evalFile(new File('" & Replace(filePath, "\", "/") & "'))"
WScript.Echo "JSX_DONE " & filePath
