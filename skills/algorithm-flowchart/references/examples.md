# 순서도 예시

Mermaid 코드 블록은 렌더링 가능한 원문이다. 처리시간은 측정값이 아닌 상대 추정이다.

## 1. 기본 예시
많은 파일의 경로를 조회하고 전체 내용을 읽어 해시를 계산한 뒤 작은 명세를 저장하는 흐름이다. 저=초록 · 중=노랑 · 고=빨강.

```mermaid
flowchart TD
    START(["시작 · 파일 명세 생성<br/>저"]) --> A
    A["입력 옵션 확인<br/>저"] --> B["파일 경로 목록 조회<br/>중"]
    B --> C["전체 파일 읽기·해시 계산<br/>고"]
    C --> D["작은 결과 명세 저장<br/>저"]
    D --> END(["종료 · 명세 저장 완료<br/>저"])
    classDef low fill:#dcfce7,stroke:#16a34a,color:#14532d
    classDef medium fill:#fef9c3,stroke:#ca8a04,color:#713f12
    classDef high fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
    class START,END,A,D low
    class B medium
    class C high
    linkStyle default stroke:#16A34A,stroke-width:2px
```

## 2. 실전 예시 — 패치 제작
전제: 작업 공간은 공통 잠금을 따르는 패처만 수정한다. 입력 빌드는 같은 볼륨의 제작용 폴더로 이동하며 실패해도 복원하지 않는다. 압축 중 검증하므로 게시 직전 전체 재검증은 하지 않는다. 이 전제를 다른 구현에 자동 적용하지 않는다.

저=초록 · 중=노랑 · 고=빨강. 델타(delta)는 이전 파일을 새 파일로 바꾸는 차이 데이터다.

```mermaid
flowchart TD
    START(["시작 · 패치 제작 요청<br/>저"]) --> A
    A["잠금 획득·인덱스 읽기<br/>저"] --> B["옵션·목표 버전·이전 명세 확인<br/>저"]
    B --> C["임시 폴더·이번 버전 미게시 잔여물 삭제<br/>중"]
    C --> D["입력 빌드 경로·링크 검사<br/>중"]
    D --> E["입력 빌드를 제작용 폴더로 이동<br/>기존 입력 위치에 빈 폴더 생성<br/>저"]
    E --> F["patch-info.json 제거<br/>저"]
    F --> G["파일 목록 생성·전체 크기와 해시 계산<br/>고"]
    G --> H["보존 정책·강제 갱신 버전 결정<br/>저"]
    H --> I["제작용 파일 경로·누락·추가 검사<br/>중"]
    I --> J["Releases.zip 압축하며 크기·해시 검증<br/>고"]
    J --> K["압축파일 해시 계산·릴리즈 명세 저장<br/>고"]
    K --> L{"이전 릴리즈 존재?<br/>저"}
    L -->|있음| M{"다음 파일 있음?<br/>저"}
    M -->|있음| N{"이전 명세와 비교해 변경 파일인가?<br/>저"}
    N -->|신규 또는 동일| M
    N -->|변경| O["해당 기준 파일 크기·해시 검증<br/>고"]
    O --> P["델타 생성<br/>고"]
    P --> Q{"전체 파일보다 작음?<br/>저"}
    Q -->|예| R["델타 시험 적용·결과 검증<br/>고"]
    Q -->|아니오| S["델타 폐기<br/>저"]
    R --> M
    S --> M
    M -->|없음| T["델타 명세 저장<br/>저"]
    L -->|없음| U["취소 요청 확인<br/>저"]
    T --> U
    U --> V["최종 위치로 이동·인덱스 게시<br/>저"]
    V --> W["임시 폴더 정리·잠금 해제<br/>중"]
    W --> END(["종료 · 패치 제작 완료<br/>저"])
    classDef low fill:#dcfce7,stroke:#16a34a,color:#14532d
    classDef medium fill:#fef9c3,stroke:#ca8a04,color:#713f12
    classDef high fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
    class START,END,A,B,E,F,H,L,M,N,Q,S,T,U,V low
    class C,D,I,W medium
    class G,J,K,O,P,R high
    linkStyle default stroke:#16A34A,stroke-width:2px
```

- 해시 알고리즘이 바뀌면 보존 정책·델타 대상 판단에도 이전 파일 읽기가 추가된다.
- 이동 후 게시 전 실패·취소 시 복원하지 않고 잔여물을 남기며 잠금은 해제한다. 다음 작업은 정해진 미게시 잔여물만 정리한다.
- 게시 확정 구간부터는 취소하지 않는다. 게시 후 정리 실패는 게시 성공과 구분해 경고한다.

## 3. 단일 순서도 — 펼칠 수 있는 호출 강조

아래와 다음 다중 예시는 설명용 가상 코드다. 특정 프로젝트의 구현 완료를 뜻하지 않는다. PrepareAsync는 CopyLauncherToTempAsync를 호출하고 실패/취소 시 자원을 정리한다. 노드 색은 상대 비용, 선 색은 정상 초록·오류 빨강·사용자 취소 노랑·공통 정리 회색이다.

```mermaid
flowchart TD
    START(["시작 · PrepareAsync<br/>저"]) --> CALL[["CopyLauncherToTempAsync<br/>내부 펼치기 가능 · 고"]]
    CALL -->|정상| CLEAN["결과 보관·자원 정리<br/>저"]
    CALL -->|오류| CLEAN
    CALL -->|사용자 취소| CLEAN
    CLEAN -->|공통 정리| RESULT{"보관한 결과는?<br/>저"}
    RESULT -->|정상| DONE(["반환 · 준비 완료<br/>저"])
    RESULT -->|오류| ERROR(["종료 · 오류 전달<br/>저"])
    RESULT -->|사용자 취소| CANCEL(["종료 · 취소 전달<br/>저"])
    classDef low fill:#dcfce7,stroke:#16a34a,color:#14532d
    classDef high fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
    class START,CLEAN,RESULT,DONE,ERROR,CANCEL low
    class CALL high
    linkStyle default stroke:#16A34A,stroke-width:2px
    linkStyle 2,6 stroke:#DC2626,stroke-width:2px
    linkStyle 3,7 stroke:#EAB308,stroke-width:3px
    linkStyle 4 stroke:#64748B,stroke-width:2px
```

## 4. 다중 순서도 — 함수별 책임 분리

“멀티 순서도로 보여줘” 요청이면 다음처럼 펼친다. 경로 프로퍼티와 단순 위임 함수는 추가 그림으로 만들지 않는다. 아래는 복사 책임을 설명하는 예시이며 병렬 처리를 가정하지 않는다. 실제 코드가 병렬이면 작업자 수와 전체 종료 대기를 별도로 반영한다.

### ① Launcher.cs · PrepareAsync

자원/잠금은 상위 함수가 관리한다. 자식 ②·③에서는 다시 획득하지 않는다. 간결하게 표현하기 위해 획득 실패는 종료 예외로 바로 전달하며, 획득하지 못한 자원은 해제하지 않는다.

```mermaid
flowchart TD
    START(["시작 · PrepareAsync<br/>저"]) --> ACQUIRE["설치 루트 확인·잠금 획득<br/>저"]
    ACQUIRE --> CALL[["CopyLauncherToTempAsync<br/>② 참고 · 고"]]
    ACQUIRE -->|획득 실패| ERROR(["종료 · 오류 전달<br/>저"])
    CALL -->|정상| CLEAN["결과 보관·잠금 해제<br/>저"]
    CALL -->|오류| CLEAN
    CALL -->|사용자 취소| CLEAN
    CLEAN -->|공통 정리| RESULT{"보관한 결과는?<br/>저"}
    RESULT -->|정상| DONE(["반환 · 준비 완료<br/>저"])
    RESULT -->|오류| ERROR
    RESULT -->|사용자 취소| CANCEL(["종료 · 취소 전달<br/>저"])
    classDef low fill:#dcfce7,stroke:#16a34a,color:#14532d
    classDef high fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
    class START,ACQUIRE,CLEAN,RESULT,DONE,ERROR,CANCEL low
    class CALL high
    linkStyle default stroke:#16A34A,stroke-width:2px
    linkStyle 2,4,8 stroke:#DC2626,stroke-width:2px
    linkStyle 5,9 stroke:#EAB308,stroke-width:3px
    linkStyle 6 stroke:#64748B,stroke-width:2px
```

### ② LocalInstallRoot.cs · CopyLauncherToTempAsync

전제: ①이 설치 루트 잠금을 보유한다. 임시 영역은 이 함수가 관리하며 파일 순회는 ③에 위임한다. 실패 정리 중 오류가 나도 원래 오류·취소 원인을 유지한다.

```mermaid
flowchart TD
    START(["시작 · CopyLauncherToTempAsync<br/>저"]) --> CHECK["원본·임시 경로 및 관리 영역 검사<br/>중"]
    CHECK --> PREPARE["이전 임시 영역 정리·폴더 생성<br/>중"]
    CHECK -->|검사 오류| ERROR(["종료 · 오류 전달<br/>저"])
    PREPARE --> CALL[["CopyExistingFilesFromManifestAsync<br/>③ 참고 · 고"]]
    PREPARE -->|오류| CLEAN["임시 영역 정리·원인 보존<br/>중"]
    PREPARE -->|사용자 취소| CLEAN
    CALL -->|정상| DONE(["반환 · 임시 사본 유지<br/>저"])
    CALL -->|오류| CLEAN
    CALL -->|사용자 취소| CLEAN
    CLEAN -->|공통 정리| RESULT{"보관한 원인은?<br/>저"}
    RESULT -->|오류| ERROR
    RESULT -->|사용자 취소| CANCEL(["종료 · 취소 전달<br/>저"])
    classDef low fill:#dcfce7,stroke:#16a34a,color:#14532d
    classDef medium fill:#fef9c3,stroke:#ca8a04,color:#713f12
    classDef high fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
    class START,ERROR,DONE,RESULT,CANCEL low
    class CHECK,PREPARE,CLEAN medium
    class CALL high
    linkStyle default stroke:#16A34A,stroke-width:2px
    linkStyle 2,4,7,10 stroke:#DC2626,stroke-width:2px
    linkStyle 5,8,11 stroke:#EAB308,stroke-width:3px
    linkStyle 9 stroke:#64748B,stroke-width:2px
```

### ③ FileUtility.cs · CopyExistingFilesFromManifestAsync

전제: ②가 목적지와 명세를 준비했다. 누락은 정상 건너뛰기이며 접근 오류를 누락으로 취급하지 않는다. 출력 파일 삭제는 ②의 책임이고 이 함수는 열린 스트림을 정리한 후 반환/예외를 전달한다.

```mermaid
flowchart TD
    START(["시작 · CopyExistingFilesFromManifestAsync<br/>저"]) --> NEXT{"다음 명세 파일이 있는가?<br/>저"}
    NEXT -->|없음| DONE(["반환 · 복사 완료<br/>저"])
    NEXT -->|있음| OPEN["취소 확인·경로 검사·원본 열기<br/>저"]
    OPEN -->|파일 누락 · 허용| NEXT
    OPEN -->|파일 존재| COPY["출력 파일 생성·스트림 복사<br/>고"]
    OPEN -->|경로·권한·공유 오류| ERROR(["종료 · 자원 정리 후 오류 전달<br/>저"])
    OPEN -->|사용자 취소| CANCEL(["종료 · 자원 정리 후 취소 전달<br/>저"])
    COPY -->|성공 · 스트림 닫기| NEXT
    COPY -->|읽기·쓰기 오류| ERROR
    COPY -->|사용자 취소| CANCEL
    classDef low fill:#dcfce7,stroke:#16a34a,color:#14532d
    classDef high fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
    class START,NEXT,DONE,OPEN,ERROR,CANCEL low
    class COPY high
    linkStyle default stroke:#16A34A,stroke-width:2px
    linkStyle 5,8 stroke:#DC2626,stroke-width:2px
    linkStyle 6,9 stroke:#EAB308,stroke-width:3px
```

③의 반환·오류·취소는 ②의 호출 노드 출력과, ②의 출력은 ①의 호출 노드 출력과 대응한다. 부모 그림에 자식의 파일 순회나 복사 로직을 다시 펼치지 않는다.
