$content = Get-Content 'c:\Users\EDG3\Downloads\medflix-v4\medflix-admin.html' -Raw
$content = $content -replace '(?s)async function smConfirmAddSem\(\) \{\r?\nasync function smConfirmAddSem\(\) \{', 'async function smConfirmAddSem() {'
[System.IO.File]::WriteAllText('c:\Users\EDG3\Downloads\medflix-v4\medflix-admin.html', $content, [System.Text.Encoding]::UTF8)
