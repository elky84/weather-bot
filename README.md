# weather_bot

기상청 API를 이용한 날씨/미세먼지 정보를 슬랙으로 전달하는 봇입니다

.env.sample의 항목을 참고해서, .env 파일을 생성 후 값을 입력해주세요

지역별 nx, ny 좌표는 docs안에 들어있는 엑셀 파일에 있습니다

## github actions

node 스크립트를 github actions에서도 실행하실 수 있습니다.

.env.sample에 해당하는 값을 github actions secret에 입력하시면 동일하게 작동합니다.