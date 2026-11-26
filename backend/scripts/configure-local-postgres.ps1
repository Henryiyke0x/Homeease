$ErrorActionPreference = "Stop"

$serviceName = "postgresql-x64-18"
$dataDirectory = "C:\Program Files\PostgreSQL\18\data"
$binDirectory = "C:\Program Files\PostgreSQL\18\bin"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$backendEnvPath = Join-Path $projectRoot "backend\.env"
$frontendEnvPath = Join-Path $projectRoot "frontend\.env.local"
$setupStatusPath = Join-Path $projectRoot "backend\.postgres-setup-status"
$hbaPath = Join-Path $dataDirectory "pg_hba.conf"
$backupPath = Join-Path $env:TEMP ("homeease-pg_hba-{0}.backup" -f [guid]::NewGuid().ToString("N"))

trap {
  try { Set-Content -LiteralPath $setupStatusPath -Encoding utf8 -Value ("failed: " + $_.Exception.Message + "`nLine: " + $_.InvocationInfo.ScriptLineNumber + "`nCommand: " + $_.InvocationInfo.Line) } catch { }
  break
}

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw "Run this script from PowerShell opened with Run as administrator."
}
if (-not (Test-Path -LiteralPath $hbaPath)) { throw "PostgreSQL 18 data file not found: $hbaPath" }

$originalHba = Get-Content -LiteralPath $hbaPath -Raw
Copy-Item -LiteralPath $hbaPath -Destination $backupPath
$dbPassword = $null
$temporaryAuthInstalled = $false

function Invoke-PostgresSql([string]$Sql) {
  $Sql | & (Join-Path $binDirectory "psql.exe") -h 127.0.0.1 -U postgres -d postgres -w -v ON_ERROR_STOP=1
  if ($LASTEXITCODE -ne 0) { throw "A PostgreSQL provisioning command failed." }
}

try {
  $temporaryRule = "host all postgres 127.0.0.1/32 trust"
  $temporaryAuthInstalled = $true
  Set-Content -LiteralPath $hbaPath -Encoding ascii -Value ($temporaryRule + [Environment]::NewLine + $originalHba)
  Restart-Service -Name $serviceName

  $ready = $false
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    & (Join-Path $binDirectory "pg_isready.exe") -h 127.0.0.1 -p 5432 *> $null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) { throw "PostgreSQL did not become ready after restarting." }

  $randomBytes = New-Object byte[] 36
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  $rng.GetBytes($randomBytes)
  $rng.Dispose()
  $dbPassword = [Convert]::ToBase64String($randomBytes).TrimEnd("=").Replace("+", "-").Replace("/", "_")

  $roleCheck = & (Join-Path $binDirectory "psql.exe") -h 127.0.0.1 -U postgres -d postgres -w -tAc "SELECT 1 FROM pg_roles WHERE rolname = 'homeease_app';" 2>&1
  if ($LASTEXITCODE -ne 0) { throw ("Could not inspect PostgreSQL roles: " + ($roleCheck -join " ")) }
  $roleExists = ($roleCheck -join "").Trim()
  if ($roleExists -ne "1") { Invoke-PostgresSql "CREATE ROLE homeease_app LOGIN;" }
  Invoke-PostgresSql "ALTER ROLE homeease_app WITH LOGIN CREATEDB PASSWORD '$dbPassword';"

  $databaseCheck = & (Join-Path $binDirectory "psql.exe") -h 127.0.0.1 -U postgres -d postgres -w -tAc "SELECT 1 FROM pg_database WHERE datname = 'homeease';" 2>&1
  if ($LASTEXITCODE -ne 0) { throw ("Could not inspect PostgreSQL databases: " + ($databaseCheck -join " ")) }
  $databaseExists = ($databaseCheck -join "").Trim()
  if ($databaseExists -eq "1") {
    Invoke-PostgresSql "ALTER DATABASE homeease OWNER TO homeease_app;"
  } else {
    & (Join-Path $binDirectory "createdb.exe") -h 127.0.0.1 -U postgres -w --owner=homeease_app homeease
    if ($LASTEXITCODE -ne 0) { throw "Could not create the HomeEase database." }
  }
} finally {
  if ($temporaryAuthInstalled) {
    Copy-Item -LiteralPath $backupPath -Destination $hbaPath -Force
    Restart-Service -Name $serviceName
  }
  Remove-Item -LiteralPath $backupPath -Force -ErrorAction SilentlyContinue
}

if (-not $dbPassword) { throw "Database setup did not finish; no project environment files were written." }

$env:PGPASSWORD = $dbPassword
try {
  & (Join-Path $binDirectory "psql.exe") -h 127.0.0.1 -U homeease_app -d homeease -w -c "SELECT current_user, current_database();"
  if ($LASTEXITCODE -ne 0) { throw "Could not verify the HomeEase application connection." }
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

$adminBytes = New-Object byte[] 36
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($adminBytes)
$rng.Dispose()
$adminKey = [Convert]::ToBase64String($adminBytes).TrimEnd("=").Replace("+", "-").Replace("/", "_")
$backendEnv = @"
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://homeease_app:$dbPassword@localhost:5432/homeease?schema=public
FRONTEND_URL=http://localhost:3000
ADMIN_API_KEY=$adminKey
"@
$frontendEnv = "NEXT_PUBLIC_API_URL=http://localhost:4000/api"
Set-Content -LiteralPath $backendEnvPath -Encoding ascii -Value $backendEnv
Set-Content -LiteralPath $frontendEnvPath -Encoding ascii -Value $frontendEnv
Set-Content -LiteralPath $setupStatusPath -Encoding ascii -Value "success"
Write-Output "HomeEase database is ready. Local environment files were written to backend/.env and frontend/.env.local."
