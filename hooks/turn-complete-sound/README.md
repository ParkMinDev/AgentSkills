# 응답 완료 알림음

Codex와 Claude Code의 주 에이전트가 응답을 마칠 때 [Notification Sound 1](https://freesound.org/people/deadrobotmusic/sounds/750607/) (deadrobotmusic, CC0)을 재생합니다. 짧은 질문에 대한 답변도 포함합니다.

## 등록

Windows에서 PowerShell 7로 저장소 루트에서 실행합니다.

```powershell
& './hooks/turn-complete-sound/Install-TurnCompleteHook.ps1' -Target Both
```

한 앱만 사용하려면 `-Target Codex` 또는 `-Target Claude`를 지정합니다. Codex는 사용자 `hooks.json`, Claude는 사용자 `settings.json`에 등록하며, 기존 설정과 다른 훅을 보존합니다. 등록한 훅은 현재 체크아웃의 스크립트를 가리키므로 저장소를 옮기기 전에 해제한 뒤 새 위치에서 다시 등록합니다.

Codex는 **설정 → 훅**에서 AgentKit의 `Stop` 명령을 검토하고 신뢰해야 실행합니다. Claude는 새 세션에서 등록 내용을 확인할 수 있습니다. Codex의 내장 알림음도 켜져 있으면 같은 응답에 소리가 두 번 날 수 있습니다.

## 해제

```powershell
& './hooks/turn-complete-sound/Install-TurnCompleteHook.ps1' -Target Both -Remove
```

선택한 앱에서 이 훅만 제거합니다. `-WhatIf`를 붙이면 변경할 설정 파일을 확인할 수 있습니다.
