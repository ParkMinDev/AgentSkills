# Markdown, Base, Canvas의 역할

## 파일별 책임

- `.md`: 목적, 결정 이유, 현재 상태, 작업 대상, 완료 조건과 고정 방침을 설명한다.
- `.base`: 항목 파일을 조회해 필터, 정렬, 열, 수식과 보기를 정의한다. 자체에 전체 행 데이터를 보관하는 파일이 아니다.
- 데이터 `.md`: 항목 하나의 수치를 앞부분 속성에 보관한다. Base가 읽는 원본이므로 폴더가 복잡해 보인다고 삭제하지 않는다.
- `.canvas`: 함수 영역, 분기, 병렬 처리와 작업 전달을 표현한다. 문서에서 같은 그림을 포함한다.

파일명 제목이 표시되는 Obsidian에서는 본문에 같은 제목을 한 번 더 쓰지 않는다. 사람이 읽는 설명과 결과를 먼저 두고 에이전트 참고 영역과 고정 방침은 아래에 둔다.

## 작은 표 예시

아래는 가상 데이터다. 실제 측정을 대신하지 않는다. 경로는 `<프로젝트명>.DevDocs` 보관소 루트 기준이다.

`analysis/Data/성능 측정 항목/동일 버전.md`:

```yaml
---
order: 1
scenario: 동일 버전 빠른 검사
condition: 로컬
beforeSeconds: 0.25
afterSeconds: 0.20
runs: 3
measured: "YYYY-MM-DD"
---
```

`analysis/성능 측정.base`:

```yaml
filters:
  and:
    - file.inFolder("analysis/Data/성능 측정 항목")
    - file.ext == "md"
properties:
  note.scenario:
    displayName: 시나리오
  note.beforeSeconds:
    displayName: 이전 시간(초)
  note.afterSeconds:
    displayName: 현재 시간(초)
views:
  - type: table
    name: 전체 비교
    order:
      - note.scenario
      - note.condition
      - note.beforeSeconds
      - note.afterSeconds
      - note.runs
    sort:
      - property: note.order
        direction: ASC
```

비교 수치는 숫자 속성으로 유지한다. 색이나 단위를 붙인 문자열로 바꾸면 수치 정렬과 계산을 망가뜨릴 수 있다. 표시용 수식은 기존 보기를 확인해 따로 정의한다. 시간과 메모리 단위, 중앙값/최고값과 표본 수를 구분한다.

## 설명 문서에서 포함

```markdown
같은 입력에서 최신 구현의 성능을 비교한다.

![[analysis/성능 측정.base#전체 비교]]

표 위의 보기 메뉴에서 분류나 메모리 상세로 전환할 수 있다.

## 실행 흐름

![[flowchart/런처 순서도.canvas]]

## - 에이전트 참고 영역 -

측정 코드 기준, 입력, 실행 조건과 원시 결과 경로를 둔다.

### 고정 방침

전체 계획에서 가져온 해당 프로젝트의 방침을 둔다.
```

링크와 데이터 필터는 `.DevDocs` 보관소 루트 기준으로 쓴다. 실제 보관소 경로를 확인하고 데이터 필터와 내부 링크를 함께 맞춘다. 기본 데이터 폴더는 `analysis/Data/<표 이름> 항목/`으로 둘 수 있지만 기존 데이터를 스킬 적용만으로 일괄 이동하지 않는다.

## 갱신과 정리

1. 숫자는 항목 속성에서 갱신하고 보기 구성은 Base에서 바꾼다. 설명 문서의 숫자 표를 따로 유지하지 않는다.
2. Base에 여러 보기를 두어 분류를 바꾼다. 같은 문서에 분류별 표를 반복 포함하지 않는 것을 기본으로 한다.
3. 요청받은 데이터 폴더 이동 시 기존 수치를 보존하고 필터와 참조 경로를 함께 수정한다.
4. 작업계획이 완료돼 삭제되어도 공유 데이터, Base, Canvas와 측정 조건은 유지한다. 다른 문서의 참조를 확인한 뒤 명시적으로 불필요한 파일만 삭제한다.
5. 화면 확인을 하지 않았다면 파일 반영 확인과 렌더링 검증을 구분해 보고한다.

형식 근거: [Obsidian Bases 소개](https://obsidian.md/help/bases), [Base 만들기와 포함](https://obsidian.md/help/bases/create-base), [Base 문법](https://obsidian.md/help/bases/syntax).
