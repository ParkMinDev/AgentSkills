# Canvas 저장과 문서 연결

## 경로와 하나의 원본

프로젝트 루트가 보관소인 경우와 `Work`만 보관소인 경우는 내부 링크 경로가 다르다. 디스크 경로와 보관소 안 경로를 구분한다.

- 디스크: `<프로젝트>/Work/flowchart/Launcher.AppUpdater_.ExecuteCoreAsync 순서도.canvas`
- `Work` 보관소에서 포함: `![[flowchart/Launcher.AppUpdater_.ExecuteCoreAsync 순서도.canvas]]`
- 프로젝트 전체 보관소에서 포함: `![[Work/flowchart/Launcher.AppUpdater_.ExecuteCoreAsync 순서도.canvas]]`

여러 진입점이 공유하는 대표 그림은 기존 `런처 순서도.canvas` 하나를 갱신한다. 측정값을 추가해도 별도 측정 순서도를 자동으로 만들지 않는다. 문서에는 그림을 재작성하지 않고 같은 Canvas를 포함한다.

## 설명 문서 예시

아래는 `Work`가 보관소인 경우다. Obsidian이 파일명을 제목으로 표시하면 본문 첫 줄에 같은 제목을 반복하지 않는다. 다른 도구용 문서나 사용자가 제목을 지정한 문서는 그 요구를 따른다.

```markdown
![[analysis/성능 측정.base#전체 비교]]

표 상단에서 분류와 지표 보기를 전환할 수 있습니다.

## 실행 흐름

![[flowchart/런처 순서도.canvas]]

측정 조건: [[analysis/런처 노드 측정]]

## - 에이전트 참고 영역 -

코드 기준, 원시 로그 경로, 미측정 분기와 재현 조건을 기록한다.
```

Base는 보기 설정이며 실제 행의 값은 항목별 Markdown 속성에 있다. `.base`만 보존하고 데이터 파일을 삭제하면 표를 유지할 수 없다. 기존 Base를 연결할 때 조회 대상 폴더와 항목 파일까지 확인한다.

## 기존 Mermaid 문서를 대신할 때

사용자가 교체/삭제를 요청한 범위에서 다음을 처리한다.

1. 기존 문서의 분기, 반복, 병렬, 실패/취소, Work 정리 설명과 측정 조건을 읽는다.
2. 흐름은 Canvas에, 오래 유지할 설명은 연결된 `.md`에 보존한다. 현재와 다른 과거 수치를 최신값으로 옮기지 않는다.
3. 참조 문서와 Canvas 내부 링크를 새 대상에 연결한다.
4. 독자적인 자료가 보존됐는지와 정확한 대상 경로를 확인한 뒤 지정된 이전 파일만 삭제한다.

스킬 갱신은 프로젝트 파일 일괄 이동이나 삭제의 승인이 아니다. 기존 형식 수정을 명시했다면 Canvas로 몰래 대체하지 않는다.

## 변경 노드와 삭제 노드

이전 노드와 의미가 같은 노드는 식별자와 배치를 유지한다. 이번에 바뀐 노드에만 지원되는 10px 강조를 적용하고 이전 갱신 강조를 해제한다. Advanced Canvas에서는 `styleAttributes.revisionEmphasis: current`와 제공된 CSS를 함께 쓴다. 기본 Canvas에 없는 속성을 저장한 것만으로 적용됐다고 보고하지 않는다.

메모리 피크 노드는 `styleAttributes.memoryPeak: observed`로 독립 표시한다. 빨간 광택은 개별 노드에만 적용하고 모든 `group`에서 이 속성을 제거한다. 그룹의 기존 색상과 수치는 유지한다. 데이터나 조건을 다시 측정하면 이전 피크 표시를 그대로 누적하지 않고 새 기록으로 다시 선정한다.

재사용할 스타일은 `assets/canvas-node-emphasis.css`다. 허용된 보관소의 `.obsidian/snippets/`에 복사하고 해당 조각만 활성화한다. 다른 조각이나 플러그인 활성 상태를 덮어쓰지 않으며 공통 설정 저장소는 별도 요청 없이는 수정하지 않는다. 노드 도형, 색상, 배치와 선은 유지한다.

Canvas 아래쪽의 삭제 카드 예시:

```markdown
### 삭제된 노드

1. DownloadPipeline.SelectRequest(): 작은 다운로드와 큰 적용량 요청을 번갈아 선택
2. PerformanceSession.Estimate(): 다운로드 속도로 남은 처리시간 비교
```

위 함수와 내용은 가상 예시다. 실제 작업에서는 존재하는 함수와 삭제 전 내용을 쓴다. 다음 갱신에 삭제가 없다면 이 카드를 제거한다.

## 형식 근거

- [JSON Canvas 공식 규격](https://jsoncanvas.org/spec/1.0/)
- [Advanced Canvas 확장 규격](https://github.com/Developer-Mike/obsidian-advanced-canvas/blob/main/assets/formats/advanced-json-canvas/spec/1.0-1.0.md)
- [Obsidian Base 포함 방법](https://obsidian.md/help/bases/create-base)

플러그인별 표시 지원은 설치 버전과 보관소 설정을 확인한다. 규격 문서를 실제 렌더링 확인의 대체 근거로 쓰지 않는다.
