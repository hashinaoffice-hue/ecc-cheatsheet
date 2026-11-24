// 펫 그림 데이터.
// Claude Code 시작 화면의 캐릭터(주황 몸통 · 세로 눈 두 개 · 양팔 · 다리 넷)를 픽셀로 그려요.
// 자세(눈·팔·웅크림·다리)를 조합해서 그림을 만들기 때문에, 여러 동작을 자유롭게 섞을 수 있어요.

export const ART_W = 16 // 그림 가로 픽셀 = 글자 칸
export const ART_H = 8 // 캐릭터 세로 픽셀
export const FX_H = 6 // 머리 위 연출 공간 세로 픽셀 (평소엔 투명)
export const CANVAS_H = FX_H + ART_H // 전체 세로 픽셀
export const PET_KEY = 'ecc-pet'

// 데스크톱: 픽셀 하나 = 가로 0.7칸 × 세로 0.35줄 (정사각형에 가깝게)
export const PX_W = 0.7
export const PX_H = 0.35

export type PetSurface = 'terminal' | 'desktop'

const r2 = (n: number) => Math.round(n * 100) / 100

/** 펫 영역 크기(칸·줄): 가로는 캐릭터에 딱 맞게, 세로는 머리 위 연출 공간 포함.
 *  bodyTop: 영역 맨 위에서 캐릭터 몸이 시작하는 위치 (그 위는 연출 공간) */
export const petSize = (surface: PetSurface) =>
  surface === 'desktop'
    ? { w: r2(ART_W * PX_W), h: r2(CANVAS_H * PX_H), bodyTop: r2(FX_H * PX_H) }
    : { w: ART_W, h: CANVAS_H / 2, bodyTop: FX_H / 2 }

export const ORANGE = 'claude' // 앱 테마의 클로드 주황색 그대로
export const EYE = '#1A1A1A'

/** 펫 자세: 이 다섯 가지를 섞어서 동작을 만들어요 */
export type Pose = {
  eyes: 'open' | 'closed'
  look: -1 | 0 | 1 // 눈동자: 왼쪽 / 가운데 / 오른쪽
  armL: 'side' | 'up'
  armR: 'side' | 'up'
  crouch: boolean // 몸을 한 픽셀 낮춤 (들썩·폴짝·꾸벅)
  legs: 'stand' | 'stepA' | 'stepB'
}

export const STILL: Pose = { eyes: 'open', look: 0, armL: 'side', armR: 'side', crouch: false, legs: 'stand' }

/** 자세 → 픽셀 지도 (가로 16 × 세로 8). '#' 몸, 'o' 눈, '.' 빈칸 */
export const posePixels = (p: Pose): string[] => {
  const g = Array.from({ length: ART_H }, () => Array<string>(ART_W).fill('.'))
  const set = (r: number, c: number, v: string) => {
    const row = g[r]
    if (row !== undefined && c >= 0 && c < ART_W) row[c] = v
  }
  const dy = p.crouch ? 1 : 0

  // 몸통: 가로 12 × 세로 6
  for (let r = 0; r < 6; r++) for (let c = 2; c <= 13; c++) set(r + dy, c, '#')

  // 눈: 세로 2픽셀 (감으면 아래 1픽셀만)
  const eyeRows = p.eyes === 'open' ? [1, 2] : [2]
  for (const r of eyeRows) {
    set(r + dy, 4 + p.look, 'o')
    set(r + dy, 11 + p.look, 'o')
  }

  // 팔: 옆으로 뻗기 / 위로 들기
  if (p.armL === 'side') {
    set(3 + dy, 0, '#')
    set(3 + dy, 1, '#')
  } else {
    set(0 + dy, 0, '#')
    set(1 + dy, 1, '#')
  }
  if (p.armR === 'side') {
    set(3 + dy, 14, '#')
    set(3 + dy, 15, '#')
  } else {
    set(0 + dy, 15, '#')
    set(1 + dy, 14, '#')
  }

  // 다리: 웅크리면 한 줄만 보임
  const legCols = [3, 5, 10, 12]
  if (p.crouch) {
    for (const c of legCols) set(7, c, '#')
  } else if (p.legs === 'stand') {
    for (const c of legCols) {
      set(6, c, '#')
      set(7, c, '#')
    }
  } else {
    // 종종걸음: 다리 두 짝씩 번갈아 들기
    const down = p.legs === 'stepA' ? [3, 10] : [5, 12]
    for (const c of legCols) set(6, c, '#')
    for (const c of down) set(7, c, '#')
  }

  return g.map(row => row.join(''))
}

/** 한 조각: [글자, 글자색, 배경색] */
export type Seg = readonly [text: string, fg: string, bg?: string]

/** 머리 위 연출: 한 번에 하나 */
export type Fx =
  | { kind: 'none' }
  | { kind: 'zzz'; frame: 0 | 1 | 2 | 3 } // 졸기: 점 → 작은 z → 큰 Z
  | { kind: 'bulb'; frame: 0 | 1 } // 일 끝: 전구 + 빛살 번갈아 반짝
  | { kind: 'dots'; count: 0 | 1 | 2 | 3 } // 일하는 중: 생각 점
  | { kind: 'heart'; frame: 0 | 1 } // 마우스 올림: 작은 하트 → 큰 하트
  | { kind: 'sparkle'; frame: 0 | 1 } // 누름: 별 반짝
  | { kind: 'note'; frame: 0 | 1; isDouble: boolean } // 손 흔들기·들썩: ♪ / ♪♪
  | { kind: 'question'; side: -1 | 1 } // 두리번: ?
  | { kind: 'twinkle'; frame: 0 | 1 } // 기지개: 반짝반짝

// 연출 그림: 글자 하나 = 색 하나 (아래 COLORS)
const BULB = ['.YYY.', 'YwyyY', 'YyyyY', '.YyY.', '.gGg.']
const RAYS: Record<0 | 1, [number, number, string][]> = {
  0: [
    [0, 5, 'r'],
    [0, 11, 'r'],
    [3, 4, 'R'],
    [3, 12, 'R'],
  ],
  1: [
    [1, 4, 'R'],
    [1, 12, 'R'],
    [5, 4, 'r'],
    [5, 12, 'r'],
  ],
}
const Z_SMALL = ['zzz', '.zz', 'zz.', 'zzz']
const Z_BIG = ['ZZZZ', '..ZZ', 'ZZ..', 'ZZZZ']
const HEART_S = ['h.h', 'hhh', '.D.']
const HEART = ['hh.hh', 'hHhhh', '.hhh.', '..D..']
const STAR = ['.s.', 'sWs', '.s.']
const NOTE = ['.NN', '..N', 'nnN', 'nn.']
const NOTE_PINK = ['.MM', '..M', 'mmM', 'mm.']
const QUESTION = ['qq.', '..Q', '.q.', '...', '.Q.']

/** 연출 → 픽셀 지도 (가로 16 × 세로 6). 머리 바로 위에 작게 */
export const fxPixels = (fx: Fx): string[] => {
  const g = Array.from({ length: FX_H }, () => Array<string>(ART_W).fill('.'))
  const stamp = (sprite: string[], top: number, left: number) =>
    sprite.forEach((line, dy) =>
      [...line].forEach((ch, dx) => {
        const row = g[top + dy]
        if (ch !== '.' && row !== undefined && left + dx >= 0 && left + dx < ART_W) row[left + dx] = ch
      }),
    )
  switch (fx.kind) {
    case 'zzz':
      if (fx.frame <= 1) stamp(['b'], 5, 6)
      if (fx.frame === 1 || fx.frame === 2) stamp(Z_SMALL, 2, 8)
      if (fx.frame >= 2) stamp(Z_BIG, 0, 12)
      break
    case 'bulb':
      stamp(BULB, 1, 6)
      for (const [r, c, color] of RAYS[fx.frame]) stamp([color], r, c)
      break
    case 'dots':
      ;['1', '2', '3'].slice(0, fx.count).forEach((d, i) => stamp([d], 5, 5 + i * 3))
      break
    case 'heart':
      if (fx.frame === 0) stamp(HEART_S, 3, 7)
      else stamp(HEART, 2, 6)
      break
    case 'sparkle':
      stamp(STAR, fx.frame === 0 ? 3 : 1, 0)
      stamp(STAR, fx.frame === 0 ? 1 : 3, 13)
      stamp([fx.frame === 0 ? 't' : 'c'], 0, 5)
      stamp([fx.frame === 0 ? 'c' : 't'], 2, 10)
      break
    case 'note':
      stamp(NOTE, fx.frame === 0 ? 2 : 1, 12)
      if (fx.isDouble) stamp(NOTE_PINK, fx.frame === 0 ? 1 : 2, 1)
      break
    case 'question':
      stamp(QUESTION, 1, fx.side < 0 ? 1 : 12)
      break
    case 'twinkle':
      stamp(fx.frame === 0 ? ['.c.', 'cWc', '.c.'] : ['t'], fx.frame === 0 ? 2 : 3, 2)
      stamp(fx.frame === 0 ? ['t'] : ['.t.', 'tWt', '.t.'], fx.frame === 0 ? 3 : 2, 12)
      break
  }
  return g.map(row => row.join(''))
}

/** 연출 + 캐릭터 → 전체 픽셀 지도 (가로 16 × 세로 14) */
export const canvasPixels = (fx: Fx, pose: Pose): string[] => [...fxPixels(fx), ...posePixels(pose)]

const COLORS: Record<string, string> = {
  '#': ORANGE, // 몸
  o: EYE, // 눈
  // 전구
  Y: '#E0A800',
  y: '#FFE066',
  w: '#FFFFFF',
  g: '#ADB5BD',
  G: '#6C757D',
  r: '#FF922B',
  R: '#FFD43B',
  // Zzz
  b: '#B197FC',
  z: '#74C0FC',
  Z: '#5C7CFA',
  // 하트
  h: '#FF4D6D',
  H: '#FFC2D1',
  D: '#C9184A',
  // 별·반짝이
  s: '#FFD43B',
  W: '#FFFFFF',
  t: '#FF8CC6',
  c: '#66D9E8',
  // 생각 점
  '1': '#4DA3FF',
  '2': '#3DDC97',
  '3': '#B38CFF',
  // 음표
  n: '#3DDC97',
  N: '#20C997',
  m: '#FF8CC6',
  M: '#F06595',
  // 물음표
  q: '#FFD43B',
  Q: '#FAB005',
}

const colorOf = (c: string | undefined): string | undefined => (c === undefined ? undefined : COLORS[c])

/** 한 픽셀 줄을 [길이, 색] 구간으로 묶음. 색이 없으면 빈칸. (데스크톱용) */
export const pixelRuns = (row: string): [number, string | undefined][] => {
  const runs: [number, string | undefined][] = []
  for (const ch of row) {
    const c = colorOf(ch)
    const last = runs[runs.length - 1]
    if (last !== undefined && last[1] === c) last[0] += 1
    else runs.push([1, c])
  }
  return runs
}

/** 픽셀 두 줄(위·아래)을 글자 한 줄로 (터미널용 ▀ ▄ █) */
const pairRow = (top: string, bottom: string): Seg[] => {
  const cells: Seg[] = []
  for (let x = 0; x < ART_W; x++) {
    const t = colorOf(top[x])
    const b = colorOf(bottom[x])
    if (t === undefined && b === undefined) cells.push([' ', ORANGE])
    else if (t === undefined) cells.push(['▄', b as string])
    else if (b === undefined) cells.push(['▀', t])
    else if (t === b) cells.push(['█', t])
    else cells.push(['▀', t, b])
  }
  // 색이 같은 이웃 칸은 한 조각으로 합침
  const merged: Seg[] = []
  for (const seg of cells) {
    const last = merged[merged.length - 1]
    if (last !== undefined && last[1] === seg[1] && last[2] === seg[2]) {
      merged[merged.length - 1] = [last[0] + seg[0], last[1], last[2]]
    } else merged.push(seg)
  }
  return merged
}

/** 픽셀 지도 → 터미널 글자 줄 (한 줄에 픽셀 두 줄) */
export const pixelsToRows = (px: string[]): Seg[][] => {
  const rows: Seg[][] = []
  for (let y = 0; y < px.length; y += 2) rows.push(pairRow(px[y] ?? '', px[y + 1] ?? ''))
  return rows
}
