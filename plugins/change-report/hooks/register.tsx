import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { FileChange, Kind, Notes, Open } from '../types'

// change-report: 응답 아래에 이번 턴에서 추가·수정·삭제된 파일을 접히는 카드로 붙인다.
// 도구 호출을 지켜보며 기록만 하고 모델을 부르지 않으며, 카드는 대화 기록에 들어가지 않는다 (토큰 0).

// ── 설정 ────────────────────────────────────────────────────────
export const CONFIG = {
  maxRows: 50, // 펼쳤을 때 최대 파일 줄 수 (넘으면 "외 N개")
  maxReadBytes: 4 * 1024 * 1024, // 삭제 전 줄 수를 세려고 읽는 최대 크기
  // 셸 명령 전후 폴더 비교: 작업 폴더를 훑어 파일 목록을 비교한다. 한도를 넘으면 그 명령은 비교를 건너뛴다.
  snapshotMaxFiles: 20_000, // 훑을 최대 파일 수
  snapshotMaxMs: 1_500, // 한 번 훑는 데 쓸 최대 시간
  newFileReadBytes: 1024 * 1024, // 셸이 만든 파일의 줄 수를 세려고 읽는 최대 크기
  newFileReadMax: 30, // 한 명령에서 줄 수를 셀 최대 파일 수
  skipDirs: [
    '.git', '.plastic', '.svn', '.hg', '.vs', '.idea', 'node_modules', '__pycache__', '.venv', 'venv',
    'library', 'temp', 'obj', 'logs', 'userSettings', '.gradle', '.next', '.cache',
  ],
}
const SKIP_DIRS = new Set(CONFIG.skipDirs.map(d => d.toLowerCase()))

const notesAtom = atom({ plugin: 'change-report', key: 'notes' } as const, {} as Notes)
const openAtom = atom({ plugin: 'change-report', key: 'open' } as const, {} as Open)
const MAX_NOTES = 200

// ── 응답 텍스트 → 키 ────────────────────────────────────────────
const KEY_LEN = 300
const normKey = (text: string): string => text.replace(/\s+/g, ' ').trim()
export const keyOf = (text: string): string => normKey(text.slice(-KEY_LEN * 4)).slice(-KEY_LEN)
// Button 주소로 쓸 짧은 해시
const hashOf = (s: string): string => {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

// ── 줄 수 ───────────────────────────────────────────────────────
export type Counts = { plus?: number; minus?: number }

export const countLines = (s: string): number => {
  if (s === '') return 0
  const n = s.split(/\r\n|\r|\n/).length
  return /(\r\n|\r|\n)$/.test(s) ? n - 1 : n
}

export const patchCounts = (hunks: readonly { lines: readonly string[] }[]): Counts => {
  let plus = 0
  let minus = 0
  for (const h of hunks)
    for (const l of h.lines) {
      if (l.startsWith('+')) plus++
      else if (l.startsWith('-')) minus++
    }
  return { plus, minus }
}

// 두 텍스트의 줄 증감 (순서를 무시한 줄 단위 비교, diff가 없을 때의 근사치)
export const lineDiff = (before: string, after: string): Counts => {
  const left = new Map<string, number>()
  for (const l of before.split(/\r\n|\r|\n/)) left.set(l, (left.get(l) ?? 0) + 1)
  let plus = 0
  for (const l of after.split(/\r\n|\r|\n/)) {
    const n = left.get(l) ?? 0
    if (n > 0) left.set(l, n - 1)
    else plus++
  }
  let minus = 0
  for (const n of left.values()) minus += n
  return { plus, minus }
}

const addCount = (a?: number, b?: number): number | undefined =>
  a === undefined || b === undefined ? undefined : a + b

// ── 변경 기록 ───────────────────────────────────────────────────
// 같은 파일이 한 턴에 여러 번 바뀌면 처음 상태 → 마지막 상태로 합친다.
export const merge = (prev: Kind | undefined, next: Kind): Kind | undefined => {
  if (prev === undefined) return next
  if (prev === 'added') return next === 'deleted' ? undefined : 'added' // 새로 만들고 지움 → 기록 없음
  if (prev === 'deleted') return next === 'deleted' ? 'deleted' : 'modified' // 지우고 다시 만듦 → 수정
  return next === 'deleted' ? 'deleted' : 'modified'
}

// ── 경로 ────────────────────────────────────────────────────────
const isAbs = (p: string): boolean => /^[A-Za-z]:[\\/]/.test(p) || /^[\\/]/.test(p)
const slash = (p: string): string => p.replace(/\\/g, '/').replace(/\/+$/, '')
export const absOf = (p: string, cwd: string): string => {
  const s = slash(p)
  if (isAbs(p)) return s
  const out: string[] = []
  for (const part of [...slash(cwd).split('/'), ...s.split('/')]) {
    if (part === '.' || part === '') {
      if (out.length === 0 && part === '') out.push('') // 맨 앞 "/" 유지
      continue
    }
    if (part === '..') {
      if (out.length > 1) out.pop()
    } else out.push(part)
  }
  return out.join('/')
}
// 작업 폴더 안이면 상대 경로, 밖이면 절대 경로로 보여 준다.
export const shown = (abs: string, cwd: string): string => {
  const base = slash(cwd)
  return abs.toLowerCase().startsWith(base.toLowerCase() + '/') ? abs.slice(base.length + 1) : abs
}

// ── 셸 명령에서 삭제 대상 찾기 ──────────────────────────────────
const DELETE_CMDS = new Set(['rm', 'rmdir', 'del', 'erase', 'rd', 'remove-item', 'ri'])

const words = (segment: string): string[] => {
  const out: string[] = []
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(segment)) !== null) out.push(m[1] ?? m[2] ?? m[3] ?? '')
  return out
}

// rm a b / Remove-Item -Recurse -Force x / del /q x / git rm x
export const deleteTargets = (command: string): string[] => {
  const targets: string[] = []
  for (const segment of command.split(/\r?\n|;|&&|\|\||\|/)) {
    let w = words(segment.trim())
    if (w[0]?.toLowerCase() === 'git' && w[1]?.toLowerCase() === 'rm') w = w.slice(1)
    if (w.length === 0 || !DELETE_CMDS.has(w[0]!.toLowerCase())) continue
    let skipNext = false
    for (const arg of w.slice(1)) {
      if (skipNext) {
        skipNext = false
        continue
      }
      if (/^-(Path|LiteralPath)$/i.test(arg)) continue // 다음 값이 경로
      if (/^-(Include|Exclude|Filter)$/i.test(arg)) {
        skipNext = true
        continue
      }
      if (arg.startsWith('-') || /^\/[A-Za-z]$/.test(arg)) continue // 옵션
      if (/[*?$(){}`<>]/.test(arg)) continue // 와일드카드·변수·식은 추적하지 않는다
      targets.push(arg.replace(/,$/, ''))
    }
  }
  return targets
}

// ── 이번 턴의 변경 ──────────────────────────────────────────────
// 소문자 절대 경로 → 기록. 모듈 변수라 리로드 때 비워진다.
const pending = new Map<string, FileChange>()

function record(abs: string, kind: Kind, cwd: string, counts: Counts, isDir?: boolean): void {
  const key = abs.toLowerCase()
  const prev = pending.get(key)
  const kept = merge(prev?.kind, kind)
  if (kept === undefined) {
    pending.delete(key)
    return
  }
  pending.set(key, {
    path: shown(abs, cwd),
    kind: kept,
    isDir,
    plus: prev ? addCount(prev.plus, counts.plus) : counts.plus,
    minus: prev ? addCount(prev.minus, counts.minus) : counts.minus,
  })
}

type Done = { deny?: string; isError?: boolean; result?: unknown }

// 도구 결과에서 읽는 필드만 (엔진 타입이 이 위치에서 좁혀지지 않아 직접 적는다)
type Hunks = readonly { lines: readonly string[] }[]
type WriteOut = {
  type?: 'create' | 'update'
  content?: string
  structuredPatch?: Hunks
  originalFile?: string | null
  staged?: boolean
}
type EditOut = { oldString?: string; newString?: string; structuredPatch?: Hunks; staged?: boolean }
type NotebookOut = { old_source?: string; new_source?: string }
const outOf = <T,>(r: Done): T | undefined =>
  r.result !== null && typeof r.result === 'object' ? (r.result as T) : undefined

// 파일 쓰기 도구: 실행 전에 파일이 있었는지로 추가·수정을 나누고, 결과의 diff로 줄 수를 센다.
async function trackWrite<R extends Done>(
  $: EngineInterface,
  raw: string,
  run: () => Promise<R>,
  measure: (r: R) => Counts | 'skip',
): Promise<R> {
  const cwd = await $.session.cwd()
  const abs = absOf(raw, cwd)
  const existed = await $.fs.exists(abs).catch(() => true)
  const r = await run()
  if (r.deny !== undefined || r.isError === true) return r
  let counts: Counts | 'skip' = {}
  try {
    counts = measure(r)
  } catch {
    counts = {}
  }
  if (counts !== 'skip') record(abs, existed ? 'modified' : 'added', cwd, counts)
  return r
}

// ── 셸 명령 전후 폴더 비교 ──────────────────────────────────────
// 소문자 절대 경로 → 파일 정보
export type SnapEntry = { path: string; size: number; mtimeMs: number }
export type Snapshot = Map<string, SnapEntry>

// 작업 폴더의 파일 목록. 한도(파일 수·시간)를 넘으면 undefined.
async function snapshot($: EngineInterface, root: string): Promise<Snapshot | undefined> {
  const files: Snapshot = new Map()
  const start = await $.clock.now()
  const stack = [root]
  while (stack.length > 0) {
    const dir = stack.pop()!
    const entries = await $.fs.list(dir).catch(() => undefined)
    if (entries === undefined) continue
    for (const en of entries) {
      if (en.isLink) continue
      const p = `${dir}/${en.name}`
      if (en.kind === 'dir') {
        if (!SKIP_DIRS.has(en.name.toLowerCase())) stack.push(p)
      } else if (en.kind === 'file') {
        files.set(p.toLowerCase(), { path: p, size: en.size, mtimeMs: en.mtimeMs })
      }
    }
    if (files.size > CONFIG.snapshotMaxFiles) return undefined
    if ((await $.clock.now()) - start > CONFIG.snapshotMaxMs) return undefined
  }
  return files
}

export type SnapDiff = { added: SnapEntry[]; modified: SnapEntry[]; deleted: SnapEntry[] }

export const diffSnapshots = (before: Snapshot, after: Snapshot): SnapDiff => {
  const diff: SnapDiff = { added: [], modified: [], deleted: [] }
  for (const [k, a] of after) {
    const b = before.get(k)
    if (b === undefined) diff.added.push(a)
    else if (b.size !== a.size || b.mtimeMs !== a.mtimeMs) diff.modified.push(a)
  }
  for (const [k, b] of before) if (!after.has(k)) diff.deleted.push(b)
  return diff
}

// 셸 도구: 실행 전후 작업 폴더를 비교해 추가·수정·삭제를 기록한다.
// 삭제 명령의 대상은 실행 전에 줄 수를 읽어 두고, 작업 폴더 밖이어도 기록한다.
async function trackShell<R>($: EngineInterface, command: string, run: () => Promise<R>): Promise<R> {
  const cwd = slash(await $.session.cwd())
  const before = await snapshot($, cwd).catch(() => undefined)

  const targets: { abs: string; isDir: boolean; lines?: number }[] = []
  for (const t of deleteTargets(command)) {
    const abs = absOf(t, cwd)
    const st = await $.fs.stat(abs).catch(() => undefined)
    if (!st) continue
    let lines: number | undefined
    if (st.kind === 'file' && st.size <= CONFIG.maxReadBytes) {
      const text = await $.fs.read(abs).catch(() => undefined)
      if (text !== undefined && !text.includes('\u0000')) lines = countLines(text) // 바이너리는 세지 않는다
    }
    targets.push({ abs, isDir: st.kind === 'dir', lines })
  }

  const r = await run()

  try {
    // 삭제 명령의 대상 중 실제로 없어진 것
    const gone: typeof targets = []
    for (const t of targets) if (!(await $.fs.exists(t.abs).catch(() => true))) gone.push(t)
    const goneDirs = gone.filter(t => t.isDir).map(t => t.abs.toLowerCase() + '/')
    const linesOf = new Map(gone.map(t => [t.abs.toLowerCase(), t.lines]))
    const recorded = new Set<string>()

    const after = before ? await snapshot($, cwd).catch(() => undefined) : undefined
    if (before && after) {
      const diff = diffSnapshots(before, after)
      let reads = 0
      for (const f of diff.added) {
        let plus: number | undefined
        if (f.size <= CONFIG.newFileReadBytes && reads < CONFIG.newFileReadMax) {
          reads++
          const text = await $.fs.read(f.path).catch(() => undefined)
          if (text !== undefined && !text.includes('\u0000')) plus = countLines(text)
        }
        record(f.path, 'added', cwd, { plus, minus: plus === undefined ? undefined : 0 })
        recorded.add(f.path.toLowerCase())
      }
      for (const f of diff.modified) {
        record(f.path, 'modified', cwd, {}) // 셸이 고친 파일은 이전 내용을 몰라 줄 수를 생략한다
        recorded.add(f.path.toLowerCase())
      }
      for (const f of diff.deleted) {
        const key = f.path.toLowerCase()
        if (goneDirs.some(d => key.startsWith(d))) continue // 지운 폴더 안의 파일은 폴더 한 줄로 묶는다
        const lines = linesOf.get(key)
        record(f.path, 'deleted', cwd, { plus: lines === undefined ? undefined : 0, minus: lines })
        recorded.add(key)
      }
    }
    for (const t of gone) {
      if (recorded.has(t.abs.toLowerCase())) continue
      record(t.abs, 'deleted', cwd, { plus: t.lines === undefined ? undefined : 0, minus: t.lines }, t.isDir)
    }
  } catch {
    // 기록 실패는 무시한다 (도구 결과는 그대로 돌려준다)
  }
  return r
}

// ── 그리기 ──────────────────────────────────────────────────────
const ORDER: readonly Kind[] = ['added', 'modified', 'deleted']
const SIGN: Record<Kind, string> = { added: '+', modified: '~', deleted: '−' }
const COLOR: Record<Kind, string> = { added: 'diffAdded', modified: 'warning', deleted: 'diffRemoved' }

export const sortChanges = (files: readonly FileChange[]): FileChange[] =>
  [...files].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind) || a.path.localeCompare(b.path))

export const linesLabel = (f: FileChange): string => {
  const parts: string[] = []
  if (f.plus !== undefined && f.plus > 0) parts.push(`+${f.plus}`)
  if (f.minus !== undefined && f.minus > 0) parts.push(`−${f.minus}`)
  return parts.join(' ')
}

// ── 훅 ─────────────────────────────────────────────────────────
export const register: Register = on => {
  pending.clear()

  const mirror = new Map<string, FileChange[] | string>()
  let loaded = false
  const fill = (notes: Notes): void => {
    if (loaded) return
    for (const [k, v] of Object.entries(notes)) if (!mirror.has(k)) mirror.set(k, v)
    loaded = true
  }

  // 이 모드의 실패가 도구 호출을 막지 않도록 각 훅에 .catch를 단다.
  on('tool.call', { tool: 'Write' }, ($, e, next) =>
    trackWrite($, e.file_path, () => next(e), r => {
      const out = outOf<WriteOut>(r)
      if (out?.staged === true) return 'skip' // 검토 대기로 실제로 쓰이지 않음
      const content = out?.content ?? e.content
      if (out?.type === 'create') return { plus: countLines(content), minus: 0 }
      if (out?.structuredPatch && out.structuredPatch.length > 0) return patchCounts(out.structuredPatch)
      if (typeof out?.originalFile === 'string') return lineDiff(out.originalFile, content)
      return {}
    }),
  ).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Edit' }, ($, e, next) =>
    trackWrite($, e.file_path, () => next(e), r => {
      const out = outOf<EditOut>(r)
      if (out?.staged === true) return 'skip'
      if (out?.structuredPatch && out.structuredPatch.length > 0) return patchCounts(out.structuredPatch)
      return lineDiff(out?.oldString ?? e.old_string, out?.newString ?? e.new_string)
    }),
  ).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'NotebookEdit' }, ($, e, next) =>
    trackWrite($, e.notebook_path, () => next(e), r => {
      const out = outOf<NotebookOut>(r)
      if (out?.new_source === undefined) return {}
      return lineDiff(out.old_source ?? '', out.new_source)
    }),
  ).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Bash' }, ($, e, next) => trackShell($, e.command, () => next(e))).catch(
    ($, e, next) => next(e),
  )
  on('tool.call', { tool: 'PowerShell' }, ($, e, next) =>
    trackShell($, e.command, () => next(e)),
  ).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    if (e.agentId !== undefined) return r // 서브에이전트의 변경은 메인 턴에 합쳐서 보여 준다
    if (pending.size === 0) return r

    const files = sortChanges([...pending.values()])
    pending.clear()

    const key = keyOf(e.answer)
    if (key === '' || files.length === 0) return r
    if (!loaded) fill(await read($, notesAtom))
    mirror.set(key, files)
    if (mirror.size > MAX_NOTES) {
      let drop = mirror.size - MAX_NOTES
      for (const k of mirror.keys()) {
        if (drop-- <= 0) break
        mirror.delete(k)
      }
    }
    const notes: Notes = {}
    for (const [k, v] of mirror) notes[k] = v
    await $.state.set({ plugin: 'change-report', key: 'notes' } as const, notes)
    $.ui.invalidate('ui.render')
    return r
  })

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    if (!loaded) fill(await read($, notesAtom))
    if (mirror.size === 0) return next(e)
    const key = keyOf(e.props.text)
    const note = mirror.get(key)
    if (note === undefined) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    const body = await next(e)

    // 0.1.0이 저장한 예전 형식: 흐린 줄 그대로
    if (typeof note === 'string') {
      return (
        <Box flexDirection="column">
          {body}
          {note.split('\n').map((line, i) => (
            <Text key={`c${i}`} dimColor>
              {line}
            </Text>
          ))}
        </Box>
      )
    }

    const isOpen = (await read($, openAtom))[key] === true
    const count = (k: Kind): number => note.filter(f => f.kind === k).length
    const toggle = (): Promise<unknown> =>
      update($, openAtom, open => {
        const nextOpen: Open = { ...open, [key]: !open[key] }
        const keys = Object.keys(nextOpen)
        for (const k of keys.slice(0, Math.max(0, keys.length - MAX_NOTES))) delete nextOpen[k]
        return nextOpen
      })
    const shownFiles = note.slice(0, CONFIG.maxRows)
    const rest = note.length - shownFiles.length

    return (
      <Box flexDirection="column">
        {body}
        <Box flexDirection="column" borderStyle="round" paddingX={1}>
          <Button key={`cr-${hashOf(key)}`} label="변경 파일" onPress={toggle}>
            <Text mono size="caption" weight="semibold">
              {isOpen ? '▾' : '▸'} 변경 파일
            </Text>
            {ORDER.filter(k => count(k) > 0).map(k => (
              <Text mono size="caption" color={COLOR[k]}>
                {`  ${SIGN[k]}${count(k)}`}
              </Text>
            ))}
          </Button>
          {isOpen &&
            shownFiles.map((f, i) => (
              <Text key={`f${i}`} mono size="caption">
                <Text color={COLOR[f.kind]}>{`${SIGN[f.kind]} ${f.isDir ? `${f.path}/` : f.path}`}</Text>
                {linesLabel(f) !== '' && <Text dimColor>{`  ${linesLabel(f)}`}</Text>}
              </Text>
            ))}
          {isOpen && rest > 0 && (
            <Text mono size="caption" dimColor>
              {`  외 ${rest}개`}
            </Text>
          )}
        </Box>
      </Box>
    )
  })
}
