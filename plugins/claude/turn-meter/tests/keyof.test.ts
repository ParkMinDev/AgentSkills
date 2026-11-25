import { expect, test } from 'claude-code/testing'

import { keyOf } from '../hooks/register'

// 이전 버전의 키: 저장된 note와 호환되려면 결과가 같아야 한다.
const oldKeyOf = (text: string): string => text.replace(/\s+/g, ' ').trim().slice(-300)

test('keyOf는 이전 전체 정규화 키와 같다', async () => {
  const ws = [' ', '  ', '\n', '\t', '\r\n', ' ', '　', ' ', '﻿', ' \n\t ']
  const words = ['a', '한글', 'word', '```', '😀', 'x'.repeat(40), '—', '#']
  let k = 12345
  const rnd = (m: number) => ((k = (k * 1103515245 + 12345) % 2147483648), k % m)
  const cases: string[] = ['', ' ', '   \n ', 'abc', '  abc  ', 'a'.repeat(299), 'a'.repeat(301), ` ${'b'.repeat(300)} `]
  for (let c = 0; c < 400; c++) {
    const len = rnd(4000)
    let s = rnd(2) ? ws[rnd(ws.length)]! : ''
    while (s.length < len) s += words[rnd(words.length)]! + ws[rnd(ws.length)]!.repeat(1 + rnd(3))
    if (rnd(3) === 0) s += ws[rnd(ws.length)]!.repeat(1 + rnd(50))
    cases.push(s)
  }
  for (const s of cases) expect(keyOf(s)).toBe(oldKeyOf(s))
})
