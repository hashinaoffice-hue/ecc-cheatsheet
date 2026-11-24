// ECC 명령어 목록. [명령어, 설명, 자주 쓰는 것이면 true]
export type Command = { name: string; desc: string; star: boolean }
export type Category = { id: string; icon: string; title: string; commands: Command[] }

type Row = [string, string, boolean?]

const cat = (id: string, icon: string, title: string, rows: Row[]): Category => ({
  id,
  icon,
  title,
  commands: rows.map(([name, desc, star]) => ({ name: `/ecc:${name}`, desc, star: star === true })),
})

export const CATEGORIES: Category[] = [
  cat('setup', '🚀', '시작·설정', [
    ['ecc-guide', 'ECC 기능 안내서', true],
    ['project-init', '프로젝트에 ECC 설정 계획 세우기'],
    ['setup-pm', 'npm/pnpm/yarn/bun 선택'],
    ['pm2', '서버 실행 명령 만들기'],
    ['auto-update', 'ECC 최신 버전으로 업데이트'],
    ['aside', '작업 흐름 안 끊고 짧은 질문하기'],
  ]),
  cat('plan', '🗺️', '계획 세우기', [
    ['plan', '요구사항·위험·단계별 계획 (확인 전엔 코드 안 건드림)', true],
    ['plan-prd', '간단한 기획서(PRD) 작성', true],
    ['prp-prd', '질문 주고받으며 기획서 작성', true],
    ['prp-plan', '코드 분석 기반 상세 구현 계획', true],
    ['plan-canvas', '브라우저에서 계획 보며 메모·승인'],
    ['model-route', '작업에 맞는 모델 추천'],
  ]),
  cat('dev', '🛠️', '기능 개발', [
    ['orch-add-feature', '새 기능 (조사→계획→테스트→구현→리뷰→커밋)', true],
    ['orch-fix-defect', '버그 재현 테스트 후 수정', true],
    ['orch-change-feature', '기존 기능 동작 변경', true],
    ['orch-refine-code', '동작은 그대로, 코드만 정리', true],
    ['orch-build-mvp', '기획 문서로 첫 버전 만들기', true],
    ['feature-dev', '코드 이해 기반 기능 개발 가이드', true],
    ['prp-implement', '세운 계획을 검증하며 실행'],
    ['gan-build', '만들기↔평가 반복 구현 루프'],
  ]),
  cat('design', '🎨', '디자인·UI', [
    ['ui-canvas', '브라우저에서 UI 시안 직접 편집 후 코드로', true],
    ['gan-design', '디자인 반복 개선 루프', true],
  ]),
  cat('review', '🔍', '코드 리뷰', [
    ['code-review', '바꾼 코드나 PR 리뷰', true],
    ['react-review', 'React 코드 전용 리뷰', true],
    ['review-pr', '여러 에이전트로 PR 종합 리뷰', true],
    ['orch-review', '검증 거친 다각도 리뷰', true],
    ['santa-loop', '리뷰어 둘 다 승인할 때까지 반복'],
    ['astra-review', 'GPT로 교차 리뷰 (Codex CLI 필요)'],
  ]),
  cat('build', '🧱', '빌드 에러 해결', [
    ['build-fix', '빌드·타입 에러 최소 수정', true],
    ['react-build', 'React(Vite 등) 빌드 에러 수정', true],
  ]),
  cat('test', '🧪', '테스트·점검·정리', [
    ['react-test', 'React 테스트 먼저 작성(TDD)', true],
    ['test-coverage', '테스트 빠진 곳 보충', true],
    ['refactor-clean', '안 쓰는 코드 안전하게 삭제', true],
    ['security-scan', '보안 점검', true],
    ['quality-gate', '파일 하나 포맷 검사'],
    ['harness-audit', '저장소 준비 상태 점수표'],
  ]),
  cat('lang', '🌐', '언어·프레임워크별', [
    ['python-review', 'Python 코드 리뷰'],
    ['fastapi-review', 'FastAPI 코드 리뷰'],
    ['vue-review', 'Vue 코드 리뷰'],
    ['flutter-build', 'Flutter 빌드 에러 수정'],
    ['flutter-review', 'Flutter 코드 리뷰'],
    ['flutter-test', 'Flutter 테스트'],
    ['go-build', 'Go 빌드 에러 수정'],
    ['go-review', 'Go 코드 리뷰'],
    ['go-test', 'Go 테스트(TDD)'],
    ['rust-build', 'Rust 빌드 에러 수정'],
    ['rust-review', 'Rust 코드 리뷰'],
    ['rust-test', 'Rust 테스트(TDD)'],
    ['kotlin-build', 'Kotlin 빌드 에러 수정'],
    ['kotlin-review', 'Kotlin 코드 리뷰'],
    ['kotlin-test', 'Kotlin 테스트(TDD)'],
    ['gradle-build', 'Gradle(Android) 빌드 에러 수정'],
    ['cpp-build', 'C++ 빌드 에러 수정'],
    ['cpp-review', 'C++ 코드 리뷰'],
    ['cpp-test', 'C++ 테스트(TDD)'],
  ]),
  cat('marketing', '📣', '마케팅', [
    ['marketing-campaign', '포지셔닝·랜딩 문구·SNS·광고·영상 대본·일정 한 번에', true],
  ]),
  cat('docs', '📄', '문서', [
    ['update-docs', '문서를 코드에 맞게 갱신', true],
    ['update-codemaps', '프로젝트 구조 지도 만들기', true],
  ]),
  cat('session', '💾', '세션·비용', [
    ['save-session', '작업 상태 저장', true],
    ['resume-session', '저장한 작업 이어하기', true],
    ['checkpoint', '체크포인트 만들기', true],
    ['cost-report', '토큰 사용량 보고', true],
    ['sessions', '세션 기록 관리'],
    ['token-card', '토큰 사용량 카드 만들기'],
  ]),
  cat('git', '🌿', 'Git·GitHub·협업', [
    ['prp-commit', '말로 설명해서 커밋', true],
    ['pr', 'GitHub PR 만들기', true],
    ['prp-pr', 'PR 만들기 (PRP 흐름용)'],
    ['issue-review', 'GitHub 이슈 검토'],
    ['jira', 'Jira 티켓 조회·수정'],
    ['epic-claim', '에픽 맡기 (담당자 표시)'],
    ['epic-decompose', '에픽을 작은 작업으로 나누기'],
    ['epic-publish', '에픽 변경 내용 이슈에 올리기'],
    ['epic-review', '에픽 리뷰 요청·승인'],
    ['epic-sync', 'GitHub에서 에픽 정보 동기화'],
    ['epic-unblock', '막힌 에픽 다시 열기'],
    ['epic-validate', '에픽 준비 상태 검사'],
  ]),
  cat('multi', '🤝', '여러 모델 협업 (별도 런타임 필요)', [
    ['multi-plan', '여러 모델로 계획 세우기'],
    ['multi-backend', '백엔드 작업 여러 모델로'],
    ['multi-frontend', '프론트엔드 작업 여러 모델로'],
    ['multi-execute', '여러 모델 계획 실행'],
    ['multi-workflow', '조사→계획→실행→리뷰 전체 흐름'],
  ]),
  cat('loop', '🔁', '자동 반복 루프', [
    ['loop-start', '자동 반복 작업 준비'],
    ['loop-status', '루프 상태 확인'],
  ]),
  cat('learn', '🧠', '학습(instinct)', [
    ['learn', '이번 작업에서 배운 패턴 저장'],
    ['learn-eval', '배운 패턴 평가 후 저장'],
    ['instinct-status', '학습 내용 보기'],
    ['instinct-export', '학습 내용 내보내기'],
    ['instinct-import', '학습 내용 가져오기'],
    ['evolve', '학습 내용 발전시키기'],
    ['promote', '프로젝트 학습을 전체로 승격'],
    ['prune', '오래된 학습 정리'],
    ['projects', '프로젝트별 학습 보기'],
  ]),
  cat('hook', '🪝', '훅(자동 규칙)', [
    ['hookify', '하지 말아야 할 행동을 규칙으로 만들기'],
    ['hookify-configure', '규칙 켜기/끄기'],
    ['hookify-list', '규칙 목록'],
    ['hookify-help', '훅 도움말'],
  ]),
  cat('skill', '🧩', '스킬 관리', [
    ['skill-create', 'git 기록에서 스킬 만들기'],
    ['skill-health', '스킬 사용 현황 대시보드'],
    ['skill-host-compat', '스킬 호환성 검사'],
  ]),
]

export const ALL_COUNT = CATEGORIES.reduce((n, c) => n + c.commands.length, 0)
export const FAV_COUNT = CATEGORIES.reduce((n, c) => n + c.commands.filter(x => x.star).length, 0)
