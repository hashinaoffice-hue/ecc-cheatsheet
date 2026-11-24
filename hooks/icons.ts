// 패널용 라인 아이콘 (24×24, 선 굵기 1.75, 둥근 끝). 데스크톱 앱에서 Svg로 그려요.
// 터미널은 그림을 그릴 수 없어서 아이콘 없이 글자로만 보여요.

/** 포인트 색: 클로드 주황(clay) / 보조 아이콘: 따뜻한 회색 — 밝은·어두운 테마 모두에서 보이는 중간 톤 */
export const ACCENT = '#D97757'
export const NEUTRAL = '#8C8A84'

const SHAPES = {
  // 패널 기본
  terminal: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7.5 9.5l3 2.5-3 2.5M13 15h3.5"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
  star: '<path d="M12 3.8l2.5 5.2 5.6.7-4.1 3.9 1 5.6-5-2.7-5 2.7 1-5.6-4.1-3.9 5.6-.7z"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r=".6"/><circle cx="4.5" cy="12" r=".6"/><circle cx="4.5" cy="18" r=".6"/>',
  copy: '<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  chevronRight: '<path d="M9.5 6l6 6-6 6"/>',
  chevronDown: '<path d="M6 9.5l6 6 6-6"/>',
  close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  unfold: '<path d="M7 15l5 5 5-5M7 9l5-5 5 5"/>',
  fold: '<path d="M7 20l5-5 5 5M7 4l5 5 5-5"/>',
  // 카테고리
  sliders:
    '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  map: '<path d="M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
  code: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5.5l-3 13"/>',
  pen: '<path d="M4.5 19.5l1-4.5L16 4.5l3.5 3.5L9 18.5z"/><path d="M13.5 7l3.5 3.5"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  wrench: '<path d="M14.5 4.2a4.5 4.5 0 0 0-5.3 5.9L4 15.3 8.7 20l5.2-5.2a4.5 4.5 0 0 0 5.9-5.3l-3 3-2.9-.6-.6-2.9z"/>',
  flask: '<path d="M9 3.5h6M10 3.5v6L5 18a2 2 0 0 0 1.7 3h10.6A2 2 0 0 0 19 18l-5-8.5v-6"/><path d="M7.5 15h9"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5z"/>',
  megaphone: '<path d="M4 10v4h3.5l7.5 4.5v-13L7.5 10z"/><path d="M18.5 9a4 4 0 0 1 0 6"/>',
  file: '<path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z"/><path d="M14 3.5v5h5M9 13h6M9 16.5h4"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  branch: '<circle cx="6.5" cy="5.5" r="2"/><circle cx="6.5" cy="18.5" r="2"/><circle cx="17.5" cy="7.5" r="2"/><path d="M6.5 7.5v9M17.5 9.5c0 3.5-2.5 5-6 5H8.5"/>',
  users: '<circle cx="9" cy="8.5" r="3.5"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9.5" r="2.5"/><path d="M16.5 14.5A5 5 0 0 1 21 20"/>',
  repeat: '<path d="M17 3.5l3 3-3 3M4 11.5V9.5a3 3 0 0 1 3-3h13M7 20.5l-3-3 3-3M20 12.5v2a3 3 0 0 1-3 3H4"/>',
  book: '<path d="M4 5.5a2 2 0 0 1 2-2h5V20H6a2 2 0 0 0-2 1.5zM20 5.5a2 2 0 0 0-2-2h-5V20h5a2 2 0 0 1 2 1.5z"/>',
  zap: '<path d="M13 3L5.5 13.5H11L10 21l7.5-10.5H12z"/>',
  layers: '<path d="M12 3.5l8.5 4.5-8.5 4.5L3.5 8z"/><path d="M3.5 12l8.5 4.5 8.5-4.5M3.5 16l8.5 4.5 8.5-4.5"/>',
} as const

export type IconName = keyof typeof SHAPES

/** 아이콘 SVG 문서. isFilled면 안을 채움 (별 표시 등) */
export const iconSvg = (name: IconName, color: string, isFilled = false): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${isFilled ? color : 'none'}" ` +
  `stroke="${color}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${SHAPES[name]}</svg>`
