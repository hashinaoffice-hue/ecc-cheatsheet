import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'ecc-cheatsheet',
  component: 'Pane',
  requestId: 'ecc-cheatsheet',
  props: {
    title: 'ECC 명령어',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
} as const

type Ui = {
  find: (q: { type: string; key?: string }) => Promise<unknown>
  findAll: (q: { type: string }) => Promise<{ key: string | undefined }[]>
}
/** 명령어 줄이 보이는지 (줄마다 key가 row:/ecc:이름) */
const has = async (ui: Ui, name: string) => (await ui.find({ type: 'Box', key: `row:${name}` })) !== undefined
/** 복사 아이콘 버튼 개수 */
const copyButtons = async (ui: Ui) =>
  (await ui.findAll({ type: 'Button' })).filter(b => b.key?.startsWith('copy:')).length

test('자주 쓰는 것 탭은 ⭐ 명령어만, 전체 탭은 99개 모두 보여준다', async ($, on) => {
  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await has(ui, '/ecc:plan')).toBe(true)
    expect(await has(ui, '/ecc:go-test')).toBe(false)

    await ui.press({ key: 'tab:all' })
    expect(await has(ui, '/ecc:go-test')).toBe(true)
    expect(await copyButtons(ui)).toBe(99)

    await ui.press({ key: 'tab:fav' })
    await ui.unmount()
  }
})

test('검색하면 맞는 명령어만 남는다', async $ => {
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.press({ key: 'tab:all' })
  await ui.input({ key: 'search', text: 'rust', kind: 'change' })

  expect(await copyButtons(ui)).toBe(3)
  expect(await has(ui, '/ecc:rust-build')).toBe(true)
  expect(await has(ui, '/ecc:plan')).toBe(false)

  await ui.press({ key: 'clear' })
  expect(await copyButtons(ui)).toBe(99)
  await ui.unmount()
})

test('카테고리 제목을 누르면 접히고 다시 누르면 펼쳐진다', async $ => {
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'head:plan' })
  expect(await has(ui, '/ecc:plan')).toBe(false)

  await ui.press({ key: 'head:plan' })
  expect(await has(ui, '/ecc:plan')).toBe(true)
  await ui.unmount()
})

test('복사 버튼은 명령어를 클립보드에 넣는다', async ($, on) => {
  const taken: string[] = []
  on('ui.copy', (_, e) => {
    taken.push(e.text)
    return { value: { isCopied: true } }
  })

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.press({ key: 'copy:/ecc:plan' })

  expect(taken).toEqual(['/ecc:plan'])
  const btn = await ui.find({ type: 'Button', key: 'copy:/ecc:plan' })
  expect(JSON.stringify(btn)).toContain('✓') // 복사 아이콘이 체크로 바뀜
  // 한글 '복사' 글자 버튼은 없음
  expect(await ui.find({ type: 'Button', text: /복사/ })).toBeUndefined()
  await ui.unmount()
})
