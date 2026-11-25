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

test('검색하면 맞는 명령어만 남는다 (터미널: 앱 기본 입력칸)', async $ => {
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'tab:all' })
  await ui.input({ key: 'search', text: 'rust', kind: 'change' })

  expect(await copyButtons(ui)).toBe(3)
  expect(await has(ui, '/ecc:rust-build')).toBe(true)
  expect(await has(ui, '/ecc:plan')).toBe(false)

  await ui.press({ key: 'clear' })
  expect(await copyButtons(ui)).toBe(99)
  await ui.unmount()
})

test('데스크톱도 앱 기본 입력칸으로 검색 (한글 조합 입력 때문에) — "리뷰"', async $ => {
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.press({ key: 'tab:all' })
  await ui.input({ key: 'search', text: '리뷰', kind: 'change' })
  expect(await has(ui, '/ecc:code-review')).toBe(true)
  expect(await has(ui, '/ecc:plan')).toBe(false)
  await ui.unmount()
})

test('검색창 폭이 패널 폭에 따라 늘고 준다 (안내 문구 뒤 보이지 않는 공백 개수)', async $ => {
  const widthAt = async (bodyColumns: number) => {
    const ui = await $.ui.mount({ ...PANE, props: { ...PANE.props, bodyColumns }, surface: 'desktop' })
    const input = (await ui.find({ type: 'Input', key: 'search' })) as { props: { placeholder?: string } } | undefined
    await ui.unmount()
    const ph = input?.props.placeholder ?? ''
    expect(ph.startsWith('명령어나 설명으로 검색')).toBe(true)
    return [...ph].length
  }
  const narrow = await widthAt(40)
  const wide = await widthAt(80)
  expect(wide - narrow).toBe(40) // 패널이 40칸 넓어지면 검색창도 40칸 넓어짐
  expect(await widthAt(10)).toBe([...'명령어나 설명으로 검색'].length) // 아주 좁으면 공백 없이 문구만
})

test('상단 모두 접기/모두 펼치기 아이콘 버튼 — 데스크톱(라인 아이콘)·터미널(기호)', async $ => {
  for (const surface of ['desktop', 'terminal'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    await ui.press({ key: 'collapse-all' })
    expect(await has(ui, '/ecc:plan')).toBe(false)
    await ui.press({ key: 'expand-all' })
    expect(await has(ui, '/ecc:plan')).toBe(true)
    await ui.unmount()
  }
})

test('바 왼쪽 ▾ 버튼을 누르면 접히고(▸) 다시 누르면 펼쳐진다 — 모든 화면', async $ => {
  for (const surface of ['desktop', 'terminal', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    const arrow = async () =>
      ((await ui.find({ type: 'Button', key: 'head:plan' })) as { text?: string } | undefined)?.text
    expect(await arrow()).toBe('▾')
    await ui.press({ key: 'head:plan' })
    expect(await has(ui, '/ecc:plan')).toBe(false)
    expect(await arrow()).toBe('▸')

    await ui.press({ key: 'head:plan' })
    expect(await has(ui, '/ecc:plan')).toBe(true)
    await ui.unmount()
  }
})

test('카테고리 제목은 버튼이 아닌 글자라 크림색이 그대로 보인다', async $ => {
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const title = (await ui.find({ type: 'Text', text: /^계획 세우기$/ })) as { props: Record<string, unknown> } | undefined
  expect(title?.props.color).toBe('#FBF3EA')
  await ui.unmount()
})

// 버그 재현: 둥근 테두리 카드가 안쪽 갈색 바를 잘라 주지 않아서,
// 네모난 바의 위쪽 모서리가 둥근 테두리 밖으로 삐져나왔다 (라운드 컬러바가 안 됨).
test('카드는 둥근 테두리 밖으로 나가는 갈색 바를 잘라 낸다 (라운드 컬러바)', async $ => {
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const card = (await ui.find({ type: 'Box', key: 'cat:plan' })) as { props: Record<string, unknown> } | undefined
  expect(card?.props.borderStyle).toBe('round')
  expect(card?.props.overflow).toBe('hidden') // 바깥으로 나간 부분은 둥근 모양대로 잘림
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
