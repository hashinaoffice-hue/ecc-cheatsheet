export type Tab = 'fav' | 'all'

/** 펫 위치: 기준 자리(입력창 위 오른쪽 구석)에서 왼쪽으로 몇 칸, 위로 몇 줄 */
export type PetPos = { right: number; bottom: number }

/** 펫 그림 부품(Client)이 받는 값 */
export type PetProps = { pos: PetPos; max: PetPos; isOpen: boolean; isWorking: boolean }

/** 펫 그림 부품이 보내는 신호 */
export type PetMsg =
  | { type: 'click' }
  | { type: 'move'; right: number; bottom: number }
  | { type: 'drop'; right: number; bottom: number }

declare module 'claude-code' {
  interface PluginState {
    'ecc-cheatsheet': {
      tab: Shaped<Tab>
      query: Shaped<string>
      collapsed: Shaped<string[]>
      copied: Shaped<string>
      isOpen: Shaped<boolean>
      pos: Shaped<PetPos>
    }
  }
}
