# AI-AgentKit

개인 AI 코딩 에이전트(Codex·Claude Code)의 공통 작업 지침, 스킬, 플러그인을 관리하는 저장소입니다. 저장소의 파일을 원본으로 관리합니다.

## 구성

| 경로 | 내용 |
| --- | --- |
| `config/AGENTS.md` | Codex·Claude Code 공통 작업 지침 원본 |
| `skills/` | 공용 스킬 (Codex는 복사 설치, Claude Code는 `agent-skills` 플러그인) |
| `plugins/turn-meter/` | Claude Code 모드: 응답 밑에 턴별 토큰 사용량 표시 |
| `plugins/change-report/` | Claude Code 모드: 응답 밑에 이번 턴의 추가·수정·삭제 파일 목록 표시 |
| `.claude-plugin/` | Claude Code 로컬 마켓플레이스 `ai-agentkit` (`agent-skills`, `turn-meter`, `change-report`) |

## Claude Code 설치 및 갱신

저장소 루트에서 실행합니다.

```powershell
claude plugin marketplace add .
claude plugin install agent-skills@ai-agentkit
claude plugin install turn-meter@ai-agentkit
claude plugin install change-report@ai-agentkit
```

플러그인은 저장소 폴더를 직접 읽으므로 `git pull` 후 새 세션부터 반영됩니다. 공통 지침은 `~/.claude/CLAUDE.md`에 아래 한 줄을 두어 불러옵니다(경로는 PC에 맞게 수정).

```
@D:/WorkSpace/ParkMinDev/Solutions/AI-AgentKit/config/AGENTS.md
```

## 스킬 목록

| 스킬 | 용도 |
| --- | --- |
| [qa-workbook](skills/qa-workbook/SKILL.md) | 엑셀 검증대장과 사진 증거 링크를 갱신하고 남은 검증 항목을 관리합니다. |
| [project-work-planning](skills/project-work-planning/SKILL.md) | Markdown 계획의 완료 기록과 작업 파일 수명을 관리하고 Base 표와 Canvas 순서도를 연결합니다. 저장 요청에 적용합니다. |
| [explain-code-changes](skills/explain-code-changes/SKILL.md) | 코드 추가·수정·삭제 설명을 실제 파일·함수에 연결하고, 작업 종류에 따라 알고리즘·선언·관계로 표현합니다. |
| [algorithm-flowchart](skills/algorithm-flowchart/SKILL.md) | 저장 요청의 순서도를 Obsidian Canvas로 작성합니다. 함수 선언부, 병렬 영역, 이벤트 점선, 변경 강조와 요청한 시간/메모리 수치를 표시합니다. |
| [package-dev-release](skills/package-dev-release/SKILL.md) | PackageDev와 자체 패키지의 의존 버전, 변경 이력, 커밋·푸시 및 지정 프로젝트 적용을 처리합니다. |
| [class-diagram](skills/class-diagram/SKILL.md) | 실제 코드나 합의된 설계의 클래스·인터페이스 관계를 Mermaid 클래스 다이어그램으로 설명합니다. |
| [text-tree](skills/text-tree/SKILL.md) | Unity 오브젝트·컴포넌트, 폴더·파일 및 일반 계층 정보를 텍스트 트리로 설명합니다. |
| [csharp-project-style](skills/csharp-project-style/SKILL.md) | Unity 및 일반 C# 코드의 선언·멤버 순서·비동기·직렬화 필드 스타일을 적용합니다. |
| [view-model-composition](skills/view-model-composition/SKILL.md) | 뷰·모델·러너·바인더를 요청한 조합으로 구성하고, 책임·수명 및 uGUI 계층을 정리합니다. |

## Codex 설치 및 갱신

`csharp-project-style`은 Unity와 일반 C# 코드의 작성 스타일을 관리합니다. 정적 멤버는 최상단에 모으고, Unity 컴포넌트 필드는 Odin이 있으면 `Title`, 없으면 `Header`를 사용합니다.

이 저장소를 복제한 뒤 저장소 루트에서 PowerShell로 실행합니다.

Canvas의 이번 변경은 기존 색상을 유지한 10px 테두리로, 메모리 피크는 개별 노드의 빨간 외곽 광택으로 구분합니다. 함수·병렬 영역에는 광택을 넣지 않고 수치만 표시합니다. 재사용할 스타일은 [canvas-node-emphasis.css](skills/algorithm-flowchart/assets/canvas-node-emphasis.css)에 있으며, 허용된 보관소에 별도로 설치·활성화합니다. 스킬 복사만으로 Obsidian 설정이 변경되지는 않습니다.

```powershell
$skillRoot = if ($env:CODEX_HOME) { Join-Path $env:CODEX_HOME 'skills' } else { Join-Path $env:USERPROFILE '.codex/skills' }
Get-ChildItem -LiteralPath './skills' -Directory | ForEach-Object {
    $target = Join-Path $skillRoot $_.Name
    New-Item -ItemType Directory -Path $target -Force | Out-Null
    Get-ChildItem -LiteralPath $_.FullName -Force | Copy-Item -Destination $target -Recurse -Force
}
```

갱신할 때는 저장소에서 `git pull --ff-only` 후 같은 복사 명령을 실행합니다. 설치본을 직접 수정했다면 먼저 저장소에 반영하거나 백업하세요. 복사는 기존 파일을 덮어쓰지만 저장소에서 삭제된 파일까지 제거하지는 않으므로 삭제된 항목은 별도로 확인합니다.

위 명령은 이 저장소에 포함된 스킬만 설치·갱신하며, 개인 폴더의 다른 스킬은 유지합니다.

## Codex 공통 작업 지침 설치 및 갱신

[config/AGENTS.md](config/AGENTS.md)는 개인 Codex 공통 작업 지침의 저장소 원본입니다. 실제 적용 파일은 `$CODEX_HOME/AGENTS.md`이며, CODEX_HOME을 지정하지 않은 환경에서는 사용자 폴더의 `.codex/AGENTS.md`를 사용합니다. 저장소 루트에 두지 않아 AI-AgentKit 저장소 자체의 지침과 구분합니다.

저장소 루트에서 다음 PowerShell 명령을 실행하면 기존 적용 파일을 별도 이름으로 백업한 뒤 복사합니다. 기존 내용과 자동 병합하지 않으므로 개인 수정이 있다면 먼저 비교해 원본에 반영하세요.

```powershell
$codexConfigRoot = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE '.codex' }
New-Item -ItemType Directory -Path $codexConfigRoot -Force | Out-Null
$instructionsPath = Join-Path $codexConfigRoot 'AGENTS.md'
if (Test-Path -LiteralPath $instructionsPath) {
    $backupPath = Join-Path $codexConfigRoot ('AGENTS.md.' + [Guid]::NewGuid().ToString('N') + '.backup')
    Copy-Item -LiteralPath $instructionsPath -Destination $backupPath -ErrorAction Stop
}
Copy-Item -LiteralPath './config/AGENTS.md' -Destination $instructionsPath -Force -ErrorAction Stop
```

갱신 순서:

1. 저장소에서 `config/AGENTS.md`를 수정하거나 `git pull --ff-only`로 최신 내용을 받습니다. 로컬 변경이 있다면 먼저 보존·정리합니다.
2. 위 복사 명령으로 적용 파일을 갱신합니다. 적용본에서 먼저 수정했다면 차이를 검토한 뒤 저장소 원본에도 반영합니다.
3. 다른 PC에서는 문서에 기록된 Unity CLI 절대 경로를 실제 설치 위치에 맞춥니다. 현재 원본에는 작성자 PC의 경로가 포함되어 있습니다.

문서의 `skills/.../SKILL.md` 링크는 설치된 Codex 폴더를 기준으로 합니다. 이 저장소의 스킬은 위 설치 명령으로 함께 설치하고, `unity-cli`처럼 별도 출처의 스킬은 따로 준비하세요. 이 지침 복사 명령은 Unity CLI나 외부 스킬을 설치하지 않습니다.

## 사용

다음과 같이 요청하거나 `$스킬이름`을 명시합니다. 스킬 선택은 사용 중인 에이전트의 기능에 따릅니다.

| 요청 예시 | 스킬 |
| --- | --- |
| “검증대장에 결과 반영해줘” / “남은 검증 알려줘” | `qa-workbook` |
| “이번 작업계획을 저장해줘” / “전체 계획에 완료 상태를 저장해줘” | `project-work-planning` |
| “작업 계획 설명해줘” / “정리할 코드 찾아봐” / “왜 바꾸는지 쉽게 설명해줘” | `explain-code-changes` |
| “이 함수 순서도를 저장해줘” / “멀티 순서도를 Canvas로 저장해줘” | `algorithm-flowchart` |
| “측정 포함 순서도를 저장해줘” / “이전 측정값으로 순서도를 저장해줘” | `algorithm-flowchart` |
| “Foundation 커밋·푸시하고 지정 프로젝트에 적용해줘” | `package-dev-release` |
| “이 클래스들의 관계를 구조도로 보여줘” | `class-diagram` |
| “플레이어 하이어라키를 텍스트 트리로 보여줘” / “폴더 구조 보여줘” | `text-tree` |
| “이 C# 코드를 프로젝트 스타일에 맞춰 작성해줘” | `csharp-project-style` |
| “뷰 만들어줘” / “모델 만들어줘” / “뷰 모델 러너 구조로 만들어줘” / “뷰 모델 바인더 구조로 만들어줘” | `view-model-composition` |

텍스트 트리를 명시하면 클래스 구조도 `text-tree`를 우선합니다. Unity 오브젝트는 `Player [Transform, PlayerActor]`처럼 이름과 컴포넌트를 한 줄에 표시합니다. 배포 방법에 대한 질문이나 계획 요청만으로 커밋·푸시하지 않습니다.

개인 `AGENTS.md`에서 스킬 사용을 지정하려면 설치 위치를 기준으로 `skills/<스킬 이름>/SKILL.md`를 연결합니다. 공통 작업 지침은 `config/AGENTS.md`에서 관리합니다.

## 관리 원칙

- 각 스킬은 `skills/<스킬 이름>/SKILL.md`에 정의합니다.
- 예시는 해당 스킬의 `references/`에 둡니다.
- 수정은 저장소 원본에서 하고 설치본에도 반영합니다.
- 비밀키·인증 토큰·개인 실행 로그는 커밋하지 않습니다.
- 다른 출처의 스킬은 라이선스와 배포 조건을 확인한 뒤 별도로 추가합니다.
