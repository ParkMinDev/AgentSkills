# 순서도 저장 예시

## 새 문서 저장

일반 프로젝트에서 `Launcher.AppUpdater_.ExecuteCoreAsync`의 내부 병렬 처리까지 펼친 순서도를 저장하면:

```text
Ignore/FlowChart/Launcher.AppUpdater_.ExecuteCoreAsync 순서도.md
```

Unity 프로젝트라면 `Assets/Ignore/FlowChart/` 아래에 같은 파일명을 사용한다. 측정 그림은 `Launcher.AppUpdater_.ExecuteCoreAsync 측정 순서도.md`로 분리한다. 같은 대상 문서가 이미 있으면 갱신한다.

문서 구성 예시:

````markdown
# Launcher.AppUpdater_.ExecuteCoreAsync 순서도

- 기준: 현재 구현, 커밋 abc1234
- 대상 코드: [Launcher.cs](../../src/Launcher.cs)
- 갱신일: YYYY-MM-DD
- 범위: AppUpdater 전체와 내부 병렬 처리
- 생략: 전체 오류·취소 연결선

노드 색은 상대 비용, 실선은 실행 순서, 점선은 작업 전달이다.

## 순서도

```mermaid
여기에 설명한 전체 Mermaid 순서도를 넣는다.
```
````

대상 링크는 실제 저장 위치에서 계산한다. 측정 문서에는 입력/환경/반복 횟수/대표 실행 선택 기준과 결과 파일 링크도 추가한다.

## 기존 문서 갱신

“docs/app-updating-flowchart.md를 현재 코드로 갱신해줘”라면 해당 파일을 수정한다. 기본 저장 경로를 이유로 별도 Ignore 파일을 만들지 않는다.

## 결과 안내

- 생성: 저장된 순서도 파일 링크
- 수정: 갱신한 기존 파일 링크
- 측정하지 않았다면 새 실행시간을 만들어 넣지 않았음을 명확히 한다.
