export type Kind = 'added' | 'modified' | 'deleted'

// 한 파일의 이번 턴 변경. plus/minus는 알 수 없으면 undefined (폴더, 바이너리, 너무 큰 파일 등).
export type FileChange = {
  path: string
  kind: Kind
  isDir?: boolean
  plus?: number
  minus?: number
}

// 응답 끝 문장(정규화한 키) → 그 턴의 변경 목록. 문자열은 0.1.0이 저장한 예전 형식.
export type Notes = Record<string, FileChange[] | string>

// 응답 키 → 펼침 여부 (없으면 닫힘)
export type Open = Record<string, boolean>

declare module 'claude-code' {
  interface PluginState {
    'change-report': { notes: Notes; open: Open }
  }
}
