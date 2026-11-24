// 떠 있는 펫: 짧게 누르면 패널 열기/닫기, 누른 채 끌면 이동.
import type { ClientModule, ClientPointerEvent, ClientSurface } from 'claude-code'

import type { PetMsg, PetPos, PetProps } from '../types'
import { ORANGE, PET_H, PET_W, clampPos, petRows } from './pet-art'
import type { Mood } from './pet-art'

type Drag = { grabX: number; grabY: number; base: PetPos; moved: boolean; last: PetPos }
type Ref = { props: PetProps; tick: number }
type State = { ref: Ref; look: string; hover: boolean; drag?: Drag }

const BLINK_EVERY = 15 // 틱(0.4초) 15번마다 한 번 깜빡

const moodOf = (s: State): Mood => {
  const { props, tick } = s.ref
  if (s.drag?.moved) return 'grab'
  if (props.isOpen) return 'happy'
  if (tick % BLINK_EVERY === 0) return 'blink'
  return props.isWorking ? 'work' : 'idle'
}
const isBounce = (s: State, reduced: boolean) =>
  !reduced && s.drag === undefined && s.ref.props.isWorking && s.ref.tick % 2 === 1
const lookOf = (s: State, reduced: boolean) => `${moodOf(s)}:${isBounce(s, reduced)}`

const send = (surface: ClientSurface<State>, msg: PetMsg) => surface.post(msg)

const onPointer = (surface: ClientSurface<State>, ev: ClientPointerEvent) => {
  const s = surface.state
  if (s === undefined) return
  const p = s.ref.props
  const d = s.drag

  if (ev.type === 'enter') return surface.setState({ ...s, hover: true })
  if (ev.type === 'leave') return surface.setState({ ...s, hover: false })

  if (ev.type === 'down') {
    if (ev.button !== undefined && ev.button !== 'left') return
    return surface.setState({
      ...s,
      drag: { grabX: ev.x, grabY: ev.y, base: p.pos, moved: false, last: p.pos },
    })
  }

  if (ev.type === 'move' && d !== undefined) {
    // 펫이 움직이면 영역도 같이 움직이므로, 처음 잡았던 자리 기준 좌표로 되돌려 계산
    const absX = ev.x - (p.pos.right - d.base.right)
    const absY = ev.y - (p.pos.bottom - d.base.bottom)
    const dx = absX - d.grabX
    const dy = absY - d.grabY
    const moved = d.moved || Math.abs(dx) >= 1 || Math.abs(dy) >= 1
    if (!moved) return
    const target = clampPos({ right: d.base.right - dx, bottom: d.base.bottom - dy }, p.max)
    if (target.right !== d.last.right || target.bottom !== d.last.bottom) {
      send(surface, { type: 'move', ...target })
    }
    return surface.setState({ ...s, drag: { ...d, moved: true, last: target } })
  }

  if (ev.type === 'up' && d !== undefined) {
    send(surface, d.moved ? { type: 'drop', ...d.last } : { type: 'click' })
    surface.setState({ ...s, drag: undefined })
  }
}

const Pet: ClientModule<PetProps, State> = (props, surface) => {
  const { Box, Text } = surface.elements
  let s = surface.state

  if (s === undefined) {
    // 처음 한 번만: 타이머·마우스·키보드 연결
    const ref: Ref = { props, tick: 1 }
    s = { ref, look: '', hover: false }
    surface.every(400, () => {
      const now = surface.state
      if (now === undefined || !surface.isWindowFocused) return
      now.ref.tick += 1
      const look = lookOf(now, surface.isMotionReduced)
      if (look !== now.look) surface.setState({ ...now, look })
    })
    surface.onPointer(ev => onPointer(surface, ev))
    surface.onKey(ev => {
      if (ev.key === 'return' || ev.key === ' ' || ev.key === 'space') send(surface, { type: 'click' })
    })
    surface.setState(s)
  }
  s.ref.props = props

  const mood = moodOf(s)
  const bounce = isBounce(s, surface.isMotionReduced)
  const tip = s.drag?.moved ? '' : props.isOpen ? '접기' : '명령어'

  return (
    <Box flexDirection="column" width={PET_W} height={PET_H} alignItems="center">
      {s.hover && tip !== '' ? (
        <Text color="#FFFFFF" backgroundColor={ORANGE} bold>
          {` ${tip} `}
        </Text>
      ) : (
        <Text> </Text>
      )}
      <Box flexDirection="column" paddingTop={bounce ? 0 : 1}>
        {petRows(mood, bounce).map(row => (
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
    </Box>
  )
}

export default Pet
