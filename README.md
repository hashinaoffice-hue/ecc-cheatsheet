# ECC 명령어 패널 (ecc-cheatsheet)

Claude Code 화면 구석에 작은 클로드풍 펫이 떠 있고, 펫을 누르면 ECC 플러그인 명령어 99개가
카테고리별로 펼쳐지는 플로팅 모드입니다. 작업하면서 필요한 명령어를 찾아 바로 복사해 쓸 수 있어요.

```
    ✦
 ▄██████▄
 █ o  o █
 █  __  █
 ▀██████▀
  ▀▀  ▀▀
```

- 펫을 **짧게 누르면** 명령어 패널이 펼쳐지고, 다시 누르면 접혀요
- 펫을 **누른 채 끌면** 원하는 자리로 옮길 수 있고, 그 자리는 다음에도 기억돼요
- 패널이 열려 있으면 웃고, Claude가 일하는 동안엔 통통 튀어요
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

세션이 시작되면 입력창 위 오른쪽 구석에 펫이 나타나요. 펫을 눌러 패널을 열고 닫으세요.

펫은 **데스크톱 앱의 Code 탭**과 **터미널의 전체화면 모드**에서 보여요.
펫이 안 보이는 화면(모바일, VS Code 등)에서는 `/ecc-panel`을 입력하면 패널이 열리고 닫혀요.

자주 쓰는 명령어(★)를 바꾸려면 `hooks/commands.ts`에서 각 줄 끝의 `true`를 넣거나 빼면 됩니다.
