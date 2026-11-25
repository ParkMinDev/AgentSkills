# Codex 턴미터

Windows의 별도 창에서 가장 최근에 완료된 Codex 턴의 토큰 사용량을 보여 줍니다. 실행해 둔 동안 몇 초마다 자동 갱신합니다.

Windows에서 PowerShell 7을 사용해 저장소 루트에서 실행합니다.

```powershell
pwsh -NoProfile -STA -File ./plugins/codex/turn-meter/Start-TurnMeter.ps1
```

기본값은 `$CODEX_HOME/sessions`이며, `CODEX_HOME`이 없으면 `~/.codex/sessions`를 사용합니다. 최근 수정된 로그 32개에서 완료 시각이 가장 늦은 메인 세션 턴을 찾습니다. 한 세션만 보려면 다음처럼 해당 로그 파일을 지정합니다.

```powershell
pwsh -NoProfile -STA -File ./plugins/codex/turn-meter/Start-TurnMeter.ps1 -TranscriptPath 'C:\경로\rollout-….jsonl'
```

- 입력·출력·합계의 괄호 안 숫자는 같은 세션의 직전 완료 턴 대비 증감입니다. 한 턴 안에서 여러 번 모델을 호출한 토큰도 합산됩니다.
- 캐시 적중률은 전체 입력 중 캐시에서 읽은 토큰의 비율입니다. 증감은 퍼센트포인트(%p)로 표시합니다.
- 사용량이 기록된 이전 턴이 3개 이상이면 같은 세션의 최근 최대 5턴 중앙값과 비교해 입력 급증이나 캐시 적중률 하락을 표시합니다.
- 소요 시간은 로그에 기록된 경우 표시합니다. 서브에이전트의 개별 로그는 합산하지 않습니다.

로그를 읽는 데 추가 모델 호출은 필요 없습니다. 로컬 로그 형식은 Codex 버전에 따라 바뀔 수 있습니다. 턴의 토큰 기록이 없거나 누적값이 리셋된 경우 해당 턴에 사용량을 표시하지 않습니다.
