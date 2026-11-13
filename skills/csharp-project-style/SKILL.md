---
name: csharp-project-style
description: Unity 및 일반 C# 프로젝트의 코드를 작성·수정할 때 선언, 멤버 순서, 조건문, 주석, 비동기·구독 수명 규칙을 적용한다. 정적 멤버를 최상단에 모으며 Unity 컴포넌트의 직렬화 필드는 Odin 사용 가능 여부에 따라 Title 또는 Header로 분류한다. 뷰·프레젠터 설계나 프로젝트 전체 일괄 재정렬은 별도 요청 범위이다.
---

# CSharp Project Style

## 적용 범위
- C# 코드를 작성·수정할 때 적용한다. 프로젝트별 지침과 사용자의 명시적인 요청을 우선한다.
- 새 코드와 요청한 변경 범위에 적용하고, 기존 파일 전체를 스타일만을 위해 일괄 재정렬하지 않는다.
- 스타일을 이유로 실행 순서, 초기화 순서, 예외 발생 시 상태나 자원 수명을 바꾸지 않는다.
- 공통 규칙은 Unity가 아닌 프로젝트에도 적용한다. Unity 컴포넌트 전용 규칙은 일반 C# 클래스에 적용하지 않는다.
- Unity, Odin, UniTask, R3 또는 Headers를 스타일 적용 목적으로 새로 설치하거나 의존성으로 추가하지 않는다.
- 뷰·로직 분리와 프레젠터 설계는 적용되는 별도 프로젝트 지침을 따른다.

# CSharp 코드 규칙

- UniTask와 R3는 프로젝트에서 실제로 참조하여 사용할 수 있는지 각각 확인하고, 설치된 라이브러리만 적극 활용한다. 이 규칙을 적용하기 위해 라이브러리를 새로 설치하지 않는다.
- 프로젝트별 지침과 사용자의 명시적인 사용·미사용 지시를 우선한다.
- 비동기 실행 흐름에서 완료를 기다리는 기능은 UniTask가 설치되어 있으면 UniTask를 적극 활용하고, 설치되어 있지 않으면 Task와 CancellationToken 등 프로젝트의 기존 방식을 따른다. 호출부에서는 await하여 순서대로 실행한다.
- UI 데이터 바인딩과 지속적인 이벤트 구독에는 R3가 설치되어 있으면 R3를 적극 활용하고, 설치되어 있지 않으면 일반 C# 이벤트 등 프로젝트의 기존 방식을 따른다.
- R3를 사용하는 비동기 기능 내부에서 구독이 필요하면, 구독 수명은 해당 비동기 메서드 안에서 관리하고 완료·취소·예외 시 해제한다.
- 완료를 기다리는 기능을 단순히 구독이나 IDisposable 반환으로 대체하지 않는다.
- LINQ를 적극적으로 활용한다.
- `var`를 사용하지 않고 명시적인 타입을 사용한다.
- 가능한 경우 부정 연산자 `!`보다 긍정 조건을 사용하고, 성공·존재 등의 조건이 참일 때 `if` 본문을 실행하며 대안은 `else`에 작성한다.
- 단, 조기 반환이나 예외 처리에서 부정 조건이 더 명확하면 그대로 사용한다.
- 이 규칙을 맞추려고 빈 분기, 중복 코드, 불필요한 중첩을 만들거나 `!조건`을 단순히 `조건 == false`로 바꾸지 않는다.
- [Header][Title]을 제외한 필드의 어트리뷰트와 선언은 같은 줄에 작성한다.
- 개행은 분류가 달라질때 넣는다.
- 사용자가 작성한 주석은 유지한다.
- 기능별 분류 주석은 작성하되, 코드 내용을 되풀이하는 설명용 주석은 추가하지 않는다.
- 메서드 내부 코드는 실행 흐름을 유지하면서 기능별로 모아 배치한다.
- 같은 대상이나 목적에 속한 코드는 가능한 한 인접하게 배치하고, 불필요한 임시 변수는 줄인다. 단, 실행 순서·예외 발생 시 상태·자원 수명에 영향을 주는 재배치는 의미가 보존되는 경우에만 수행한다.
- 기능이 바뀌는 지점에 빈 줄과 짧은 분류 주석을 둔다.
- 단순히 분류하기 위해 한 번만 사용하는 비공개 메서드나 지역 함수를 만들지 않는다. 순서대로 읽을 수 있도록 한 메서드 안에서 정리한다.
- 새 코드 작성 시부터 적용하며, 실행 순서에 의미가 있는 코드를 분류 목적으로 임의 재배치하지 않는다.
- 선언이 길더라도 임의로 줄바꿈하지 않는다.
- 메서드 매개변수를 여러 줄로 작성할 경우 닫는 괄호 `)`는 별도의 줄에 배치한다.
```csharp
public static async Task<CreateLoginSessionResponse> CreateLoginSessionAsync(
    CancellationToken cancellationToken
) {
}
```

- 필드·생성자 인자·지역변수를 추가하기 전에 기존 데이터로 직접 표현할 수 있는지 확인한다.
- 파생 가능한 상태를 불필요하게 중복 보관하거나, 필요한 정보보다 넓은 객체·컬렉션을 편의상 전달하지 않는다.
- 단, 가독성, 중복 계산 방지, 시점의 상태 보존, 수명 관리에 필요한 변수는 유지한다.

# CSharp 입력 검증 규칙

- 하위 호출이 동일한 잘못된 입력을 이미 거부한다면 중복 예외 검사를 추가하지 않는다.
- 단, 객체의 유효 조건을 보장하거나 하위 호출이 허용하는 값을 금지하는 검사는 유지한다.

## Unity 컴포넌트 직렬화 필드
- MonoBehaviour, ExtendedBehaviour, Actor, BasicUI 등 Unity 컴포넌트 계열의 직렬화 필드에만 적용한다.
- 해당 코드에서 Odin을 참조하여 사용할 수 있으면 `[Title]`을 우선 사용하고, Odin이 없으면 Unity 기본 `[Header]`를 사용한다.
- 프로젝트의 기존 `Headers` 상수를 확인하여 `Required`, `Injectable`, `Optional`, `Settings` 영역으로 분류한다. 상수가 없으면 해당 제목 문자열을 사용하며, 이 규칙만을 위해 공용 상수 타입이나 의존성을 만들지 않는다.
- Odin을 사용할 수 있을 때 Required 영역의 필드에는 `[SerializeField, Required]`처럼 `[Required]`를 붙인다. Odin이 없으면 해당 어트리뷰트를 요구하지 않는다.
- `[Header]`와 `[Title]`은 필드 위에 단독으로 작성하고 다른 어트리뷰트와 병합하지 않는다.
- 분류 사이에는 빈 줄을 두고, Settings 내용이 많으면 적절히 내부 분류한다.

Odin과 기존 Headers 상수를 사용할 수 있는 경우:

```csharp
[Title(Headers.Required)]
[SerializeField, Required] PlayerActor playerActor;
```

Odin이 없고 기존 Headers 상수를 사용할 수 있는 경우:

```csharp
[Header(Headers.Required)]
[SerializeField] PlayerActor playerActor;
```

## 멤버 배치 순서
- 정적 멤버는 클래스 맨 위의 `Static` 영역에 모은다. 기존 Public Statics / Private Statics 분할은 사용하지 않는다.
- 정적 영역과 그 아래 영역은 공개 메서드 → 공개 프로퍼티 → 공개 이벤트 → 핸들러 → 비공개·보호 멤버 → 중첩 타입 순서를 대칭적으로 적용한다. 인스턴스 생성자는 정적 영역 다음에 둔다.
- 아래 분류 주석과 순서를 사용하고, 존재하지 않는 구역은 생략한다. 구역을 채우기 위한 멤버나 빈 핸들러를 만들지 않는다.
- `private` 키워드는 생략한다. 비공개·보호 영역 내부는 필드 → 프로퍼티 → 메서드 순서로 두고 분류 사이에 빈 줄을 둔다.
- 공개 메서드 구역에서는 public 다음에 internal 메서드를 둔다. Observable 프로퍼티와 UnityEvent는 해당 이벤트 구역에 둔다.
- 정적 생성자가 필요하면 Static 영역의 첫 멤버로 둔다. 초기화 순서에 의미가 있는 필드는 의미를 보존하며 배치한다.
- 중첩 타입은 인스턴스 멤버가 아니다. 명시적으로 static인 중첩 클래스만 Static Class에 두고, 나머지는 Class Struct Enum에 둔다.

다음은 배치 안내이며 구현할 멤버 목록이 아니다.

```csharp
// - Static -

// - Static Public Methods -
// public → internal 정적 메서드

// - Static Public Properties -
// 공개 정적 프로퍼티

// - Static Public Events -
// 공개 정적 이벤트와 이벤트 성격의 프로퍼티

// - Static Handler -
// 정적 이벤트 핸들러

// - Static Private & Protected -
// 정적 필드 → 정적 프로퍼티 → 정적 메서드

// - Static Class -
// 중첩 정적 클래스

// - Construct -
// 인스턴스 생성자

// - Public Methods -
// public → internal 메서드

// - Public Properties -
// 공개 프로퍼티

// - Public Events -
// 공개 이벤트, Observable 프로퍼티, UnityEvent

// - Handler -
// Unity 메시지(Awake, Start, Update 등), 이벤트 핸들러

// - Private & Protected -
// 필드 → 프로퍼티 → 메서드

// - Class Struct Enum -
// public class → struct → enum, 이후 비공개 class → struct → enum
```
