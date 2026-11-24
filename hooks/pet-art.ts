// 펫 그림 데이터와 공용 계산. 클로드 주황색 + 머리 위 반짝이를 살린 오리지널 캐릭터.
import type { PetPos } from '../types'

export const PET_W = 12 // 펫 영역 가로 칸
export const PET_H = 8 // 펫 영역 세로 줄 (말풍선 1 + 통통 여유 1 + 몸 6)
export const PET_KEY = 'ecc-pet'
export const START_POS: PetPos = { right: 2, bottom: 0 }

export const ORANGE = '#D97757'
export const DARK = '#3A1F14'
export const SPARK = '#F4B860'

export type Mood = 'idle' | 'blink' | 'happy' | 'grab' | 'work'

/** 한 조각: [글자, 글자색, 배경색] */
export type Seg = readonly [text: string, fg: string, bg?: string]

const EYES: Record<Mood, string> = {
  idle: ' o  o ',
  blink: ' -  - ',
  happy: ' ^  ^ ',
  grab: ' >  < ',
  work: ' o  o ',
}
const MOUTH: Record<Mood, string> = {
  idle: '  __  ',
  blink: '  __  ',
  happy: ' \\__/ ',
  grab: '  ()  ',
  work: '  ~~  ',
}

/** 표정별 펫 그림 (가로 10칸 × 세로 6줄) */
export const petRows = (mood: Mood, step: boolean): Seg[][] => [
  [[mood === 'happy' ? '   ✦  ✦   ' : '    ✦     ', SPARK]],
  [[' ▄██████▄ ', ORANGE]],
  [[' █', ORANGE], [EYES[mood], DARK, ORANGE], ['█ ', ORANGE]],
  [[' █', ORANGE], [MOUTH[mood], DARK, ORANGE], ['█ ', ORANGE]],
  [[' ▀██████▀ ', ORANGE]],
  [[step ? '   ▀▀▀▀   ' : '  ▀▀  ▀▀  ', ORANGE]],
]

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
