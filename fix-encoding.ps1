$content = Get-Content 'c:\Users\EDG3\Downloads\medflix-v4\medflix-admin.html' -Raw
[System.IO.File]::WriteAllText('c:\Users\EDG3\Downloads\medflix-v4\medflix-admin.html', $content, [System.Text.Encoding]::UTF8)
