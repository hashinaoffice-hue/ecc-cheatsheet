import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Tab } from '../types'
import { ALL_COUNT, CATEGORIES, FAV_COUNT } from './commands'
import type { Category, Command } from './commands'

const PANE = 'ecc-cheatsheet'
const TITLE = 'ECC 명령어'
const open = { id: PANE, title: TITLE, columns: 60 } as const

// 패널이 기억하는 값: 현재 탭, 검색어, 접힌 카테고리, 마지막으로 복사한 명령어
const tab = atom({ plugin: 'ecc-cheatsheet', key: 'tab' } as const, 'fav' as Tab, { shape: 'tab-1' })
const query = atom({ plugin: 'ecc-cheatsheet', key: 'query' } as const, '', { shape: 'query-1' })
const collapsed = atom({ plugin: 'ecc-cheatsheet', key: 'collapsed' } as const, [] as string[], {
  shape: 'collapsed-1',
})
const copied = atom({ plugin: 'ecc-cheatsheet', key: 'copied' } as const, '', { shape: 'copied-1' })

const matches = (c: Command, cat: Category, q: string) =>
  q === '' ||
  c.name.toLowerCase().includes(q) ||
  c.desc.toLowerCase().includes(q) ||
  cat.title.toLowerCase().includes(q)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'ecc-panel',
      description: 'ECC 명령어 패널 열기',
    })
    void $.ui.open(open)

    return next(e)
  })

  on('command.run', { command: 'ecc-panel' }, async $ => {
    await $.ui.open(open)

    return { text: 'ECC 명령어 패널을 열었어요.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button, Input } = $.ui.resolve(e)
    const nowTab = await read($, tab)
    const rawQuery = await read($, query)
    const q = rawQuery.trim().toLowerCase()
    const closed = await read($, collapsed)
    const last = await read($, copied)
    const isSearching = q !== ''

    const groups = CATEGORIES.map(cat => ({
      cat,
      list: cat.commands.filter(c => (nowTab === 'all' || c.star) && matches(c, cat, q)),
    })).filter(g => g.list.length > 0)
    const shown = groups.reduce((n, g) => n + g.list.length, 0)

    const toggle = (id: string) =>
      update($, collapsed, list => (list.includes(id) ? list.filter(x => x !== id) : [...list, id]))

    const copy = (c: Command) => async (press: { surface: Parameters<typeof $.ui.copy>[0]['surface'] }) => {
      const done = await $.ui.copy({ text: c.name, surface: press.surface })
      if (done.isCopied) {
        await update($, copied, () => c.name)
        $.ui.toast(`✓ 복사했어요: ${c.name}`)
      } else {
        $.ui.toast(`복사하지 못했어요 (${done.reason}). 직접 입력해 주세요: ${c.name}`)
      }
    }

    // ── 한 줄: 명령어(굵게·강조색) + 오른쪽 복사 버튼, 아래 줄: 설명(흐리게)
    const row = (c: Command) => {
      const isCopied = last === c.name

      return (
        <Box key={`row:${c.name}`} flexDirection="column" marginTop={1}>
          <Box flexDirection="row" justifyContent="space-between" gap={1}>
            <Box flexDirection="row" gap={1} flexShrink={1}>
              <Text bold mono color="suggestion" wrap="truncate-end">
                {c.name}
              </Text>
              {c.star && <Text color="warning">★</Text>}
            </Box>
            <Box flexShrink={0}>
              <Button
                key={`copy:${c.name}`}
                variant={isCopied ? 'primary' : 'secondary'}
                label={isCopied ? '✓ 복사됨' : '복사'}
                onPress={copy(c)}
              />
            </Box>
          </Box>
          <Text dimColor size="footnote" wrap="wrap">
            {'  '}
            {c.desc}
          </Text>
        </Box>
      )
    }

    // ── 카테고리 카드: 둥근 테두리 + 아이콘·제목·개수 머리글
    const card = (cat: Category, list: Command[]) => {
      const isOpen = isSearching || !closed.includes(cat.id) // 검색 중엔 항상 펼침

      return (
        <Box
          key={`cat:${cat.id}`}
          flexDirection="column"
          marginTop={1}
          paddingX={1}
          borderStyle="round"
          borderColor={isOpen ? 'claude' : 'subtle'}
          borderDimColor={!isOpen}
        >
          <Box flexDirection="row" justifyContent="space-between" gap={1}>
            <Button
              key={`head:${cat.id}`}
              plain
              label={`${isOpen ? '▾' : '▸'}  ${cat.icon}  ${cat.title}`}
              onPress={() => toggle(cat.id)}
            />
            <Text dimColor tabular>
              {list.length}개
            </Text>
          </Box>
          {isOpen && list.map(row)}
        </Box>
      )
    }

    return (
      <Box flexDirection="column" paddingX={1}>
        {/* ── 머리말 */}
        <Text bold size="heading" color="claude">
          📘 ECC 명령어 모음
        </Text>
        <Text dimColor size="caption">
          [복사]를 누르면 명령어가 클립보드에 들어가요 · 제목을 누르면 접혀요
        </Text>

        {/* ── 검색 */}
        <Box marginTop={1} borderStyle="round" borderColor="promptBorder" paddingX={1}>
          <Input
            key="search"
            label="검색"
            placeholder="예: 리뷰, test, plan"
            value={rawQuery}
            submitLabel="검색"
            onInput={value => update($, query, () => value)}
            onSubmit={value => update($, query, () => value)}
          />
        </Box>

        {/* ── 탭 + 전체 접기/펼치기 */}
        <Box flexDirection="row" justifyContent="space-between" flexWrap="wrap" gap={1} marginTop={1}>
          <Box flexDirection="row" gap={1}>
            <Button
              key="tab:fav"
              hotkey="1"
              variant={nowTab === 'fav' ? 'primary' : 'secondary'}
              dimColor={nowTab !== 'fav'}
              label={`★ 자주 쓰는 것 ${FAV_COUNT}`}
              onPress={() => update($, tab, () => 'fav' as Tab)}
            />
            <Button
              key="tab:all"
              hotkey="2"
              variant={nowTab === 'all' ? 'primary' : 'secondary'}
              dimColor={nowTab !== 'all'}
              label={`전체 ${ALL_COUNT}`}
              onPress={() => update($, tab, () => 'all' as Tab)}
            />
          </Box>
          <Box flexDirection="row" gap={1}>
            <Button key="expand-all" plain dimColor label="⊞ 펼치기" onPress={() => update($, collapsed, () => [])} />
            <Button
              key="collapse-all"
              plain
              dimColor
              label="⊟ 접기"
              onPress={() => update($, collapsed, () => CATEGORIES.map(c => c.id))}
            />
          </Box>
        </Box>

        {/* ── 검색 결과 안내 */}
        {isSearching && (
          <Box flexDirection="row" gap={1} marginTop={1}>
            <Text color="suggestion">
              “{rawQuery.trim()}” 검색 결과 {shown}개
            </Text>
            <Button key="clear" plain dimColor label="✕ 지우기" onPress={() => update($, query, () => '')} />
          </Box>
        )}
        {groups.length === 0 && (
          <Box marginTop={1} borderStyle="round" borderColor="subtle" paddingX={1} flexDirection="column">
            <Text>🔎 찾는 명령어가 없어요.</Text>
            <Text dimColor size="footnote">
              다른 단어로 검색하거나 [전체] 탭에서 찾아보세요.
            </Text>
          </Box>
        )}

        {groups.map(({ cat, list }) => card(cat, list))}
      </Box>
    )
  })
}
