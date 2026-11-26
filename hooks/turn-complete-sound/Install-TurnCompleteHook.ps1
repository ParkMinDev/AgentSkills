#Requires -Version 7.0

[CmdletBinding(SupportsShouldProcess)]
param(
    [ValidateSet('Both','Codex','Claude')]
    [string] $Target = 'Both',
    [switch] $Remove,
    [string] $CodexConfigDirectory,
    [string] $ClaudeConfigDirectory
)

$ErrorActionPreference = 'Stop'
if (!$IsWindows) { throw 'This sound hook is for Windows.' }

$profilePath = [Environment]::GetFolderPath('UserProfile')
if (!$CodexConfigDirectory) {
    $CodexConfigDirectory = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $profilePath '.codex' }
}
if (!$ClaudeConfigDirectory) {
    $ClaudeConfigDirectory = if ($env:CLAUDE_CONFIG_DIR) { $env:CLAUDE_CONFIG_DIR } else { Join-Path $profilePath '.claude' }
}

$playerPath = Join-Path $PSScriptRoot 'Play-TurnCompleteSound.ps1'
$encoding = [Text.UTF8Encoding]::new($false,$true)

function Test-SoundHandler($Handler, $Expected) {
    if ($Handler -isnot [Collections.IDictionary] -or $Handler['type'] -ne 'command' -or $Handler['command'] -ne $Expected['command']) {
        return $false
    }

    if ($Expected.Contains('args')) {
        return ($Handler['args'] -join [char]0) -eq ($Expected['args'] -join [char]0)
    }

    return $true
}

function Get-SettingsUpdate([string] $Path, [string] $TemplatePath) {
    $template = Get-Content -LiteralPath $TemplatePath -Raw | ConvertFrom-Json -AsHashtable
    $group = $template['hooks']['Stop'][0]
    $desired = $group['hooks'][0]
    $desired['command'] = $desired['command'].Replace('__SOUND_SCRIPT__',$playerPath)
    if ($desired.Contains('args')) {
        $desired['args'] = @($desired['args'] | ForEach-Object { $_.Replace('__SOUND_SCRIPT__',$playerPath) })
    }

    $existed = Test-Path -LiteralPath $Path
    $original = if ($existed) { $encoding.GetString([IO.File]::ReadAllBytes($Path)) } else { '{}' }
    $config = $original | ConvertFrom-Json -AsHashtable
    if ($config -isnot [Collections.IDictionary]) { throw "Expected a JSON object: $Path" }

    $hooks = $config['hooks']
    if ($null -ne $hooks -and $hooks -isnot [Collections.IDictionary]) { throw "Invalid hooks object: $Path" }
    $stop = if ($hooks) { $hooks['Stop'] }
    $groups = [Collections.Generic.List[object]]::new()
    $matches = 0

    foreach ($existing in $stop) {
        if ($existing -isnot [Collections.IDictionary] -or $existing['hooks'] -isnot [array]) {
            throw "Invalid Stop hook group: $Path"
        }

        $kept = [Collections.Generic.List[object]]::new()
        foreach ($handler in $existing['hooks']) {
            if (Test-SoundHandler $handler $desired) {
                $matches++
                if ($Remove) { continue }
            }

            $kept.Add($handler)
        }

        if ($Remove -and $kept.Count -lt $existing['hooks'].Count) {
            if ($kept.Count -eq 0) { continue }
            $existing['hooks'] = $kept.ToArray()
        }

        $groups.Add($existing)
    }

    if ((!$Remove -and $matches -gt 0) -or ($Remove -and $matches -eq 0)) {
        return
    }

    if ($Remove) {
        if ($groups.Count -eq 0) { $hooks.Remove('Stop') }
        else { $hooks['Stop'] = $groups.ToArray() }
        if ($hooks.Count -eq 0) { $config.Remove('hooks') }
    } else {
        if ($null -eq $hooks) { $hooks = @{} }
        $groups.Add($group)
        $hooks['Stop'] = $groups.ToArray()
        $config['hooks'] = $hooks
    }

    [pscustomobject]@{
        Path = $Path
        Existed = $existed
        Original = $original
        Content = ($config | ConvertTo-Json -Depth 100) + [Environment]::NewLine
    }
}

$selection = @(
    @{ Name = 'Codex'; Path = Join-Path $CodexConfigDirectory 'hooks.json'; Template = 'codex\hooks.example.json' }
    @{ Name = 'Claude'; Path = Join-Path $ClaudeConfigDirectory 'settings.json'; Template = 'claude\settings.example.json' }
)
$updates = @(
    foreach ($app in $selection) {
        if ($Target -eq 'Both' -or $Target -eq $app.Name) {
            Get-SettingsUpdate ([IO.Path]::GetFullPath($app.Path)) (Join-Path $PSScriptRoot $app.Template)
        }
    }
)
$action = if ($Remove) { 'Remove the AgentKit Stop sound hook' } else { 'Register the AgentKit Stop sound hook' }
foreach ($update in $updates) {
    if (!$PSCmdlet.ShouldProcess($update.Path,$action)) { continue }
    $existsNow = Test-Path -LiteralPath $update.Path
    if ($existsNow -ne $update.Existed -or ($existsNow -and $encoding.GetString([IO.File]::ReadAllBytes($update.Path)) -cne $update.Original)) {
        throw "Settings changed during preparation: $($update.Path)"
    }

    $directory = [IO.Path]::GetDirectoryName($update.Path)
    [void][IO.Directory]::CreateDirectory($directory)
    $temporary = Join-Path $directory ('.agentkit-hook-' + [Guid]::NewGuid().ToString('N') + '.tmp')
    try {
        [IO.File]::WriteAllText($temporary,$update.Content,$encoding)
        [IO.File]::Move($temporary,$update.Path,$update.Existed)
    } finally {
        if ([IO.File]::Exists($temporary)) { [IO.File]::Delete($temporary) }
    }

    Write-Output "$action - $($update.Path)"
}
