const axios = require('axios');

const API_KEY = '4d03d6d8d9dd48b0fad3d09a9fee0c061e460c231eb630e836ee599c5634650a';
// 입찰공고 서비스
const SERVICE = 'BidPublicInfoService';
const OPERATIONS = [
    'getBidPblancListInfoServcPPSSrch', // 용역 (PPSSrch)
    'getBidPblancListInfoServc',        // 용역 (일반)
];

// 검색어
const KEYWORD = '두바이';

async function testDubaiSearch() {
    // 날짜 범위: 15일 테스트
    const startDate = '202510010000';
    const endDate = '202510152359';

    console.log(`=== Testing Bid Search for '${KEYWORD}' (15 Days) ===`);
    console.log(`Period: ${startDate} ~ ${endDate}\n`);

    for (const op of OPERATIONS) {
        const url = `http://apis.data.go.kr/1230000/ad/${SERVICE}/${op}`;
        console.log(`Testing: ${op}`);

        const params = {
            ServiceKey: API_KEY,
            numOfRows: 10,
            pageNo: 1,
            inqryDiv: 1,
            inqryBgnDt: startDate,
            inqryEndDt: endDate,
            bidNtceNm: KEYWORD, // 파라미터명: 입찰공고명
            type: 'json'
        };

        try {
            const response = await axios.get(url, { params, timeout: 5000 });
            const data = response.data;

            if (response.status === 200) {
                if (data.response && data.response.body) {
                    const totalCount = data.response.body.totalCount;
                    console.log(`- Status: 200 OK`);
                    console.log(`- Total Count: ${totalCount}`);

                    const items = data.response.body.items;
                    if (totalCount > 0 && items) {
                        let itemList = [];
                        if (Array.isArray(items)) itemList = items;
                        else if (items.item) itemList = Array.isArray(items.item) ? items.item : [items.item];
                        else itemList = [items];

                        console.log(`- Found ${itemList.length} items.`);
                        if (itemList.length > 0) {
                            console.log(`  > First Item Title: ${itemList[0].bidNtceNm}`);
                            console.log(`  > Date: ${itemList[0].bidNtceDt}`);
                        }
                    } else {
                        console.log(`- No items found.`);
                    }
                } else {
                    console.log(`- Invalid Response Structure:`, JSON.stringify(data).substring(0, 100));
                }
            }
        } catch (error) {
            if (error.response) {
                console.log(`- HTTP Error ${error.response.status} (${error.response.statusText})`);
            } else {
                console.log(`- Error: ${error.message}`);
            }
        }
        console.log('---');
    }
}

testDubaiSearch();
