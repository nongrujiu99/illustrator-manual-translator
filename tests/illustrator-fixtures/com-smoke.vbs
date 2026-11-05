Option Explicit
Dim appRef, docRef
On Error Resume Next
Set appRef = CreateObject("Illustrator.Application.CC.2019")
If Err.Number <> 0 Then
  WScript.Echo "COM_ERROR " & Err.Number & " " & Err.Description
  WScript.Quit 1
End If
On Error GoTo 0
WScript.Echo "VERSION " & appRef.Version
WScript.Echo "OPEN_DOCUMENTS " & appRef.Documents.Count
For Each docRef In appRef.Documents
  WScript.Echo "DOCUMENT " & docRef.Name & " ARTBOARDS " & docRef.Artboards.Count & " TEXT_FRAMES " & docRef.TextFrames.Count
Next
