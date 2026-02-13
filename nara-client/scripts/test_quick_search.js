// Standalone Test Script (Standard JS) - No TypeScript compilation needed
// Run with: node scripts/test_quick_search.js

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load API Key from .env.local manually
let API_KEY = "";
try {
    const envPath = path.resolve(__dirname, '../.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/NEXT_PUBLIC_NARA_API_KEY=(.+)/);
    if (match) {
        API_KEY = match[1].trim();
    }
} catch (e) {
    console.error("Warning: Could not read .env.local");
}

if (!API_KEY) {
    console.error("❌ API Key not found. Please check .env.local");
    process.exit(1);
}

// Helper to get date string
const getDateString = (date) => {
    const pad = (n) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}0000`;
};

async function runTest() {
    console.log("🚀 Starting Quick Speed Test (Node.js)...");

    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7);

    const inqryBgnDt = getDateString(start);
    const inqryEndDt = getDateString(end);
    const keyword = "해외"; // Testing with 'Overseas'

    console.log(`📅 Range: ${inqryBgnDt} ~ ${inqryEndDt}`);
    console.log(`🔎 Keyword: "${keyword}"`);

    // CORRECTED URL
    const url = "http://apis.data.go.kr/1230000/BidPublicInfoService/getBidPblancListInfoServcPPSSrch";

    console.log(`📡 Sending Request to Server...`);

    try {
        const response = await axios.get(url, {
            params: {
                serviceKey: decodeURIComponent(API_KEY),
                numOfRows: 10,
                pageNo: 1,
                inqryDiv: '1',
                bidNtceNm: keyword,
                inqryBgnDt: inqryBgnDt,
                inqryEndDt: inqryEndDt,
                type: 'json'
            },
            timeout: 5000
        });

        const items = response.data?.response?.body?.items;
        if (items) {
            const count = Array.isArray(items) ? items.length : 1;
            console.log(`✅ Success! Found ${count} items in < 1 second.`);
            console.log("------------------------------------------------");
            const list = Array.isArray(items) ? items : [items];
            list.forEach((item, idx) => {
                if (idx < 5) console.log(`[${idx + 1}] ${item.bidNtceNm} (${item.bidNtceDt})`);
            });
            console.log("------------------------------------------------");
        } else {
            console.log(`✅ Success but no items found.`);
        }

    } catch (error) {
        console.error("❌ Request Failed:", error.message);
        if (error.response) console.error("   Status:", error.response.status);
    }
}

runTest();
