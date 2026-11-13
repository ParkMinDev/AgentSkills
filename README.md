# AgentSkills

개인 AI 코딩 에이전트 스킬을 관리하는 독립 저장소입니다. 저장소의 파일을 원본으로 관리하며, 도구별 개인 스킬 폴더에는 복사하여 설치합니다.

## 스킬 목록

| 스킬 | 용도 |
| --- | --- |
| [algorithm-flowchart](skills/algorithm-flowchart/SKILL.md) | 알고리즘을 Mermaid 순서도로 설명하고 상대 처리시간을 저(초록)·중(노랑)·고(빨강)로 표시합니다. 기본 예시와 패치 제작 예시를 포함합니다. |

## Codex 설치 및 갱신

이 저장소를 복제한 뒤 저장소 루트에서 PowerShell로 실행합니다. 비공개 저장소이므로 GitHub 접근 권한이 필요합니다.

```powershell
$skillRoot = if ($env:CODEX_HOME) { Join-Path $env:CODEX_HOME 'skills' } else { Join-Path $env:USERPROFILE '.codex/skills' }
$target = Join-Path $skillRoot 'algorithm-flowchart'
New-Item -ItemType Directory -Path $target -Force | Out-Null
Copy-Item -Path './skills/algorithm-flowchart/*' -Destination $target -Recurse -Force
```

갱신할 때는 저장소에서 `git pull --ff-only` 후 같은 복사 명령을 실행합니다. 설치본을 직접 수정했다면 먼저 저장소에 반영하거나 백업하세요. 복사는 기존 파일을 덮어쓰지만 저장소에서 삭제된 파일까지 제거하지는 않으므로 삭제된 항목은 별도로 확인합니다.

현재 환경의 설치본은 유지하며, 이 저장소를 생성하는 과정에서 재설치하지 않습니다.

## 사용

“이 함수 순서도 보여줘”, “수정된 알고리즘 순서도 보여줘”처럼 요청하거나 `$algorithm-flowchart`를 명시합니다. 스킬 선택은 사용 중인 에이전트의 기능에 따릅니다.

## 관리 원칙

- 각 스킬은 `skills/<스킬 이름>/SKILL.md`에 정의합니다.
- 예시는 해당 스킬의 `references/`에 둡니다.
- 수정은 저장소 원본에서 하고 설치본에도 반영합니다.
- 비밀키·인증 토큰·개인 실행 로그는 커밋하지 않습니다.
- 다른 출처의 스킬은 라이선스와 배포 조건을 확인한 뒤 별도로 추가합니다.