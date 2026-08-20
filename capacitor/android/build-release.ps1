Write-Host "=== BudzetsIMT release build ===" -ForegroundColor Cyan

$javaHome = "C:\Program Files\Android\Android Studio\jbr"
if (-not (Test-Path $javaHome)) {
    Write-Host "BRIDINAJUMS: JAVA_HOME celjs neeksiste: $javaHome" -ForegroundColor Yellow
    Write-Host "Palabo sa skripta JAVA_HOME mainigo, ja Android Studio instalets citur." -ForegroundColor Yellow
}
$env:JAVA_HOME = $javaHome

Set-Location $PSScriptRoot

Write-Host "`nPalaiz ./gradlew bundleRelease ..." -ForegroundColor Cyan
& ./gradlew.bat bundleRelease
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nBUILD NEIZDEVAS (exit code $LASTEXITCODE)." -ForegroundColor Red
    Read-Host "Nospied Enter, lai aizvertu"
    exit $LASTEXITCODE
}

$aabPath = "app\build\outputs\bundle\release\app-release.aab"
if (-not (Test-Path $aabPath)) {
    Write-Host "`nBUILD SUCCESSFUL, bet .aab fails nav atrasts sagaidamaja vieta: $aabPath" -ForegroundColor Red
    Read-Host "Nospied Enter, lai aizvertu"
    exit 1
}

$gradle = Get-Content "app\build.gradle" -Raw
$versionName = [regex]::Match($gradle, 'versionName\s+"([^"]+)"').Groups[1].Value
$versionCode = [regex]::Match($gradle, 'versionCode\s+(\d+)').Groups[1].Value

$dest = "releases"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
$destFile = "$dest\budzetsimt-$versionName-vc$versionCode.aab"
Copy-Item $aabPath $destFile -Force

Write-Host "`n=== GATAVS ===" -ForegroundColor Green
Write-Host "Play Console augsupieladei: $aabPath"
Write-Host "Lokala arhiva kopija:       $destFile"
Read-Host "`nNospied Enter, lai aizvertu"
