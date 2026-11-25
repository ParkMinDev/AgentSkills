---
name: show-class-shape
description: 클래스·인터페이스·공개 API의 선언을 보여 줄 때 사용한다(API 형태 보여줘, 어떤 메서드가 생기는지 보여줘). 기존 타입의 선언이 바뀌면 show-diff로 표시한다.
---

# 클래스 형태

## 예시

### • 클래스 형태

```csharp
public sealed class SaveStore {
    public IReadOnlyList<SaveBackupInfo> GetBackups(int slotId);
    public Task RestoreBackupAsync(
        int slotId,
        string backupId,
        IProgress<int>? progress = null,
        CancellationToken cancellationToken = default
    );
}

public sealed class SaveBackupInfo {
    public string Id { get; }
    public DateTimeOffset CreatedUtc { get; }
}
```

## 규칙

- **대상**: 기존 코드를 읽어 타입과 멤버의 선언을 확인한다. 새 이름이나 선언은 기존 규칙에 맞추고 제안임을 밝힌다.
- **범위**: 타입 선언 안에 외부에서 쓰는 멤버(`public`, `protected` 등)를 기존 것까지 모두 적는다. 비공개 멤버도 요청하면 전부 포함한다. 타입이 여러 개면 한 블록에 차례대로 둔다.
- **표기**: 타입의 접근 제한자, 수식어, 상속·인터페이스와 멤버의 인자, 기본값, nullable, 취소 토큰을 실제 선언과 맞춘다. 메서드는 본문 없이 `;`로 끝내고, 매개변수가 여러 줄이면 닫는 `)`를 단독 줄에 둔다. 주석과 동작 설명은 생략한다.
- **제목**: 이 스킬을 단독으로 쓸 때는 `### • 클래스 형태`를 제목으로 쓴다.
- **출력**: 새 타입은 언어 코드 블록으로 보여 준다. 기존 타입의 선언이 바뀌면 [show-diff](../show-diff/SKILL.md)를 따른다. 공개 선언이 그대로라면 “공개 API 변경 없음”이라고 적는다.
