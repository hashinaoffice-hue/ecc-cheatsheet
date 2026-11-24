export type Tab = 'fav' | 'all'

/** 펫 모드: 클래식 = 동작만, 캐주얼 = 동작 + 머리 위 연출 */
export type PetMode = 'classic' | 'casual'

/** 펫 그림 부품(Client)이 받는 값 */
export type PetProps = {
  isOpen: boolean
  isWorking: boolean
  /** 데스크톱은 색 상자로, 터미널은 반칸 블록 글자로 그림 */
  surface: 'terminal' | 'desktop'
  mode: PetMode
}

/** 펫 그림 부품이 보내는 신호: 눌렸어요 / 우클릭으로 모드를 바꿨어요 */
export type PetMsg = { type: 'click' } | { type: 'mode'; mode: PetMode }

declare module 'claude-code' {
  interface PluginState {
    'ecc-cheatsheet': {
      tab: Shaped<Tab>
      query: Shaped<string>
      collapsed: Shaped<string[]>
      copied: Shaped<string>
      isOpen: Shaped<boolean>
      mode: Shaped<PetMode>
    }
  }
}
