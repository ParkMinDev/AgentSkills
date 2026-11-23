import { expect, test } from 'claude-code/testing'

import { adviceLines, summaryLine } from '../hooks/register'
import type { TurnFacts, TurnRecord } from '../hooks/register'

const normal: TurnRecord = {
  input: 46_000,
  hit: 0.97,
  output: 300,
  ctx: 40_000,
  delta: 2_000,
  requests: 3,
  agents: 0,
  agentTokens: 0,
  compacted: false,
}
const history: TurnRecord[] = [normal, normal, normal, normal, normal]

const facts = (over: Partial<TurnFacts>): TurnFacts => ({
  ...normal,
  prevCtx: 38_000,
  idleMs: 60_000,
  cacheTtlMs: 5 * 60_000,
  durationMs: 12_000,
  compactCount: 0,
  ...over,
})

test('평소 턴: 첫 줄만, advisor 없음', async () => {
  const f = facts({ output: 285 })
  expect(summaryLine(f)).toBe(
    '입력 46k (캐시적중 97%, 변동 +2k) · 출력 285 · 마지막응답으로부터 1m · 응답 소요시간 12s',
  )
  expect(adviceLines(f, history)).toEqual([])
})

test('입력·출력 뒤에 직전 턴 대비 증감률', async () => {
  expect(
    summaryLine(
      facts({ input: 46_000, output: 285, prevInput: 44_200, prevOutput: 750 }),
    ),
  ).toBe(
    '입력 46k, +4% (캐시적중 97%, 변동 +2k) · 출력 285, -62% · 마지막응답으로부터 1m · 응답 소요시간 12s',
  )
  expect(summaryLine(facts({ output: 300, prevInput: 46_000, prevOutput: 300 }))).toMatch(
    /^입력 46k, ±0% \(.*\) · 출력 300, ±0% · /,
  )
})

test('문제가 겹친 턴: 변동 감지 줄이 🔴 → 🟡 순서로', async () => {
  const f = facts({
    input: 128_000,
    hit: 0.12,
    output: 1_100,
    prevCtx: 31_000,
    ctx: 60_000,
    delta: 29_000,
    idleMs: 9 * 60_000,
    durationMs: 48_000,
    agents: 3,
    agentTokens: 40_000,
    compactCount: 2,
  })
  expect(summaryLine(f)).toBe(
    '입력 128k (캐시적중 12%, 변동 +29k) · 출력 1.1k · 마지막응답으로부터 9m · 응답 소요시간 48s · 서브에이전트 3개 · 컴팩트횟수 2',
  )
  expect(adviceLines(f, history)).toEqual([
    '🔴 [캐시적중 하락] 평소 97% → 12% · 대기 9m (수명 5m)',
    '🟡 [대화 급증] 31k → 60k · 평소 +2k',
    '🟡 [입력 급증] 평소 46k → 128k',
    '🟡 [서브에이전트 급증] 평소 0개 → 3개 · 40k',
  ])
})

test('컴팩트 턴: 캐시 규칙은 건너뛰고 ℹ️ 표시', async () => {
  const f = facts({
    input: 38_000,
    hit: 0,
    output: 900,
    compacted: true,
    compactCount: 3,
    compactBefore: 162_000,
    compactAfter: 38_000,
    delta: -120_000,
  })
  expect(adviceLines(f, history)).toEqual(['ℹ️ [컴팩트] 대화 162k → 38k'])
})

test('기록이 3턴 미만이면 변동 규칙을 쉰다', async () => {
  const f = facts({ hit: 0.1, input: 500_000 })
  expect(adviceLines(f, [normal, normal])).toEqual([])
})
