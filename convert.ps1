$c = Get-Content 'c:\Users\EDG3\Downloads\medflix-v4\diff.txt' -Raw
[System.IO.File]::WriteAllText('c:\Users\EDG3\Downloads\medflix-v4\diff-utf8.patch', $c, [System.Text.Encoding]::UTF8)
