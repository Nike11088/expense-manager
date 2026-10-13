$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
$env:VITE_NATIVE_TESTS = '1'
try {
    & powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-android.ps1 -DebugBuild
    if ($LASTEXITCODE -ne 0) { throw 'Debug build failed.' }
    Push-Location android
    try {
        & .\gradlew.bat :app:connectedDebugAndroidTest --console=plain
        if ($LASTEXITCODE -ne 0) { throw 'Android tests failed.' }
    } finally { Pop-Location }
} finally { Remove-Item Env:VITE_NATIVE_TESTS -ErrorAction SilentlyContinue }
