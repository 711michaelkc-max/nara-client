// Test Script: Verify Search Keywords & Filtering Logic
// Run with: npx ts-node scripts/test_search_keywords.ts

import { fetchBids } from '../src/services/naraApi';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// 1. Define Keywords
const KEYWORDS = {
    MustHave: ["해외", "국외"],
    Education: ["수학여행", "문화탐방", "현장체험"],
    Professional: ["글로벌", "탐방", "벤치마킹", "선진지", "연수", "시찰"],
    Regions: ["미국", "유럽", "싱가포르", "호주", "일본", "대만", "베트남"]
};

// 2. Define Negative Context (Exclude if these words appear)
const NEGATIVE_WORDS = ["전시회", "도서", "구매", "구입", "공사", "설치", "용역", "제작"];
// Note: '용역' is tricky because "Training Service" is '연수 용역'. We must be careful with '용역'.
// Better list:
const REAL_BAD_WORDS = ["전시회", "도서", "구매", "구입", "설치", "공사", "제작", "유지보수", "리모델링", "폐기물"];


async function runTest() {
    console.log("🔍 Starting Keyword Search Test (Last 7 Days)...");

    // Helper to get date string (YYYYMMDDHHMM)
    const getDateString = (date: Date) => {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}0000`;
    };

    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7); // Last 7 days

    const inqryBgnDt = getDateString(start);
    const inqryEndDt = getDateString(end);

    // Combine all unique keywords for API checking
    const allKeywords = ["해외"]; // Testing speed with just ONE keyword first


    console.log(`📅 Range: ${inqryBgnDt} ~ ${inqryEndDt}`);
    console.log(`🔑 Keywords: ${allKeywords.join(', ')}`);

    let totalFound = 0;

    for (const keyword of allKeywords) {
        console.log(`\n🔎 Searching for '${keyword}'...`);
        try {
            const result = await fetchBids({
                bidNtceNm: keyword,
                inqryBgnDt: inqryBgnDt,
                inqryEndDt: inqryEndDt,
                numOfRows: 10, // Just check top 10 for testing
                pageNo: 1,
                inqryDiv: '1',
                type: 'servc' // Service contracts only (usually training is service)
            });

            const items = result.response.body.items;
            if (items && items.length > 0) {
                console.log(`   ✅ Found ${items.length} items (showing top 5):`);
                items.slice(0, 5).forEach((item: any) => {
                    const title = item.bidNtceNm;
                    let status = "✅ ACCEPT";

                    // Apply Smart Filter (Mock)
                    if (REAL_BAD_WORDS.some(bad => title.includes(bad))) {
                        status = "❌ REJECT (Negative Context)";
                    }
                    else if (!title.includes("해외") && !title.includes("국외") && !title.includes("연수")) {
                        // Check logic
                        status = "⚠️ CHECK (Vague)";
                    }

                    console.log(`      [${status}] ${title}`);
                });
                totalFound += items.length;
            } else {
                console.log(`   ⚠️ No items found.`);
            }

        } catch (e) {
            console.error(`   ❌ Error searching ${keyword}`, e);
        }
    }

    console.log(`\n🏁 Test Finished. Total Candidates Found: ${totalFound}`);
}

runTest();
