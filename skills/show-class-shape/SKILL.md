---
name: show-class-shape
description: 클래스·인터페이스·공개 API의 모양을 보여 줄 때 사용한다(API 형태 보여줘, 어떤 메서드가 생기는지 보여줘). 클래스 블록 안에 선언을 실제와 같게 쓰고, 호출하는 쪽이 알아야 할 계약을 동작 표로, 기존 API의 바뀌는 동작을 별도 표로 적는다.
---

# 클래스 형태

표기는 아래 예시를 따른다. 예시는 표현 방식만 보여 주며 실제 프로젝트 코드가 아니다.

## 예시

```csharp
public class SaveStore {
    public Task SaveAsync(int slotId, CancellationToken cancellationToken = default);
    public void DeleteSlot(int slotId);
    public IReadOnlyList<SaveBackupInfo> GetBackups(int slotId);
    public Task<string> RestoreBackupAsync(
        int slotId,
        string backupId,
        IProgress<SaveProgress>? progress = null,
        CancellationToken cancellationToken = default
    );
}

public sealed class SaveBackupInfo {
    public string Id { get; }
    public long Size { get; }
    public DateTimeOffset CreatedUtc { get; }
}
```

`RestoreBackupAsync` 동작:

| 항목 | 동작 |
| --- | --- |
| 역할 | 백업을 현재 저장 파일로 되돌리고, 되돌린 저장 파일 경로를 반환한다 |
| 대상 | `GetBackups`가 돌려준 백업. 지워진 백업 ID는 오류 |
| 결과 확인 | 풀어낸 파일의 `size`·`hash`를 백업 기록과 비교한다 |
| 재실행 | 실패하거나 취소하면 현재 저장 파일을 그대로 둔다 (`SaveAsync`의 교체와 같은 방식) |
| 잠금 | `SaveAsync`와 같은 슬롯 잠금. 다른 작업 중이면 `IOException` |
| 취소 | 지원한다. 임시 파일을 지우고 `OperationCanceledException` |
| 오류 | 없는 백업·손상된 백업·해시 불일치는 `InvalidDataException` |
| 진행 보고 | `SaveProgress` 단계 `백업 확인` → `백업 해제` → `복원 완료` |

기존 API의 바뀌는 동작 (시그니처는 그대로):

| API | 바뀌는 동작 |
| --- | --- |
| `SaveStore.SaveAsync` | 덮어쓰기 전에 직전 파일을 `backups/`에 압축해 남긴다. 백업 실패는 경고로 알리고 저장은 계속한다 |
| `SaveStore.DeleteSlot` | 슬롯 백업도 함께 지운다. 사용법은 같다 |

## 규칙
- **실제 코드를 읽고 쓴다.** 기존 이름·인자·예외·진행 보고 형식은 현재 코드에서 확인하고, 새 이름은 기존 이름 규칙을 따른다. 아직 없는 이름은 제안이라고 밝힌다.
- **클래스 블록 안에 쓴다.** 타입 선언(접근 제한자, `static`·`sealed`·`partial`, 상속·인터페이스)을 실제와 같게 쓰고 그 안에 멤버 선언을 둔다. 타입이 여러 개면 같은 블록에 차례로 둔다.
- **선언은 실제와 같게** 쓴다. 기본값·nullable·취소 토큰까지 맞추고, 메서드는 본문 없이 `;`로 끝낸다. 매개변수가 여러 줄이면 `)`를 단독 줄에 둔다.
- **멤버 범위**: 기본은 공개 멤버(public·protected 등 바깥에서 쓰는 것)를 **기존 것까지 전부** 쓰고 접지 않는다. 사용자가 비공개 멤버도 보여 달라고 하면 비공개 멤버까지 전부 쓴다.
- **주석을 쓰지 않는다.** 멤버의 역할이나 반환값 설명이 필요하면 동작 표의 "역할" 행에 쓴다.
- **동작 표**에는 호출하는 쪽이 알아야 할 계약만, 해당하는 행만 둔다. 항목은 역할, 대상, 결과 확인, 재실행(실패·취소 시 기존 결과를 지키는지), 잠금, 취소, 오류, 진행 보고에서 고른다. 기존 동작과 같은 방식이면 그 사례를 가리킨다.
- **기존 API**의 시그니처가 그대로면 `API | 바뀌는 동작` 표에 결과가 어떻게 달라지는지 쓴다. 공개 API가 그대로인 모듈은 "공개 API 변경 없음"과 내부에서 달라지는 것을 한 행에 쓴다.
- **달라지는 모양**: 기존 것과 달라지는 모양을 보여 줄 때는 [show-diff](../show-diff/SKILL.md)를 따른다. 이 대화에서 이미 읽었으면 다시 읽지 않는다.
