import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { EngineInterface } from 'claude-code'

import type { PetMode, PetMsg, Tab } from '../types'
import { ALL_COUNT, CATEGORIES, FAV_COUNT } from './commands'
import type { Category, Command } from './commands'
import { ACCENT, BROWN, CREAM, NEUTRAL, iconSvg } from './icons'
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

// 펫 숨김 (다음 세션에도 기억) · 다시 불러온 횟수 (바뀌면 펫을 새로 그림)
const isPetHidden = atom({ plugin: 'ecc-cheatsheet', key: 'isPetHidden' } as const, false, { shape: 'hidden-1' })
const summon = atom({ plugin: 'ecc-cheatsheet', key: 'summon' } as const, 0, { shape: 'summon-1' })
const STORE_HIDDEN = 'petHidden'
const HIDE_WORDS = ['숨기기', '숨김', '끄기', 'hide', 'off']

const asMsg = (data: unknown): PetMsg | undefined => {
  if (typeof data !== 'object' || data === null) return undefined
  const m = data as PetMsg
  if (m.type === 'click') return m
  if (m.type === 'mode' && isMode(m.mode)) return m
  return undefined
}

// ── 검색창 폭 맞추기
// 데스크톱 앱의 입력칸은 폭 설정이 없고 안내 문구 길이에 맞춰 넓어져요.
// 그래서 안내 문구 뒤에 보이지 않는 공백(U+2007, 숫자 폭 공백)을 패널 남는 폭만큼 붙여서
// 패널 폭이 바뀔 때마다 입력칸이 함께 늘어나고 줄어들게 해요.
const PLACEHOLDER = '명령어나 설명으로 검색'
const FIGURE_SPACE = ' '
/** 글자 폭(칸): 한글·한자 등 넓은 글자는 2칸, 나머지는 1칸 */
const textColumns = (s: string) => [...s].reduce((n, ch) => n + (/[ᄀ-ᇿ　-鿿가-힯]/.test(ch) ? 2 : 1), 0)
/** 패널 안쪽 여백(4) + 돋보기와 간격(3) + ↵ 버튼(5) + 입력칸 자체 여백(2) */
const SEARCH_CHROME = 14
const fillPlaceholder = (text: string, bodyColumns: number) =>
  text + FIGURE_SPACE.repeat(Math.max(0, Math.floor(bodyColumns - SEARCH_CHROME - textColumns(text))))

/** 데스크톱 단위를 픽셀로: 세로 1단위 = 10px, 가로 1단위 = 7px (캡처를 재서 확인한 값).
 *  간격을 늘 정수 픽셀로 맞춰야 구분선이 두 픽셀에 걸쳐 2px로 번져 보이지 않음 */
const PX_V = 1 / 10
const PX_H = 1 / 7

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
    await $.command.register({
      name: 'ecc-pet',
      description: '펫 다시 불러오기 · "/ecc-pet 숨기기"로 숨기기',
      argumentHint: '[숨기기]',
    })
    const savedMode = await $.store.get(STORE_MODE)
    if (isMode(savedMode)) await update($, mode, () => savedMode)
    if ((await $.store.get(STORE_HIDDEN)) === true) await update($, isPetHidden, () => true)
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

  // /ecc-pet: 펫 다시 불러오기 (숨겼으면 다시 보이고, 떠 있어도 새로 그림) · /ecc-pet 숨기기
  on('command.run', { command: 'ecc-pet' }, async ($, e) => {
    if (HIDE_WORDS.includes((e.args ?? '').trim().toLowerCase())) {
      await update($, isPetHidden, () => true)
      await $.store.set(STORE_HIDDEN, true)

      return { text: '펫을 숨겼어요. /ecc-pet 을 입력하면 다시 불러와요. 패널은 /ecc-panel 로 열 수 있어요.' }
    }
    await update($, isPetHidden, () => false)
    await $.store.set(STORE_HIDDEN, false)
    await update($, summon, n => n + 1)

    // 펫은 데스크톱 앱 Code 탭과 터미널(전체화면)에서만 그려짐
    const surfaces = await $.session.surfaces()
    if (!surfaces.some(s => s === 'desktop' || s === 'terminal')) {
      return {
        text:
          '펫을 다시 불렀지만, 지금 보고 있는 화면은 펫을 그릴 수 없는 곳이에요 ' +
          '(펫은 데스크톱 앱 Code 탭과 터미널 전체화면에서 보여요). 명령어 패널은 /ecc-panel 로 열 수 있어요.',
      }
    }

    return { text: '펫을 다시 불렀어요! 입력창 위 오른쪽 구석을 보세요.' }
  })

  // 패널의 ✕로 직접 닫아도 펫이 알아채도록
  on('ui.close', { id: PANE }, async ($, e, next) => {
    const done = await next(e)
    await update($, isOpen, () => false)

    return done
  })

  // 펫이 눌리면 패널 열기/닫기, 우클릭하면 모드 바꾸기
  on('ui.message', async ($, e, next) => {
    // 펫 부품 이름은 'ecc-pet:불러온 횟수' (다시 불러오면 이름이 바뀌어 새로 그려짐)
    if (!e.element.startsWith(PET_KEY)) return next(e)
    const msg = asMsg(e.data)
    if (msg?.type === 'click') await toggle($)
    else if (msg?.type === 'mode') await setMode($, msg.mode)

    return {}
  })

  // 펫 그리기: 입력창 위 오른쪽 구석에 딱 붙어 떠 있음 (여백 없음)
  on('ui.render', { component: 'BesidePrompt' }, async ($, e, next) => {
    if (e.surface !== 'terminal' && e.surface !== 'desktop') return next(e)
    if (await read($, isPetHidden)) return next(e) // /ecc-pet 숨기기 로 숨겨 둔 상태
    const { Box, Client } = $.ui.resolve(e)
    const size = petSize(e.surface)
    const n = await read($, summon)
    const props = {
      isOpen: await read($, isOpen),
      isWorking: e.props.isWorking,
      surface: e.surface,
      mode: await read($, mode),
      summon: n,
    }

    return (
      <Box>
        <Box position="absolute" anchor="above" right={INSET[e.surface]} bottom={0}>
          {/* 다시 불러올 때마다 이름(key)이 바뀌어 펫이 처음부터 새로 그려짐 */}
          <Client
            key={n === 0 ? PET_KEY : `${PET_KEY}:${n}`}
            module="./pet.tsx"
            width={size.w}
            height={size.h}
            props={props}
          />
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
    const row = (c: Command, marginTop: number = 1) => {
      const isCopied = last === c.name
      const short = c.name.replace(/^\/ecc:/, '')
      const copyButton = (
        <Button key={`copy:${c.name}`} plain onPress={copy(c)}>
          <Text color={isCopied ? 'claude' : undefined} bold={isCopied}>
            {isCopied ? '✓' : '⧉'}
          </Text>
        </Button>
      )

      return (
        <Box key={`row:${c.name}`} flexDirection="column" marginTop={marginTop}>
          {/* 데스크톱은 상자가 깊게 겹치면 줄이 사라질 때가 있어서, 한 줄에 전부 나란히 놓음 */}
          <Box flexDirection="row" alignItems="center">
            <Text mono color="inactive">
              /ecc:
            </Text>
            <Text mono weight="semibold" bold>
              {short}
            </Text>
            {c.star && <Text> </Text>}
            {c.star && (Svg === undefined ? <Text color="claude">★</Text> : icon('star', ACCENT, 10, true))}
            {/* 복사 아이콘: 명령어 이름 줄 오른쪽 끝 (이름 글자와 같은 높이) */}
            <Box flexGrow={1} />
            {copyButton}
          </Box>
          <Text size="footnote" wrap="wrap">
            {c.desc}
          </Text>
        </Box>
      )
    }

    // ── 카테고리: 갈색 둥근 테두리 카드 + 맨 위 갈색 머리글 바 + 아래로 명령어 줄
    //    머리글 바 = 펼침 표시 · 라인 아이콘(크림색) · 제목 · 개수
    //    데스크톱은 테두리 안쪽에 틈을 두므로 바를 바깥으로 당겨 테두리에 붙이고,
    //    overflow="hidden"으로 둥근 테두리 밖으로 나간 바의 네모 모서리를 잘라 라운드 컬러바로 만듦
    const isDesk = e.surface === 'desktop'
    const card = (cat: Category, list: Command[]) => {
      const isOpen = isSearching || !closed.includes(cat.id) // 검색 중엔 항상 펼침

      return (
        <Box
          key={`cat:${cat.id}`}
          flexDirection="column"
          // 카드와 카드 사이 = 카드 안 줄 간격(약 16px)과 같게
          marginTop={isDesk ? 1.5 : 1}
          borderStyle="round"
          borderColor={BROWN}
          overflow="hidden"
          // 데스크톱: 카드 바탕을 갈색으로 → 둥근 모서리 틈이 흰색 대신 갈색과 섞여 보이지 않음
          backgroundColor={isDesk ? BROWN : undefined}
        >
          <Box
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
            gap={1}
            // 간격 통일: 왼쪽 ▾ 는 아래 명령어 이름과 같은 세로선, 오른쪽 개수는 아래 ⧉ 와 같은 세로선
            // (버튼은 자체 안쪽 여백이 있어서 왼쪽·오른쪽 값을 다르게 줘서 맞춤)
            // 왼쪽 ▾ 는 아래 명령어 이름과, 오른쪽 개수는 아래 ⧉ 와 같은 세로선 (목록과 같은 만큼 이동)
            paddingLeft={isDesk ? 1.5 - 2 * PX_H : 2}
            paddingRight={isDesk ? 2.5 + 1 * PX_H : 2}
            // 위아래 여백 약 16px (데스크톱 1줄 ≈ 14px → 1.1줄 ≈ 15.4px + 글자 상자 여유 ≈ 16px)
            paddingY={isDesk ? 1.1 : 0}
            // 넉넉히 바깥으로 당겨 테두리와의 틈을 없앰. 넘친 부분은 카드의 overflow="hidden"이 둥글게 잘라 냄
            marginX={isDesk ? -2.5 : 0}
            marginTop={isDesk ? -1.5 : 0}
            backgroundColor={BROWN}
          >
            <Box flexDirection="row" alignItems="center" gap={1}>
              {/* 접기/펼치기 버튼 (버튼 글자는 앱 기본색이라, 제목은 따로 크림색 글자로) */}
              <Button key={`head:${cat.id}`} plain label={isOpen ? '▾' : '▸'} onPress={() => toggleCat(cat.id)} />
              {icon(cat.icon, CREAM, 15)}
              <Text bold weight="semibold" color={CREAM}>
                {cat.title}
              </Text>
            </Box>
            <Text color={CREAM} tabular size="caption">
              {list.length}개
            </Text>
          </Box>
          {isOpen &&
            (isDesk ? (
              // 데스크톱: 명령어 목록은 앱 배경과 같은 색(inverseText: 밝은 테마 흰색, 어두운 테마 검정)으로 칠하고,
              // 테두리 안쪽 틈까지 덮도록 바깥으로 당김 (넘친 부분은 카드가 둥글게 잘라 냄)
              <Box
                flexDirection="column"
                backgroundColor="inverseText"
                marginX={-2.5}
                marginBottom={-1.5}
                // 간격 통일: 왼쪽 글자와 오른쪽 ⧉ 모두 카드 테두리에서 같은 거리(약 16px)
                // 좌우 여백: 글자·복사 아이콘 모두 카드 테두리에서 16px (측정: 왼쪽 18→16, 오른쪽 15→16)
                paddingLeft={2.5 - 2 * PX_H}
                paddingRight={1.5 + 1 * PX_H}
                // 마지막 설명 ↓ 카드 아래 테두리 = 16px (측정 20px → 4px 줄임)
                paddingBottom={1.4}
              >
                {/* 문단 사이: 설명 ↓15px · 1px 구분선 · ↓15px 다음 이름
                    (글자 상자 안 여유: 설명 아래 2px, 이름 위 4px → 간격 13px · 11px)
                    구분선 양 끝도 카드 테두리에서 16px */}
                {list.map((c, i) => [
                  i > 0 ? (
                    <Box
                      key={`div:${c.name}`}
                      height={PX_V}
                      marginTop={13 * PX_V}
                      marginLeft={2 * PX_H}
                      marginRight={6 * PX_H}
                      backgroundColor="promptBorder"
                    />
                  ) : null,
                  row(c, i > 0 ? 11 * PX_V : 1),
                ])}
              </Box>
            ) : (
              <Box flexDirection="column" paddingX={2}>
                {list.map(row)}
              </Box>
            ))}
        </Box>
      )
    }

    // ── 글자 탭 (B안): 지금 보는 탭은 진하게 + 아래 갈색 밑줄, 다른 탭은 흐리게
    //    데스크톱은 얇은 갈색 막대로 밑줄, 터미널은 칸 단위라 진한 버튼(primary)으로 표시
    // 아이콘 버튼: 데스크톱은 라인 아이콘 위에 투명한 버튼을 겹쳐서 아이콘을 누르면 동작하게,
    // 아이콘을 못 그리는 화면(터미널)은 기호 버튼으로
    const iconButton = (key: string, name: IconName, title: string, glyph: string, onPress: () => unknown) =>
      Svg === undefined ? (
        <Button key={key} plain dimColor label={glyph} onPress={onPress} />
      ) : (
        <Box key={`${key}:wrap`} width={2} height={1} alignItems="center" justifyContent="center">
          {icon(name, NEUTRAL, 15)}
          <Box position="absolute" top={0} left={0} width={2} height={1}>
            <Button key={key} plain label={' '} hover={{ dimColor: true }} onPress={onPress} />
          </Box>
        </Box>
      )

    const tabButton = (id: Tab, label: string, count: number) => {
      const isNow = nowTab === id
      // 지금 보는 탭은 누를 필요가 없으니 굵은 글자로 (버튼 글자는 굵기를 못 바꿈), 다른 탭만 버튼
      // 글자들은 묶지 않고 한 줄 상자에 바로 나란히 (묶으면 데스크톱이 위아래로 쌓음)
      const isBold = isNow && isDesk

      return (
        <Box key={`tabwrap:${id}`} flexDirection="column">
          <Box flexDirection="row" alignItems="center" gap={1}>
            {icon(id === 'fav' ? 'star' : 'list', isNow ? ACCENT : NEUTRAL, 13, id === 'fav' && isNow)}
            {isBold && (
              <Text weight="semibold" bold wrap="truncate-end">
                {label}
              </Text>
            )}
            {isBold && <Text color="inactive">{count}</Text>}
            {!isBold && (
              <Button
                key={`tab:${id}`}
                plain={isDesk ? true : undefined}
                variant={!isDesk && isNow ? 'primary' : undefined}
                dimColor={!isNow}
                label={`${label} ${count}`}
                onPress={() => update($, tab, () => id)}
              />
            )}
          </Box>
          {isDesk && <Box height={0.15} marginTop={0.35} backgroundColor={isNow ? BROWN : undefined} />}
        </Box>
      )
    }

    return (
      <Box flexDirection="column" paddingX={2}>
        {/* ── 머리말: 제목 한 줄 + 오른쪽 작은 안내 */}
        <Box flexDirection="row" alignItems="center" gap={1}>
          {icon('terminal', ACCENT, 18)}
          <Text size="heading" weight="semibold">
            ECC 명령어
          </Text>
          <Box flexGrow={1} />
          <Text color="inactive" size="caption">
            ⧉ 누르면 복사
          </Text>
        </Box>

        {/* ── 검색: 앱 기본 입력칸 (한글 조합 입력은 앱 입력칸만 받을 수 있음 —
               직접 그린 검색창은 키를 하나씩만 받아서 한글이 안 쳐졌음. 폭과 ↵ 버튼은 앱이 정함) */}
        <Box marginTop={1} flexDirection="row" alignItems="center" gap={1}>
          {icon('search', NEUTRAL, 14)}
          <Input
            key="search"
            label={Svg === undefined ? '검색' : undefined}
            placeholder={isDesk ? fillPlaceholder(PLACEHOLDER, e.props.bodyColumns) : PLACEHOLDER}
            value={rawQuery}
            submitLabel="↵"
            onInput={value => update($, query, () => value)}
            onSubmit={value => update($, query, () => value)}
          />
        </Box>

        {/* ── 글자 탭 + 오른쪽 모두 펼치기(⇊)/모두 접기(⇈) + 아래 얇은 구분선
               펼치기·접기는 탭 글자와 같은 높이가 되도록 밑줄 자리만큼 아래 여백을 줌 */}
        <Box flexDirection="row" alignItems="flex-end" gap={2} marginTop={1}>
          {tabButton('fav', '자주 쓰는 것', FAV_COUNT)}
          {tabButton('all', '전체', ALL_COUNT)}
          <Box flexGrow={1} />
          <Box flexDirection="row" alignItems="center" gap={2} paddingBottom={isDesk ? 0.5 : 0}>
            {iconButton('expand-all', 'unfold', '모두 펼치기', '⇊', () => update($, collapsed, () => []))}
            {iconButton('collapse-all', 'fold', '모두 접기', '⇈', () =>
              update($, collapsed, () => CATEGORIES.map(c => c.id)),
            )}
          </Box>
        </Box>
        {isDesk && <Box height={0.05} backgroundColor="promptBorder" />}

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
