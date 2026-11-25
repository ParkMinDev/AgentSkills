// turn-meter 성능 벤치마크 (실제 훅 구동). 실행: claude plugin test <이 폴더>
// 60개 응답(~3,000자), 최신 20개에만 note 저장, 응답마다 AssistantMessage 렌더 훅 30회 = 1,800회/run, 5 run 중앙값.
import { expect, mock, test } from 'claude-code/testing'

import { keyOf } from '../hooks/register'

const REPLIES = 60
const NOTED = 20
const REDRAWS = 30
const RUNS = 5
const CHARS = 3_000

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2
}
const f = (n: number, d = 1) => n.toFixed(d)

// 결정적 의사 난수로 마크다운·코드·한글이 섞인 ~3,000자 응답을 만든다 (공백 연속, 줄바꿈 포함).
const replyText = (i: number): string => {
  const parts = [
    `## 응답 ${i}\n\n`,
    '이 변경은 훅이 매 렌더마다 수행하는 작업을 줄이기 위한 것입니다.  ',
    'The render hook runs on every redraw of every assistant message.\n',
    '```ts\nconst  x = await read($, notesAtom)\n    return next(e)\n```\n',
    '- 항목 하나\t탭 포함\n- 두 번째 항목    공백 여러 개\n\n',
  ]
  let s = ''
  let k = i * 7919
  while (s.length < CHARS) {
    k = (k * 1103515245 + 12345) % 2147483648
    s += parts[k % parts.length]
  }
  return `${s.slice(0, CHARS - 40)}\n\n마지막 문장 #${i} — 끝.`
}

const usage = (i: number) => ({
  input_tokens: 2_000 + i,
  output_tokens: 700 + i,
  cache_read_input_tokens: 40_000 + i * 100,
  cache_creation_input_tokens: 500,
})

const render = ($: any, text: string) =>
  $.ui.render({ surface: 'terminal', component: 'AssistantMessage', props: { text } })

test('bench: AssistantMessage 렌더 훅 + 턴 종료 note 쓰기', async ($: any, on: any) => {
  mock.clock(on)
  let ctx = 30_000
  on('turn.complete', (_: any, e: any) => ({ text: e.answer }))
  on('session.usage', () => ({ value: { context: { tokens: (ctx += 1_500) } } }))

  const texts = Array.from({ length: REPLIES }, (_, i) => replyText(i))

  // 1) 턴 종료 note 쓰기: 최신 20개 응답에 대해 실제 turn.complete 훅 구동
  const writeUs: number[] = []
  for (let i = REPLIES - NOTED; i < REPLIES; i++) {
    const t0 = performance.now()
    await $.turn.complete({ answer: texts[i], usage: usage(i), durationMs: 10_000 })
    writeUs.push((performance.now() - t0) * 1000)
  }

  // 정확성 확인: note 있는 응답은 Box로 감싸지고, 없는 응답은 그대로 넘긴다
  const hit = await render($, texts[REPLIES - 1])
  expect(hit.type).toBe('Box')
  const miss = await render($, texts[0])
  expect(miss.type).toBe('engine')

  // 워밍업
  for (let d = 0; d < REDRAWS; d++) for (let i = 0; i < REPLIES; i++) await render($, texts[i]) // 워밍업 1 run

  // 2) 본 측정: 60 응답 × 30 redraw = 1,800 hook 호출
  const runMs: number[] = []
  const hitUs: number[] = []
  const missUs: number[] = []
  for (let r = 0; r < RUNS; r++) {
    let hitT = 0
    let missT = 0
    const t0 = performance.now()
    for (let d = 0; d < REDRAWS; d++) {
      for (let i = 0; i < REPLIES; i++) {
        const a = performance.now()
        await render($, texts[i])
        const dt = performance.now() - a
        if (i >= REPLIES - NOTED) hitT += dt
        else missT += dt
      }
    }
    runMs.push(performance.now() - t0)
    hitUs.push((hitT * 1000) / (NOTED * REDRAWS))
    missUs.push((missT * 1000) / ((REPLIES - NOTED) * REDRAWS))
  }

  // 3) 대조군: turn-meter가 걸지 않은 컴포넌트 렌더 = 엔진/테스트 경계 비용만
  const ctrlMs: number[] = []
  for (let r = 0; r < RUNS; r++) {
    const t0 = performance.now()
    for (let d = 0; d < REDRAWS; d++)
      for (let i = 0; i < REPLIES; i++)
        await $.ui.render({ surface: 'terminal', component: 'UserMessage', props: { text: texts[i] } })
    ctrlMs.push(performance.now() - t0)
  }

  // 4) 렌더 경로 중 keyOf 단독 비용 (3,000자 전체 정규화)
  const keyMs: number[] = []
  let sink = 0
  for (let r = 0; r < RUNS; r++) {
    const t0 = performance.now()
    for (let d = 0; d < REDRAWS; d++) for (let i = 0; i < REPLIES; i++) sink += keyOf(texts[i]).length
    keyMs.push(performance.now() - t0)
  }
  expect(sink).toBeGreaterThan(0)

  const calls = REPLIES * REDRAWS
  const total = median(runMs)
  console.log(`[bench] calls/run=${calls} runs=${RUNS} (median)`)
  console.log(`[bench] render total        ${f(total, 2)} ms  | ${f((total * 1000) / calls)} µs/call`)
  console.log(`[bench]   note 있음 (최신 20) ${f(median(hitUs))} µs/call`)
  console.log(`[bench]   note 없음 (이전 40) ${f(median(missUs))} µs/call`)
  console.log(`[bench] control (훅 없음)    ${f(median(ctrlMs), 2)} ms  | ${f((median(ctrlMs) * 1000) / calls)} µs/call`)
  console.log(`[bench] keyOf only          ${f(median(keyMs), 2)} ms  | ${f((median(keyMs) * 1000) / calls, 2)} µs/call`)
  console.log(`[bench] turn-end write      median ${f(median(writeUs))} µs (first ${f(writeUs[0]!)}, last ${f(writeUs[writeUs.length - 1]!)})`)
  console.log(`[bench] runs ms: ${runMs.map(x => f(x, 1)).join(', ')}`)
})
