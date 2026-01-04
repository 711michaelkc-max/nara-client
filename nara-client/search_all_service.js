const axios = require('axios');

const API_KEY = '4d03d6d8d9dd48b0fad3d09a9fee0c061e460c231eb630e836ee599c5634650a';
const BASE_URL = 'https://apis.data.go.kr/1230000/ad/BidPublicInfoService';

const getDateString = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}${mm}${dd}${hh}${min}`;
};

async function searchAllServiceData() {
    console.log('╔════════════════════════════════════════╗');
    console.log('║  용역 전체 데이터에서 "두바이" 검색  ║');
    console.log('╚════════════════════════════════════════╝\n');

    const start = new Date('2025-09-25T00:00:00');
    const end = new Date('2025-12-24T23:59:59');

    console.log(`기간: ${start.toLocaleDateString('ko-KR')} ~ ${end.toLocaleDateString('ko-KR')}\n`);

    let allItems = [];

    // 1개월씩 나눠서 조회
    const periods = [
        { start: '2025-09-25', end: '2025-10-25' },
        { start: '2025-10-25', end: '2025-11-25' },
        { start: '2025-11-25', end: '2025-12-24' }
    ];

    for (const period of periods) {
        console.log(`\n${period.start} ~ ${period.end}`);

        const periodStart = new Date(period.start + 'T00:00:00');
        const periodEnd = new Date(period.end + 'T23:59:59');

        try {
            const params = {
                serviceKey: API_KEY,
                pageNo: 1,
                numOfRows: 999,  // 최대한 많이
                inqryDiv: 3,  // 용역
                inqryBgnDt: getDateString(periodStart),
                inqryEndDt: getDateString(periodEnd),
                type: 'json'
            };

            const response = await axios.get(`${BASE_URL}/getBidPblancListInfoServc`, { params });

            if (response.data['nkoneps.com.response.ResponseError']) {
                const error = response.data['nkoneps.com.response.ResponseError'].header;
                console.log(`❌ 에러: ${error.resultMsg}`);
                continue;
            }

            const items = response.data?.response?.body?.items || [];
            console.log(`  조회: ${items.length}건`);

            allItems.push(...items);

        } catch (error) {
            console.log(`❌ 실패: ${error.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log(`\n총 조회: ${allItems.length}건\n`);

    // "두바이" 검색
    const filtered = allItems.filter(item =>
        item.bidNtceNm?.includes('두바이') ||
        item.dminsttNm?.includes('두바이') ||
        item.ntceInsttNm?.includes('두바이')
    );

    console.log(`"두바이" 검색 결과: ${filtered.length}건\n`);

    if (filtered.length > 0) {
        console.log('✅ 발견!');
        console.log('='.repeat(80));
        filtered.forEach((item, idx) => {
            console.log(`\n[${idx + 1}] ${item.bidNtceNm}`);
            console.log(`    수요기관: ${item.dminsttNm}`);
            console.log(`    공고일: ${item.bidNtceDt}`);
            console.log(`    공고번호: ${item.bidNtceNo}`);
        });
    } else {
        console.log('⚠️ 용역 데이터에서도 "두바이"를 찾지 못했습니다.');
        console.log('\n샘플 데이터 (처음 5개):');
        console.log('='.repeat(80));
        allItems.slice(0, 5).forEach((item, idx) => {
            console.log(`\n[${idx + 1}] ${item.bidNtceNm}`);
        });
    }
}

searchAllServiceData();
