# ECC 명령어 패널 (ecc-cheatsheet)

Claude Code 화면 옆에 ECC 플러그인 명령어 99개를 카테고리별로 띄워 두는 패널 모드입니다.
작업하면서 필요한 명령어를 찾아 바로 복사해 쓸 수 있어요.

- ★ 자주 쓰는 것 / 전체 탭
- 검색창 (명령어 이름·설명·카테고리로 찾기)
- 카테고리 접기·펼치기
- 명령어마다 [복사] 버튼

## 설치

터미널에서 Claude Code를 실행한 뒤 프롬프트에 입력하세요:

```
/plugin install ecc-cheatsheet --marketplace hashinaoffice-hue/ecc-cheatsheet
```

`Add marketplace?`가 나오면 `y`, 설치 범위는 맨 위(user)를 고르고 Enter를 누르면 됩니다.

셸에서 설치하려면:

```bash
claude plugin install ecc-cheatsheet --marketplace hashinaoffice-hue/ecc-cheatsheet
```

데스크톱 앱(`/plugin`이 안 되는 곳)에서는: 입력창 옆 **+** → **Plugins** → **Add marketplace**에 `hashinaoffice-hue/ecc-cheatsheet` 입력 → **Add plugin**.

## 사용법

세션이 시작되면 패널이 자동으로 열립니다. 닫았다면 `/ecc-panel`로 다시 열 수 있어요.

자주 쓰는 명령어(★)를 바꾸려면 `hooks/commands.ts`에서 각 줄 끝의 `true`를 넣거나 빼면 됩니다.
