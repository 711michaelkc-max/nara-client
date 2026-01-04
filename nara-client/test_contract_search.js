// const { fetchContracts } = require('./src/services/naraApi'); // Removed
const axios = require('axios');

// Mock axios to avoid actual network calls if needed, OR just run real test locally if environment supports it.
// Since we are in the agent environment, we can run real calls if we import fetchContracts correctly.
// However, fetchContracts is in TS and uses local imports. It's better to recreate a simple test script
// that mimics the LOGIC of fetchContracts or try to use ts-node if available (unlikely reliable).
// Better approach: Write a pure JS script that does exactly what fetchContracts "all" block does, to verify the logic externally first.

const API_KEY = '4d03d6d8d9dd48b0fad3d09a9fee0c061e460c231eb630e836ee599c5634650a';

function getDateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
}

async function fetchSingle(type, keyword) {
    let operation = 'getCntrctInfoListServcPPSSrch';
    if (type === 'cnstwk') operation = 'getCntrctInfoListCnstwkPPSSrch';
    if (type === 'thng') operation = 'getCntrctInfoListThngPPSSrch';

    // Test with 'last 1 month' range
    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(now.getMonth() - 1);

    const url = `http://apis.data.go.kr/1230000/ao/CntrctInfoService/${operation}`;
    const params = {
        serviceKey: API_KEY,
        numOfRows: 10, pageNo: 1, inqryDiv: 1,
        inqryBgnDate: getDateString(oneMonthAgo),
        inqryEndDate: getDateString(now),
        insttNm: keyword,
        type: 'json'
    };

    console.log(`[${type}] Requesting ${url} with insttNm=${keyword}...`);
    try {
        const res = await axios.get(url, { params });
        const items = res.data?.response?.body?.items;
        const list = items ? (Array.isArray(items) ? items : [items]) : [];
        console.log(`[${type}] Found ${list.length} items.`);
        return list;
    } catch (e) {
        console.log(`[${type}] Error: ${e.message}`);
        return [];
    }
}

async function runTest() {
    const keyword = '조달청'; // Test keyword
    console.log(`Testing Contract Search for Agency: '${keyword}'`);

    const types = ['servc', 'cnstwk', 'thng'];

    let allItems = [];
    for (const t of types) {
        const items = await fetchSingle(t, keyword);
        allItems = [...allItems, ...items];
    }

    // Sort logic verification
    allItems.sort((a, b) => {
        const dateA = new Date(a.cntrctCnclsDate || 0).getTime();
        const dateB = new Date(b.cntrctCnclsDate || 0).getTime();
        return dateB - dateA; // Descending
    });

    console.log(`\nTotal Merged Items: ${allItems.length}`);
    if (allItems.length > 0) {
        console.log("Top 5 Items (Latest First):");
        allItems.slice(0, 5).forEach(item => {
            console.log(`[${item.cntrctCnclsDate}] ${item.cntrctNm} (${item.cntrctInsttNm})`);
        });
    } else {
        console.log("No items found. Try another keyword or check parameters.");
    }
}

runTest();
