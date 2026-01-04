const axios = require('axios');
const API_KEY = '4d03d6d8d9dd48b0fad3d09a9fee0c061e460c231eb630e836ee599c5634650a';

const params = {
    serviceKey: API_KEY,
    numOfRows: 1, pageNo: 1, inqryDiv: '1',
    inqryBgnDate: '20251201', inqryEndDate: '20260103',
    type: 'json'
};

async function checkOp(type) {
    // Pattern: getCntrctInfoList{Type}PPSSrch
    const op = `getCntrctInfoList${type}PPSSrch`;
    const url = `http://apis.data.go.kr/1230000/ao/CntrctInfoService/${op}`;

    try {
        console.log(`Checking ${type}...`);
        const res = await axios.get(url, { params });
        const code = res.data?.response?.header?.resultCode;
        const msg = res.data?.response?.header?.resultMsg;

        if (code === '00') console.log(`[OK] ${type}: Normal Service`);
        else console.log(`[FAIL] ${type}: ${code} - ${msg}`);

    } catch (e) {
        // 404 or 500
        console.log(`[ERR] ${type}: ${e.response ? e.response.status : e.message}`);
    }
}

async function run() {
    console.log("Scanning Contract Service Operations...");
    await checkOp('Servc');  // 용역
    await checkOp('Cnstwk'); // 공사
    await checkOp('Thng');   // 물품
    await checkOp('Etc');    // 기타 ??
    await checkOp('Forn');   // 외자 ??
}

run();
