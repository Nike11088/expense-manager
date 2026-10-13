param([switch]$DebugBuild, [switch]$SkipWebBuild)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$appVersion = (Get-Content -LiteralPath 'package.json' -Raw | ConvertFrom-Json).version
$releaseApk = Join-Path 'artifacts' "expense-manager-$appVersion.apk"
if (-not $DebugBuild) {
    if ($SkipWebBuild) { throw 'Release requires a fresh web build.' }
    $env:VITE_NATIVE_TESTS = '0'
}
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
if (-not (Test-Path -LiteralPath $env:JAVA_HOME)) { throw 'Укажите JAVA_HOME с JDK 21 в scripts/build-android.ps1.' }
if (-not $SkipWebBuild) {
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Ошибка сборки веб-приложения.' }
}
& npx.cmd cap sync android
if ($LASTEXITCODE -ne 0) { throw 'Ошибка синхронизации Capacitor.' }
Push-Location android
try {
    $buildTask = if ($DebugBuild) { 'assembleDebug' } else { 'assembleRelease' }
    & .\gradlew.bat $buildTask --console=plain
    if ($LASTEXITCODE -ne 0) { throw 'Ошибка сборки Android.' }
} finally { Pop-Location }
New-Item -ItemType Directory -Path artifacts -Force | Out-Null
if ($DebugBuild) {
    Copy-Item -LiteralPath 'android\app\build\outputs\apk\debug\app-debug.apk' -Destination 'artifacts\expense-manager-debug.apk'
    Write-Output 'Debug APK: artifacts\expense-manager-debug.apk'
    exit 0
}
$signingDirectory = Join-Path $env:USERPROFILE '.android\expense-manager-release'
$keyFile = Join-Path $signingDirectory 'release.jks'
$configFile = Join-Path $signingDirectory 'signing.json'
if (-not (Test-Path -LiteralPath $keyFile)) {
    if (Test-Path -LiteralPath $configFile) { throw 'Конфигурация подписи существует, но ключ отсутствует. Восстановите прежний ключ.' }
    New-Item -ItemType Directory -Path $signingDirectory -Force | Out-Null
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $rng.Dispose()
    $password = [Convert]::ToBase64String($bytes)
    @{ alias = 'expense-manager'; password = $password } | ConvertTo-Json | Set-Content -LiteralPath $configFile -Encoding utf8
    # Ключ и пароль доступны только текущему пользователю и SYSTEM.
    & icacls.exe $signingDirectory /inheritance:r /grant:r "${env:USERNAME}:(OI)(CI)F" 'SYSTEM:(OI)(CI)F' | Out-Null
    $env:EXPENSE_SIGN_PASSWORD = $password
    & "$env:JAVA_HOME\bin\keytool.exe" -genkeypair -keystore $keyFile -storepass:env EXPENSE_SIGN_PASSWORD -keypass:env EXPENSE_SIGN_PASSWORD -alias expense-manager -keyalg RSA -keysize 3072 -validity 10000 -dname 'CN=Expense Manager'
    if ($LASTEXITCODE -ne 0) { throw 'Не удалось создать ключ подписи.' }
}
$signing = Get-Content -LiteralPath $configFile -Raw | ConvertFrom-Json
$env:EXPENSE_SIGN_PASSWORD = $signing.password
try {
    $buildTools = Get-ChildItem -LiteralPath "$env:ANDROID_HOME\build-tools" -Directory | Where-Object { $_.Name -match '^\d+\.\d+\.\d+$' } | Sort-Object { [version]$_.Name } -Descending | Select-Object -First 1
    & "$($buildTools.FullName)\zipalign.exe" -f -p 4 'android\app\build\outputs\apk\release\app-release-unsigned.apk' 'artifacts\expense-manager-aligned.apk'
    if ($LASTEXITCODE -ne 0) { throw 'Ошибка выравнивания APK.' }
    & "$($buildTools.FullName)\apksigner.bat" sign --ks $keyFile --ks-key-alias $signing.alias --ks-pass env:EXPENSE_SIGN_PASSWORD --key-pass env:EXPENSE_SIGN_PASSWORD --out $releaseApk 'artifacts\expense-manager-aligned.apk'
    if ($LASTEXITCODE -ne 0) { throw 'Ошибка подписи APK.' }
    & "$($buildTools.FullName)\apksigner.bat" verify --verbose $releaseApk
    if ($LASTEXITCODE -ne 0) { throw 'Подпись APK не прошла проверку.' }
} finally { Remove-Item Env:EXPENSE_SIGN_PASSWORD -ErrorAction SilentlyContinue }
Write-Output "Release APK: $releaseApk"

