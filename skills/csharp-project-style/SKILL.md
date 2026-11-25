---
name: csharp-project-style
description: Unity 및 일반 C# 프로젝트의 코드를 작성·수정할 때 선언, 멤버 순서, 조건문, 주석, 비동기·구독 수명 규칙을 적용한다. 정적 멤버를 최상단에 모으며 Unity 컴포넌트의 직렬화 필드는 Odin 사용 가능 여부에 따라 Title 또는 Header로 분류한다. 뷰·프레젠터 설계나 프로젝트 전체 일괄 재정렬은 별도 요청 범위이다.
---

# CSharp Project Style

표기는 아래 예시를 따른다. 예시는 표현 방식만 보여 주며 실제 프로젝트 코드가 아니다. 예시로 보이지 않는 판단 규칙만 글로 적는다.

## 예시

UniTask·R3·Odin과 기존 `Headers` 상수를 쓸 수 있는 Unity 컴포넌트:

```csharp
public class InventoryView : MonoBehaviour {
    // - Static -

    // - Static Public Methods -
    public static bool IsValidSlot(int index) => index >= 0 && index < SlotCount;

    // - Static Private & Protected -
    const int SlotCount = 20;

    // - Public Methods -
    public async UniTask OpenAsync(
        IReadOnlyList<ItemData> items,
        CancellationToken cancellationToken
    ) {
        // 슬롯 채우기
        List<ItemData> visibleItems = items.Where(item => item.IsVisible).OrderBy(item => item.Order).ToList();
        for (int i = 0; i < slots.Length; i++) {
            if (i < visibleItems.Count) {
                slots[i].Bind(visibleItems[i]);
            } else {
                slots[i].Clear();
            }
        }

        // 닫기를 기다리는 동안만 선택 이벤트 구독
        using IDisposable subscription = selected.Subscribe(item => detailPanel.Show(item));
        await closeButton.OnClickAsync(cancellationToken);
    }

    // - Public Events -
    public Observable<ItemData> Selected => selected;

    // - Handler -
    void OnSlotClicked(int index) {
        if (!IsValidSlot(index)) return;
        selected.OnNext(slots[index].Item);
    }

    // - Private & Protected -
    [Title(Headers.Required)]
    [SerializeField, Required] Button closeButton;
    [SerializeField, Required] InventorySlot[] slots;
    [SerializeField, Required] ItemDetailPanel detailPanel;

    [Title(Headers.Settings)]
    [SerializeField, Min(0f)] float openDuration = 0.2f;

    readonly Subject<ItemData> selected = new();
}
```

Odin이 없으면 직렬화 필드만 이렇게 바뀐다.

```csharp
[Header(Headers.Required)]
[SerializeField] Button closeButton;
```

예시가 보여 주는 표기: 명시적 타입(`var` 금지), LINQ 활용, 긍정 조건의 `if`/`else`, 조기 반환의 부정 조건, 어트리뷰트와 선언은 한 줄(`[Title]`·`[Header]`만 단독 줄), 여러 줄 매개변수의 `)`는 단독 줄, `private` 생략, 분류가 바뀔 때만 빈 줄, 메서드 안 기능별 짧은 분류 주석, 비동기 메서드 안에서 끝나는 구독 수명.

## 멤버 배치 순서
분류 주석은 예시처럼 `// - 이름 -`으로 쓰고, 아래 순서를 따른다. 없는 구역은 생략하고, 구역을 채우려고 멤버나 빈 핸들러를 만들지 않는다.

`Static` → `Static Public Methods` → `Static Public Properties` → `Static Public Events` → `Static Handler` → `Static Private & Protected` → `Static Class` → `Construct` → `Public Methods` → `Public Properties` → `Public Events` → `Handler` → `Private & Protected` → `Class Struct Enum`

- 공개 메서드 구역은 public 다음에 internal이다. Observable 프로퍼티와 UnityEvent는 이벤트 구역, Unity 메시지(Awake, Update 등)는 Handler 구역이다.
- Private & Protected 안은 필드 → 프로퍼티 → 메서드 순이다.
- 정적 생성자는 Static 영역의 첫 멤버다. 초기화 순서에 의미가 있는 필드는 그 의미를 지켜 배치한다.
- 명시적으로 static인 중첩 클래스만 Static Class에, 나머지 중첩 타입은 Class Struct Enum에 둔다(public class → struct → enum, 이후 비공개 class → struct → enum).

## 판단 규칙
- **적용 범위**: 새 코드와 요청한 변경 범위에만 적용하고, 기존 파일을 스타일만을 위해 일괄 재정렬하지 않는다. 프로젝트별 지침과 사용자의 명시적 요청이 우선이다. 뷰·로직 분리와 프레젠터 설계는 별도 프로젝트 지침을 따른다.
- **의미를 바꾸지 않는다**: 스타일을 이유로 실행 순서, 초기화 순서, 예외 시 상태, 자원 수명을 바꾸지 않는다. 실행 순서에 의미가 있는 코드는 분류 목적으로 재배치하지 않는다.
- **라이브러리**: UniTask·R3·Odin·`Headers`는 프로젝트에서 실제로 참조할 수 있는지 각각 확인하고 있는 것만 쓴다. 스타일 적용을 위해 설치하거나 의존성을 추가하지 않는다.
  - 완료를 기다리는 흐름: UniTask가 있으면 UniTask, 없으면 Task와 CancellationToken 등 기존 방식. 호출부는 await해 순서대로 실행한다. 완료 대기를 구독이나 IDisposable 반환으로 대체하지 않는다.
  - UI 바인딩·지속 구독: R3가 있으면 R3, 없으면 C# 이벤트 등 기존 방식. 비동기 메서드 안의 구독은 그 메서드 안에서 완료·취소·예외 시 해제한다.
- **조건문**: 긍정 조건을 우선하되, 이를 맞추려고 빈 분기·중복·불필요한 중첩을 만들거나 `!조건`을 `조건 == false`로 바꾸지 않는다.
- **메서드 구성**: 같은 목적의 코드는 인접하게 두고 불필요한 임시 변수를 줄인다. 분류만을 위해 한 번만 쓰는 비공개 메서드나 지역 함수를 만들지 않는다.
- **주석**: 사용자가 쓴 주석은 유지한다. 코드를 되풀이하는 설명 주석은 추가하지 않는다.
- **줄바꿈**: 선언이 길어도 임의로 줄바꿈하지 않는다.
- **데이터**: 필드·생성자 인자·지역 변수를 추가하기 전에 기존 데이터로 표현할 수 있는지 확인한다. 파생 가능한 상태를 중복 보관하거나 필요보다 넓은 객체·컬렉션을 넘기지 않는다. 가독성, 중복 계산 방지, 시점의 상태 보존, 수명 관리에 필요한 변수는 둔다.
- **입력 검증**: 하위 호출이 같은 잘못된 입력을 이미 거부하면 중복 검사를 넣지 않는다. 객체의 유효 조건을 보장하거나 하위 호출이 허용하는 값을 금지하는 검사는 둔다.
- **Unity 직렬화 필드**: MonoBehaviour, ExtendedBehaviour, Actor, BasicUI 등 Unity 컴포넌트 계열에만 적용하고 일반 C# 클래스에는 적용하지 않는다.
  - Odin이 있으면 `[Title]`, 없으면 `[Header]`. `[Required]`는 Odin이 있을 때 Required 영역에만 붙인다.
  - 기존 `Headers` 상수로 `Required`, `Injectable`, `Optional`, `Settings` 영역을 나눈다. 상수가 없으면 같은 제목 문자열을 쓰고, 이 규칙을 위해 상수 타입을 만들지 않는다. Settings가 많으면 안에서 다시 나눈다.
