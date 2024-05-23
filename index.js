const axios = require('axios');
const moment = require('moment');
const dotenv = require('dotenv');

dotenv.config();

const KMA_WEATHER_SERVICE_KEY = process.env.KMA_WEATHER_SERVICE_KEY;
const STATION_NAME = process.env.STATION_NAME;
const STATE_NAME = process.env.STATE_NAME;

const KMA_AIR_SERVICE_KEY = process.env.KMA_AIR_SERVICE_KEY;

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const LOCATION_COORDINATES = { nx: process.env.NX, ny: process.env.NY };

async function getWeather(baseTime) {
  const url = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=${KMA_WEATHER_SERVICE_KEY}&pageNo=1&numOfRows=100&dataType=JSON&base_date=${getBaseDate()}&base_time=${toBaseTime(baseTime)}&nx=${LOCATION_COORDINATES.nx}&ny=${LOCATION_COORDINATES.ny}`;
  const response = await axios.get(url);
  if(response.data.response.header.resultCode == '03') {
    baseTime.setHours(baseTime.getHours() - 1); // 시간 감소
    return getWeather(baseTime);
}
return response.data.response.body.items.item;
}

async function getUltraSrtFcst(baseTime) {
    const url = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst?serviceKey=${KMA_WEATHER_SERVICE_KEY}&pageNo=1&numOfRows=100&dataType=JSON&base_date=${getToday()}&base_time=${toBaseTime(baseTime)}&nx=${LOCATION_COORDINATES.nx}&ny=${LOCATION_COORDINATES.ny}`;
    const response = await axios.get(url);
    if(response.data.response.header.resultCode == '03') {
        baseTime.setHours(baseTime.getHours() - 1); // 시간 감소
        return getUltraSrtFcst(baseTime);
    }

    return response.data.response.body.items.item;
}

async function getAirPollution() {
  const url = `http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty?serviceKey=${KMA_AIR_SERVICE_KEY}&stationName=${encodeURIComponent(STATION_NAME)}&returnType=json&dataTerm=DAILY&ver=1.0`;
  const response = await axios.get(url);
  return response.data.response.body.items;
}

function getToday() {
  return moment().format('YYYYMMDD');
}

function getBaseDate() {
  return moment().subtract(1, 'days').format('YYYYMMDD');
}

function toBaseTime(date) {
  return moment(date).subtract(9, 'hours').format('HH00'); // KST로 변환하여 반환
}

async function sendToSlack(message) {
  const payload = {
    text: message,
  };

  await axios.post(SLACK_WEBHOOK_URL, payload);
}

function convertWeatherDescription(ptyValue) {
  switch (ptyValue) {
      case '0':
          return "강수 없음";
      case '1':
          return "비";
      case '2':
          return "비/눈";
      case '3':
          return "눈";
      case '5':
          return "빗방울";
      case '6':
          return "빗방울눈날림";
      case '7':
          return "눈날림";
      default:
          return "알 수 없음";
  }
}

function interpretAirQuality(pmValue) {
  if (pmValue == '-') {
      return '알 수 없음';
  }
  else if (pmValue <= 30) {
      return '좋음';
  } else if (pmValue <= 80) {
      return '보통';
  } else {
      return '나쁨';
  }
}

(async () => {
  try {
    const weatherData = await getWeather(new Date);
    const ultraSrtNcst = await getUltraSrtFcst(new Date);
    const airPollutionData = await getAirPollution();

    const temperature = ultraSrtNcst.find(item => item.category === 'T1H').fcstValue;
    const humidity = ultraSrtNcst.find(item => item.category === 'REH').fcstValue;
    const weatherDescription = convertWeatherDescription(weatherData.find(item => item.category === 'PTY').fcstValue);

    const pm10 = airPollutionData[0].pm10Value;
    const pm2_5 = airPollutionData[0].pm25Value;

    const message = `
      ${STATE_NAME} ${STATION_NAME} (${LOCATION_COORDINATES.nx}:${LOCATION_COORDINATES.ny})의 현재 날씨와 미세먼지 정보입니다:
      - 날씨: ${weatherDescription}
      - 온도: ${temperature}°C
      - 습도: ${humidity}
      - PM10: ${pm10} µg/m³ ${interpretAirQuality(pm10)}
      - PM2.5: ${pm2_5} µg/m³ ${interpretAirQuality(pm2_5)}
    `;

    await sendToSlack(message);
    console.log('날씨와 미세먼지 정보가 슬랙에 성공적으로 전송되었습니다.');
  } catch (error) {
    console.error('정보를 가져오거나 슬랙에 전송하는 데 실패했습니다:', error);
  }
})();
