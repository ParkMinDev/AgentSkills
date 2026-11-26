---
name: edit-libreoffice-document
description: LibreOffice로 여는 오피스 문서(스프레드시트 ods·ots·xlsx·xlsm·xls, 텍스트 문서 odt·ott·docx·doc·rtf, 프레젠테이션 odp·otp·pptx·ppt, 그림 odg)를 읽기·만들기·고칠 때 사용한다. 파일 이름이나 형식만 말해도("엑셀에 행 추가해줘", "이 docx 문단 고쳐줘") 적용한다. 문서가 LibreOffice에 열려 있어도 닫으라고 하지 않고 UNO 연결(127.0.0.1:2002)로 열린 문서를 직접 고친다. 형식별 xlsx·docx·pptx 스킬이나 openpyxl·python-docx보다 이 스킬을 먼저 쓴다. csv·txt·html 같은 일반 텍스트와 pdf는 대상이 아니다.
---

# LibreOffice 문서 편집

사용자는 LibreOffice를 오피스로 쓰고, 문서를 켜 둔 채로 에이전트가 고치기를 원한다. 파일에 직접 쓰는 라이브러리(openpyxl, python-docx, python-pptx 등)는 LibreOffice가 파일을 붙잡고 있으면 저장이 막히고(PermissionError), 열린 화면과 파일 내용도 어긋난다. 그래서 열려 있든 닫혀 있든 LibreOffice 자체를 UNO(LibreOffice를 밖에서 조종하는 API)로 움직여 고친다. 방식이 하나라 형식마다 결과가 같고, 저장도 LibreOffice가 원래 형식대로 한다.

## 순서
1. 작업 스크립트를 임시 산출물 위치(AGENTS.md 규칙, 없으면 작업 폴더의 임시 위치)에 쓰고 `scripts/lo_uno.py`를 불러온다.
2. `open_document(path)`로 문서를 얻는다.
   - LibreOffice가 포트 2002로 켜져 있으면 연결한다. 꺼져 있으면 headless(창 없는) 모드로 켠다. 포트 없이 켜져 있으면 그 LibreOffice가 포트를 열어 연결된다.
   - 문서가 이미 열려 있으면 그 문서를 쓴다. 아니면 숨김 상태로 연다.
   - 새 파일이면 `create_if_missing=True`와 `kind`(scalc·swriter·simpress·sdraw)를 넘긴다.
3. 필요한 범위만 고친다. 사용자가 화면에서 같은 문서를 만지고 있을 수 있으니 다른 셀·문단은 건드리지 않는다.
4. `finish(session)`로 저장한다(새 파일은 `finish(session, path)`). 이번에 연 문서와 이번에 켠 LibreOffice만 닫고, 원래 열려 있던 문서는 열어 둔다.
5. 고친 범위를 다시 읽어 결과를 사용자에게 알린다.

실행은 LibreOffice에 들어 있는 파이썬으로 한다. 시스템 파이썬에는 `uno` 모듈이 없다.

```powershell
$env:PYTHONIOENCODING='utf-8'; & "C:\Program Files\LibreOffice\program\python.exe" "<작업 스크립트>.py"
```

열린 문서 목록만 볼 때는 `python.exe scripts/lo_uno.py --list`를 쓴다.

## 연결이 안 될 때
- `connect()`가 시간 안에 연결하지 못하면 LibreOffice가 대화 상자(복구, 저장 확인 등)로 멈춰 있을 수 있다. 사용자에게 화면을 확인해 달라고 알린다. 문서를 강제로 닫거나 LibreOffice를 종료하지 않는다.
- 포트 확인: `Get-NetTCPConnection -State Listen -LocalPort 2002`
- 시스템 파이썬이 아니라 LibreOffice 파이썬으로 실행했는지 확인한다. 작업 스크립트에서 `com.sun.star...`를 불러오려면 `lo_uno`(또는 `uno`)를 먼저 불러온다.

## 형식별 메모
- **스프레드시트**: `doc.Sheets`, `sheet.getCellByPosition(열, 행)`(0부터). 값은 `.String`(글자)·`.Value`(숫자)·`.Formula`(수식, 영어 함수 이름). 마지막 사용 행은 `sheet.createCursor()` → `gotoEndOfUsedArea(False)` → `RangeAddress.EndRow`.
  - 엑셀 표(데이터베이스 범위, `doc.DatabaseRanges`)의 바로 아래에 행을 넣으면 `DataArea`의 `EndRow`도 넓힌다. 그러지 않으면 xlsx로 저장할 때 표 밖의 행이 된다.
  - 줄바꿈은 `cell.IsTextWrapped = True`, 위쪽 맞춤은 `cell.VertJustify = 1`.
- **텍스트 문서**: `doc.Text`, `doc.Text.createTextCursor()`, 찾아 바꾸기는 `doc.createReplaceDescriptor()` → `doc.replaceAll(...)`. 표는 `doc.TextTables`.
- **프레젠테이션·그림**: `doc.DrawPages.getByIndex(i)`의 도형을 돌며 `shape.String`을 읽고 쓴다.

## 하지 말 것
- 문서가 잠겨 있다고(`.~lock.<파일명>#`) 사용자에게 닫아 달라고 먼저 요청하지 않는다. 위 순서로 열린 문서를 고친다.
- 사용자가 열어 둔 문서를 `close()`하거나 LibreOffice를 종료하지 않는다.
