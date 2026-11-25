---
name: csharp-project-style
description: Unity 및 일반 C# 프로젝트의 선언, 멤버 순서, 조건문, 주석, 비동기·구독 수명을 다룬다. 멤버를 Const Area, Static Area, Instance Area 순으로 배치한다. 뷰·프레젠터 설계와 프로젝트 전체 일괄 재정렬은 별도 요청 범위다.
---

# CSharp Project Style

## 멤버 배치

대영역은 예시의 구분선을 쓰고, 소영역은 `// - 이름 -`으로 표시한다. 없는 영역은 생략하고, 영역을 채우려고 멤버를 만들지 않는다.

| 대영역 | 배치 순서 |
| --- | --- |
| Const Area | 공개 `const` → 나머지 `const`. 소영역 주석을 두지 않는다. |
| Static Area | Static Construct → Static Public Methods → Static Public Properties → Static Public Events → Static Handler → Static Private & Protected → Static Class |
| Instance Area | Construct → Public Methods → Public Properties → Public Events → Handler → Private & Protected → Class Struct Enum |

- `Const Area`에는 클래스에 선언한 `const` 멤버만 둔다. `static readonly`는 접근 범위에 맞는 정적 필드 위치에 둔다.
- 메서드는 `public` 다음에 `internal`을 배치한다. 비공개·보호 영역은 필드 → 프로퍼티 → 메서드 순서다.
- UnityEvent는 이벤트 영역에, Awake·Update 같은 Unity 메시지는 Handler에 둔다.
- 명시적으로 `static`인 중첩 클래스는 Static Class에 둔다. 나머지 중첩 타입은 Class Struct Enum에 공개 타입부터 두고, 각 접근 범위에서 class → struct → enum 순으로 배치한다.

## 예시

```csharp
using System;
using System.Threading;
using System.Threading.Tasks;

public sealed class RetryJob {
    // ====================== Const Area ======================
    public const int DefaultMaxAttempts = 3;
    const int MaxAllowedAttempts = 10;

    // ===================== Static Area ======================

    // - Static Construct -
    static RetryJob() {
        AppDomain.CurrentDomain.ProcessExit += OnProcessExit;
    }

    // - Static Public Methods -
    public static RetryJob CreateDefault(Func<CancellationToken, Task<bool>> operation) {
        return new RetryJob(operation, DefaultMaxAttempts);
    }

    // - Static Public Properties -
    public static bool IsShuttingDown => shutdown.IsCancellationRequested;

    // - Static Public Events -
    public static event Action<JobResult>? AnyJobFinished;

    // - Static Handler -
    static void OnProcessExit(object? sender, EventArgs e) => shutdown.Cancel();

    // - Static Private & Protected -
    static readonly CancellationTokenSource shutdown = new();

    // - Static Class -
    static class RetrySchedule {
        public static TimeSpan GetDelay(int attempt) => TimeSpan.FromMilliseconds(100 * attempt);
    }

    // ==================== Instance Area =====================

    // - Construct -
    public RetryJob(Func<CancellationToken, Task<bool>> operation, int maxAttempts) {
        if (maxAttempts < 1 || maxAttempts > MaxAllowedAttempts) {
            throw new ArgumentOutOfRangeException(nameof(maxAttempts));
        }

        this.operation = operation ?? throw new ArgumentNullException(nameof(operation));
        MaxAttempts = maxAttempts;
    }

    // - Public Methods -
    public async Task<JobResult> RunAsync(CancellationToken cancellationToken) {
        using CancellationTokenSource run = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, shutdown.Token);
        using CancellationTokenRegistration registration = run.Token.Register(OnCancellationRequested);

        for (int attempt = 1; attempt <= MaxAttempts; attempt++) {
            run.Token.ThrowIfCancellationRequested();
            if (await operation(run.Token)) return Finish(attempt, JobOutcome.Succeeded);

            if (attempt < MaxAttempts) {
                await Task.Delay(RetrySchedule.GetDelay(attempt), run.Token);
            }
        }

        return Finish(MaxAttempts, JobOutcome.Exhausted);
    }

    // - Public Properties -
    public int MaxAttempts { get; }

    // - Public Events -
    public event Action? CancellationRequested;

    // - Handler -
    void OnCancellationRequested() => CancellationRequested?.Invoke();

    // - Private & Protected -
    readonly Func<CancellationToken, Task<bool>> operation;
    JobResult Finish(int attempts, JobOutcome outcome) {
        JobResult result = new(attempts, outcome);
        AnyJobFinished?.Invoke(result);
        return result;
    }

    // - Class Struct Enum -
    public sealed record JobResult(int Attempts, JobOutcome Outcome);
    public enum JobOutcome { Succeeded, Exhausted }
}
```

## 공통 규칙

- **적용 범위** — 새 코드와 요청한 변경 범위에 적용한다. 프로젝트 지침과 사용자 요청이 우선이다. 스타일 때문에 실행·초기화 순서, 예외 시 상태, 자원 수명을 바꾸지 않는다.
- **선언** — `var` 대신 명시적 타입을 쓰고 `private`는 생략한다. 선언이 길다는 이유만으로 줄을 나누지 않는다. 여러 줄로 쓴 매개변수 목록은 닫는 `)`를 매개변수와 다른 줄에 둔다. 어트리뷰트는 선언과 같은 줄에 두되 `[Title]`과 `[Header]`는 단독 줄에 둔다.
- **조건문** — `if`/`else`에는 긍정 조건을 우선하고, 조기 반환에는 부정 조건을 쓸 수 있다. 긍정 조건을 만들려고 빈 분기·중복·불필요한 중첩을 추가하거나 `!조건`을 `조건 == false`로 바꾸지 않는다.
- **구성과 주석** — 같은 목적의 코드를 모으고, 읽기 쉬운 컬렉션 변환에는 LINQ를 활용한다. 분류만을 위해 한 번 쓰는 메서드나 지역 함수를 만들지 않는다. 분류가 바뀌는 곳에만 빈 줄을 두고, 기능 구분에 필요한 짧은 주석을 쓴다. 사용자 주석은 유지하고, 코드를 되풀이하는 주석은 추가하지 않는다.
- **데이터와 검증** — 파생 가능한 상태를 중복 저장하거나 필요보다 넓은 객체를 전달하지 않는다. 가독성, 중복 계산 방지, 값의 시점 보존, 수명 관리에 필요한 변수는 둔다. 하위 호출이 이미 거부하는 입력은 중복 검증하지 않는다. 객체의 유효 조건을 보장하거나 하위 호출이 허용하는 값을 금지하는 검사는 둔다.
- **비동기와 구독 수명** — 완료를 기다릴 때는 호출부에서 `await`한다. 완료 대기를 구독이나 `IDisposable` 반환으로 대체하지 않는다. 비동기 메서드 안에서 시작한 구독은 그 메서드가 완료·취소·실패할 때 해제한다.

## 라이브러리와 프로젝트 의존성

UniTask·R3·Odin·`Headers`는 프로젝트에서 각각 참조 가능 여부를 확인한다. 스타일 적용을 위해 의존성을 추가하지 않는다.

- **UniTask** — 사용할 수 있으면 완료 대기에 UniTask를 쓰고, 없으면 Task와 CancellationToken 등 프로젝트에서 쓰는 방식을 따른다.
- **R3** — 사용할 수 있으면 UI 바인딩과 지속 구독에 R3를 쓰고, 없으면 C# 이벤트 등 프로젝트에서 쓰는 방식을 따른다. Observable 프로퍼티는 이벤트 영역에 둔다.
- **Odin과 Headers** — MonoBehaviour, ExtendedBehaviour, Actor, BasicUI 등 Unity 컴포넌트의 직렬화 필드에 적용한다. Odin이 있으면 `[Title]`, 없으면 `[Header]`를 쓴다. `[Required]`는 Odin을 사용하는 Required 영역에만 붙인다. 기존 `Headers`의 Required·Injectable·Optional·Settings를 재사용하고, 없으면 제목 문자열을 직접 쓴다. Settings가 많으면 안에서 더 나눈다.

```csharp
// Odin을 사용할 때
[Title(Headers.Required)]
[SerializeField, Required] Button closeButton;

// Odin 없이 사용할 때
[Header(Headers.Required)]
[SerializeField] Button closeButton;
```
