const axios = require('axios');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const apiKeyLine = envFile.split('\n').find(line => line.startsWith('NEXT_PUBLIC_NARA_API_KEY='));
const apiKey = apiKeyLine ? apiKeyLine.split('=')[1].trim() : '';

console.log('Original Key (Hex?):', apiKey.substring(0, 10) + '...');

// Convert Hex to Base64
let base64Key = '';
try {
    base64Key = Buffer.from(apiKey, 'hex').toString('base64');
    console.log('Converted to Base64:', base64Key.substring(0, 10) + '...');
} catch (e) {
    console.log('Conversion failed:', e.message);
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

async function tryRequest(key, description) {
    const url = 'http://apis.data.go.kr/1230000/BidPublicInfoService04/getBidPblancListInfoServc';
    try {
        console.log(`\nTesting ${description}...`);

        // We need to URL Encode the Base64 key because it contains '+', '/', '='
        const encodedKey = encodeURIComponent(key);

        const queryString = Object.keys(commonParams)
            .map(k => `${k}=${commonParams[k]}`)
            .join('&');

        const fullUrl = `${url}?ServiceKey=${encodedKey}&${queryString}`;

        console.log(`Requesting...`);

        const response = await axios.get(fullUrl);

        console.log('Status:', response.status);
        if (response.data && response.data.response && response.data.response.header && response.data.response.header.resultCode === '00') {
            console.log('✅ SUCCESS! The key needed to be Base64.');
            return true;
        } else {
            console.log('❌ FAILED:', response.data.response.header.resultMsg);
        }
    } catch (error) {
        console.error('❌ ERROR:', error.message);
    }
    return false;
}

async function run() {
    if (base64Key) {
        await tryRequest(base64Key, 'Converted Base64 Key');
    }
}

run();
