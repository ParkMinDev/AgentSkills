import { expect, test } from 'claude-code/testing'

import { deleteTargets, diffSnapshots, merge, shown } from '../hooks/register'
import type { Snapshot } from '../hooks/register'

const snap = (files: [string, number, number][]): Snapshot =>
  new Map(files.map(([path, size, mtimeMs]) => [path.toLowerCase(), { path, size, mtimeMs }]))

test('폴더 비교: 새 파일은 추가, 크기·시간이 바뀌면 수정, 사라지면 삭제', async () => {
  const before = snap([
    ['D:/w/a.txt', 10, 1],
    ['D:/w/b.txt', 10, 1],
    ['D:/w/c.txt', 10, 1],
  ])
  const after = snap([
    ['D:/w/a.txt', 10, 1], // 그대로
    ['D:/w/b.txt', 12, 2], // 수정
    ['D:/w/sample.xlsx', 5000, 3], // 추가
  ])
  const d = diffSnapshots(before, after)
  expect(d.added.map(f => f.path)).toEqual(['D:/w/sample.xlsx'])
  expect(d.modified.map(f => f.path)).toEqual(['D:/w/b.txt'])
  expect(d.deleted.map(f => f.path)).toEqual(['D:/w/c.txt'])
})

test('삭제 명령의 대상만 뽑는다', async () => {
  expect(deleteTargets('Remove-Item -Recurse -Force old; rm a.txt "b c.txt" && del /q d.txt')).toEqual([
    'old',
    'a.txt',
    'b c.txt',
    'd.txt',
  ])
  expect(deleteTargets('rm *.log; git status')).toEqual([])
})

test('한 턴 안의 여러 변경을 합친다', async () => {
  expect(merge(undefined, 'added')).toBe('added')
  expect(merge('added', 'modified')).toBe('added')
  expect(merge('added', 'deleted')).toBeUndefined()
  expect(merge('deleted', 'added')).toBe('modified')
})

test('작업 폴더 안은 상대 경로', async () => {
  expect(shown('D:/WorkSpace/Scratch/x/a.txt', 'D:\\WorkSpace\\Scratch')).toBe('x/a.txt')
  expect(shown('C:/Temp/a.txt', 'D:\\WorkSpace\\Scratch')).toBe('C:/Temp/a.txt')
})
