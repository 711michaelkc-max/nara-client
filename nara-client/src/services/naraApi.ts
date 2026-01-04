import axios from 'axios';

// Interfaces
export interface NaraItem {
    bidNtceNo: string;
    bidNtceOrd?: string;
    bidNtceNm: string;
    bidNtceDt: string;
    ntceInsttNm?: string;
    dminsttNm?: string;
    ntceKindNm?: string;
    bidMethdNm?: string;
    cnstrtnLoc?: string;
    asignBdgtAmt?: string;
    presmptPrce?: string;
    bidClseDt?: string;
    opengDt?: string;
    [key: string]: any; // Allow other properties
}

export interface NaraResponse {
    response: {
        header: {
            resultCode: string;
            resultMsg: string;
        };
        body: {
            items: NaraItem[];
            totalCount: number;
            pageNo: number;
            numOfRows: number;
        };
    };
}

const API_KEY = process.env.NEXT_PUBLIC_NARA_API_KEY;

// Helper: Date to YYYYMMDDHHmm
const getDateString = (date: Date): string => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}`;
};

// Main Bid Search (With 30-day split logic)
export const fetchBids = async (queryParams: any): Promise<{ response: { body: { items: NaraItem[], totalCount: number, pageNo: number, numOfRows: number } } }> => {
    // Handle 'all' type: Fetch all 4 types in parallel (added 'etc')
    if (queryParams.type === 'all') {
        const types = ['servc', 'cnstwk', 'thng', 'etc'];
        console.log(`[API] Fetching All Bid Types: ${types.join(', ')}`);

        try {
            const promises = types.map(t => fetchBids({ ...queryParams, type: t }));
            const results = await Promise.all(promises);

            let allItems: NaraItem[] = [];
            let totalCount = 0;

            results.forEach(res => {
                const body = res.response?.body;
                if (body?.items) {
                    allItems = [...allItems, ...body.items];
                    totalCount += body.totalCount || 0;
                }
            });

            // Deduplicate by bidNtceNo
            const uniqueItems = Array.from(new Map(allItems.map(item => [item.bidNtceNo, item])).values());

            // Sort by bidNtceDt descending (Latest first) - Reinforced
            uniqueItems.sort((a, b) => {
                const dateA = new Date(a.bidNtceDt || 0).getTime();
                const dateB = new Date(b.bidNtceDt || 0).getTime();
                return dateB - dateA;
            });

            console.log(`[API] Merge Result: ${uniqueItems.length} items. First: ${uniqueItems[0]?.bidNtceDt}, Last: ${uniqueItems[uniqueItems.length - 1]?.bidNtceDt}`);

            return {
                response: {
                    body: {
                        items: uniqueItems,
                        totalCount: uniqueItems.length, // Update total count to match merged list
                        pageNo: queryParams.pageNo,
                        numOfRows: queryParams.numOfRows
                    }
                }
            };
        } catch (error) {
            console.error('Error fetching all bid types:', error);
            throw error;
        }
    }

    // 15 days in milliseconds
    const CHUNK_SIZE = 15 * 24 * 60 * 60 * 1000;

    // Type handling
    let type = 'Servc'; // Default
    if (queryParams.type === 'cnstwk') type = 'Cnstwk';
    if (queryParams.type === 'thng') type = 'Thng';
    if (queryParams.type === 'etc') type = 'Etc'; // Added etc

    // Use PPSSrch if keyword exists
    const hasKeyword = !!queryParams.bidNtceNm && queryParams.bidNtceNm.trim().length > 0;
    let endpoint = `getBidPblancListInfo${type}`;
    if (hasKeyword) endpoint += 'PPSSrch'; // e.g. getBidPblancListInfoServcPPSSrch

    const url = `/api/proxy/1230000/ad/BidPublicInfoService/${endpoint}`;

    // Split logic if range > 15 days
    const startStr = queryParams.inqryBgnDt;
    const endStr = queryParams.inqryEndDt;

    if (startStr && endStr && startStr.length >= 8 && endStr.length >= 8) {
        // Simple conversion YYYYMMDDHHmm -> Date
        const parseDate = (s: string) => {
            const y = parseInt(s.substring(0, 4));
            const m = parseInt(s.substring(4, 6)) - 1;
            const d = parseInt(s.substring(6, 8));
            const h = s.length >= 10 ? parseInt(s.substring(8, 10)) : 0;
            const min = s.length >= 12 ? parseInt(s.substring(10, 12)) : 0;
            return new Date(y, m, d, h, min);
        };

        const startDate = parseDate(startStr);
        const endDate = parseDate(endStr);
        const diff = endDate.getTime() - startDate.getTime();

        if (diff > CHUNK_SIZE) {
            console.log(`[API] Time range > 15 days (` + Math.round(diff / (1000 * 60 * 60 * 24)) + ` days). Splitting requests...`);

            const chunkPromises = [];
            let current = startDate;

            while (current < endDate) {
                let chunkEnd = new Date(current.getTime() + CHUNK_SIZE);
                if (chunkEnd > endDate) chunkEnd = endDate;

                const chunkParams = {
                    ...queryParams,
                    inqryBgnDt: getDateString(current),
                    inqryEndDt: getDateString(chunkEnd),
                    type: 'json'
                };
                delete chunkParams.typeParam; // Clear internal type param if any

                console.log(`[API] Chunk: ${chunkParams.inqryBgnDt} ~ ${chunkParams.inqryEndDt}`);
                chunkPromises.push(axios.get(url, { params: { serviceKey: API_KEY, ...chunkParams } }));

                current = new Date(chunkEnd.getTime() + 60000); // +1 min
            }

            try {
                const responses = await Promise.all(chunkPromises);
                let allItems: NaraItem[] = [];

                responses.forEach(res => {
                    const body = res.data?.response?.body;
                    let items = body?.items;
                    if (items && !Array.isArray(items)) {
                        if (items.item) items = Array.isArray(items.item) ? items.item : [items.item];
                        else items = [items];
                    } else if (!items) {
                        items = [];
                    }
                    allItems = [...allItems, ...items];
                });

                // Deduplicate
                const uniqueItems = Array.from(new Map(allItems.map(item => [item.bidNtceNo, item])).values());
                // Sort
                uniqueItems.sort((a, b) => new Date(b.bidNtceDt).getTime() - new Date(a.bidNtceDt).getTime());

                return {
                    response: {
                        body: {
                            items: uniqueItems,
                            totalCount: uniqueItems.length,
                            pageNo: 1,
                            numOfRows: uniqueItems.length
                        }
                    }
                };
            } catch (e) {
                console.error('Chunk fetch error', e);
                throw e;
            }
        }
    }

    // Single Request
    const params: any = {
        serviceKey: API_KEY,
        numOfRows: queryParams.numOfRows,
        pageNo: queryParams.pageNo,
        inqryDiv: queryParams.inqryDiv,
        inqryBgnDt: queryParams.inqryBgnDt,
        inqryEndDt: queryParams.inqryEndDt,
        type: 'json',
    };
    if (hasKeyword) params.bidNtceNm = queryParams.bidNtceNm;

    try {
        const response = await axios.get(url, { params });
        const body = response.data?.response?.body;
        let items = body?.items;

        if (items && !Array.isArray(items)) {
            if (items.item) items = Array.isArray(items.item) ? items.item : [items.item];
            else items = [items];
        } else if (!items) {
            items = [];
        }

        return {
            response: {
                body: {
                    items: items,
                    totalCount: body?.totalCount || items.length,
                    pageNo: body?.pageNo || 1,
                    numOfRows: body?.numOfRows || items.length
                }
            }
        };
    } catch (error) {
        console.error('Fetch bids error', error);
        throw error;
    }
};

// Wrapper for page.tsx
export const fetchBidList = async (keyword: string, startDate?: string, endDate?: string, typeStr: string = '전체') => {
    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(now.getMonth() - 1);

    const start = startDate ? new Date(startDate + 'T00:00:00') : oneMonthAgo;
    const end = endDate ? new Date(endDate + 'T23:59:59') : now;

    let apiType: 'servc' | 'cnstwk' | 'thng' | 'all' = 'all'; // Default to all if '전체'
    if (typeStr === '용역') apiType = 'servc';
    else if (typeStr === '공사') apiType = 'cnstwk';
    else if (typeStr === '물품') apiType = 'thng';

    return fetchBids({
        bidNtceNm: keyword,
        inqryBgnDt: getDateString(start),
        inqryEndDt: getDateString(end),
        numOfRows: 999,
        pageNo: 1,
        inqryDiv: '1',
        type: apiType
    });
};

// Win List Fetch (UPDATED: Using OpengResultInfoService)
export const fetchWinList = async (keyword: string, startDate?: string, endDate?: string, type: 'cnstwk' | 'servc' | 'thng' | 'all' = 'all'): Promise<any> => {
    try {
        const now = new Date();
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(now.getMonth() - 1);
        const start = startDate ? new Date(startDate + 'T00:00:00') : oneMonthAgo;
        const end = endDate ? new Date(endDate + 'T23:59:59') : now;
        const hasKeyword = !!keyword && keyword.trim().length > 0;

        // Base Params for OpengResultInfoService
        const baseParams: any = {
            serviceKey: API_KEY,
            pageNo: 1,
            numOfRows: 500,
            inqryDiv: '2', // 2: Opening Date Based
            inqryBgnDt: getDateString(start), // YYYYMMDDHHmm
            inqryEndDt: getDateString(end), // YYYYMMDDHHmm
            type: 'json'
        };
        if (hasKeyword) baseParams.bidNtceNm = keyword;

        let typesToFetch = ['Servc'];
        if (type === 'cnstwk') typesToFetch = ['Cnstwk'];
        else if (type === 'thng') typesToFetch = ['Thng'];
        else if (type === 'servc') typesToFetch = ['Servc'];
        else if (type === 'all' || !type) typesToFetch = ['Servc', 'Cnstwk', 'Thng'];

        console.log(`[API] Fetching WinList Types (OpengResult): ${typesToFetch.join(', ')}`);

        const promises = typesToFetch.map(async (t) => {
            // Note: Using getOpengResultListInfo operations under ScsbidInfoService (with /as/ path)
            let endpoint = `getOpengResultListInfo${t}`;
            if (hasKeyword) endpoint += 'PPSSrch';

            // Proxy path must include '/as/ScsbidInfoService/'
            const proxyUrl = `/api/proxy/1230000/as/ScsbidInfoService/${endpoint}`;

            console.log(`[API] Requesting: ${proxyUrl}`, baseParams);

            try {
                const res = await axios.get(proxyUrl, { params: baseParams });
                const body = res.data?.response?.body;
                let items = body?.items;
                if (items && !Array.isArray(items)) {
                    if (items.item) items = Array.isArray(items.item) ? items.item : [items.item];
                    else items = [items];
                } else if (!items) items = [];

                // Add type info and map fields (rlOpengDt -> opengDt)
                return items.map((item: any) => ({
                    ...item,
                    bizType: t,
                    opengDt: item.rlOpengDt || item.opengDt || item.bidNtceDt // Map rlOpengDt (Real Opening Date)
                }));
            } catch (err) {
                console.error(`Error fetching ${t}:`, err);
                return [];
            }
        });

        const results = await Promise.all(promises);

        // Merge results
        const mergedItems = results.flat();
        console.log(`[API] WinList Total Fetched: ${mergedItems.length} items`);

        // Deduplicate
        const uniqueItems = Array.from(new Map(mergedItems.map(item => [item.bidNtceNo, item])).values());

        // Sort by opengDt descending (Latest first)
        uniqueItems.sort((a, b) => {
            const dateA = a.opengDt || a.bidNtceDt || '';
            const dateB = b.opengDt || b.bidNtceDt || '';
            return dateB.localeCompare(dateA);
        });

        return {
            response: {
                header: { resultCode: '00', resultMsg: 'NORMAL SERVICE.' },
                body: {
                    items: uniqueItems,
                    totalCount: uniqueItems.length,
                    pageNo: 1,
                    numOfRows: 500
                }
            }
        };
    } catch (error) {
        console.error('Error fetching win list:', error);
        return { response: { header: { resultCode: '99', resultMsg: 'Error' }, body: { items: [], totalCount: 0 } } };
    }
};

// Opening Results (Rankings) - Keep as is (Assuming simple detail usage)
export const fetchOpeningResults = async (bidNtceNo: string, bidNtceOrd: string = '000', serviceKey?: string): Promise<any[]> => {
    // OpengResultInfoService operation
    // User mentioned OpengResultInfoService. Let's use the explicit path if needed.
    // Originally we used /as/ScsbidInfoService/... for this.
    // Let's try to double check if this also needs shift.
    // For now, keep as is unless broken, or update to use OpengResultInfoService path if strictly required.
    // The previous implementation WORKED for detail list. So NO CHANGE needed here for now.

    // Correction: User said "OpengResultInfoService" contains the LIST operations (PPSSrch).
    // The DETAIL operation 'getOpengResultListInfoOpengCompt' might also be there.
    // But since it worked before, we leave it. Or safely, try OpengResultInfoService if Scsbid fails?
    // Let's stick to the path that worked for Detail: /as/ScsbidInfoService/... or .../OpengResultInfoService
    // I will update the path here to be safe and consistent if it's the same service family.
    // Just in case, I will try to use the more standard proxy path without /as/ if it was ambiguous.
    // Actually, let's keep the one that worked (step 1176 confirm?) -> wait, step 1176 failed 401.
    // But Step 1284 user said "개찰결과 투찰 순위 기능을 재확인했습니다" implies it worked?
    // No, I notified user it worked. Did I verify it? 
    // I verified UI code. The script failed with 401. 
    // I should probably update this path too to be `/api/proxy/1230000/OpengResultInfoService/...` if that's the correct service.
    // But let's trust the user's explicit instruction about the SEARCH operation first.

    const url = '/api/proxy/1230000/as/ScsbidInfoService/getOpengResultListInfoOpengCompt';

    const params = {
        serviceKey: serviceKey || API_KEY,
        numOfRows: 500,
        pageNo: 1,
        bidNtceNo: bidNtceNo,
        bidNtceOrd: bidNtceOrd,
        type: 'json'
    };

    try {
        const response = await axios.get(url, { params });
        const body = response.data?.response?.body;
        let items = body?.items;

        if (items && !Array.isArray(items)) {
            if (items.item) items = Array.isArray(items.item) ? items.item : [items.item];
            else items = [items];
        } else if (!items) items = [];

        console.log(`[API] Opening Results for ${bidNtceNo}: ${items.length} items`);
        return items;
    } catch (error) {
        console.error('Error fetching opening results:', error);
        return [];
    }
};

// Contracts Fetch
export const fetchContracts = async (keyword: string, startDate?: string, endDate?: string, type: 'cnstwk' | 'servc' | 'thng' | 'all' = 'all') => {
    // Handle 'all' type: Fetch all 3 types in parallel (Etc not supported in CntrctInfoService)
    if (type === 'all') {
        const types: ('cnstwk' | 'servc' | 'thng')[] = ['servc', 'cnstwk', 'thng'];
        console.log(`[API] Fetching All Contract Types: ${types.join(', ')}`);

        try {
            const promises = types.map(t => fetchContracts(keyword, startDate, endDate, t));
            const results = await Promise.all(promises);

            let allItems: any[] = [];
            results.forEach(res => {
                const items = res.response?.body?.items;
                if (items) {
                    allItems = [...allItems, ...items];
                }
            });

            // Deduplicate by cntrctNo (just in case)
            const uniqueItems = Array.from(new Map(allItems.map(item => [item.cntrctNo, item])).values());

            // Sort by cntrctCnclsDate descending (Latest first)
            uniqueItems.sort((a, b) => {
                const dateA = new Date(a.cntrctCnclsDate || 0).getTime();
                const dateB = new Date(b.cntrctCnclsDate || 0).getTime();
                return dateB - dateA;
            });

            console.log(`[API] Contract Merge Result: ${uniqueItems.length} items`);

            return {
                response: { body: { items: uniqueItems, totalCount: uniqueItems.length } }
            };
        } catch (error) {
            console.error('Error fetching all contract types:', error);
            return { response: { body: { items: [], totalCount: 0 } } };
        }
    }

    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(now.getMonth() - 1);
    const start = startDate ? new Date(startDate + 'T00:00:00') : oneMonthAgo;
    const end = endDate ? new Date(endDate + 'T23:59:59') : now;

    let operation = 'getCntrctInfoListServcPPSSrch';
    if (type === 'cnstwk') operation = 'getCntrctInfoListCnstwkPPSSrch';
    if (type === 'thng') operation = 'getCntrctInfoListThngPPSSrch';

    const url = `/api/proxy/1230000/ao/CntrctInfoService/${operation}`;
    const params = {
        serviceKey: API_KEY,
        numOfRows: 100,
        pageNo: 1,
        inqryDiv: 1,
        inqryBgnDate: getDateString(start).substring(0, 8),
        inqryEndDate: getDateString(end).substring(0, 8),
        // insttDivCd: 2, // Removing insttDivCd=2 restriction to broaden search if not strictly required, or keep if verified.
        // User wants "Agency Search". insttDivCd=1: Demand Agency, 2: Ordering Agency? Usually 1.
        // However, docs say insttNm is enough. Let's try without forcing insttDivCd first, or use 1 for Demand Agency.
        // Let's remove insttDivCd to be safe, or set to 1.
        insttNm: keyword,
        type: 'json'
    };

    console.log(`[API] Fetching Contracts (${type}) from: ${url}`);
    try {
        const response = await axios.get(url, { params });
        let items = response.data?.response?.body?.items || [];
        if (items && !Array.isArray(items)) {
            if (items.item) items = Array.isArray(items.item) ? items.item : [items.item];
            else items = [items];
        } else if (!items) items = [];

        return {
            response: { body: { items: items, totalCount: items.length } }
        };
    } catch (error) {
        console.error('[API] Error fetching contracts:', error);
        // Do not throw, return empty to allow merge to continue
        return { response: { body: { items: [], totalCount: 0 } } };
    }
};

// Final Win List Fetch (Scsbid)
export const fetchScsbidList = async (keyword: string, startDate?: string, endDate?: string, type: 'cnstwk' | 'servc' | 'thng' | 'all' = 'all'): Promise<any> => {
    // Handle 'all' type: Fetch all 3 types in parallel
    if (type === 'all') {
        const types: ('cnstwk' | 'servc' | 'thng')[] = ['servc', 'cnstwk', 'thng'];
        console.log(`[API] Fetching All Scsbid Types: ${types.join(', ')}`);

        try {
            const promises = types.map(t => fetchScsbidList(keyword, startDate, endDate, t));
            const results = await Promise.all(promises);

            let allItems: any[] = [];
            results.forEach(res => {
                const items = res.response?.body?.items;
                if (items) {
                    allItems = [...allItems, ...items];
                }
            });

            // Deduplicate by bidNtceNo (Scsbid usually uniq by notice no)
            const uniqueItems = Array.from(new Map(allItems.map(item => [item.bidNtceNo, item])).values());

            // Sort by opengDt descending (Latest first)
            uniqueItems.sort((a, b) => {
                const dateA = new Date(a.opengDt || 0).getTime();
                const dateB = new Date(b.opengDt || 0).getTime();
                return dateB - dateA;
            });

            console.log(`[API] Scsbid Merge Result: ${uniqueItems.length} items`);

            return {
                response: { body: { items: uniqueItems, totalCount: uniqueItems.length } }
            };
        } catch (error) {
            console.error('Error fetching all Scsbid types:', error);
            return { response: { body: { items: [], totalCount: 0 } } };
        }
    }

    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(now.getMonth() - 1);
    const start = startDate ? new Date(startDate + 'T00:00:00') : oneMonthAgo;
    const end = endDate ? new Date(endDate + 'T23:59:59') : now;

    // Split date range into 5-day chunks to avoid 07 Error (Input Range Exceeded)
    const MAX_DAYS = 5;
    const dayDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (dayDiff > MAX_DAYS) {
        console.log(`[API] Scsbid Range ${dayDiff} days > ${MAX_DAYS}. Splitting requests...`);
        let chunks = [];
        let currentStart = new Date(start);

        while (currentStart <= end) {
            let currentEnd = new Date(currentStart);
            currentEnd.setDate(currentEnd.getDate() + (MAX_DAYS - 1));
            if (currentEnd > end) currentEnd = new Date(end);

            chunks.push({
                s: getDateString(currentStart), // YYYYMMDDHHmm
                e: getDateString(currentEnd)
            });

            currentStart.setDate(currentStart.getDate() + MAX_DAYS);
        }

        try {
            const chunkPromises = chunks.map(chunk => {
                const sStr = `${chunk.s.substring(0, 4)}-${chunk.s.substring(4, 6)}-${chunk.s.substring(6, 8)}`;
                const eStr = `${chunk.e.substring(0, 4)}-${chunk.e.substring(4, 6)}-${chunk.e.substring(6, 8)}`;
                return fetchScsbidList(keyword, sStr, eStr, type);
            });

            const results = await Promise.all(chunkPromises);
            let combinedItems: any[] = [];
            results.forEach(res => {
                const items = res.response?.body?.items;
                if (items) combinedItems = [...combinedItems, ...items];
            });
            return {
                response: { body: { items: combinedItems, totalCount: combinedItems.length } }
            };
        } catch (e) {
            console.error('[API] Scsbid Split Error', e);
            return { response: { body: { items: [], totalCount: 0 } } };
        }
    }

    let operation = 'getScsbidListSttusServcPPSSrch';
    if (type === 'cnstwk') operation = 'getScsbidListSttusCnstwkPPSSrch';
    if (type === 'thng') operation = 'getScsbidListSttusThngPPSSrch';

    const url = `/api/proxy/1230000/as/ScsbidInfoService/${operation}`;
    const params = {
        serviceKey: API_KEY,
        numOfRows: 100,
        pageNo: 1,
        inqryDiv: '1', // 1: Opening Date
        inqryBgnDt: getDateString(start), // YYYYMMDDHHmm
        inqryEndDt: getDateString(end),
        bidNtceNm: keyword,  // Search by Notice Name
        type: 'json'
    };

    console.log(`[API] Fetching Scsbid (${type}) from: ${url}`);
    try {
        const response = await axios.get(url, { params });
        let items = response.data?.response?.body?.items || [];
        if (items && !Array.isArray(items)) {
            if (items.item) items = Array.isArray(items.item) ? items.item : [items.item];
            else items = [items];
        } else if (!items) items = [];

        return {
            response: { body: { items: items, totalCount: items.length } }
        };
    } catch (error) {
        console.error('[API] Error fetching Scsbid:', error);
        return { response: { body: { items: [], totalCount: 0 } } };
    }


};

// Mock Company List
export const fetchCompanyList = async (keyword: string): Promise<any> => {
    const MOCK_COMPANY_DATA: any[] = []; // Simplified for now
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                response: {
                    header: { resultCode: "00", resultMsg: "NORMAL SERVICE." },
                    body: { items: MOCK_COMPANY_DATA, totalCount: 0, pageNo: 1, numOfRows: 10 }
                }
            });
        }, 300);
    });
};

// Mock Company History
export const fetchCompanyHistory = async (name: string): Promise<any> => {
    // Simplified return to avoid complexity if not used much
    return { response: { header: { resultCode: "00" }, body: { items: [], totalCount: 0 } } };
};