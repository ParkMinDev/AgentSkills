// 응답 끝 문장(정규화한 키) → 그 턴의 meter 줄들
export type Notes = Record<string, string>

declare module 'claude-code' {
  interface PluginState {
    'turn-meter': { notes: Notes }
  }
}
