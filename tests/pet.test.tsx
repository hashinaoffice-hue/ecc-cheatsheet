import { expect, mock, test } from 'claude-code/testing'

const PET = {
  plugin: 'ecc-cheatsheet',
  component: 'BesidePrompt',
  requestId: 'beside',
  props: { maxColumns: 20, floatRows: 20, floatColumns: 80, isWorking: false, view: {} },
} as const

type Found = { find: (q: { type: string; key?: string }) => Promise<{ props: Record<string, unknown> } | undefined> }
/** 펫 그림 부품이 받은 값(위치, 열림 여부)을 읽음 */
const petProps = async (ui: Found) =>
  (await ui.find({ type: 'Client', key: 'ecc-pet' }))?.props.props as
    | { pos: { right: number; bottom: number }; isOpen: boolean }
    | undefined

const click = async (ui: { pointer: (e: never) => Promise<void> }) => {
  await ui.pointer({ type: 'down', x: 5, y: 4, button: 'left' } as never)
  await ui.pointer({ type: 'up', x: 5, y: 4, button: 'left' } as never)
}

test('펫이 데스크톱과 터미널에 그려진다', async $ => {
  for (const surface of ['desktop', 'terminal'] as const) {
    const ui = await $.ui.mount({ ...PET, surface })
    expect(await ui.find({ type: 'Text', text: /██████/, in: 'ecc-pet' })).toBeDefined()
    await ui.unmount()
  }
})

test('펫을 누르면 패널이 펼쳐지고, 다시 누르면 접힌다', async ($, on) => {
  const opened: string[] = []
  const closed: string[] = []
  on('ui.open', (_, e) => {
    opened.push(e.id)
    return { value: { isPlaced: true } }
  })
  on('ui.close', (_, e) => {
    closed.push(e.id)
    return { value: undefined }
  })

  const ui = await $.ui.mount({ ...PET, surface: 'desktop' })
  await click(ui)
  expect(opened).toEqual(['ecc-cheatsheet'])
  expect((await petProps(ui))?.isOpen).toBe(true)

  await click(ui)
  expect(closed).toEqual(['ecc-cheatsheet'])
  expect((await petProps(ui))?.isOpen).toBe(false)
  await ui.unmount()
})

test('펫을 끌면 위치가 바뀌고, 놓으면 저장되며, 패널은 열리지 않는다', async ($, on) => {
  const opened: string[] = []
  const saved: unknown[] = []
  on('ui.open', (_, e) => {
    opened.push(e.id)
    return { value: { isPlaced: true } }
  })
  on('store.set', (_, e) => {
    saved.push(e.value)
    return { value: undefined }
  })

  const ui = await $.ui.mount({ ...PET, surface: 'desktop' })
  await ui.pointer({ type: 'down', x: 5, y: 4, button: 'left' })
  await ui.pointer({ type: 'move', x: 2, y: 2, button: 'left' }) // 왼쪽 3칸, 위로 2줄
  await ui.pointer({ type: 'up', x: 2, y: 2, button: 'left' })

  expect((await petProps(ui))?.pos).toEqual({ right: 5, bottom: 2 })
  expect(saved).toEqual([{ right: 5, bottom: 2 }])
  expect(opened).toEqual([])
  await ui.unmount()
})

test('화면 밖으로는 못 나간다', async ($, on) => {
  mock.store(on)
  const ui = await $.ui.mount({ ...PET, surface: 'desktop' })
  await ui.pointer({ type: 'down', x: 5, y: 4, button: 'left' })
  // 왼쪽 위로 아주 멀리 → 왼쪽 위 끝(가로 80-16, 세로 20-6)에서 멈춤
  await ui.pointer({ type: 'move', x: -500, y: -500, button: 'left' })
  await ui.pointer({ type: 'up', x: -500, y: -500, button: 'left' })
  expect((await petProps(ui))?.pos).toEqual({ right: 64, bottom: 14 })

  // 오른쪽 아래로 아주 멀리 → 처음 구석(0, 0)에서 멈춤
  await ui.pointer({ type: 'down', x: 5, y: 4, button: 'left' })
  await ui.pointer({ type: 'move', x: 500, y: 500, button: 'left' })
  await ui.pointer({ type: 'up', x: 500, y: 500, button: 'left' })
  expect((await petProps(ui))?.pos).toEqual({ right: 0, bottom: 0 })
  await ui.unmount()
})

test('지난번에 옮겨 둔 자리에서 시작하고, 패널은 자동으로 열지 않는다', async ($, on) => {
  const opened: string[] = []
  on('command.register', () => ({ value: { command: 'ecc-panel' } }))
  on('ui.open', (_, e) => {
    opened.push(e.id)
    return { value: { isPlaced: true } }
  })
  mock.store(on, { petPos: { right: 7, bottom: 3 } })
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const ui = await $.ui.mount({ ...PET, surface: 'desktop' })
  expect((await petProps(ui))?.pos).toEqual({ right: 7, bottom: 3 })
  expect(opened).toEqual([])
  await ui.unmount()
})
