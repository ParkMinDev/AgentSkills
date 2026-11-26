$ErrorActionPreference = 'Stop'

$sound = Join-Path $PSScriptRoot 'assets\codex-notification.wav'
$player = [System.Media.SoundPlayer]::new($sound)
try {
    $player.PlaySync()
} finally {
    $player.Dispose()
}
