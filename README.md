## 클로드코드 제대로 시작하기 

<img width="400" height="547" alt="클로드제대로_400" src="https://github.com/user-attachments/assets/9fd89de5-5802-406f-a73c-dc006a21af64" />

- 교보문고: https://product.kyobobook.co.kr/detail/S000220662769
- yes24: https://www.yes24.com/product/goods/194483933
- 알라딘: https://www.aladin.co.kr/shop/wproduct.aspx?ItemId=399290397

# 정오표
## 155p 
before

3. 클로드 코드에서 다음 명령으로 OMC를 설치합니다. 

after

3. omc는 다음의 2개의 명령어로 설치합니다. 

1단계 – 마켓플레이스 등록

클로드 코드 세션을 연 뒤 다음 명령을 입력합니다.

/plugin marketplace add https://github.com/Yeachan-Heo/oh-my-claudecode

이 명령은 플러그인을 곧바로 설치하지 않습니다. 해당 깃허브 저장소를 "플러그인을 내려받아 올 목록(마켓플레이스)"으로 클로드 코드에 등록하는 단계입니다. 서점을 등록해 두는 것에 가깝다고 이해하면 됩니다.

2단계 – 플러그인 설치

등록이 끝났다면 이어서 다음 명령을 입력합니다.

/plugin install oh-my-claudecode

이제 방금 등록한 마켓플레이스에서 실제로 책을 한 권 골라 꺼내 오는 셈입니다. 설치가 끝나면 OMC의 에이전트와 스킬이 세션에 로드됩니다.

여기서 초보자가 가장 자주 걸려 넘어지는 지점이 있습니다. 두 명령을 한꺼번에 복사해 붙여넣으면 실패합니다. 슬래시 명령은 한 번에 하나씩 처리되기 때문에, 반드시 첫 줄을 입력해 등록이 끝난 것을 확인한 뒤 두 번째 줄을 입력해야 합니다.  
