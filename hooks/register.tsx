import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { EngineInterface } from 'claude-code'

import type { PetMode, PetMsg, Tab } from '../types'
import { ALL_COUNT, CATEGORIES, FAV_COUNT } from './commands'
import type { Category, Command } from './commands'
import { ACCENT, NEUTRAL, iconSvg } from './icons'
import type { IconName } from './icons'
import { PET_KEY, petSize } from './pet-art'

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
// 펫: 패널이 열렸는지
const isOpen = atom({ plugin: 'ecc-cheatsheet', key: 'isOpen' } as const, false, { shape: 'open-1' })

/** 펫을 누를 때: 열려 있으면 접고, 접혀 있으면 펼침. 상태를 먼저 바꿔서 펫이 바로 따라오게 함. */
const toggle = async ($: EngineInterface) => {
  const wasOpen = await read($, isOpen)
  await update($, isOpen, () => !wasOpen)
  if (wasOpen) await $.ui.close({ id: PANE })
  else await $.ui.open(open)
}

// 펫을 오른쪽 끝에서 안쪽으로 들이는 칸 수: 데스크톱은 입력창 테두리 안쪽에 들어오도록
const INSET = { desktop: 4.5, terminal: 1 } as const

// 펫 모드 (다음 세션에도 기억)
const mode = atom({ plugin: 'ecc-cheatsheet', key: 'mode' } as const, 'casual' as PetMode, { shape: 'mode-1' })
const STORE_MODE = 'petMode'
const MODE_NAME: Record<PetMode, string> = { classic: '클래식 모드 (동작만)', casual: '캐주얼 모드 (동작 + 연출)' }
const isMode = (v: unknown): v is PetMode => v === 'classic' || v === 'casual'

const setMode = async ($: EngineInterface, next: PetMode) => {
  await update($, mode, () => next)
  await $.store.set(STORE_MODE, next)
  $.ui.toast(`펫: ${MODE_NAME[next]}`)
}

const asMsg = (data: unknown): PetMsg | undefined => {
  if (typeof data !== 'object' || data === null) return undefined
  const m = data as PetMsg
  if (m.type === 'click') return m
  if (m.type === 'mode' && isMode(m.mode)) return m
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
    await $.command.register({
      name: 'ecc-pet-mode',
      description: '펫 모드 바꾸기: 클래식(동작만) ↔ 캐주얼(동작 + 연출). 펫을 우클릭해도 돼요',
    })
    const savedMode = await $.store.get(STORE_MODE)
    if (isMode(savedMode)) await update($, mode, () => savedMode)
    // 시작할 땐 패널을 열지 않고 펫만 띄움
    await update($, isOpen, () => false)

    return next(e)
  })

  on('command.run', { command: 'ecc-panel' }, async $ => {
    await toggle($)

    return { text: (await read($, isOpen)) ? 'ECC 명령어 패널을 열었어요.' : 'ECC 명령어 패널을 접었어요.' }
  })

  on('command.run', { command: 'ecc-pet-mode' }, async $ => {
    const next: PetMode = (await read($, mode)) === 'casual' ? 'classic' : 'casual'
    await setMode($, next)

    return { text: `펫을 ${MODE_NAME[next]}로 바꿨어요.` }
  })

  // 패널의 ✕로 직접 닫아도 펫이 알아채도록
  on('ui.close', { id: PANE }, async ($, e, next) => {
    const done = await next(e)
    await update($, isOpen, () => false)

    return done
  })

  // 펫이 눌리면 패널 열기/닫기, 우클릭하면 모드 바꾸기
  on('ui.message', async ($, e, next) => {
    if (e.element !== PET_KEY) return next(e)
    const msg = asMsg(e.data)
    if (msg?.type === 'click') await toggle($)
    else if (msg?.type === 'mode') await setMode($, msg.mode)

    return {}
  })

  // 펫 그리기: 입력창 위 오른쪽 구석에 딱 붙어 떠 있음 (여백 없음)
  on('ui.render', { component: 'BesidePrompt' }, async ($, e, next) => {
    if (e.surface !== 'terminal' && e.surface !== 'desktop') return next(e)
    const { Box, Client } = $.ui.resolve(e)
    const size = petSize(e.surface)
    const props = {
      isOpen: await read($, isOpen),
      isWorking: e.props.isWorking,
      surface: e.surface,
      mode: await read($, mode),
    }

    return (
      <Box>
        <Box position="absolute" anchor="above" right={INSET[e.surface]} bottom={0}>
          <Client key={PET_KEY} module="./pet.tsx" width={size.w} height={size.h} props={props} />
        </Box>
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const els = $.ui.resolve(e)
    const { Box, Text, Button, Input } = els
    // 데스크톱·VS Code·모바일은 라인 아이콘(Svg), 터미널은 아이콘 없이 글자로
    const Svg = 'Svg' in els ? els.Svg : undefined
    const icon = (name: IconName, color: string = NEUTRAL, size = 14, isFilled = false) =>
      Svg === undefined ? null : (
        <Svg source={iconSvg(name, color, isFilled)} alt={name} width={size} height={size} />
      )

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

    const toggleCat = (id: string) =>
      update($, collapsed, list => (list.includes(id) ? list.filter(x => x !== id) : [...list, id]))

    const copy = (c: Command) => async (press: { surface: Parameters<typeof $.ui.copy>[0]['surface'] }) => {
      const done = await $.ui.copy({ text: c.name, surface: press.surface })
      if (done.isCopied) {
        await update($, copied, () => c.name)
        $.ui.toast(`복사했어요: ${c.name}`)
      } else {
        $.ui.toast(`복사하지 못했어요 (${done.reason}). 직접 입력해 주세요: ${c.name}`)
      }
    }

    // ── 명령어 한 줄 (가장 중요): 이름은 굵게, 공통 접두어 /ecc: 는 회색
    //    오른쪽 끝에 복사 아이콘 버튼 / 아래 줄 설명은 작게, 하지만 또렷한 기본 글자색
    const row = (c: Command) => {
      const isCopied = last === c.name
      const short = c.name.replace(/^\/ecc:/, '')

      return (
        <Box key={`row:${c.name}`} flexDirection="column" marginTop={1}>
          <Box flexDirection="row" justifyContent="space-between" alignItems="center" gap={1}>
            <Box flexDirection="row" alignItems="center" gap={1} flexShrink={1}>
              <Text mono wrap="truncate-end">
                <Text color="inactive">/ecc:</Text>
                <Text weight="semibold" bold>
                  {short}
                </Text>
              </Text>
              {c.star && (Svg === undefined ? <Text color="claude">★</Text> : icon('star', ACCENT, 10, true))}
            </Box>
            <Box flexShrink={0}>
              <Button key={`copy:${c.name}`} plain onPress={copy(c)}>
                <Text color={isCopied ? 'claude' : undefined} bold={isCopied}>
                  {isCopied ? '✓' : '⧉'}
                </Text>
              </Button>
            </Box>
          </Box>
          <Text size="footnote" wrap="wrap">
            {c.desc}
          </Text>
        </Box>
      )
    }

    // ── 카테고리: 얇은 테두리 카드, 머리글 = 펼침 표시 · 라인 아이콘 · 제목 · 개수
    const card = (cat: Category, list: Command[]) => {
      const isOpen = isSearching || !closed.includes(cat.id) // 검색 중엔 항상 펼침

      return (
        <Box
          key={`cat:${cat.id}`}
          flexDirection="column"
          marginTop={1}
          paddingX={2}
          borderStyle="round"
          borderColor="promptBorder"
          borderDimColor={!isOpen}
        >
          <Box flexDirection="row" justifyContent="space-between" alignItems="center" gap={1}>
            <Box flexDirection="row" alignItems="center" gap={1}>
              {Svg === undefined ? (
                <Text dimColor>{isOpen ? '▾' : '▸'}</Text>
              ) : (
                icon(isOpen ? 'chevronDown' : 'chevronRight', NEUTRAL, 12)
              )}
              {icon(cat.icon, ACCENT, 15)}
              <Button key={`head:${cat.id}`} plain onPress={() => toggleCat(cat.id)}>
                <Text weight="semibold" bold color={isOpen ? 'claude' : 'inactive'}>
                  {cat.title}
                </Text>
              </Button>
            </Box>
            <Text color="inactive" tabular size="caption">
              {list.length}개
            </Text>
          </Box>
          {isOpen && list.map(row)}
        </Box>
      )
    }

    const tabButton = (id: Tab, label: string, count: number, hotkey: string) => (
      <Box flexDirection="row" alignItems="center" gap={1}>
        {icon(id === 'fav' ? 'star' : 'list', nowTab === id ? ACCENT : NEUTRAL, 13, id === 'fav' && nowTab === id)}
        <Button
          key={`tab:${id}`}
          hotkey={hotkey}
          variant={nowTab === id ? 'primary' : 'secondary'}
          dimColor={nowTab !== id}
          label={`${label} ${count}`}
          onPress={() => update($, tab, () => id)}
        />
      </Box>
    )

    return (
      <Box flexDirection="column" paddingX={2}>
        {/* ── 머리말 */}
        <Box flexDirection="row" alignItems="center" gap={1}>
          {icon('terminal', ACCENT, 18)}
          <Text size="heading" weight="semibold">
            ECC 명령어
          </Text>
        </Box>
        <Text color="inactive" size="caption">
          {ALL_COUNT}개 명령어 · ⧉ 를 누르면 복사돼요
        </Text>

        {/* ── 검색 */}
        <Box
          marginTop={1}
          flexDirection="row"
          alignItems="center"
          gap={1}
          borderStyle="round"
          borderColor="promptBorder"
          paddingX={2}
        >
          {icon('search', NEUTRAL, 14)}
          <Input
            key="search"
            label={Svg === undefined ? '검색' : undefined}
            placeholder="명령어나 설명으로 검색"
            value={rawQuery}
            submitLabel="검색"
            onInput={value => update($, query, () => value)}
            onSubmit={value => update($, query, () => value)}
          />
        </Box>

        {/* ── 탭 + 모두 펼치기/접기 */}
        <Box flexDirection="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} marginTop={1}>
          <Box flexDirection="row" alignItems="center" gap={1}>
            {tabButton('fav', '자주 쓰는 것', FAV_COUNT, '1')}
            {tabButton('all', '전체', ALL_COUNT, '2')}
          </Box>
          <Box flexDirection="row" alignItems="center" gap={1}>
            {icon('unfold', NEUTRAL, 12)}
            <Button key="expand-all" plain dimColor label="펼치기" onPress={() => update($, collapsed, () => [])} />
            {icon('fold', NEUTRAL, 12)}
            <Button
              key="collapse-all"
              plain
              dimColor
              label="접기"
              onPress={() => update($, collapsed, () => CATEGORIES.map(c => c.id))}
            />
          </Box>
        </Box>

        {/* ── 검색 결과 안내 */}
        {isSearching && (
          <Box flexDirection="row" alignItems="center" gap={1} marginTop={1}>
            <Text size="footnote">
              “{rawQuery.trim()}” 결과 <Text color="claude">{shown}</Text>개
            </Text>
            {icon('close', NEUTRAL, 11)}
            <Button key="clear" plain dimColor label="지우기" onPress={() => update($, query, () => '')} />
          </Box>
        )}
        {groups.length === 0 && (
          <Box marginTop={1} borderStyle="round" borderColor="promptBorder" paddingX={2} flexDirection="column">
            <Box flexDirection="row" alignItems="center" gap={1}>
              {icon('search', NEUTRAL, 14)}
              <Text>찾는 명령어가 없어요.</Text>
            </Box>
            <Text dimColor size="footnote">
              다른 단어로 검색하거나 전체 탭에서 찾아보세요.
            </Text>
          </Box>
        )}

        {groups.map(({ cat, list }) => card(cat, list))}
      </Box>
    )
  })
}
