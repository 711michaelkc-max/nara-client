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

async function checkActualData() {
    console.log('╔════════════════════════════════════════╗');
    console.log('║   실제 데이터에서 "해외" 검색        ║');
    console.log('╚════════════════════════════════════════╝\n');

    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    try {
        const params = {
            serviceKey: API_KEY,
            pageNo: 1,
            numOfRows: 100,  // 더 많은 데이터 조회
            inqryDiv: 1,
            inqryBgnDt: getDateString(oneMonthAgo),
            inqryEndDt: getDateString(now),
            type: 'json'
        };

        console.log('API 조회 중...\n');
        const response = await axios.get(`${BASE_URL}/getBidPblancListInfoCnstwk`, { params });

        const items = response.data?.response?.body?.items || [];
        console.log(`전체 조회 결과: ${items.length}건\n`);

        // "해외"가 포함된 공고 찾기
        const matchedItems = items.filter(item =>
            item.bidNtceNm?.includes('해외') ||
            item.dminsttNm?.includes('해외') ||
            item.ntceInsttNm?.includes('해외')
        );

        console.log(`"해외" 포함 공고: ${matchedItems.length}건\n`);

        if (matchedItems.length > 0) {
            console.log('매칭된 공고 목록:');
            console.log('='.repeat(80));
            matchedItems.forEach((item, idx) => {
                console.log(`\n[${idx + 1}]`);
                console.log(`  공고명: ${item.bidNtceNm}`);
                console.log(`  수요기관: ${item.dminsttNm}`);
                console.log(`  공고일: ${item.bidNtceDt}`);
            });
        } else {
            console.log('⚠️ 최근 1개월 데이터에 "해외"가 포함된 공고가 없습니다.');
            console.log('\n전체 공고 샘플 (처음 5개):');
            console.log('='.repeat(80));
            items.slice(0, 5).forEach((item, idx) => {
                console.log(`\n[${idx + 1}] ${item.bidNtceNm}`);
            });
        }

        console.log('\n\n╔════════════════════════════════════════╗');
        console.log('║              결론                     ║');
        console.log('╚════════════════════════════════════════╝\n');

        if (matchedItems.length > 0) {
            console.log('✅ 데이터에 "해외" 공고가 존재합니다.');
            console.log('   → API는 키워드 검색을 지원하지 않으므로');
            console.log('   → 클라이언트 측에서 필터링해야 합니다.');
        } else {
            console.log('⚠️ 최근 1개월 데이터에 "해외" 공고가 없습니다.');
            console.log('   → 나라장터 웹사이트는 더 긴 기간을 조회하거나');
            console.log('   → 다른 API 엔드포인트를 사용할 수 있습니다.');
        }

    } catch (error) {
        console.error('❌ 오류:', error.message);
    }
}

checkActualData();
