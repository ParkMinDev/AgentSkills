param(
    [Parameter(Mandatory)][string]$SessionsPath,
    [string]$TranscriptPath
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

function Format-TokenCount {
    param([long]$Count, $PreviousCount)

    $text = '{0:N0}' -f $Count
    if ($null -ne $PreviousCount) {
        $text += ' ({0:+#,0;-#,0;0})' -f ($Count - $PreviousCount)
    }
    return $text
}

function Format-TurnReport {
    param($Report)

    if ($null -eq $Report) { return '완료된 Codex 턴을 기다리는 중입니다.' }

    $turn = $Report.Turn
    $lines = @(
        '완료 {0:MM-dd HH:mm:ss}' -f $turn.CompletedAt.ToLocalTime()
        "세션 $($turn.SessionId)"
        ''
    )
    if ($null -eq $turn.Usage) {
        return (($lines + '이 턴의 토큰 사용량을 확인할 수 없습니다.') -join [Environment]::NewLine)
    }

    $usage = $turn.Usage
    $previous = $Report.PreviousUsage
    $cache = if ($null -eq $usage.CacheRate) { '—' } else { '{0:P1}' -f $usage.CacheRate }
    if ($null -ne $usage.CacheRate -and $null -ne $previous.CacheRate) {
        $cache += ' ({0:+0.0;-0.0;0.0}%p)' -f (100 * ($usage.CacheRate - $previous.CacheRate))
    }
    $lines += @(
        "입력       $(Format-TokenCount $usage.InputTokens $previous.InputTokens)"
        "출력       $(Format-TokenCount $usage.OutputTokens $previous.OutputTokens)"
        "합계       $(Format-TokenCount $usage.TotalTokens $previous.TotalTokens)"
        "캐시 적중  $cache"
    )
    if ($null -ne $turn.DurationMs) {
        $lines += '소요 시간  {0:N1}초' -f ($turn.DurationMs / 1000)
    }
    if ($Report.Alerts.Count -gt 0) { $lines += @('') + $Report.Alerts }
    return ($lines -join [Environment]::NewLine)
}

$form = [System.Windows.Forms.Form]::new()
$form.Text = 'Codex 턴미터'
$form.StartPosition = 'CenterScreen'
$form.ClientSize = [Drawing.Size]::new(500, 270)
$form.MinimumSize = [Drawing.Size]::new(420, 250)
$form.Padding = [System.Windows.Forms.Padding]::new(14)

$reportView = [System.Windows.Forms.TextBox]::new()
$reportView.Multiline = $true
$reportView.ReadOnly = $true
$reportView.ScrollBars = 'Vertical'
$reportView.Dock = 'Fill'
$reportView.Font = [Drawing.Font]::new('맑은 고딕', 11)
$reportView.Text = '완료된 Codex 턴을 기다리는 중입니다.'
$form.Controls.Add($reportView)

$worker = [PowerShell]::Create()
$null = $worker.AddScript({
    param($ModulePath, $LogDirectory, $LogFile)
    $ErrorActionPreference = 'Stop'
    Import-Module -Name $ModulePath
    if ($LogFile) { Get-CodexTurnReport -TranscriptPath $LogFile }
    else { Get-CodexTurnReport -SessionsPath $LogDirectory }
}).AddArgument((Join-Path $PSScriptRoot 'CodexTurnUsage.psm1')).AddArgument($SessionsPath).AddArgument($TranscriptPath)

$refresh = @{ Pending = $null; Next = [DateTime]::MinValue }
$timer = [System.Windows.Forms.Timer]::new()
$timer.Interval = 400
$timer.Add_Tick({
    if ($null -ne $refresh.Pending) {
        if (!$refresh.Pending.IsCompleted) { return }
        try {
            $result = $worker.EndInvoke($refresh.Pending)
            $reportText = Format-TurnReport ($result | Select-Object -Last 1)
        }
        catch {
            $reportText = 'Codex 세션 로그를 읽지 못했습니다. 로그 경로와 읽기 권한을 확인하세요.'
        }
        $worker.Streams.Error.Clear()
        if ($reportView.Text -ne $reportText) { $reportView.Text = $reportText }
        $refresh.Pending = $null
        $refresh.Next = [DateTime]::UtcNow.AddSeconds(3)
    }
    if ([DateTime]::UtcNow -ge $refresh.Next) {
        $refresh.Pending = $worker.BeginInvoke()
    }
})

try {
    $timer.Start()
    $null = $form.ShowDialog()
}
finally {
    $timer.Stop()
    $timer.Dispose()
    $worker.Dispose()
    $form.Dispose()
}
