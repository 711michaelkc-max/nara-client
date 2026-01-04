const axios = require('axios');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const apiKeyLine = envFile.split('\n').find(line => line.startsWith('NEXT_PUBLIC_NARA_API_KEY='));
const apiKey = apiKeyLine ? apiKeyLine.split('=')[1].trim() : '';
let base64Key = '';

try {
    base64Key = Buffer.from(apiKey, 'hex').toString('base64');
} catch (e) {
    console.log('Key conversion failed:', e.message);
}

const getDateString = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}${mm}${dd}${hh}${min}`;
};

const now = new Date();
const fiveDaysAgo = new Date();
fiveDaysAgo.setDate(now.getDate() - 5);

const commonParams = {
    numOfRows: 1,
    pageNo: 1,
    inqryDiv: 1,
    inqryBgnDt: getDateString(fiveDaysAgo),
    inqryEndDt: getDateString(now),
    type: 'json'
};

const ENDPOINTS = [
    {
        name: "1. 입찰공고 서비스 (Bid Notice)",
        url: "http://apis.data.go.kr/1230000/BidPublicInfoService04/getBidPblancListInfoServc" // Use 'Servc' endpoint?
        // Note: The correct endpoint name is tricky. I'll stick to what I used or variations.
        // Actually the doc file implies 'getBidPblancListInfoPthue' or similar. 
        // Let's try the one from verify-api.js first as it's standard.
    },
    {
        name: "2. 낙찰정보 서비스 (Scsbid Info)",
        url: "http://apis.data.go.kr/1230000/ScsbidInfoService01/getScsbidListInfoThng" // Common endpoint for Supply(Thng)
    },
    {
        name: "3. 계약정보 서비스 (Contract Info)",
        url: "http://apis.data.go.kr/1230000/CntrctInfoService02/getCntrctListInfoThng" // Common endpoint for Supply(Thng)
    }
];

// Note: I will just use the one endpoint I tested before for Bid, and guess the others.
// Bid: http://apis.data.go.kr/1230000/BidPublicInfoService04/getBidPblancListInfoPthue ( 용역 )
// Win: http://apis.data.go.kr/1230000/ScsbidInfoService01/getScsbidListInfoServc ( 용역 )
// Contract: http://apis.data.go.kr/1230000/CntrctInfoService02/getCntrctListInfoServc ( 용역 )

const REAL_ENDPOINTS = [
    { name: "입찰공고 (용역)", url: "http://apis.data.go.kr/1230000/BidPublicInfoService04/getBidPblancListInfoServc" },
    { name: "낙찰정보 (용역)", url: "http://apis.data.go.kr/1230000/ScsbidInfoService01/getScsbidListInfoServc" },
    { name: "계약정보 (용역)", url: "http://apis.data.go.kr/1230000/CntrctInfoService02/getCntrctListInfoServc" }
];

async function testEndpoint(endpoint, key) {
    try {
        const encodedKey = encodeURIComponent(key);
        const queryString = Object.keys(commonParams)
            .map(k => `${k}=${commonParams[k]}`)
            .join('&');
        const fullUrl = `${endpoint.url}?ServiceKey=${encodedKey}&${queryString}`;

        console.log(`Testing ${endpoint.name}...`);
        const response = await axios.get(fullUrl);

        if (response.status === 200 && response.data.response?.header?.resultCode === '00') {
            console.log(`✅ SUCCESS!`);
            return { name: endpoint.name, status: 'SUCCESS' };
        } else {
            // Try to parse error
            const resultMsg = response.data?.response?.header?.resultMsg || response.statusText;
            console.log(`❌ FAILED (Logic): ${resultMsg}`);
            return { name: endpoint.name, status: `FAILED (${resultMsg})` };
        }
    } catch (e) {
        console.log(`❌ FAILED (Network/System): ${e.message}`);
        return { name: endpoint.name, status: `ERROR (${e.message})` };
    }
}

async function run() {
    console.log("Checking ALL 3 Services (Bid, Win, Contract)...");
    const results = [];
    if (base64Key) {
        for (const ep of REAL_ENDPOINTS) {
            results.push(await testEndpoint(ep, base64Key));
        }
    } else {
        console.log("No API Key found.");
    }

    console.log("\n--- SUMMARY ---");
    results.forEach(r => console.log(`${r.name}: ${r.status}`));
}

run();
