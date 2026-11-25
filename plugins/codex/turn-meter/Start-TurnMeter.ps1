#Requires -Version 7.0
[CmdletBinding()]
param(
    [string]$TranscriptPath
)

$ErrorActionPreference = 'Stop'
if (!$IsWindows) { throw 'Codex 턴미터 창은 Windows에서 실행할 수 있습니다.' }
if ([Threading.Thread]::CurrentThread.GetApartmentState() -ne 'STA') {
    throw 'pwsh -STA -File Start-TurnMeter.ps1 형태로 실행하세요.'
}

$codexConfigPath = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE '.codex' }
$sessionDirectory = Join-Path $codexConfigPath 'sessions'
if ($TranscriptPath) {
    $TranscriptPath = (Resolve-Path -LiteralPath $TranscriptPath).ProviderPath
}

& (Join-Path $PSScriptRoot 'TurnMeterWindow.ps1') -SessionsPath $sessionDirectory -TranscriptPath $TranscriptPath
