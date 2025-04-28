# PowerShell script to fix merge conflicts by keeping the HEAD version
$files = Get-ChildItem -Path "c:\Users\Lenovo\Desktop\eppspadelbot-mainrev\eppspadelbot-main\src" -Recurse -Filter "*.js" | Where-Object { Get-Content $_.FullName | Select-String -Pattern "<<<<<<< HEAD" -Quiet }

foreach ($file in $files) {
    Write-Host "Fixing merge conflicts in $($file.FullName)"
    
    # Read the file content
    $content = Get-Content $file.FullName -Raw
    
    # Replace merge conflict markers with HEAD content
    $newContent = $content -replace "<<<<<<< HEAD\r?\n(.*?)\r?\n=======\r?\n.*?\r?\n>>>>>>> cfd635071d15c9d4887df80f3c1952808ecdc1df\r?\n", "`$1`n"
    
    # Write the updated content back to the file
    Set-Content -Path $file.FullName -Value $newContent -NoNewline
}

Write-Host "All merge conflicts have been fixed!"
