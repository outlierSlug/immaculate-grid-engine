<#
.SYNOPSIS
    Loads the bundled game rosters into the production database (Neon).

.DESCRIPTION
    Runs the backend once with the load-data profile against production, then
    stops it as soon as every game has loaded. It replaces setting DB_URL,
    DB_USERNAME and DB_PASSWORD by hand in a terminal, which left the
    production credentials in that terminal session - so the next plain
    `mvnw spring-boot:run` in the same window would have pointed local dev at
    production.

    Where the credentials live:
      - Not in the repo. They are saved to %USERPROFILE%\.gachagrid\, so no
        `git add` can ever pick them up.
      - Encrypted at rest. Export-Clixml protects a SecureString with Windows
        DPAPI: the file can only be decrypted by this Windows user on this
        machine. Copying it elsewhere yields nothing usable.
      - Never in the terminal's environment. They are handed only to the
        child process this script starts, so nothing lingers afterwards.

    The first run asks for the three values (copy them from Render's
    Environment page) and saves them. Later runs reuse the saved file.

    The load itself is an upsert by id (see GameDataLoader), so it is safe to
    re-run and never touches puzzles, attempts or accounts.

.PARAMETER Reset
    Ask for the credentials again and overwrite the saved file. Use this
    after rotating the Neon password.

.PARAMETER Force
    Skip the "load into <host>?" confirmation.

.PARAMETER CredentialPath
    Use a different saved-credentials file. Mainly for pointing the script at
    a non-production database to test it.

.EXAMPLE
    .\load-prod-data.ps1
#>
[CmdletBinding()]
param(
    [switch]$Reset,
    [switch]$Force,
    [string]$CredentialPath = (Join-Path $env:USERPROFILE '.gachagrid\prod-db.clixml')
)

$ErrorActionPreference = 'Stop'

# Port for the throwaway backend, so it can't collide with a local dev
# backend already on 8080.
$LoadPort = '8081'

function ConvertTo-PlainText([System.Security.SecureString]$Secure) {
    return [System.Net.NetworkCredential]::new('', $Secure).Password
}

function Read-Credentials {
    Write-Host 'Enter the production database settings (Render -> backend service -> Environment).'
    Write-Host 'Input is hidden. Paste each value and press Enter.'
    return [pscustomobject]@{
        DbUrl      = Read-Host -AsSecureString 'DB_URL'
        DbUsername = Read-Host -AsSecureString 'DB_USERNAME'
        DbPassword = Read-Host -AsSecureString 'DB_PASSWORD'
    }
}

if ($Reset -or -not (Test-Path $CredentialPath)) {
    $saved = Read-Credentials
    $dir = Split-Path -Parent $CredentialPath
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force $dir | Out-Null
    }
    $saved | Export-Clixml -Path $CredentialPath
    Write-Host "Saved (encrypted for this Windows user) to $CredentialPath"
} else {
    $saved = Import-Clixml -Path $CredentialPath
}

$dbUrl = ConvertTo-PlainText $saved.DbUrl
if ($dbUrl -notmatch '^jdbc:postgresql://([^/:?]+)') {
    throw "DB_URL should look like jdbc:postgresql://<host>/<db>?sslmode=require. Re-run with -Reset to enter it again."
}
$dbHost = $Matches[1]

if (-not $Force) {
    $answer = Read-Host "Load game data into $dbHost ? (y/N)"
    if ($answer -notmatch '^[yY]') {
        Write-Host 'Cancelled. Nothing was changed.'
        return
    }
}

# GameDataLoader loads one roster per *_entities.json and prints one
# "Loaded N grid items for <game>" line each. The backend keeps running as a
# web server afterwards, so that count is how this script knows it is done.
$resources = Join-Path $PSScriptRoot 'src\main\resources'
$expected = @(Get-ChildItem -Path $resources -Filter '*_entities.json').Count
if ($expected -eq 0) {
    throw "No *_entities.json files found in $resources."
}

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $env:ComSpec
# 2>&1 inside cmd merges stderr into the one stream read below; reading only
# stdout while stderr is redirected separately can deadlock on a full buffer.
# The wrapper is named by full path because cmd won't search the current
# directory when NoDefaultCurrentDirectoryInExePath is set.
$mvnw = Join-Path $PSScriptRoot 'mvnw.cmd'
$psi.Arguments = "/c `"`"$mvnw`" -q spring-boot:run 2>&1`""
$psi.WorkingDirectory = $PSScriptRoot
$psi.UseShellExecute = $false
$psi.RedirectStandardOutput = $true
$psi.EnvironmentVariables['SPRING_PROFILES_ACTIVE'] = 'load-data'
$psi.EnvironmentVariables['PORT'] = $LoadPort
$psi.EnvironmentVariables['DB_URL'] = $dbUrl
$psi.EnvironmentVariables['DB_USERNAME'] = ConvertTo-PlainText $saved.DbUsername
$psi.EnvironmentVariables['DB_PASSWORD'] = ConvertTo-PlainText $saved.DbPassword
# The backend refuses to start without these, but the loader never uses
# them, so a placeholder is enough when they aren't set on this machine.
foreach ($name in 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET') {
    if (-not $psi.EnvironmentVariables.ContainsKey($name)) {
        $psi.EnvironmentVariables[$name] = 'unused-by-load-data'
    }
}

Write-Host "Starting the backend with the load-data profile against $dbHost ..."
$process = [System.Diagnostics.Process]::Start($psi)
$loaded = @()
# Everything else the backend prints is startup noise on a good run, so it is
# only shown (the tail of it) when the load fails.
$tail = New-Object System.Collections.Generic.Queue[string]
try {
    while ($null -ne ($line = $process.StandardOutput.ReadLine())) {
        if ($line -match '^Loaded \d+ grid items for ') {
            $loaded += $line
            Write-Host "  $line"
            if ($loaded.Count -ge $expected) {
                break
            }
        } else {
            $tail.Enqueue($line)
            if ($tail.Count -gt 40) {
                [void]$tail.Dequeue()
            }
        }
    }
} finally {
    if (-not $process.HasExited) {
        # /T takes the whole tree: cmd -> Maven -> the backend's own JVM.
        & taskkill /T /F /PID $process.Id | Out-Null
    }
}

if ($loaded.Count -ge $expected) {
    Write-Host "Done. Loaded $expected games into $dbHost." -ForegroundColor Green
} else {
    Write-Host '--- last lines of backend output ---' -ForegroundColor Red
    $tail | ForEach-Object { Write-Host $_ }
    throw "The backend stopped after loading $($loaded.Count) of $expected games. See its output above."
}
