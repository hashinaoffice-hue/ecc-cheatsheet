export type Tab = 'fav' | 'all'

declare module 'claude-code' {
  interface PluginState {
    'ecc-cheatsheet': {
      tab: Shaped<Tab>
      query: Shaped<string>
      collapsed: Shaped<string[]>
      copied: Shaped<string>
    }
  }
}
