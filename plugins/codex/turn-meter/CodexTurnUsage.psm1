$script:TranscriptCache = @{}

function Get-UsageTotals {
    param([System.Collections.IDictionary]$Usage)

    if ($null -eq $Usage) { return }
    $totals = @{}
    foreach ($field in @('input_tokens', 'cached_input_tokens', 'output_tokens')) {
        $value = $Usage[$field]
        if (!(($value -is [int]) -or ($value -is [long])) -or $value -lt 0) { return }
        $totals[$field] = [long]$value
    }
    if ($totals.cached_input_tokens -gt $totals.input_tokens) { return }
    return $totals
}

function Get-UsageDifference {
    param($Before, $After)

    if ($null -eq $Before -or $null -eq $After) { return }
    $inputCount = $After.input_tokens - $Before.input_tokens
    $cachedCount = $After.cached_input_tokens - $Before.cached_input_tokens
    $outputCount = $After.output_tokens - $Before.output_tokens
    if ($inputCount -lt 0 -or $cachedCount -lt 0 -or $outputCount -lt 0 -or $cachedCount -gt $inputCount) { return }

    [pscustomobject]@{
        InputTokens  = $inputCount
        CachedTokens = $cachedCount
        OutputTokens = $outputCount
        TotalTokens  = $inputCount + $outputCount
        CacheRate    = if ($inputCount -gt 0) { $cachedCount / $inputCount }
    }
}

function Read-CodexTranscript {
    param([string]$Path)

    $sessionId = $null
    $activeTurn = $null
    $lastTotals = $null
    $history = [System.Collections.Generic.Queue[object]]::new()
    $share = [IO.FileShare]::ReadWrite -bor [IO.FileShare]::Delete
    $stream = [IO.File]::Open($Path, [IO.FileMode]::Open, [IO.FileAccess]::Read, $share)
    try {
        $reader = [IO.StreamReader]::new($stream)
        while ($null -ne ($line = $reader.ReadLine())) {
            if ($line -notmatch '"type"\s*:\s*"(session_meta|task_started|task_complete|turn_aborted|token_count)"') { continue }
            try { $entry = ConvertFrom-Json -InputObject $line -AsHashtable -ErrorAction Stop }
            catch { continue }
            $payload = $entry.payload
            if ($entry.type -eq 'session_meta') {
                $source = $payload.source
                if ($payload.parent_thread_id -or ($source -is [System.Collections.IDictionary] -and $source.Contains('subagent'))) {
                    return
                }
                if (!$sessionId) {
                    $sessionId = $payload.id
                    $lastTotals = @{ input_tokens = 0L; cached_input_tokens = 0L; output_tokens = 0L }
                }
                continue
            }
            if ($entry.type -ne 'event_msg') { continue }

            switch ($payload.type) {
                'task_started' {
                    if (!$payload.turn_id) { continue }
                    $activeTurn = @{
                        Id = $payload.turn_id
                        Before = $lastTotals
                        HasUsage = $false
                        Valid = $true
                    }
                }
                'token_count' {
                    if ($null -eq $payload.info) { continue }
                    $currentTotals = Get-UsageTotals $payload.info.total_token_usage
                    if ($null -ne $activeTurn) {
                        $activeTurn.HasUsage = $true
                        if ($null -eq (Get-UsageDifference $lastTotals $currentTotals)) { $activeTurn.Valid = $false }
                    }
                    $lastTotals = $currentTotals
                }
                'turn_aborted' {
                    if ($null -ne $activeTurn -and (!$payload.turn_id -or $payload.turn_id -eq $activeTurn.Id)) {
                        $activeTurn = $null
                    }
                }
                'task_complete' {
                    if ($null -eq $activeTurn -or $payload.turn_id -ne $activeTurn.Id) { continue }
                    $completedTotals = if ($activeTurn.HasUsage -and $activeTurn.Valid) {
                        Get-UsageDifference $activeTurn.Before $lastTotals
                    }
                    try { $completedAt = [DateTimeOffset]$entry.timestamp }
                    catch { $activeTurn = $null; continue }

                    $history.Enqueue([pscustomobject]@{
                        SessionId   = $sessionId
                        TurnId      = $activeTurn.Id
                        CompletedAt = $completedAt
                        DurationMs  = $payload.duration_ms
                        Usage       = $completedTotals
                    })
                    if ($history.Count -gt 6) { $null = $history.Dequeue() }
                    $activeTurn = $null
                }
            }
        }
    }
    finally {
        if ($null -ne $reader) { $reader.Dispose() }
        $stream.Dispose()
    }
    return $history.ToArray()
}

function Get-CachedTurnHistory {
    param([IO.FileInfo]$File)

    $signature = "$($File.Length):$($File.LastWriteTimeUtc.Ticks)"
    $cached = $script:TranscriptCache[$File.FullName]
    if ($null -eq $cached -or $cached.Signature -ne $signature) {
        $turns = @(Read-CodexTranscript -Path $File.FullName)
        $cached = @{ Signature = $signature; Turns = $turns }
        $script:TranscriptCache[$File.FullName] = $cached
    }
    return $cached.Turns
}

function Get-Median {
    param([double[]]$Values)
    $sorted = @($Values | Sort-Object)
    $middle = [int][Math]::Floor($sorted.Count / 2)
    if ($sorted.Count % 2) { return $sorted[$middle] }
    return ($sorted[$middle - 1] + $sorted[$middle]) / 2
}

function Get-CodexTurnReport {
    [CmdletBinding(DefaultParameterSetName = 'Directory')]
    param(
        [Parameter(Mandatory, ParameterSetName = 'Directory')][string]$SessionsPath,
        [Parameter(Mandatory, ParameterSetName = 'File')][string]$TranscriptPath
    )

    $files = if ($PSCmdlet.ParameterSetName -eq 'File') {
        Get-Item -LiteralPath $TranscriptPath -ErrorAction Stop
    }
    elseif (Test-Path -LiteralPath $SessionsPath -PathType Container) {
        Get-ChildItem -LiteralPath $SessionsPath -Filter 'rollout-*.jsonl' -File -Recurse -ErrorAction Stop |
            Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 32
    }
    $retainedPaths = @{}
    $latest = $null
    $latestHistory = @()
    foreach ($file in $files) {
        $retainedPaths[$file.FullName] = $true
        if ($null -ne $latest -and $file.LastWriteTimeUtc -lt $latest.CompletedAt.UtcDateTime) { continue }
        try { $history = @(Get-CachedTurnHistory $file) }
        catch [IO.IOException] {
            if ($PSCmdlet.ParameterSetName -eq 'File') { throw }
            continue
        }
        if ($history.Count -gt 0 -and ($null -eq $latest -or $history[-1].CompletedAt -gt $latest.CompletedAt)) {
            $latest = $history[-1]
            $latestHistory = $history
        }
    }
    foreach ($cachedPath in @($script:TranscriptCache.Keys)) {
        if (!$retainedPaths.ContainsKey($cachedPath)) { $script:TranscriptCache.Remove($cachedPath) }
    }
    if ($null -eq $latest) { return }

    $previous = if ($latestHistory.Count -gt 1) { $latestHistory[-2].Usage }
    $alerts = @()
    if ($null -ne $latest.Usage) {
        $earlier = @($latestHistory | Select-Object -SkipLast 1 | ForEach-Object { $_.Usage } | Where-Object { $null -ne $_ })
        if ($earlier.Count -ge 3) {
            $typicalInput = Get-Median @($earlier.InputTokens)
            if ($latest.Usage.InputTokens -ge 2 * $typicalInput -and $latest.Usage.InputTokens -ge 50000) {
                $alerts += '입력 급증: 최근 중앙값 {0:N0} → {1:N0}' -f $typicalInput, $latest.Usage.InputTokens
            }
            $earlierRates = @($earlier.CacheRate | Where-Object { $null -ne $_ })
            if ($earlierRates.Count -ge 3 -and $null -ne $latest.Usage.CacheRate) {
                $typicalRate = Get-Median $earlierRates
                if (($typicalRate - $latest.Usage.CacheRate) -ge 0.30) {
                    $alerts += '캐시 적중률 하락: 최근 중앙값 {0:P0} → {1:P0}' -f $typicalRate, $latest.Usage.CacheRate
                }
            }
        }
    }
    [pscustomobject]@{ Turn = $latest; PreviousUsage = $previous; Alerts = $alerts }
}

Export-ModuleMember -Function Get-CodexTurnReport
