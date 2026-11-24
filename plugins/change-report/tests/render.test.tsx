import { expect, test } from 'claude-code/testing'

const TEXT = '테스트 응답입니다. 파일을 만들었습니다.'

for (const surface of ['terminal', 'desktop'] as const) {
  test(`${surface}: 파일을 쓰면 닫힌 카드가 그려지고 눌러서 펼친다`, async ($: any, on: any) => {
    // 엔진 대신 답하는 바닥 훅
    on('session.cwd', () => ({ value: 'D:/work' }))
    on('fs.exists', () => ({ value: false }))
    on('tool.call', (_: unknown, e: any) => ({
      result: { type: 'create', filePath: e.file_path, content: e.content, structuredPatch: [], originalFile: null },
    }))
    on('turn.complete', () => ({ text: TEXT }))

    await $.tool.call({ tool: 'Write', file_path: 'D:/work/a.txt', content: 'one\ntwo\n' })
    await $.turn.complete({ answer: TEXT, reason: 'answer', durationMs: 1000 })

    const ui = await $.ui.mount({ plugin: 'change-report', surface, component: 'AssistantMessage', props: { text: TEXT } })
    const button = await ui.find({ type: 'Button' })
    expect(button.text).toBe('▸ 변경 파일  +1')
    await ui.press({ key: button.key })
    expect((await ui.find({ type: 'Button' })).text).toBe('▾ 변경 파일  +1')
    await ui.unmount()
  })
}

test('셸 명령이 만든 파일도 카드에 잡힌다', async ($: any, on: any) => {
  const files = [{ name: 'old.txt', kind: 'file', size: 3, mtimeMs: 1, isLink: false }]
  on('session.cwd', () => ({ value: 'D:/work' }))
  on('clock.now', () => ({ value: 0 }))
  on('fs.list', () => ({ value: files.map(f => ({ ...f })) }))
  on('fs.read', () => ({ value: 'a\nb\nc\n' }))
  on('tool.call', () => {
    files.push({ name: 'sample.xlsx', kind: 'file', size: 9, mtimeMs: 2, isLink: false }) // 스크립트가 만든 파일
    return { result: { stdout: '', stderr: '', interrupted: false } }
  })
  on('turn.complete', () => ({ text: TEXT }))

  await $.tool.call({ tool: 'PowerShell', command: 'py make.py' })
  await $.turn.complete({ answer: TEXT, reason: 'answer', durationMs: 1000 })

  const ui = await $.ui.mount({ plugin: 'change-report', surface: 'desktop', component: 'AssistantMessage', props: { text: TEXT } })
  const button = await ui.find({ type: 'Button' })
  expect(button.text).toBe('▸ 변경 파일  +1')
  await ui.press({ key: button.key })
  expect(JSON.stringify(await ui.find({ text: '+ sample.xlsx' }))).toContain('sample.xlsx')
  await ui.unmount()
})
