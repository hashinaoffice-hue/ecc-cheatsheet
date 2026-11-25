// 오른쪽 구석에 떠 있는 펫.
// - 누르면 명령어 패널이 열리고, 다시 누르면 접혀요. (누르는 순간 반응, 펫 모습부터 바꿈)
// - 혼자서도 두리번(?)·손 흔들기(♪)·기지개(반짝)·들썩(♪♪)이고, 오래 두면 잠깐 졸다(Zzz) 기지개 켜며 깨요.
// - 마우스를 올리면 손 흔들며 인사하고 눈이 마우스를 따라봐요.
// - Claude가 일하면 종종걸음, 일을 끝내면 만세하며 폴짝폴짝.
// - 머리 위 연출: 졸면 Zzz, 일 끝나면 전구 반짝, 일하는 중엔 생각 점, 마우스 올리면 하트, 누르면 반짝이.
// - 우클릭하면 클래식(동작만) ↔ 캐주얼(동작 + 머리 위 연출) 모드가 바로 바뀌어요.
// 모든 동작은 이 부품 안에서만 돌아가서(클라우드와 주고받지 않음) 가볍고 빨라요.
import type { ClientModule, ClientSurface } from 'claude-code'

import type { PetMode, PetMsg, PetProps } from '../types'
import { PX_H, PX_W, STILL, canvasPixels, pixelRuns, pixelsToRows, petSize } from './pet-art'
import type { Fx, Pose } from './pet-art'

const TICK_MS = 300
const SLEEP_AFTER = 200 // 약 1분 동안 아무 일 없으면 졸기
const SLEEP_LEN = 80 // 약 24초 졸다가 스스로 깸
const CHEER_TICKS = 10 // 일 끝났을 때 축하 + 전구 (약 3초)
const HEART_TICKS = 5 // 마우스 올렸을 때 하트 (약 1.5초)
const SPARKLE_TICKS = 4 // 눌렀을 때 반짝이 (약 1.2초)
const GUESS_TICKS = 10 // 누른 뒤 본체 답을 기다리는 최대 시간 (약 3초)

type ActKind = 'look' | 'wave' | 'stretch' | 'bob'
type Act = { kind: ActKind; start: number; until: number }
const ACT_LENGTH: Record<ActKind, number> = { look: 8, wave: 6, stretch: 5, bob: 6 }
const ACTS: ActKind[] = ['look', 'wave', 'stretch', 'bob']

type Ref = {
  props: PetProps
  tick: number
  hover: boolean
  look: -1 | 0 | 1 // 마우스 쪽 시선
  lastActive: number
  act?: Act
  nextActAt: number
  wasWorking: boolean
  sleepStart: number // 0이면 깨어 있음
  mode: PetMode // 지금 모드 (우클릭하면 바로 바뀌고, 본체에는 나중에 알림)
  propsMode: PetMode // 본체가 마지막으로 알려 준 모드
  cheerUntil: number
  heartUntil: number
  sparkleUntil: number
}
/** 누른 직후 펫이 먼저 보여 주는 열림 상태 */
type Guess = { isOpen: boolean; untilTick: number }
type State = { ref: Ref; key: string; guess?: Guess }

const randInt = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))

const isOpenNow = (s: State): boolean => {
  const { props, tick } = s.ref
  const g = s.guess
  if (g !== undefined && tick <= g.untilTick && g.isOpen !== props.isOpen) return g.isOpen
  return props.isOpen
}

/** 지금 이 순간의 자세: 위에 있는 상황일수록 먼저 */
const poseOf = (s: State, reduced: boolean): Pose => {
  const r = s.ref
  const t = r.tick
  const blink = t % 17 === 0

  // 패널 열림: 만세, 가끔 살랑
  if (isOpenNow(s)) {
    return { ...STILL, armL: 'up', armR: 'up', eyes: blink ? 'closed' : 'open', crouch: !reduced && t % 6 === 0 }
  }
  if (reduced) return { ...STILL, eyes: blink ? 'closed' : 'open' }

  // 일 끝남: 만세하며 폴짝폴짝
  if (t < r.cheerUntil) {
    const up = t % 2 === 0
    return { ...STILL, armL: up ? 'up' : 'side', armR: up ? 'up' : 'side', crouch: !up }
  }
  // 일하는 중: 종종걸음
  if (r.props.isWorking) {
    return { ...STILL, legs: t % 2 === 0 ? 'stepA' : 'stepB', eyes: blink ? 'closed' : 'open' }
  }
  // 마우스 올림: 손 흔들며 마우스 쪽 바라보기
  if (r.hover) {
    return { ...STILL, look: r.look, armR: t % 2 === 0 ? 'up' : 'side' }
  }
  // 오래 혼자: 꾸벅꾸벅
  if (isAsleep(r)) {
    return { ...STILL, eyes: 'closed', crouch: t % 8 < 4 }
  }
  // 혼자 놀기
  const a = r.act
  if (a !== undefined && t < a.until) {
    const k = t - a.start
    if (a.kind === 'look') return { ...STILL, look: k < ACT_LENGTH.look / 2 ? -1 : 1 }
    if (a.kind === 'wave') return { ...STILL, armL: k % 2 === 0 ? 'up' : 'side' }
    if (a.kind === 'stretch') return { ...STILL, armL: 'up', armR: 'up', eyes: 'closed' }
    return { ...STILL, crouch: k % 2 === 0 } // bob
  }
  return { ...STILL, eyes: blink ? 'closed' : 'open' }
}

const isAsleep = (r: Ref) => r.sleepStart > 0 && !r.hover && !r.props.isWorking

/** 깨우기: 무언가 일어났을 때 */
const wake = (r: Ref) => {
  r.lastActive = r.tick
  r.sleepStart = 0
}

/** 지금 이 순간 머리 위 연출: 위에 있는 상황일수록 먼저. 몸 동작과 짝을 이뤄요. */
const fxOf = (s: State, reduced: boolean): Fx => {
  const r = s.ref
  const t = r.tick
  if (r.mode === 'classic') return { kind: 'none' } // 클래식: 연출 없이 동작만
  const f = (reduced ? 0 : t % 2) as 0 | 1
  if (t < r.cheerUntil) return { kind: 'bulb', frame: f } // 일 끝: 전구 + 폴짝
  if (t < r.sparkleUntil) return { kind: 'sparkle', frame: f } // 누름: 별 + 만세
  if (r.hover && t < r.heartUntil) return { kind: 'heart', frame: r.heartUntil - t >= HEART_TICKS ? 0 : 1 } // 인사
  if (r.props.isWorking) return { kind: 'dots', count: reduced ? 3 : ((t % 4) as 0 | 1 | 2 | 3) } // 종종걸음
  if (isAsleep(r)) return { kind: 'zzz', frame: reduced ? 2 : ((Math.floor(t / 2) % 4) as 0 | 1 | 2 | 3) } // 꾸벅
  const a = r.act
  if (!reduced && a !== undefined && t < a.until) {
    const k = t - a.start
    if (a.kind === 'look') return { kind: 'question', side: k < ACT_LENGTH.look / 2 ? -1 : 1 }
    if (a.kind === 'wave') return { kind: 'note', frame: f, isDouble: false }
    if (a.kind === 'bob') return { kind: 'note', frame: f, isDouble: true }
    return { kind: 'twinkle', frame: f } // stretch
  }
  return { kind: 'none' }
}

const keyOf = (p: Pose, fx: Fx) => `${p.eyes}${p.look}${p.armL}${p.armR}${p.crouch}${p.legs}|${JSON.stringify(fx)}`
const keyNow = (s: State, reduced: boolean) => keyOf(poseOf(s, reduced), fxOf(s, reduced))

const redraw = (surface: ClientSurface<State>, s: State) => {
  const key = keyNow(s, surface.isMotionReduced)
  if (key !== s.key) surface.setState({ ...s, key })
}

const tickOnce = (surface: ClientSurface<State>) => {
  const s = surface.state
  if (s === undefined) return
  const r = s.ref
  r.tick += 1
  const t = r.tick
  if (r.props.isWorking || r.hover) wake(r)
  // 졸기 시작 / 한참 졸면 스스로 깨서 기지개
  if (r.sleepStart === 0 && t - r.lastActive > SLEEP_AFTER) {
    r.sleepStart = t
  } else if (r.sleepStart > 0 && t - r.sleepStart > SLEEP_LEN) {
    wake(r)
    r.act = { kind: 'stretch', start: t, until: t + ACT_LENGTH.stretch }
    r.nextActAt = r.act.until + randInt(6, 14)
  }
  // 깨어 있을 때 혼자 놀기 고르기
  if (!isAsleep(r) && (r.act === undefined || t >= r.act.until) && t >= r.nextActAt) {
    const kind = ACTS[randInt(0, ACTS.length - 1)] ?? 'look'
    r.act = { kind, start: t, until: t + ACT_LENGTH[kind] }
    r.nextActAt = r.act.until + randInt(6, 14)
  }
  if (!surface.isWindowFocused) return // 창을 안 보고 있으면 다시 그리지 않음
  redraw(surface, s)
}

const press = (surface: ClientSurface<State>) => {
  const s = surface.state
  if (s === undefined) return
  surface.post({ type: 'click' } satisfies PetMsg)
  wake(s.ref)
  s.ref.sparkleUntil = s.ref.tick + SPARKLE_TICKS
  // 답을 기다리지 않고 펫 모습부터 바꿈
  const next: State = { ...s, guess: { isOpen: !isOpenNow(s), untilTick: s.ref.tick + GUESS_TICKS } }
  surface.setState({ ...next, key: keyNow(next, surface.isMotionReduced) })
}

/** 우클릭: 모드 바꾸기 (펫 먼저 바뀌고 본체에 알림) */
const switchMode = (surface: ClientSurface<State>) => {
  const s = surface.state
  if (s === undefined) return
  const next: PetMode = s.ref.mode === 'casual' ? 'classic' : 'casual'
  s.ref.mode = next
  wake(s.ref)
  if (next === 'casual') s.ref.sparkleUntil = s.ref.tick + SPARKLE_TICKS // 캐주얼로 바꾸면 반짝!
  surface.post({ type: 'mode', mode: next } satisfies PetMsg)
  surface.setState({ ...s, key: keyNow(s, surface.isMotionReduced) })
}

const Pet: ClientModule<PetProps, State> = (props, surface) => {
  const { Box, Text } = surface.elements
  let s = surface.state

  if (s === undefined) {
    // 처음 한 번만: 타이머·마우스·키보드 연결
    const ref: Ref = {
      props,
      tick: 1,
      hover: false,
      look: 0,
      lastActive: 1,
      nextActAt: randInt(8, 16),
      wasWorking: props.isWorking,
      sleepStart: 0,
      mode: props.mode,
      propsMode: props.mode,
      cheerUntil: 0,
      heartUntil: 0,
      // /ecc-pet 으로 다시 불러왔으면 반짝이며 등장 (약 2초)
      sparkleUntil: props.summon > 0 ? SPARKLE_TICKS + 3 : 0,
    }
    s = { ref, key: '' }
    surface.every(TICK_MS, () => tickOnce(surface))
    surface.onPointer(ev => {
      const now = surface.state
      if (now === undefined) return
      const r = now.ref
      const size = petSize(r.props.surface)
      const x = ev.fine?.x ?? ev.x
      const y = ev.fine?.y ?? ev.y
      // 머리 위 연출 공간은 투명한 자리: 몸 위에 있을 때만 반응
      const isOnBody = y >= size.bodyTop
      if (ev.type === 'down') {
        if (!isOnBody) return
        if (ev.button === 'right') switchMode(surface)
        else if (ev.button === undefined || ev.button === 'left') press(surface)
        return
      }
      if (ev.type === 'leave' || ((ev.type === 'enter' || ev.type === 'move') && !isOnBody)) {
        r.hover = false
        r.look = 0
      } else if (ev.type === 'enter' || ev.type === 'move') {
        if (!r.hover) {
          r.heartUntil = r.tick + HEART_TICKS // 막 올라왔으면 하트
          wake(r)
        }
        r.hover = true
        // 마우스가 펫의 왼쪽/가운데/오른쪽 중 어디 있는지 → 그쪽을 바라봄
        r.look = x < size.w * 0.35 ? -1 : x > size.w * 0.65 ? 1 : 0
      } else return
      redraw(surface, now)
    })
    surface.onKey(ev => {
      if (ev.key === 'return' || ev.key === ' ' || ev.key === 'space') press(surface)
    })
    surface.setState(s)
  }

  // 본체가 새 값을 줄 때: Claude가 일을 막 끝냈으면 축하 시작
  const r = s.ref
  if (r.wasWorking && !props.isWorking) {
    r.cheerUntil = r.tick + CHEER_TICKS
    wake(r)
  }
  if (props.isOpen !== r.props.isOpen) wake(r)
  // 본체가 다른 모드를 알려 오면(명령어로 바꿨거나 저장된 모드) 따름
  if (props.mode !== r.propsMode) {
    r.mode = props.mode
    r.propsMode = props.mode
  }
  r.wasWorking = props.isWorking
  r.props = props

  const size = petSize(props.surface)
  const px = canvasPixels(fxOf(s, surface.isMotionReduced), poseOf(s, surface.isMotionReduced))

  // 머리 위 연출 공간(투명) + 캐릭터
  if (props.surface === 'desktop') {
    // 데스크톱: 픽셀마다 색 상자 (줄 사이 틈 없이 붙음)
    return (
      <Box flexDirection="column" width={size.w} height={size.h}>
        {px.map(row => (
          <Box flexDirection="row" height={PX_H}>
            {pixelRuns(row).map(([len, color]) =>
              color === undefined ? (
                <Box width={len * PX_W} height={PX_H} />
              ) : (
                <Box width={len * PX_W} height={PX_H} backgroundColor={color} />
              ),
            )}
          </Box>
        ))}
      </Box>
    )
  }

  // 터미널: 글자 한 칸에 위아래 두 픽셀 (▀ ▄ █)
  return (
    <Box flexDirection="column" width={size.w} height={size.h}>
      {pixelsToRows(px).map(row => (
        <Text>
          {row.map(([text, fg, bg]) =>
            bg === undefined ? (
              <Text color={fg}>{text}</Text>
            ) : (
              <Text color={fg} backgroundColor={bg} bold>
                {text}
              </Text>
            ),
          )}
        </Text>
      ))}
    </Box>
  )
}

export default Pet
