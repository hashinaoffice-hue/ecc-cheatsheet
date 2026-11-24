import { expect, mock, test } from 'claude-code/testing'

import { STILL, fxPixels, posePixels } from '../hooks/pet-art'

const PET = {
  plugin: 'ecc-cheatsheet',
  component: 'BesidePrompt',
  requestId: 'beside',
  props: { maxColumns: 20, floatRows: 20, floatColumns: 80, isWorking: false, view: {} },
} as const

type Found = { find: (q: { type: string; key?: string }) => Promise<{ props: Record<string, unknown> } | undefined> }
/** 펫 그림 부품의 값(열림 여부)과 크기를 읽음 */
const pet = async (ui: Found) => (await ui.find({ type: 'Client', key: 'ecc-pet' }))?.props

test('펫이 데스크톱과 터미널에 여백 없이 그려진다', async $ => {
  const desk = await $.ui.mount({ ...PET, surface: 'desktop' })
  const boxes = await desk.findAll({ type: 'Box', in: 'ecc-pet' })
  // 몸통 한 줄(가로 12픽셀)이 주황 상자 하나로 그려짐
  expect(boxes.some(b => b.props.backgroundColor === 'claude' && Math.abs(Number(b.props.width) - 12 * 0.7) < 0.01)).toBe(
    true,
  )
  // 가로 = 캐릭터 그대로 (16픽셀 × 0.7), 세로 = 머리 위 연출 6픽셀 + 캐릭터 8픽셀 (× 0.35)
  expect((await pet(desk))?.width).toBe(11.2)
  expect((await pet(desk))?.height).toBe(4.9)
  // 입력창 테두리 안쪽으로 들여서 그림
  const holder = (await desk.findAll({ type: 'Box' })).find(b => b.props.anchor === 'above')
  expect(holder?.props.right).toBe(4.5)
  await desk.unmount()

  const term = await $.ui.mount({ ...PET, surface: 'terminal' })
  expect(await term.find({ type: 'Text', text: /██████/, in: 'ecc-pet' })).toBeDefined()
  expect((await pet(term))?.height).toBe(7)
  await term.unmount()
})

test('펫을 누르는 순간 패널이 펼쳐지고, 다시 누르면 접힌다 (손 떼기 기다리지 않음)', async ($, on) => {
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
  await ui.pointer({ type: 'down', x: 3, y: 3, button: 'left' })
  expect(opened).toEqual(['ecc-cheatsheet'])
  expect(((await pet(ui))?.props as { isOpen: boolean }).isOpen).toBe(true)

  await ui.pointer({ type: 'up', x: 3, y: 3, button: 'left' }) // 손 떼기는 아무 일도 안 함
  expect(opened).toEqual(['ecc-cheatsheet'])

  await ui.pointer({ type: 'down', x: 3, y: 3, button: 'left' })
  expect(closed).toEqual(['ecc-cheatsheet'])
  expect(((await pet(ui))?.props as { isOpen: boolean }).isOpen).toBe(false)
  await ui.unmount()
})

test('우클릭하면 클래식 ↔ 캐주얼 모드가 바뀌고 저장된다 (패널은 안 열림)', async ($, on) => {
  const opened: string[] = []
  const saved: unknown[] = []
  on('ui.open', (_, e) => {
    opened.push(e.id)
    return { value: { isPlaced: true } }
  })
  on('store.set', (_, e) => {
    saved.push([e.key, e.value])
    return { value: undefined }
  })

  const ui = await $.ui.mount({ ...PET, surface: 'desktop' })
  const modeNow = async () => ((await pet(ui))?.props as { mode: string }).mode
  expect(await modeNow()).toBe('casual') // 처음은 캐주얼

  await ui.pointer({ type: 'down', x: 3, y: 3, button: 'right' })
  expect(await modeNow()).toBe('classic')
  await ui.pointer({ type: 'down', x: 3, y: 3, button: 'right' })
  expect(await modeNow()).toBe('casual')

  expect(saved).toEqual([
    ['petMode', 'classic'],
    ['petMode', 'casual'],
  ])
  expect(opened).toEqual([])
  await ui.unmount()
})

test('클래식 모드: 마우스를 올려도 머리 위 연출 없이 동작만', async ($, on) => {
  mock.store(on, { petMode: 'classic' })
  on('command.register', () => ({ value: { command: 'x' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  const ui = await $.ui.mount({ ...PET, surface: 'terminal' })
  const rows = async () => (await ui.findAll({ type: 'Text', in: 'ecc-pet' })).map(t => t.text)
  const before = await rows()
  await ui.pointer({ type: 'enter', x: 1, y: 5 })
  await ui.pointer({ type: 'move', x: 1, y: 5 })
  const after = await rows()
  expect(after.slice(0, 3).join('').trim()).toBe('') // 연출 공간은 비어 있음
  expect(after.join('\n')).not.toBe(before.join('\n')) // 그래도 몸은 반응 (손 인사·시선)
  await ui.unmount()
})

test('시작할 때 패널은 자동으로 열지 않는다', async ($, on) => {
  const opened: string[] = []
  on('command.register', () => ({ value: { command: 'ecc-panel' } }))
  on('ui.open', (_, e) => {
    opened.push(e.id)
    return { value: { isPlaced: true } }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(opened).toEqual([])
})


test('자세 조합: 기본 모습은 Claude Code 캐릭터 그대로', () => {
  expect(posePixels(STILL)).toEqual([
    '..############..',
    '..##o######o##..',
    '..##o######o##..',
    '################',
    '..############..',
    '..############..',
    '...#.#....#.#...',
    '...#.#....#.#...',
  ])
})

test('자세 조합: 두리번(눈 이동), 만세(팔 위), 웅크림(몸 한 칸 아래), 눈 감기', () => {
  expect(posePixels({ ...STILL, look: -1 })[1]).toBe('..#o######o###..')
  expect(posePixels({ ...STILL, look: 1 })[1]).toBe('..###o######o#..')
  const up = posePixels({ ...STILL, armL: 'up', armR: 'up' })
  expect(up[0]).toBe('#.############.#')
  expect(up[1]).toBe('.###o######o###.')
  expect(up[3]).toBe('..############..')
  const crouch = posePixels({ ...STILL, crouch: true })
  expect(crouch[0]).toBe('................')
  expect(crouch[7]).toBe('...#.#....#.#...')
  expect(crouch).toHaveLength(8)
  const closed = posePixels({ ...STILL, eyes: 'closed' })
  expect(closed[1]).toBe('..############..')
  expect(closed[2]).toBe('..##o######o##..')
})

test('마우스를 올리면 펫이 반응하지만 패널은 열리지 않는다', async ($, on) => {
  const opened: string[] = []
  on('ui.open', (_, e) => {
    opened.push(e.id)
    return { value: { isPlaced: true } }
  })
  const ui = await $.ui.mount({ ...PET, surface: 'terminal' })
  const before = (await ui.findAll({ type: 'Text', in: 'ecc-pet' })).map(t => t.text).join('\n')
  await ui.pointer({ type: 'enter', x: 1, y: 5 })
  await ui.pointer({ type: 'move', x: 1, y: 5 })
  const after = (await ui.findAll({ type: 'Text', in: 'ecc-pet' })).map(t => t.text).join('\n')
  expect(after).not.toBe(before) // 마우스 쪽으로 눈을 돌림
  expect(opened).toEqual([])
  await ui.unmount()
})

test('머리 위 연출 공간을 누르면 패널이 열리지 않는다 (몸을 눌러야 열림)', async ($, on) => {
  const opened: string[] = []
  on('ui.open', (_, e) => {
    opened.push(e.id)
    return { value: { isPlaced: true } }
  })
  const ui = await $.ui.mount({ ...PET, surface: 'desktop' })
  await ui.pointer({ type: 'down', x: 5, y: 1, button: 'left' }) // 연출 공간 (몸은 2.1줄부터)
  expect(opened).toEqual([])
  await ui.pointer({ type: 'down', x: 5, y: 3, button: 'left' }) // 몸
  expect(opened).toEqual(['ecc-cheatsheet'])
  await ui.unmount()
})

test('마우스를 올리면 머리 위에 하트가 뜬다', async $ => {
  const ui = await $.ui.mount({ ...PET, surface: 'terminal' })
  await ui.pointer({ type: 'enter', x: 8, y: 5 })
  const top = (await ui.findAll({ type: 'Text', in: 'ecc-pet' })).map(t => t.text).slice(0, 3).join('')
  expect(top.trim()).not.toBe('') // 연출 공간에 무언가 그려짐
  await ui.unmount()
})

test('연출 그림: 작고 여러 색으로', () => {
  const all = (fx: Parameters<typeof fxPixels>[0]) => fxPixels(fx).join('')
  // 졸기: 점 → 작은 z → 큰 Z 로 차례로
  expect(all({ kind: 'zzz', frame: 0 })).toContain('b')
  expect(all({ kind: 'zzz', frame: 1 })).toContain('z')
  expect(all({ kind: 'zzz', frame: 3 })).toContain('ZZZZ')
  expect(all({ kind: 'zzz', frame: 3 })).not.toContain('z')
  // 전구: 금색 테두리 + 하이라이트 + 받침, 빛살은 두 색이 번갈아
  const bulb = fxPixels({ kind: 'bulb', frame: 0 })
  expect(bulb[0]).toBe('.....r.....r....') // 빛살
  expect(bulb[1]).toBe('.......YYY......')
  expect(bulb[2]).toBe('......YwyyY.....')
  expect(bulb[5]).toBe('.......gGg......')
  expect(all({ kind: 'bulb', frame: 1 })).toContain('R')
  // 생각 점: 파랑·초록·보라가 하나씩
  expect(fxPixels({ kind: 'dots', count: 3 })[5]).toBe('.....1..2..3....')
  expect(all({ kind: 'dots', count: 1 })).not.toContain('2')
  // 하트: 작게 뿅 → 크게, 하이라이트와 끝 색
  expect(all({ kind: 'heart', frame: 0 })).not.toContain('H')
  expect(fxPixels({ kind: 'heart', frame: 1 })[3]).toBe('......hHhhh.....')
  // 음표·물음표·반짝이
  expect(all({ kind: 'note', frame: 0, isDouble: false })).not.toContain('m')
  expect(all({ kind: 'note', frame: 0, isDouble: true })).toContain('m')
  expect(fxPixels({ kind: 'question', side: -1 })[1]).toBe('.qq.............')
  expect(fxPixels({ kind: 'question', side: 1 })[1]).toBe('............qq..')
  expect(all({ kind: 'twinkle', frame: 0 })).toContain('W')
  expect(all({ kind: 'sparkle', frame: 0 })).toContain('sWs')
  expect(all({ kind: 'none' })).toBe('.'.repeat(16 * 6))
})
