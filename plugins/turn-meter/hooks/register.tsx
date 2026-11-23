import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Notes } from '../types'

// 응답 본문 아래에 직접 그리기 위해, 턴의 마지막 문장 → meter 줄을 기억한다.
// 세션 상태라 모드를 다시 불러와도 남고, 쓰면 해당 응답이 다시 그려진다.
const notesAtom = atom({ plugin: 'turn-meter', key: 'notes' } as const, {} as Notes)
const MAX_NOTES = 200

// 화면의 응답 블록 텍스트와 turn.complete의 answer를 맞추는 키.
export const keyOf = (text: string): string => text.replace(/\s+/g, ' ').trim().slice(-300)

// turn-meter: 응답 아래에 이번 턴 사용량 한 줄과, 이 세션의 평소 값 대비
// 변동을 감지한 advisor 줄을 붙인다. 모두 엔진이 이미 가진 숫자로 계산하고
// 모델을 부르지 않으며, 붙인 줄은 대화 기록에 들어가지 않는다 (토큰 0).

// ── 설정: 화면에는 나오지 않는 감지 기준 ─────────────────────────────
export const CONFIG = {
  baselineTurns: 5, // 평소 값 = 직전 N턴(컴팩트 턴 제외)의 중앙값
  minHistory: 3, // 기록이 이보다 적으면 변동 규칙을 쉰다
  maxAdvice: 4, // advisor 최대 줄 수
  cacheHitDropPt: 0.3, // C2: 캐시적중이 평소보다 30%p 이상 하락
  growthRatio: 3, // C3: 대화 증가량이 평소의 3배 이상
  growthMin: 10_000, //     그리고 최소 +1만
  inputRatio: 2, // C4: 입력 총량이 평소의 2배 이상
  inputMin: 50_000, //     그리고 최소 5만
  requestRatio: 2, // C5: 요청 횟수가 평소의 2배 이상
  requestMinExtra: 5, //     그리고 평소보다 최소 +5회
  outputRatio: 3, // C6: 출력이 평소의 3배 이상
  outputMin: 2_000, //     그리고 최소 2,000
  agentTokenRatio: 2, // C7: 서브에이전트 토큰이 평소의 2배 이상
  agentTokenMin: 10_000, //     그리고 최소 1만
}

// ── 한 턴의 측정값 ──────────────────────────────────────────────
type Usage = {
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens: number
  cache_creation_input_tokens?: number
  ephemeral_1h_input_tokens?: number
}

export type TurnRecord = {
  input: number // 일반 입력 + 캐시 읽기 + 캐시 쓰기 (메인 + 서브에이전트)
  hit: number // 캐시 읽기 / 입력 (0~1)
  output: number
  ctx?: number // 턴 종료 시점의 메인 대화 크기
  delta?: number // ctx - 직전 턴 ctx
  requests: number // 메인 루프의 모델 요청 횟수
  agents: number // 이번 턴에 끝난 서브에이전트 수
  agentTokens: number
  compacted: boolean
}

export type TurnFacts = TurnRecord & {
  prevCtx?: number
  idleMs?: number // 직전 응답 종료 ~ 이번 턴 시작
  cacheTtlMs: number // 직전 턴의 캐시 수명 추정 (5m 또는 1h)
  durationMs: number
  compactCount: number
  compactBefore?: number
  compactAfter?: number
  prevInput?: number // 직전 턴의 입력 총량
  prevOutput?: number // 직전 턴의 출력
}

// 직전 턴 대비 변동: "변동 +8.3만, +208%" / "변동 -170, -62%" / "변동 +0, ±0%". 직전 값이 없거나 0이면 ''.
export const changeVsPrev = (cur: number, prev?: number): string => {
  if (prev === undefined || prev <= 0) return ''
  const p = Math.round(((cur - prev) / prev) * 100)
  return `변동 ${signed(cur - prev)}, ${p > 0 ? '+' : p < 0 ? '-' : '±'}${Math.abs(p)}%`
}

// ── 숫자 표시 ──────────────────────────────────────────────────
// 한국 단위: 1만 미만은 쉼표(9,500), 1만 이상은 만(4.6만, 120만), 1억 이상은 억(1.5억)
const comma = (n: number): string => `${Math.round(n)}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
const oneDecimal = (n: number): string => n.toFixed(1).replace(/\.0$/, '')
export const tok = (n: number): string => {
  const a = Math.abs(n)
  if (a < 10_000) return comma(n)
  if (Math.abs(Number((n / 10_000).toFixed(1))) < 10_000) return `${oneDecimal(n / 10_000)}만`
  return `${oneDecimal(n / 100_000_000)}억`
}
const signed = (n: number): string => (n >= 0 ? `+${tok(n)}` : `-${tok(-n)}`)
const pct = (r: number): string => `${Math.round(r * 100)}%`
export const dur = (ms: number): string => {
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}초`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}분`
  return `${Math.floor(m / 60)}시간 ${m % 60}분`
}

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2
}

// ── 요약 4줄: 입력 / 출력 / 입출력 / 시간·횟수 ─────────────────────
// 괄호 묶음마다 빈 항목을 빼고, 빈 묶음은 괄호째 생략한다.
const withGroups = (head: string, groups: string[][]): string =>
  [head, ...groups.map(g => g.filter(s => s !== '')).filter(g => g.length).map(g => `(${g.join(', ')})`)].join(' ')
export const summaryLines = (f: TurnFacts): string[] => {
  const prevTotal =
    f.prevInput !== undefined && f.prevOutput !== undefined ? f.prevInput + f.prevOutput : undefined
  const last: string[] = []
  last.push(`응답 소요시간 ${dur(f.durationMs)}`)
  if (f.idleMs !== undefined) last.push(`마지막응답으로부터 ${dur(f.idleMs)}`)
  if (f.compactCount > 0) last.push(`컴팩트횟수 ${f.compactCount}`)
  if (f.agents > 0) last.push(`서브에이전트 ${f.agents}개`)
  return [
    withGroups(`입력 ${tok(f.input)}`, [
      [changeVsPrev(f.input, f.prevInput)],
      [f.delta !== undefined ? `대화 ${signed(f.delta)}` : '', `읽기 횟수 ${f.requests}`],
      [`캐시적중 ${pct(f.hit)}`],
    ]),
    withGroups(`출력 ${tok(f.output)}`, [[changeVsPrev(f.output, f.prevOutput)]]),
    withGroups(`입출력 ${tok(f.input + f.output)}`, [[changeVsPrev(f.input + f.output, prevTotal)]]),
    last.join(' · '),
  ]
}

// ── advisor: 평소 값 대비 변동 감지 ─────────────────────────────
type Advice = { level: 0 | 1 | 2; text: string } // 0 🔴, 1 🟡, 2 ℹ️
const ICON = ['🔴', '🟡', 'ℹ️'] as const

export const adviceLines = (f: TurnFacts, history: readonly TurnRecord[]): string[] => {
  const out: Advice[] = []

  if (f.compacted) {
    const before = f.compactBefore ?? f.prevCtx
    const after = f.compactAfter ?? f.ctx
    out.push({
      level: 2,
      text:
        before !== undefined && after !== undefined
          ? `[컴팩트] 대화 ${tok(before)} → ${tok(after)}`
          : '[컴팩트] 이번 턴 컴팩트됨',
    })
  }

  const base = history.filter(r => !r.compacted).slice(-CONFIG.baselineTurns)
  if (base.length >= CONFIG.minHistory) {
    const b = (pick: (r: TurnRecord) => number | undefined): number | undefined => {
      const xs = base.map(pick).filter((x): x is number => x !== undefined)
      return xs.length >= CONFIG.minHistory ? median(xs) : undefined
    }

    // C2 캐시적중 하락 (컴팩트 턴은 원래 낮으므로 건너뜀)
    const bHit = b(r => r.hit)
    if (!f.compacted && bHit !== undefined && bHit - f.hit >= CONFIG.cacheHitDropPt) {
      let text = `[캐시적중 하락] 평소 ${pct(bHit)} → ${pct(f.hit)}`
      if (f.idleMs !== undefined && f.idleMs > f.cacheTtlMs) {
        text += ` · 대기 ${dur(f.idleMs)} (수명 ${dur(f.cacheTtlMs)})`
      }
      out.push({ level: 0, text })
    }

    // C3 대화 급증
    const bDelta = b(r => r.delta)
    if (
      !f.compacted &&
      f.delta !== undefined &&
      f.prevCtx !== undefined &&
      f.ctx !== undefined &&
      bDelta !== undefined &&
      f.delta >= Math.max(CONFIG.growthRatio * Math.max(bDelta, 0), CONFIG.growthMin)
    ) {
      out.push({
        level: 1,
        text: `[대화 급증] ${tok(f.prevCtx)} → ${tok(f.ctx)} · 평소 ${signed(bDelta)}`,
      })
    }

    // C4 입력 급증
    const bIn = b(r => r.input)
    if (bIn !== undefined && f.input >= Math.max(CONFIG.inputRatio * bIn, CONFIG.inputMin)) {
      out.push({ level: 1, text: `[입력 급증] 평소 ${tok(bIn)} → ${tok(f.input)}` })
    }

    // C5 요청 급증
    const bReq = b(r => r.requests)
    if (
      bReq !== undefined &&
      f.requests >= Math.max(CONFIG.requestRatio * bReq, bReq + CONFIG.requestMinExtra)
    ) {
      out.push({ level: 1, text: `[요청 급증] 평소 ${Math.round(bReq)}회 → ${f.requests}회` })
    }

    // C6 출력 급증
    const bOut = b(r => r.output)
    if (bOut !== undefined && f.output >= Math.max(CONFIG.outputRatio * bOut, CONFIG.outputMin)) {
      out.push({ level: 1, text: `[출력 급증] 평소 ${tok(bOut)} → ${tok(f.output)}` })
    }

    // C7 서브에이전트 급증
    const bAg = b(r => r.agents)
    const bAgTok = b(r => r.agentTokens)
    if (
      bAg !== undefined &&
      bAgTok !== undefined &&
      f.agents > bAg &&
      f.agentTokens >= Math.max(CONFIG.agentTokenRatio * bAgTok, CONFIG.agentTokenMin)
    ) {
      out.push({
        level: 1,
        text: `[서브에이전트 급증] 평소 ${Math.round(bAg)}개 → ${f.agents}개 · ${tok(f.agentTokens)}`,
      })
    }
  }

  out.sort((a, b) => a.level - b.level)
  const lines = out.slice(0, CONFIG.maxAdvice).map(a => `${ICON[a.level]} ${a.text}`)
  const rest = out.length - CONFIG.maxAdvice
  if (rest > 0) lines[lines.length - 1] += ` 외 ${rest}건`
  return lines
}

export const usageIn = (u: Usage): number =>
  u.input_tokens + u.cache_read_input_tokens + (u.cache_creation_input_tokens ?? 0)

// ── 훅 ─────────────────────────────────────────────────────────
export const register: Register = on => {
  // 모듈 변수: 리로드 때 처음부터 다시 센다.
  const history: TurnRecord[] = []
  let prevCtx: number | undefined
  let lastEndAt: number | undefined
  let lastTtlMs = 5 * 60_000
  let turnStartAt: number | undefined
  let requests = 0
  const agentIds = new Set<string>()
  let agentIn = 0
  let agentOut = 0
  let agentCacheRead = 0
  let compactCount = 0
  let compactedThisTurn = false
  let compactBefore: number | undefined
  let compactAfter: number | undefined

  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined && turnStartAt === undefined) {
      turnStartAt = await $.clock.now()
    }
    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    if (e.agentId === undefined) requests += 1
    return yield* next(e)
  })

  on('session.compact', async ($, e, next) => {
    const r = await next(e)
    if (e.trigger !== 'precompute' && !('skip' in r && typeof r.skip === 'string')) {
      compactCount += 1
      compactedThisTurn = true
      if ('tokensBefore' in r) compactBefore = r.tokensBefore
      if ('tokensAfter' in r) compactAfter = r.tokensAfter
    }
    return r
  }).catch(($, e, next) => next(e)) // 이 모드의 실패가 컴팩트를 막지 않게

  on('turn.complete', async ($, e, next) => {
    // 서브에이전트: 사용량만 모아 두고 그대로 넘긴다.
    if (e.agentId !== undefined) {
      if (e.usage) {
        agentIds.add(e.agentId)
        agentIn += usageIn(e.usage)
        agentCacheRead += e.usage.cache_read_input_tokens
        agentOut += e.usage.output_tokens
      }
      return next(e)
    }

    const r = await next(e)
    const u = e.usage
    if (!u) return r // 중단·오류로 사용량이 없는 턴은 표시하지 않는다

    const now = await $.clock.now()
    let ctx: number | undefined
    try {
      const su = await $.session.usage()
      ctx = su.context.tokens
    } catch {
      ctx = undefined
    }

    const mainIn = usageIn(u)
    const input = mainIn + agentIn
    const cacheRead = u.cache_read_input_tokens + agentCacheRead
    const record: TurnRecord = {
      input,
      hit: input > 0 ? cacheRead / input : 0,
      output: u.output_tokens + agentOut,
      ctx,
      delta: ctx !== undefined && prevCtx !== undefined ? ctx - prevCtx : undefined,
      requests,
      agents: agentIds.size,
      agentTokens: agentIn + agentOut,
      compacted: compactedThisTurn,
    }
    const facts: TurnFacts = {
      ...record,
      prevCtx,
      idleMs:
        lastEndAt !== undefined && turnStartAt !== undefined
          ? Math.max(0, turnStartAt - lastEndAt)
          : undefined,
      cacheTtlMs: lastTtlMs,
      durationMs: e.durationMs,
      compactCount,
      compactBefore,
      compactAfter,
      prevInput: history[history.length - 1]?.input,
      prevOutput: history[history.length - 1]?.output,
    }

    // 첫 턴에는 캐시가 원래 비어 있으므로 C2용 기록은 두 번째 턴부터 의미가 있다.
    const lines = [...summaryLines(facts), ...adviceLines(facts, history)]

    // 다음 턴을 위해 갱신
    history.push(record)
    if (history.length > 20) history.shift()
    if (ctx !== undefined) prevCtx = ctx
    lastEndAt = now
    lastTtlMs = (u.ephemeral_1h_input_tokens ?? 0) > 0 ? 60 * 60_000 : 5 * 60_000
    requests = 0
    turnStartAt = undefined
    agentIds.clear()
    agentIn = agentOut = agentCacheRead = 0
    compactedThisTurn = false
    compactBefore = compactAfter = undefined

    const key = keyOf(e.answer)
    if (key !== '') {
      const note = lines.join('\n')
      await update($, notesAtom, prev => {
        const merged: Notes = { ...prev, [key]: note }
        const keys = Object.keys(merged)
        for (const k of keys.slice(0, Math.max(0, keys.length - MAX_NOTES))) delete merged[k]
        return merged
      })
    }
    // 접히는 메모로 붙이지 않고, 아래 ui.render에서 응답 본문 밑에 직접 그린다.
    return r
  })

  // 응답의 마지막 블록 밑에 meter 줄을 흐리게 그린다 (항상 펼쳐진 상태).
  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    const notes = await read($, notesAtom)
    const note = notes[keyOf(e.props.text)]
    if (note === undefined) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        {await next(e)}
        {note.split('\n').map((line, i) => (
          <Text key={`m${i}`} dimColor>
            {line}
          </Text>
        ))}
      </Box>
    )
  })
}
