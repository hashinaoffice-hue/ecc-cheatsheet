import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { EngineInterface } from 'claude-code'

import type { PetMsg, PetPos, Tab } from '../types'
import { ALL_COUNT, CATEGORIES, FAV_COUNT } from './commands'
import type { Category, Command } from './commands'
import { PET_H, PET_KEY, PET_W, START_POS, clampPos, isPos } from './pet-art'

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
// 펫: 패널이 열렸는지, 펫이 어디 있는지 (위치는 다음 세션을 위해 저장소에도 저장)
const isOpen = atom({ plugin: 'ecc-cheatsheet', key: 'isOpen' } as const, false, { shape: 'open-1' })
const pos = atom({ plugin: 'ecc-cheatsheet', key: 'pos' } as const, START_POS as PetPos, { shape: 'pos-1' })
const STORE_POS = 'petPos'

/** 펫을 누를 때: 열려 있으면 접고, 접혀 있으면 펼침 */
const toggle = async ($: EngineInterface) => {
  if (await read($, isOpen)) {
    await $.ui.close({ id: PANE })
    await update($, isOpen, () => false)
  } else {
    await $.ui.open(open)
    await update($, isOpen, () => true)
  }
}

const asMsg = (data: unknown): PetMsg | undefined => {
  if (typeof data !== 'object' || data === null) return undefined
  const m = data as PetMsg
  if (m.type === 'click') return m
  if ((m.type === 'move' || m.type === 'drop') && isPos(m)) return m
  return undefined
}

const matches = (c: Command, cat: Category, q: string) =>
  q === '' ||
  c.name.toLowerCase().includes(q) ||
  c.desc.toLowerCase().includes(q) ||
  cat.title.toLowerCase().includes(q)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'ecc-panel',
      description: 'ECC 명령어 패널 열기/닫기 (펫을 눌러도 돼요)',
    })
    // 시작할 땐 패널을 열지 않고 펫만 띄움. 지난번에 옮겨 둔 자리를 불러옴.
    const saved = await $.store.get(STORE_POS)
    if (isPos(saved)) await update($, pos, () => saved)
    await update($, isOpen, () => false)

    return next(e)
  })

  on('command.run', { command: 'ecc-panel' }, async $ => {
    await toggle($)

    return { text: (await read($, isOpen)) ? 'ECC 명령어 패널을 열었어요.' : 'ECC 명령어 패널을 접었어요.' }
  })

  // 패널의 ✕로 직접 닫아도 펫이 알아채도록
  on('ui.close', { id: PANE }, async ($, e, next) => {
    const done = await next(e)
    await update($, isOpen, () => false)

    return done
  })

  // 펫이 보내는 신호: 클릭 → 열기/닫기, 끌기 → 위치 이동, 놓기 → 위치 저장
  on('ui.message', async ($, e, next) => {
    if (e.element !== PET_KEY) return next(e)
    const msg = asMsg(e.data)
    if (msg === undefined) return {}
    if (msg.type === 'click') {
      await toggle($)
    } else {
      const where = { right: msg.right, bottom: msg.bottom }
      await update($, pos, () => where)
      if (msg.type === 'drop') await $.store.set(STORE_POS, where)
    }

    return {}
  })

  // 펫 그리기: 입력창 위 오른쪽 구석에 떠 있음
  on('ui.render', { component: 'BesidePrompt' }, async ($, e, next) => {
    if (e.surface !== 'terminal' && e.surface !== 'desktop') return next(e)
    const { Box, Client } = $.ui.resolve(e)
    const max = {
      right: Math.max(0, e.props.floatColumns - PET_W),
      bottom: Math.max(0, e.props.floatRows - PET_H),
    }
    const at = clampPos(await read($, pos), max)
    const props = { pos: at, max, isOpen: await read($, isOpen), isWorking: e.props.isWorking }

    return (
      <Box>
        <Box position="absolute" anchor="above" right={at.right} bottom={at.bottom}>
          <Client key={PET_KEY} module="./pet.tsx" width={PET_W} height={PET_H} props={props} />
        </Box>
      </Box>
    )
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
