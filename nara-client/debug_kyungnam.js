const axios = require('axios');
const API_KEY = '4d03d6d8d9dd48b0fad3d09a9fee0c061e460c231eb630e836ee599c5634650a';

// Date range: Last 8 days
const START_DATE = '202512270000';
const END_DATE = '202601032359';
const KEYWORD = '경남대학교';

async function checkBid(typeParam, keywordParamName) {
    const url = `http://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfo${typeParam}PPSSrch`;
    const params = {
        serviceKey: API_KEY,
        numOfRows: 10, pageNo: 1, inqryDiv: '1',
        inqryBgnDt: START_DATE, inqryEndDt: END_DATE,
        [keywordParamName]: KEYWORD,
        type: 'json'
    };

    try {
        const res = await axios.get(url, { params });
        const items = res.data?.response?.body?.items;
        const count = items ? (Array.isArray(items) ? items.length : 1) : 0;
        console.log(`[Bid][${typeParam}] param=${keywordParamName}: Found ${count} items`);
        if (count > 0) {
            const list = Array.isArray(items) ? items : [items];
            list.forEach(i => console.log(` - ${i.bidNtceNm} (Agency: ${i.dminsttNm})`));
        }
    } catch (e) {
        console.log(`[Bid][${typeParam}] Error: ${e.message}`);
    }
}

async function checkOpen(keywordParamName) {
    // Correct Openg Op for Win List
    const url = `http://apis.data.go.kr/1230000/as/ScsbidInfoService/getOpengResultListInfoOpengCompt`;

    // Openg endpoint uses inqryBgnDt
    const params = {
        serviceKey: API_KEY,
        numOfRows: 10, pageNo: 1, inqryDiv: '1',
        inqryBgnDt: START_DATE, inqryEndDt: END_DATE,
        [keywordParamName]: KEYWORD,
        type: 'json'
    };

    try {
        const res = await axios.get(url, { params });
        const items = res.data?.response?.body?.items;
        const count = items ? (Array.isArray(items) ? items.length : 1) : 0;
        console.log(`[Openg] param=${keywordParamName}: Found ${count} items`);
        if (count > 0) {
            const list = Array.isArray(items) ? items : [items];
            list.forEach(i => console.log(` - ${i.bidNtceNm} (Agency: ${i.dminsttNm})`));
        }
    } catch (e) {
        console.log(`[Openg] Error: ${e.message} (Status: ${e.response?.status})`);
    }
}

async function run() {
    console.log(`Analysing 'Kyungnam University' (${KEYWORD}) Issue...`);

    // 1. Bid Notice - Search by Title (bidNtceNm)
    console.log("\n--- Bid Notice: Search by Title (bidNtceNm) ---");
    await checkBid('Servc', 'bidNtceNm');

    // 2. Bid Notice - Search by Demand Agency (dminsttNm)
    console.log("\n--- Bid Notice: Search by Demand Agency (dminsttNm) ---");
    await checkBid('Servc', 'dminsttNm');

    // 3. Opening Result - Search by Title (bidNtceNm) is usually allowed
    console.log("\n--- Opening Result: Search by Title (bidNtceNm) ---");
    await checkOpen('bidNtceNm');

    // 4. Opening Result - Search by Agency ? (dminsttNm might not work on Openg, but let's try if title fails)
    // Note: Openg docs usually support 'dminsttNm'
    console.log("\n--- Opening Result: Search by Agency (dminsttNm) ---");
    await checkOpen('dminsttNm');
}

run();
