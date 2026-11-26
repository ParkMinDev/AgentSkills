# AI-AgentKit

개인 AI 코딩 에이전트(Codex·Claude Code)의 공통 작업 지침, 스킬, 플러그인을 관리하는 저장소입니다. 저장소의 파일을 원본으로 관리합니다.

## 구성

| 경로 | 내용 |
| --- | --- |
| `config/AGENTS.md` | Codex·Claude Code 공통 작업 지침 원본 |
| [hooks/](hooks/turn-complete-sound/README.md) | Codex·Claude Code의 응답 완료 알림음 훅 |
| `skills/` | 공용 스킬 (Codex는 복사 설치, Claude Code는 `agent-skills` 플러그인) |
| `plugins/claude/turn-meter/` | Claude Code 모드: 응답 밑에 턴별 토큰 사용량 표시 |
| `plugins/claude/change-report/` | Claude Code 모드: 응답 밑에 이번 턴의 추가·수정·삭제 파일 목록 표시 |
| `plugins/codex/turn-meter/` | Codex용 Windows 턴미터: 별도 창에 턴별 토큰과 캐시 적중률 표시 |
| `.claude-plugin/` | Claude Code 로컬 마켓플레이스 `ai-agentkit` (`agent-skills`, `turn-meter`, `change-report`) |

## Claude Code 설치 및 갱신

저장소 루트에서 실행합니다.

```powershell
claude plugin marketplace add .
claude plugin install agent-skills@ai-agentkit
claude plugin install turn-meter@ai-agentkit
claude plugin install change-report@ai-agentkit
```

기존 설치를 갱신할 때는 저장소에서 `git pull --ff-only` 후 `claude plugin update agent-skills@ai-agentkit --scope user`를 실행하고 Claude Code를 재시작합니다. 버전 0.4.0부터 게임 기획서 스킬은 `workflow-game-design`으로 제공됩니다. 공통 지침은 `~/.claude/CLAUDE.md`에 아래 한 줄을 두어 불러옵니다(경로는 PC에 맞게 수정).

```
@D:/WorkSpace/ParkMinDev/Solutions/AI-AgentKit/config/AGENTS.md
```

## 스킬 목록

| 스킬                                                                     | 용도                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [workflow-game-design](skills/workflow-game-design/SKILL.md) | 게임별 대표 Obsidian Canvas 기획서에 규칙·데이터 표·플레이 흐름·시안을 함께 관리합니다. 게임마다 기존 대표 기획서를 갱신하며, 배치는 기본으로 시각 확인하며, 사용자가 생략을 요청하면 건너뜁니다. 새 기획서의 기본 경로는 `<프로젝트명>.DevDocs/기획/<게임명> 기획서.canvas`입니다. 캡슐·마름모 표시는 Advanced Canvas를 사용합니다. |
| [workflow-planning-execute](skills/workflow-planning-execute/SKILL.md) | 워크플로우: 계획 파일을 만들고 고치고(저장·문서·“작업계획에 반영”), 그 파일대로 실행하고, 완료되면 전체 계획에 기록하고 작업 파일을 `planning/완료/`로 옮깁니다. 전체 계획은 ✍️ 사용자 메모 · 📋 계획(진행 중·남은 계획) · ✅ 검증(남은 검증) · 🏁 완료(계획·검증) · 📌 고정 방침 · 🤖 에이전트 참고 영역, 작업계획은 ✍️ 사용자 메모 · 📦 결과물(`show-result`) · 📝 계획 요약 · 🔢 작업 순서 · ✅ 검증 · 🤖 에이전트용 계획으로 쓰고, 계획이 바뀌면 최신 계획으로 다시 씁니다. |
| [show-result](skills/show-result/SKILL.md)                             | 결과물 표현 조합: 작업으로 생기거나 바뀌는 결과물 전체를 클래스 → 폴더 → 파일 순서로, 알맞은 표현 스킬을 골라 보여 줍니다.                                                                                                                                                                                                                                          |
| [show-class-shape](skills/show-class-shape/SKILL.md)                   | 결과물 표현: 클래스·인터페이스·공개 API의 선언을 보여 줍니다.                                                                                                                                                                                                                                |
| [show-diff](skills/show-diff/SKILL.md)                                 | 결과물 표현 공통: 텍스트 하나(파일·설정·명세·목록·트리·선언)가 바뀔 때, 현재 기준으로 바뀌는 줄만 `+`/`-`로 표시하고(수정은 `+ 이전 → 새 (수정)`) 색은 `diff` 블록에 맡기며, 아래에 완성본을 함께 보여 줍니다. 새로 생기는 텍스트 파일·설정·명세의 내용도 보여 줍니다.                                                                                                                                              |
| [save-code-flowchart](skills/save-code-flowchart/SKILL.md)             | 코드의 실행 흐름을 그린 순서도 Canvas를 만들거나 복사·수정하거나 노드를 추가·삭제할 때 적용합니다(작업·검증 절차도와 기획서 Canvas 제외). 예시 순서도를 기준으로 노드 설명 범례, 함수 펼침·접힘, 병렬 영역, 변경 노드 광택, 메모리 피크 배지, 하단 삭제 영역과 요청한 시간/메모리 수치를 표시합니다.                                                                                                                                 |
| [organize-obsidian-assets](skills/organize-obsidian-assets/SKILL.md) | Obsidian 문서 전용 자료를 문서 옆의 .Data 폴더에 배치하고 이동한 참조를 갱신합니다. |
| [workflow-package-dev-push](skills/workflow-package-dev-push/SKILL.md) | PackageDev와 자체 패키지의 의존 버전, 변경 이력, 커밋·푸시 및 지정 프로젝트 적용을 처리합니다.                                                                                                                                                                                                                                                       |
| [show-text-tree](skills/show-text-tree/SKILL.md)                       | 결과물 표현: Unity 오브젝트·컴포넌트, 폴더·파일 및 일반 계층 정보를 텍스트 트리로 보여 줍니다.                                                                                                                                                                                                                                                         |
| [csharp-project-style](skills/csharp-project-style/SKILL.md)           | Unity 및 일반 C# 코드의 선언·멤버 순서·비동기·직렬화 필드 스타일을 적용합니다.                                                                                                                                                                                                                                                                  |
| [edit-libreoffice-document](skills/edit-libreoffice-document/SKILL.md) | LibreOffice가 여는 오피스 문서(스프레드시트·텍스트 문서·프레젠테이션·그림)를 UNO 연결(127.0.0.1:2002)로 읽고 고칩니다. 문서가 열려 있으면 닫지 않고 그 문서를 직접 고치고, 닫혀 있으면 숨김 상태로 열어 고친 뒤 닫습니다. |
| [view-model-composition](skills/view-model-composition/SKILL.md)       | 뷰·모델·러너·바인더를 요청한 조합으로 구성하고, 책임·수명 및 uGUI 계층을 정리합니다.                                                                                                                                                                                                                                                                |

## Codex 설치 및 갱신

Windows에서 턴별 토큰 사용량을 보려면 [Codex 턴미터 실행 안내](plugins/codex/turn-meter/README.md)를 참고하세요.

`csharp-project-style`은 Unity와 일반 C# 코드의 작성 스타일을 관리합니다. 정적 멤버는 최상단에 모으고, Unity 컴포넌트 필드는 Odin이 있으면 `Title`, 없으면 `Header`를 사용합니다.

이 저장소를 복제한 뒤 저장소 루트에서 PowerShell로 실행합니다.

Canvas의 이번 변경은 노드 자기 색의 광택으로, 메모리 피크는 개별 노드 오른쪽 위 빨간 배지로 구분하며 노드 글꼴만 1.7배로 키웁니다. 표시 방식은 [예시 순서도](skills/save-code-flowchart/assets/예시%20순서도.canvas)에 모두 담겨 있습니다. 재사용할 스타일은 [canvas-node-emphasis.css](skills/save-code-flowchart/assets/canvas-node-emphasis.css)에 있으며, 허용된 보관소에 별도로 설치·활성화합니다. 스킬 복사만으로 Obsidian 설정이 변경되지는 않습니다.

```powershell
$skillRoot = if ($env:CODEX_HOME) { Join-Path $env:CODEX_HOME 'skills' } else { Join-Path $env:USERPROFILE '.codex/skills' }
Get-ChildItem -LiteralPath './skills' -Directory | ForEach-Object {
    $target = Join-Path $skillRoot $_.Name
    New-Item -ItemType Directory -Path $target -Force | Out-Null
    Get-ChildItem -LiteralPath $_.FullName -Force | Copy-Item -Destination $target -Recurse -Force
}
```

갱신할 때는 저장소에서 `git pull --ff-only` 후 같은 복사 명령을 실행합니다. 설치본을 직접 수정했다면 먼저 저장소에 반영하거나 백업하세요. 복사는 기존 파일을 덮어쓰지만 저장소에서 삭제된 파일까지 제거하지는 않으므로 삭제된 항목은 별도로 확인합니다.

이전 버전에서 옮길 때는 새 `workflow-game-design` 설치 후 스킬 폴더에서 기존 `show-game-flowchart` 사본을 제거합니다. `save-code-flowchart`를 설치한 뒤에는 기존 `show-code-flowchart` 설치본을 제거합니다.

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

| 요청 예시                                                                  | 스킬                                            |
| ---------------------------------------------------------------------- | --------------------------------------------- |
| “이번 작업계획을 저장해줘” / “정한 대로 작업계획에 반영해줘” / “작업계획대로 진행해” / “전체 계획에 완료 반영해줘” | `workflow-planning-execute`                   |
| “구현 전에 계획 세워봐” / “어떻게 바꿀지 보여줘”                                         | `show-result` + 계획 설명 (`config/AGENTS.md` 지정) |
| “결과물 보여줘” / “이거 하면 뭐가 생기는지 보여줘” / “작업 결과 보여줘”                          | `show-result`                                 |
| “API 형태 보여줘” / “어떤 메서드가 생기는지 보여줘”                                      | `show-class-shape`                            |
| “이 파일 어떻게 바뀌는지 보여줘” / “변경 전후 비교해줘” / “설정 파일 형태 보여줘”                    | `show-diff`                                   |
| “이 함수 순서도를 저장해줘” / “멀티 순서도를 Canvas로 저장해줘” / “기존 Canvas를 복사해서 수정해줘”     | `save-code-flowchart`                         |
| “측정 포함 순서도를 저장해줘” / “이전 측정값으로 순서도를 저장해줘”                               | `save-code-flowchart`                         |
| “기획서에 시안 추가” / “이 표의 원본 자료 정리해줘” (Obsidian 보관소) | `organize-obsidian-assets` |
| “게임 기획서 만들어줘” / “기획서에 레시피와 보상 규칙 반영해줘” / “장면 전환 흐름을 그려줘” | `workflow-game-design` |
| “Foundation 커밋·푸시하고 지정 프로젝트에 적용해줘”                                     | `workflow-package-dev-push`                   |
| “플레이어 하이어라키를 텍스트 트리로 보여줘” / “폴더 구조 보여줘”                                | `show-text-tree`                              |
| “이 C# 코드를 프로젝트 스타일에 맞춰 작성해줘”                                           | `csharp-project-style`                        |
| “뷰 만들어줘” / “모델 만들어줘” / “뷰 모델 러너 구조로 만들어줘” / “뷰 모델 바인더 구조로 만들어줘”        | `view-model-composition`                      |

텍스트 트리를 명시하면 클래스 구조도 `show-text-tree`로 표현합니다. Unity 오브젝트는 `Player [Transform, PlayerActor]`처럼 이름과 컴포넌트를 한 줄에 표시합니다. 배포 방법에 대한 질문이나 계획 요청만으로 커밋·푸시하지 않습니다.

개인 `AGENTS.md`에서 스킬 사용을 지정하려면 설치 위치를 기준으로 `skills/<스킬 이름>/SKILL.md`를 연결합니다. 공통 작업 지침은 `config/AGENTS.md`에서 관리합니다.

## 관리 원칙

- 각 스킬은 `skills/<스킬 이름>/SKILL.md`에 정의합니다.
- 스킬은 다른 스킬의 SKILL.md를 링크로 읽어 부품처럼 조합합니다. 링크는 위에서 아래로만 둡니다(`workflow-planning-execute` → `show-result` → 결과물 표현 스킬 `show-class-shape`·`show-text-tree` → 공통 `show-diff`. 파일 형태는 `show-diff`가 직접 맡음). 결과물 표현 스킬은 달라지는 모양을 보여 줄 때 `show-diff`만 가리키고, `show-diff`는 다른 스킬을 가리키지 않습니다. 새 `show-` 스킬을 추가해도 `show-diff`는 고치지 않습니다. 같은 원칙은 한 스킬에만 두고 나머지는 링크합니다.
- 참고 문서는 해당 스킬의 `references/`에, 복사해서 사용하는 예시 캔버스와 첨부 자료는 `assets/`에 둡니다.
- 쓰지 않는 스킬은 지우지 않고 `skills-archive/<스킬 이름>/`으로 옮겨 보관합니다. 플러그인과 Codex 설치 명령은 `skills/`만 읽으므로 보관한 스킬은 불러오지 않으며, 다시 쓰려면 `skills/`로 되돌립니다. 이미 Codex에 설치된 사본은 따로 지웁니다.
- 스킬을 바꿔 커밋할 때는 `.claude-plugin/plugin.json`의 `version`도 올립니다. Claude Code는 설치할 때 받은 사본(`~/.claude/plugins/cache/`)을 쓰며, 버전이 같으면 업데이트에서 새로 받지 않습니다.
- Claude 전용 파일은 `.claude-plugin/`(매니페스트, 플러그인 아이콘 `agent-skills-icon.png`)에, Codex 전용 파일은 각 스킬의 `agents/`(`openai.yaml`, `icon.png`)에 둡니다. Codex는 스킬 폴더 단위로 설치되므로 스킬마다 `agents/`가 있어야 합니다. `openai.yaml`의 `display_name`만 영어(스킬 이름을 단어별 대문자로)로 쓰고, 짧은 설명과 기본 프롬프트는 한국어로 씁니다.
- 수정은 저장소 원본에서 하고 설치본에도 반영합니다.
- 비밀키·인증 토큰·개인 실행 로그는 커밋하지 않습니다.
- 다른 출처의 스킬은 라이선스와 배포 조건을 확인한 뒤 별도로 추가합니다.
