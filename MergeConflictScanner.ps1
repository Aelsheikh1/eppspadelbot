# Simple Conflict Resolver Script
# This script removes merge conflict markers and keeps ONLY the working version of the code
# By default, it keeps the current/HEAD version (your version) of the code

param(
    [Parameter(Mandatory=$false)]
    [string]$ProjectPath = (Get-Location),
    
    [Parameter(Mandatory=$false)]
    [switch]$UseIncomingVersion = $false   # Set to $true to keep the incoming version instead
)

# Banner
Write-Host "`n====================================================" -ForegroundColor Cyan
Write-Host "            SIMPLE CONFLICT RESOLVER                " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

# Check if the path exists
if (-not (Test-Path -Path $ProjectPath)) {
    Write-Host "Error: The specified path does not exist: $ProjectPath" -ForegroundColor Red
    exit 1
}

Write-Host "Scanning for merge conflicts in: $ProjectPath" -ForegroundColor Cyan

# Files to exclude from scanning
$excludeDirs = @("node_modules", ".git", "build", "dist", ".next", ".cache")

# Get all files recursively, excluding the directories we don't want to scan
$files = Get-ChildItem -Path $ProjectPath -Recurse -File | Where-Object {
    $exclude = $false
    foreach ($dir in $excludeDirs) {
        if ($_.FullName -like "*\$dir\*") {
            $exclude = $true
            break
        }
    }
    -not $exclude
}

$totalFiles = $files.Count
$processed = 0
$resolvedFiles = 0

Write-Host "Found $totalFiles files to scan" -ForegroundColor Yellow

# Process each file
foreach ($file in $files) {
    $processed++
    $percentComplete = [math]::Round(($processed / $totalFiles) * 100, 1)
    Write-Progress -Activity "Checking files for conflicts" -Status "$percentComplete% Complete" -PercentComplete $percentComplete
    
    try {
        # Read file content
        $content = Get-Content -Path $file.FullName -Raw -ErrorAction Stop
        
        # Check if file has conflict markers
        if ($content -match '<{7}' -and $content -match '={7}' -and $content -match '>{7}') {
            Write-Host "Found conflicts in: $($file.FullName)" -ForegroundColor Yellow
            
            # Process the content - split by conflict markers
            $newContent = $content
            
            # Use regex to find all conflict blocks
            $pattern = '(<{7}[^\r\n]*\r?\n)([\s\S]*?)(={7}\r?\n)([\s\S]*?)(>{7}[^\r\n]*\r?\n)'
            
            # Check if there are conflict markers in the file
            if ($newContent -match $pattern) {
                # Replace each conflict block with the desired version
                if ($UseIncomingVersion) {
                    # Keep only the INCOMING version (after =======)
                    $newContent = [regex]::Replace($newContent, $pattern, {
                        param($match)
                        return $match.Groups[4].Value  # Return only the incoming version
                    })
                } else {
                    # Keep only the CURRENT version (before =======)
                    $newContent = [regex]::Replace($newContent, $pattern, {
                        param($match)
                        return $match.Groups[2].Value  # Return only the current version
                    })
                }
                
                # Write the modified content back to the file
                Set-Content -Path $file.FullName -Value $newContent -NoNewline
                $resolvedFiles++
                Write-Host "  [RESOLVED] Conflict resolved in: $($file.FullName)" -ForegroundColor Green
            }
        }
    }
    catch {
        Write-Host "  [ERROR] Failed to process $($file.FullName): $_" -ForegroundColor Red
    }
}

Write-Progress -Activity "Checking files for conflicts" -Completed

Write-Host "`nProcessed $totalFiles files" -ForegroundColor Cyan
Write-Host "Found and resolved conflicts in $resolvedFiles files" -ForegroundColor Green

if ($UseIncomingVersion) {
    Write-Host "Used the INCOMING version of code in conflict areas" -ForegroundColor Yellow
} else {
    Write-Host "Used the CURRENT version of code in conflict areas" -ForegroundColor Yellow
}

Write-Host "`nDone!" -ForegroundColor Green