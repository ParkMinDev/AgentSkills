"""LibreOffice UNO 연결 도우미.

LibreOffice에 들어 있는 python.exe로 실행한다.
    "C:\\Program Files\\LibreOffice\\program\\python.exe" 작업스크립트.py

작업 스크립트에서:
    import sys; sys.path.insert(0, r"<이 scripts 폴더>")
    from lo_uno import open_document, finish

    s = open_document(r"D:\\경로\\파일.xlsx")
    sheet = s.doc.Sheets.getByIndex(0)
    sheet.getCellByPosition(0, 4).String = "값"
    finish(s)  # 저장하고, 이 스크립트가 연 문서·LibreOffice만 닫는다

명령줄로 열린 문서 목록만 볼 때:
    python.exe lo_uno.py --list
"""

import os
import subprocess
import sys
import time

import uno
from com.sun.star.beans import PropertyValue
from com.sun.star.connection import NoConnectException

HOST = "127.0.0.1"
PORT = 2002
SOFFICE = r"C:\Program Files\LibreOffice\program\soffice.exe"
CONNECT_URL = f"uno:socket,host={HOST},port={PORT};urp;StarOffice.ComponentContext"


class Session:
    """이번 작업에서 연 것과 원래 열려 있던 것을 구분해 정리할 때 쓴다."""

    def __init__(self, ctx, desktop, doc, opened_doc, started_office):
        self.ctx = ctx
        self.desktop = desktop
        self.doc = doc
        self.opened_doc = opened_doc
        self.started_office = started_office


def _prop(name, value):
    p = PropertyValue()
    p.Name = name
    p.Value = value
    return p


def _try_connect():
    local = uno.getComponentContext()
    resolver = local.ServiceManager.createInstanceWithContext(
        "com.sun.star.bridge.UnoUrlResolver", local)
    try:
        return resolver.resolve(CONNECT_URL)
    except NoConnectException:
        return None


def _office_running():
    """LibreOffice 본체(soffice.bin)가 이미 실행 중인지."""
    out = subprocess.run(
        ["tasklist", "/FI", "IMAGENAME eq soffice.bin", "/NH"],
        capture_output=True, text=True, errors="ignore").stdout
    return "soffice.bin" in out.lower()


def connect(start_if_needed=True, timeout=20):
    """(ctx, desktop, started_office)를 돌려준다.

    연결이 없으면 포트를 여는 옵션으로 soffice를 실행한다.
    - LibreOffice가 꺼져 있었으면 headless로 새로 켜지고, started_office=True다.
    - 사용자가 포트 없이 켜 둔 LibreOffice가 있으면 그 프로그램이 명령을 받아 포트를 연다.
      이때는 사용자의 LibreOffice이므로 started_office=False이고, finish()가 종료하지 않는다.
    """
    ctx = _try_connect()
    started = False
    if ctx is None:
        if not start_if_needed:
            raise RuntimeError(f"LibreOffice UNO 연결({HOST}:{PORT})이 없습니다.")
        was_running = _office_running()
        subprocess.Popen([
            SOFFICE, "--headless", "--invisible", "--nologo", "--norestore",
            f"--accept=socket,host={HOST},port={PORT};urp;StarOffice.ComponentContext",
        ])
        started = not was_running
        deadline = time.time() + timeout
        while ctx is None and time.time() < deadline:
            time.sleep(0.5)
            ctx = _try_connect()
        if ctx is None:
            raise RuntimeError(
                f"LibreOffice에 포트({HOST}:{PORT})를 열라고 했지만 {timeout}초 안에 연결되지 않았습니다. "
                "LibreOffice가 대화 상자 등으로 멈춰 있지 않은지 확인하세요.")
    desktop = ctx.ServiceManager.createInstanceWithContext("com.sun.star.frame.Desktop", ctx)
    return ctx, desktop, started


def list_documents(desktop):
    """열려 있는 문서의 (시스템 경로 또는 URL, 문서) 목록."""
    result = []
    comps = desktop.Components.createEnumeration()
    while comps.hasMoreElements():
        c = comps.nextElement()
        url = getattr(c, "URL", "") or ""
        path = uno.fileUrlToSystemPath(url) if url.startswith("file:") else url
        result.append((path, c))
    return result


def find_open_document(desktop, path):
    target = os.path.normcase(os.path.abspath(path))
    for p, c in list_documents(desktop):
        if p and os.path.normcase(os.path.abspath(p)) == target:
            return c
    return None


def open_document(path, create_if_missing=False, kind="scalc"):
    """문서를 돌려준다. 이미 열려 있으면 그 문서를, 아니면 숨김 상태로 연다.

    create_if_missing=True면 없는 파일을 새로 만든다(kind: scalc·swriter·simpress·sdraw).
    돌려준 Session은 finish()에 넘긴다.
    """
    ctx, desktop, started = connect()
    doc = find_open_document(desktop, path)
    opened = False
    if doc is None:
        if os.path.exists(path):
            url = uno.systemPathToFileUrl(os.path.abspath(path))
        elif create_if_missing:
            url = f"private:factory/{kind}"
        else:
            raise FileNotFoundError(path)
        doc = desktop.loadComponentFromURL(url, "_blank", 0, (_prop("Hidden", True),))
        opened = True
    return Session(ctx, desktop, doc, opened, started)


# 새 파일을 저장할 때 쓰는 필터 이름(확장자 기준)
FILTERS = {
    ".ods": "calc8", ".ots": "calc8_template",
    ".xlsx": "Calc MS Excel 2007 XML", ".xlsm": "Calc MS Excel 2007 VBA XML",
    ".xls": "MS Excel 97",
    ".odt": "writer8", ".ott": "writer8_template",
    ".docx": "MS Word 2007 XML", ".doc": "MS Word 97", ".rtf": "Rich Text Format",
    ".odp": "impress8", ".otp": "impress8_template",
    ".pptx": "Impress MS PowerPoint 2007 XML", ".ppt": "MS PowerPoint 97",
    ".odg": "draw8",
}


def finish(session, path=None, save=True):
    """저장하고, 이번에 연 문서와 이번에 켠 LibreOffice만 닫는다.

    원래 열려 있던 문서는 저장만 하고 닫지 않는다.
    새로 만든 문서는 path를 넘겨 그 형식으로 저장한다.
    """
    doc = session.doc
    if save:
        if doc.hasLocation():
            doc.store()
        else:
            if path is None:
                raise ValueError("새 문서는 저장할 path가 필요합니다.")
            ext = os.path.splitext(path)[1].lower()
            props = (_prop("FilterName", FILTERS[ext]),) if ext in FILTERS else ()
            doc.storeToURL(uno.systemPathToFileUrl(os.path.abspath(path)), props)
    if session.opened_doc:
        doc.close(True)
    if session.started_office:
        try:
            session.desktop.terminate()
        except Exception:
            pass  # 종료 중 연결이 끊기는 것은 정상


if __name__ == "__main__":
    if "--list" in sys.argv:
        _, desk, started = connect(start_if_needed=False)
        for p, _ in list_documents(desk):
            print(p)
