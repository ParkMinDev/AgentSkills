# AgentSkills

개인 AI 코딩 에이전트 스킬을 관리하는 독립 저장소입니다. 저장소의 파일을 원본으로 관리하며, 도구별 개인 스킬 폴더에는 복사하여 설치합니다.

## 스킬 목록

| 스킬 | 용도 |
| --- | --- |
| [algorithm-flowchart](skills/algorithm-flowchart/SKILL.md) | 알고리즘을 Mermaid 순서도로 설명하고 저·중·고 색상을 표시합니다. 측정 요청 시 실제 실행시간도 표시하며, 일반·패치 제작·병렬 측정 예시를 포함합니다. |
| [package-dev-release](skills/package-dev-release/SKILL.md) | PackageDev와 자체 패키지의 의존 버전, 변경 이력, 커밋·푸시 및 지정 프로젝트 적용을 처리합니다. |
| [class-diagram](skills/class-diagram/SKILL.md) | 실제 코드나 합의된 설계의 클래스·인터페이스 관계를 Mermaid 클래스 다이어그램으로 설명합니다. |
| [text-tree](skills/text-tree/SKILL.md) | Unity 오브젝트·컴포넌트, 폴더·파일 및 일반 계층 정보를 텍스트 트리로 설명합니다. |
| [csharp-project-style](skills/csharp-project-style/SKILL.md) | Unity 및 일반 C# 코드의 선언·멤버 순서·비동기·직렬화 필드 스타일을 적용합니다. |
| [view-model-composition](skills/view-model-composition/SKILL.md) | 뷰·모델·러너·바인더를 요청한 조합으로 구성하고, 책임·수명 및 uGUI 계층을 정리합니다. |

## Codex 설치 및 갱신

`csharp-project-style`은 Unity와 일반 C# 코드의 작성 스타일을 관리합니다. 정적 멤버는 최상단에 모으고, Unity 컴포넌트 필드는 Odin이 있으면 `Title`, 없으면 `Header`를 사용합니다.

이 저장소를 복제한 뒤 저장소 루트에서 PowerShell로 실행합니다. 비공개 저장소이므로 GitHub 접근 권한이 필요합니다.

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

## 사용

다음과 같이 요청하거나 `$스킬이름`을 명시합니다. 스킬 선택은 사용 중인 에이전트의 기능에 따릅니다.

| 요청 예시 | 스킬 |
| --- | --- |
| “이 함수 순서도 보여줘” | `algorithm-flowchart` |
| “측정 포함 순서도 보여줘” / “이전 측정 결과로 순서도 보여줘” | `algorithm-flowchart` |
| “Foundation 커밋·푸시하고 지정 프로젝트에 적용해줘” | `package-dev-release` |
| “이 클래스들의 관계를 구조도로 보여줘” | `class-diagram` |
| “플레이어 하이어라키를 텍스트 트리로 보여줘” / “폴더 구조 보여줘” | `text-tree` |
| “이 C# 코드를 프로젝트 스타일에 맞춰 작성해줘” | `csharp-project-style` |
| “뷰 만들어줘” / “모델 만들어줘” / “뷰 모델 러너 구조로 만들어줘” / “뷰 모델 바인더 구조로 만들어줘” | `view-model-composition` |

텍스트 트리를 명시하면 클래스 구조도 `text-tree`를 우선합니다. Unity 오브젝트는 `Player [Transform, PlayerActor]`처럼 이름과 컴포넌트를 한 줄에 표시합니다. 배포 방법에 대한 질문이나 계획 요청만으로 커밋·푸시하지 않습니다.

개인 `AGENTS.md`에서 스킬 사용을 지정하려면 설치 위치를 기준으로 `skills/<스킬 이름>/SKILL.md`를 연결합니다. 개인 코딩 규칙 전체를 이 저장소에 복사할 필요는 없습니다.

## 관리 원칙

- 각 스킬은 `skills/<스킬 이름>/SKILL.md`에 정의합니다.
- 예시는 해당 스킬의 `references/`에 둡니다.
- 수정은 저장소 원본에서 하고 설치본에도 반영합니다.
- 비밀키·인증 토큰·개인 실행 로그는 커밋하지 않습니다.
- 다른 출처의 스킬은 라이선스와 배포 조건을 확인한 뒤 별도로 추가합니다.
