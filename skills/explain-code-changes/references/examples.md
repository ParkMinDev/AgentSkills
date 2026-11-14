# 코드 변경 설명 예시

아래는 설명용 가상 코드다. 실제 응답에서는 확인한 파일·함수와 요청 범위로 대체한다. 실제 파일을 참조할 때는 해당 환경에서 열 수 있는 파일 링크를 사용한다.

## 추가: 결과 묶음에 이름 붙이기

`PatchWorkSpace.cs`의 `SelectCleanupTargets()`가 반환하는 네 목록을 이름 있는 자료형으로 표현하려는 변경안이다.

같은 파일의 `PatchWorkSpace` 안에 비공개 중첩 클래스 `CleanupSelection`을 추가한다. 이름은 "클린업 선정 결과"를 뜻한다.

```csharp
sealed class CleanupSelection
{
    public List<ReleaseTarget> Releases { get; }
    public List<PatchTarget> Patches { get; }
    public List<ReleaseEntry> RemainingReleases { get; }
    public List<PatchEntry> RemainingPatches { get; }
    // 생성자 생략
}
```

`SelectCleanupTargets()`가 생성하여 반환하고, `GetCleanupListAsync()`와 `CleanupAsync()`가 받아 사용한다.

```csharp
CleanupSelection selected = SelectCleanupTargets(index, keepVersion);
```

선정 규칙을 추가하는 것이 아니라 기존 결과 묶음에 이름을 붙인다. 위 타입·인자는 예시이며 실제 프로젝트의 선언에 맞춘다.

## 수정: 실행 순서를 바꾸는 경우

대상은 `PatchWorkSpace.cs`의 `PatchWorkSpace.PatchAsync()`다. 실행 파일과 보존 파일의 존재 확인 시점을 옮기려는 변경안이다.

현재:
```text
빌드 파일 목록 수집
    ↓
빌드를 제작용 폴더로 이동
    ↓
전체 파일 압축 + 크기·해시 계산
    ↓
실행 파일·보존 파일이 목록에 있는지 확인
    ├─ 없음 → 실패
    └─ 있음 → 제작 계속
```

실제 파일이 `Game.exe`인데 `Gmae.exe`로 입력하면 전체 압축을 마친 뒤 실패한다.

변경안:
```text
빌드 파일 목록 수집
    ↓
배포할 파일 목록 확정
    ↓
실행 파일·보존 파일이 목록에 있는지 확인
    ├─ 없음 → 이동·압축 전에 실패
    └─ 있음
           ↓
       빌드를 제작용 폴더로 이동
           ↓
       전체 파일 압축 + 크기·해시 계산
           ↓
       제작 계속
```

이미 수집한 목록을 사용하므로 파일 내용을 다시 읽는 검사는 추가하지 않는다. 입력 오류로 실패하는 시점이 앞당겨진다.

## 수정: 함수 선언을 바꾸는 경우

대상은 `Cleanup.cs`의 `SelectTargets()`와 그 호출부다. 실행 순서 대신 선언을 비교한다.

```csharp
// 현재
(List<string> Files, List<string> Directories) SelectTargets(string root);

// 변경안
DeletionTargets SelectTargets(string root);
```

```csharp
// 변경 후 호출 예
DeletionTargets targets = SelectTargets(root);
```

삭제 대상을 고르는 알고리즘은 유지하고 반환 자료형만 바꾼다. 메서드 본문 없이 선언만 나타낸 예시다.

## 삭제: 대체 경로가 있는 중복 함수

삭제 대상은 `PatchInfo.cs`의 `PatchInfo.ValidateExecutable()`이다.

- 기존 역할: 실행 파일의 상대 경로 형식과 `.exe` 확장자를 검사한다.
- 삭제 근거: 같은 규칙을 `PathUtility.cs`의 `PathUtility.ValidateExecutablePath(string path)`로 옮기고 기존 호출부도 교체한다.
- 호출부 변경: `PatchInfo.LoadFromJson()`이 공통 함수를 직접 호출한다.

```csharp
// 현재: PatchInfo.LoadFromJson() 내부
info.ValidateExecutable();

// 변경안
PathUtility.ValidateExecutablePath(info.Executable);
```

호출부를 교체한 뒤 기존 `ValidateExecutable()`을 삭제한다. 실행 파일 경로 검사는 유지되며, 파일 존재 여부까지 검사하게 되는 것은 아니다.

## 조합: 공통화의 연결 관계

목적은 파일 입력과 직접 입력이 같은 경로 검사 규칙을 사용하도록 하는 것이다.

| 작업 | 실제 대상 | 내용 |
| --- | --- | --- |
| 추가 | `PathUtility.cs` → `ValidateExecutablePath()` | 공통 검사 구현 |
| 수정 | `PatchInfo.cs` → `LoadFromJson()` | 읽어온 값을 공통 함수로 검사 |
| 수정 | `PatchWorkSpace.cs` → `PatchAsync()` | 직접 입력한 값을 공통 함수로 검사 |
| 삭제 | `PatchInfo.ValidateExecutable()` 및 `PatchAsync()`의 중복 검사 | 대체 호출로 기능 유지 |

필수값 누락은 `PatchInfo.LoadFromJson()`, 경로 형식은 `PathUtility.ValidateExecutablePath()`, 실제 배포 파일의 존재는 `PatchWorkSpace.PatchAsync()`가 담당한다. 책임의 이동 범위를 이렇게 구분하면 "공통화"라는 말만으로 설명할 때보다 변경 범위가 명확해진다.
