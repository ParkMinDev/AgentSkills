# Canvas 표현 예시

아래 함수와 데이터는 설명용 가상 예시이며 제품 구현이나 실제 측정 결과가 아니다. 구체적인 프로젝트의 이전 패치 정책을 그대로 옮긴 예시는 사용하지 않는다.

## 1. 시작, 분기, 반환

Advanced Canvas가 활성화된 보관소에서 사용할 수 있는 작은 `.canvas` 예시다. 표준 Canvas에서는 텍스트와 선은 유지되지만 확장 도형은 표시되지 않을 수 있다.

```json
{
  "nodes": [
    {"id":"main","type":"group","x":0,"y":0,"width":1600,"height":1300,"label":"[가상 예시] Preparer.PrepareAsync","color":"#64748b"},
    {"id":"start","type":"text","x":150,"y":80,"width":1200,"height":350,"color":"6","text":"### 시작\n[가상 예시] Preparer\n```csharp\npublic async Task PrepareAsync(\n    string directoryPath,\n    CancellationToken cancellationToken = default\n)\n```","styleAttributes":{"shape":"pill"}},
    {"id":"check","type":"text","x":450,"y":500,"width":600,"height":300,"color":"4","text":"### 준비할 파일이 있는가?","styleAttributes":{"shape":"diamond","textAlign":"center"}},
    {"id":"done","type":"text","x":150,"y":980,"width":550,"height":180,"color":"6","text":"### 반환\n처리 완료","styleAttributes":{"shape":"pill"}},
    {"id":"skip","type":"text","x":900,"y":980,"width":550,"height":180,"color":"6","text":"### 반환\n변경 없음","styleAttributes":{"shape":"pill"}}
  ],
  "edges": [
    {"id":"e1","fromNode":"start","fromSide":"bottom","toNode":"check","toSide":"top","toEnd":"arrow","color":"#16a34a"},
    {"id":"e2","fromNode":"check","fromSide":"bottom","toNode":"done","toSide":"top","toEnd":"arrow","color":"#16a34a","label":"예"},
    {"id":"e3","fromNode":"check","fromSide":"right","toNode":"skip","toSide":"top","toEnd":"arrow","color":"#16a34a","label":"아니오"}
  ]
}
```

카드 폭이 부족하면 인자의 타입과 이름을 쪼개지 않고 카드를 넓힌다. 마름모는 중앙 유효 폭에 맞게 문장을 짧게 쓰되 분기 의미를 생략하지 않는다.

## 2. 함수별 펼치기

상위 시작 → 명세 조회 호출 → 파일 준비 호출 → 반환 흐름이라면:

- 바깥 그룹: `Preparer.PrepareAsync`, 시작 카드에 전체 선언부.
- 첫 내부 그룹: `GetManifestAsync`, 그 그룹의 시작 카드에 해당 선언부와 조회 단계.
- 둘째 내부 그룹: `PrepareFilesAsync`, 시작 카드와 파일별 반복/실패 처리.
- 같은 함수를 펼쳤다면 상위에 별도 실행 호출 카드를 남겨 두 번 실행하는 모양으로 그리지 않는다.
- 짧은 경로 반환 함수는 호출 역할만 표시한다. 독립 Canvas로 분리할 때는 번호와 파일 링크를 연결한다.

## 3. 세 병렬 흐름

가상 배치 예시다. 좌표는 예시이며 실제 카드 크기에 맞춰 조정한다.

- 바깥 `병렬 처리`: x=0, y=800, width=6600, height=2800.
- 내부 `다운로드`: x=100, y=1000, width=2000, height=2400.
- 내부 `델타 적용`: x=2300, y=1000, width=2000, height=2400.
- 내부 `최종 검증`: x=4500, y=1000, width=2000, height=2400.
- 함께 시작 카드는 바깥 그룹 위에, 모든 파일 완료와 작업자 종료 대기는 아래에 둔다. 두 실선은 바깥 그룹을 연결한다.

각 내부 그룹의 위에는 대기열, 가운데에는 처리와 조건/반복, 아래에는 이벤트 노드를 놓는다. 파랑 테두리와 짙은 바탕으로 독립 흐름을 구분한다. 내부 영역은 스레드 하나가 아니며 작업자 수를 별도로 쓴다.

전달 선은 이벤트에서 대상 대기열로 향한다. 예시:

```json
{"id":"deltaevent","fromNode":"downloadDeltaEvent","fromSide":"right","toNode":"deltaQueue","toSide":"left","toEnd":"arrow","label":"델타 자료 전달","color":"#60a5fa","styleAttributes":{"path":"dotted"}}
```

실제 Canvas에는 참조하는 두 노드가 있어야 한다. 다른 이벤트도 각각 표현한다.

- 다운로드: 델타 완료 → 적용 대기열, 전체 파일 완료 → 검증 대기열.
- 델타 적용: 다음 델타 요청 → 다운로드 대기열, 목표 도달 → 검증 대기열, 적용 실패 → 수리 요청.
- 검증: 실패 → 수리 요청, 성공 → 파일 완료.

잠깐 큐가 비었다고 종료하지 않는다. 모든 대상 완료 후 작업자 종료를 기다린다. 해당 알고리즘이 결과만 준비하는 구조라면 “원본 교체”를 임의로 끼워 넣지 않는다.

## 4. 실측 표시

카드 안:

```markdown
### 델타 적용

**시간 0.976초 | 최대 전용 29.07MB**

앱 인접 업데이트, 31회, 동시 호출 중복을 제외한 활동시간.
메모리는 해당 구간 프로세스 전체 관측값.
```

바깥 병렬 그룹 제목은 짧게 `병렬 전체 | 1.088초 | 최대 전용 29.07MB`로 표시하고 자세한 조건은 읽는 방법 카드에 둔다. 위 숫자는 서식 예시이며 해당 프로젝트의 실측으로 재사용하지 않는다. 병렬 시간과 메모리는 더하지 않는다.

## 5. 변경과 메모리 피크 강조

아래는 서로 독립된 두 표시다. 첫 노드는 수정됐지만 피크는 아니고, 두 번째는 피크가 관측됐지만 수정됐다는 뜻은 아니다. 두 조건을 모두 충족하면 두 속성을 함께 둔다.

```json
{"id":"changed","type":"text","x":0,"y":0,"width":650,"height":240,"color":"3","text":"### 이번에 변경한 처리","styleAttributes":{"revisionEmphasis":"current"}}
```

```json
{"id":"peak","type":"text","x":800,"y":0,"width":650,"height":240,"color":"1","text":"### 델타 적용\n시간 0.976초 | 최대 전용 29.07MB","styleAttributes":{"memoryPeak":"observed"}}
```

제공된 CSS를 활성화하면 첫 노드는 기존 노랑색 10px 테두리, 두 번째는 기존 빨간 배경과 테두리에 빨간 외곽 광택을 추가한다. 마름모나 캡슐이면 기존 `shape`도 그대로 둔다.

병렬 그룹은 `label`에 `1.088초 | 최대 전용 29.07MB`만 표시하고 `memoryPeak` 속성은 넣지 않는다. 같은 값이 찍혔다고 그룹까지 붉게 빛나게 하지 않는다. 범례에는 “빨간 광택은 해당 대표 회차에서 프로세스 최대 전용 메모리가 관측된 개별 노드, 10px 테두리는 이번 변경”이라고 적는다. 수치는 가상 예시다.
