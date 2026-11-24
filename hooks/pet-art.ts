// 펫 그림 데이터와 공용 계산.
// Claude Code 시작 화면의 캐릭터(주황 몸통 · 세로 눈 두 개 · 양팔 · 다리 넷)를 픽셀로 그리고,
// 글자 한 칸에 위아래 두 픽셀을 반칸 블록(▀ ▄ █)으로 담아 촘촘하게 표시해요.
import type { PetPos } from '../types'

export const ART_W = 16 // 그림 가로 픽셀 = 글자 칸
export const ART_ROWS = 4 // 그림 세로 글자 줄 (픽셀 8줄)
export const PET_W = ART_W // 펫 영역 가로 칸
export const PET_H = ART_ROWS + 2 // 말풍선 1 + 통통 여유 1 + 그림
export const PET_KEY = 'ecc-pet'
export const START_POS: PetPos = { right: 2, bottom: 0 }

export const ORANGE = 'claude' // 앱 테마의 클로드 주황색 그대로
export const EYE = '#1A1A1A'

export type Mood = 'idle' | 'blink' | 'happy' | 'grab' | 'work'

/** 한 조각: [글자, 글자색, 배경색] */
export type Seg = readonly [text: string, fg: string, bg?: string]

// 픽셀 지도: '#' 몸, 'o' 눈, '.' 빈칸. 가로 16 × 세로 8.
const BODY = '..############..'
const EYES = '..##o######o##..'
const ARMS = '################'
const LEGS = '...#.#....#.#...'
const NONE = '................'

const MAP: Record<Mood, (step: boolean) => string[]> = {
  // 평소: 세로 눈, 양팔 옆으로
  idle: () => [BODY, EYES, EYES, ARMS, BODY, BODY, LEGS, LEGS],
  // 깜빡: 눈이 한 줄로 짧아짐
  blink: () => [BODY, BODY, EYES, ARMS, BODY, BODY, LEGS, LEGS],
  // 패널이 열리면 만세
  happy: () => [
    '#.############.#',
    '.###o######o###.',
    '..##o######o##..',
    BODY,
    BODY,
    BODY,
    LEGS,
    LEGS,
  ],
  // 잡혀서 들려 있을 땐 눈 질끈, 다리 벌어짐
  grab: () => [BODY, BODY, EYES, ARMS, BODY, BODY, '..#..#....#..#..', '..#..#....#..#..'],
  // 일하는 중엔 종종걸음
  work: step => {
    const legs = step ? '...#......#.....' : '.....#......#...'
    return [BODY, EYES, EYES, ARMS, BODY, BODY, LEGS, legs]
  },
}

const colorOf = (c: string | undefined): string | undefined =>
  c === '#' ? ORANGE : c === 'o' ? EYE : undefined

/** 픽셀 두 줄(위·아래)을 글자 한 줄로 */
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

/** 표정별 펫 그림 (가로 16칸 × 세로 4줄) */
export const petRows = (mood: Mood, step: boolean): Seg[][] => {
  const px = MAP[mood](step)
  const rows: Seg[][] = []
  for (let y = 0; y < px.length; y += 2) rows.push(pairRow(px[y] ?? NONE, px[y + 1] ?? NONE))
  return rows
}

const clampNum = (n: number, max: number) => Math.min(Math.max(0, Math.round(n)), Math.max(0, max))

/** 위치를 움직일 수 있는 범위 안으로 맞춤 */
export const clampPos = (p: PetPos, max: PetPos): PetPos => ({
  right: clampNum(p.right, max.right),
  bottom: clampNum(p.bottom, max.bottom),
})

/** 저장소에서 읽은 값이 올바른 위치인지 확인 */
export const isPos = (v: unknown): v is PetPos =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as PetPos).right === 'number' &&
  typeof (v as PetPos).bottom === 'number' &&
  Number.isFinite((v as PetPos).right) &&
  Number.isFinite((v as PetPos).bottom)
