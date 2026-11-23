import { expect, test } from 'claude-code/testing'

import { adviceLines, summaryLines } from '../hooks/register'
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

test('평소 턴: 요약 4줄만, advisor 없음', async () => {
  const f = facts({ output: 285 })
  expect(summaryLines(f)).toEqual([
    '입력 4.6만 (대화 +2,000, 읽기 횟수 3) (캐시적중 97%)',
    '출력 285',
    '입출력 4.6만',
    '마지막응답으로부터 1분 · 응답 소요시간 12초',
  ])
  expect(adviceLines(f, history)).toEqual([])
})

test('입력·출력·입출력에 직전 턴 대비 변동(차이, 비율)', async () => {
  expect(
    summaryLines(facts({ input: 46_000, output: 285, prevInput: 44_200, prevOutput: 750 })),
  ).toEqual([
    '입력 4.6만 (변동 +1,800, +4%) (대화 +2,000, 읽기 횟수 3) (캐시적중 97%)',
    '출력 285 (변동 -465, -62%)',
    '입출력 4.6만 (변동 +1,335, +3%)',
    '마지막응답으로부터 1분 · 응답 소요시간 12초',
  ])
  const same = summaryLines(facts({ output: 300, prevInput: 46_000, prevOutput: 300 }))
  expect(same[1]).toBe('출력 300 (변동 +0, ±0%)')
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
  expect(summaryLines(f)).toEqual([
    '입력 12.8만 (대화 +2.9만, 읽기 횟수 3) (캐시적중 12%)',
    '출력 1,100',
    '입출력 12.9만',
    '마지막응답으로부터 9분 · 응답 소요시간 48초 · 서브에이전트 3개 · 컴팩트횟수 2',
  ])
  expect(adviceLines(f, history)).toEqual([
    '🔴 [캐시적중 하락] 평소 97% → 12% · 대기 9분 (수명 5분)',
    '🟡 [대화 급증] 3.1만 → 6만 · 평소 +2,000',
    '🟡 [입력 급증] 평소 4.6만 → 12.8만',
    '🟡 [서브에이전트 급증] 평소 0개 → 3개 · 4만',
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
  expect(adviceLines(f, history)).toEqual(['ℹ️ [컴팩트] 대화 16.2만 → 3.8만'])
})

test('기록이 3턴 미만이면 변동 규칙을 쉰다', async () => {
  const f = facts({ hit: 0.1, input: 500_000 })
  expect(adviceLines(f, [normal, normal])).toEqual([])
})
