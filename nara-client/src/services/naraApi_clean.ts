import axios from 'axios';

// API ???ㅼ젙 (?섍꼍 蹂???먮뒗 吏곸젒 ?낅젰)
const API_KEY = process.env.NEXT_PUBLIC_NARA_API_KEY || '4d03d6d8d9dd48b0fad3d09a9fee0c061e460c231eb630e836ee599c5634650a'; // 媛쒕컻????吏곸젒 ?낅젰 (蹂댁븞???섍꼍蹂??沅뚯옣)
const BASE_URL = '/api/proxy/1230000/ad/BidPublicInfoService';

export interface NaraParams {
    numOfRows: number;
    pageNo: number;
    inqryDiv: string;
    inqryBgnDt: string;
    inqryEndDt: string;
    bidNtceNm?: string;
    type?: 'cnstwk' | 'servc' | 'thng'; // 怨듭궗, ?⑹뿭, 臾쇳뭹
}

export interface NaraItem {
    bidNtceNo: string; // ?낆같怨듦퀬踰덊샇
    bidNtceOrd: string; // ?낆같怨듦퀬李⑥닔
    bidNtceNm: string; // ?낆같怨듦퀬紐?
    bidNtceDt: string; // ?낆같怨듦퀬?쇱떆
    ntceInsttNm: string; // 怨듦퀬湲곌?紐?
    dminsttNm: string; // ?섏슂湲곌?紐?
    bidMethdNm: string; // ?낆같諛⑹떇紐?
    cntrctCnclsMthdNm: string; // 怨꾩빟泥닿껐諛⑸쾿紐?
    ntceInsttOfclNm?: string; // ?낆같吏묓뻾愿紐?(怨듦퀬湲곌??대떦?먮챸)
    bidQlfctRgstDt?: string; // ?낆같李멸??먭꺽?깅줉留덇컧?쇱떆
    cmmnSpldmdAgrmntRcptdocMethd?: string; // 怨듬룞?섍툒?묒젙?쒖젒?섎갑??
    cmmnSpldmdAgrmntClseDt?: string; // 怨듬룞?섍툒?묒젙?쒕쭏媛먯씪??
    bidBeginDt?: string; // ?낆같?쒖젒?섍컻?쒖씪??
    bidClseDt?: string; // ?낆같?쒖젒?섎쭏媛먯씪??
    opengDt?: string; // 媛쒖같?쇱떆
    prearngPrceDcsnMthdNm?: string; // ?덉젙媛寃⑷껐?뺣갑踰뺣챸
    totPrdprcNum?: string; // 諛곗젙?덉궛(珥앹븸)
    drwtPrdprcNum?: string; // 異붿꺼踰덊샇怨듦컻?щ?
    presmptPrce?: string; // 異붿젙媛寃?
    opengPlce?: string; // 媛쒖같?μ냼
    bidNtceDtlUrl: string; // ?낆같怨듦퀬?곸꽭URL
    bidNtceUrl?: string; // ?낆같怨듦퀬URL
    // Additional Detail Fields
    refNo?: string; // 李몄“踰덊샇
    sucsfbidMthdNm?: string; // ?숈같諛⑸쾿
    rbidPermsnYn?: string; // ?ъ엯李고뿀?⑹뿬遺
    dcmtgOprtnPlce?: string; // ?꾩옣?ㅻ챸?뚯옣??
    dcmtgOprtnDt?: string; // ?꾩옣?ㅻ챸?뚯씪??
    crdtrNm?: string; // 梨꾧텒?먮챸
    cmmnSpldmdMethdNm?: string; // 怨듬룞?섍툒諛⑸쾿紐?(怨듬룞?섍툒?묒젙??
    asignBdgtAmt?: string; // 諛곗젙?덉궛
    ntceKindNm?: string; // 怨듦퀬醫낅쪟

    // Progress Dates
    pqApplDocRcptDt?: string; // PQ?ъ궗?좎껌?쒖젒?섏씪??
    tpEvalApplClseDt?: string; // ?쒖븞??洹쒓꺽?쒖젣異쒕쭏媛먯씪??
    rbidOpengDt?: string; // ?ъ엯李곌컻李곗씪??

    // WinList usage
    bidwinrNm?: string;
    bidPrice?: string;
    bidRate?: string;
}

export interface NaraResponse {
    response: {
        header: {
            resultCode: string;
            resultMsg: string;
        };
        body: {
            items: {
                item: NaraItem[] | NaraItem;
            };
            numOfRows: number;
            pageNo: number;
            totalCount: number;
        };
    };
}

function getEndpoint(type: string, hasKeyword: boolean = false): string {
    let endpoint = '';
    switch (type) {
        case 'cnstwk':
            endpoint = 'getBidPblancListInfoCnstwk';
            break;
        case 'servc':
            endpoint = 'getBidPblancListInfoServc';
            break;
        case 'thng':
            endpoint = 'getBidPblancListInfoThng';
            break;
        default:
            endpoint = 'getBidPblancListInfoCnstwk';
    }

    // ?ㅼ썙??寃?됱씠 ?덈뒗 寃쎌슦 PPSSrch ?붾뱶?ъ씤???ъ슜 (?쒕쾭 痢??꾪꽣留??곸슜 - PDF 臾몄꽌 湲곕컲)
    if (hasKeyword) {
        endpoint += 'PPSSrch';
    }

    return endpoint;
}

const getDateString = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}${mm}${dd}${hh}${min}`;
};

export const fetchBids = async (queryParams: NaraParams) => {
    const hasKeyword = !!queryParams.bidNtceNm && queryParams.bidNtceNm.trim().length > 0;
    const endpoint = getEndpoint(queryParams.type || 'cnstwk', hasKeyword);
    const url = `${BASE_URL}/${endpoint}`;

    // Helper: Parse YYYYMMDDHHMM to Date
    const parseParamDate = (str: string) => {
        const y = parseInt(str.substring(0, 4));
        const m = parseInt(str.substring(4, 6)) - 1;
        const d = parseInt(str.substring(6, 8));
        const h = parseInt(str.substring(8, 10));
        const min = parseInt(str.substring(10, 12));
        return new Date(y, m, d, h, min);
    };

    // Helper: Add days
    const addDays = (date: Date, days: number) => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    };

    // 15???댁긽 ?ㅼ썙??寃????遺꾪븷 議고쉶 (API ?ㅻ쪟 諛⑹?)
    if (hasKeyword && queryParams.inqryBgnDt && queryParams.inqryEndDt) {
        const start = parseParamDate(queryParams.inqryBgnDt);
        const end = parseParamDate(queryParams.inqryEndDt);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 15) {
            // console.log(`[API] Splitting request for ${diffDays} days...`);
            const chunkPromises = [];
            let current = new Date(start);

            while (current < end) {
                let chunkEnd = addDays(current, 15);
                if (chunkEnd > end) chunkEnd = end;

                // Adjust chunk end time to 23:59 for full coverage if needed, or stick to provided end
                // Simply use param format:
                const chunkStartStr = getDateString(current);
                const chunkEndStr = getDateString(chunkEnd);

                const chunkParams = {
                    ...queryParams,
                    inqryBgnDt: chunkStartStr,
                    inqryEndDt: chunkEndStr,
                    numOfRows: 999, // Ensure full recall per chunk
                    pageNo: 1,      // Always page 1 for chunks
                    type: 'json'
                };

                // Remove params not for axios
                const { bidNtceNm, ...rest } = chunkParams;
                const apiParams: any = {
                    serviceKey: API_KEY,
                    ...rest
                };
                if (bidNtceNm) apiParams.bidNtceNm = bidNtceNm;

                chunkPromises.push(
                    axios.get<NaraResponse>(url, { params: apiParams }).catch(err => {
                        console.warn(`[API] Chunk failed: ${chunkStartStr}~${chunkEndStr}`, err.message);
                        return { data: { response: { body: { items: [], totalCount: 0 } } } }; // Fallback
                    })
                );

                // Next start is 1 minute after previous end? Or same because HHMM?
                // Logic: 01-01 ~ 01-15, Next 01-15 ~ ?? No, overlap risk.
                // Should be 01-16 00:00 ideally.
                // Let's safe-add 1 second or just 1 day?
                // Standard: Start next chunk from chunkEnd + 1 min?
                // Or just use overlap safely if API allows.
                // Let's do: Next Loop Start = ChunkEnd.
                // Note: If exact timestamps, overlap is minimal.
                current = chunkEnd;
                // Prevent infinite loop if addDays doesn't move forward (unlikely)
                if (chunkEnd >= end) break;
                // Set next start to literally 1 minute after? 
                // getDateString is minutes resolution.
                // Better: current = addDays(chunkEnd, 0); wait, that's same.
                // Let's just update current. Overlapping boundary (e.g. 15th 23:59 vs 15th 23:59) might retrieve same item twice?
                // Nara dates are often strings.
                // Let's set next start to chunkEnd + 1 minute (handled by Date object)
                current = new Date(chunkEnd.getTime() + 60000);
            }

            try {
                const responses = await Promise.all(chunkPromises);
                let allItems: NaraItem[] = [];

                responses.forEach(res => {
                    const body = res.data?.response?.body;
                    if (body) {
                        let itemsRaw = body.items as any;
                        if (itemsRaw && !Array.isArray(itemsRaw) && itemsRaw.item) {
                            itemsRaw = itemsRaw.item;
                        }
                        if (Array.isArray(itemsRaw)) {
                            allItems = [...allItems, ...itemsRaw];
                        } else if (itemsRaw) {
                            allItems.push(itemsRaw);
                        }
                    }
                });

                // Deduplicate by bidNtceNo just in case
                const uniqueItems = Array.from(new Map(allItems.map(item => [item.bidNtceNo, item])).values());

                // Sort descending by date
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
            } catch (error) {
                console.error('[API] Error in split fetch:', error);
                throw error;
            }
        }
    }

    // Default Single Request Logic (No keyword or Short period)
    const params: any = {
        serviceKey: API_KEY,
        numOfRows: queryParams.numOfRows,
        pageNo: queryParams.pageNo,
        inqryDiv: queryParams.inqryDiv,
        inqryBgnDt: queryParams.inqryBgnDt,
        inqryEndDt: queryParams.inqryEndDt,
        type: 'json',
    };

    if (hasKeyword) {
        params.bidNtceNm = queryParams.bidNtceNm;
    }

    console.log(`[API] Fetching from: ${url}`);
    // console.log(`[API] Params:`, params);

    try {
        const response = await axios.get<NaraResponse>(url, { params });

        if (!response.data || !response.data.response || !response.data.response.body) {
            console.error('[API] Invalid response structure:', response.data);
            return { items: [], totalCount: 0 };
        }

        const body = response.data.response.body;

        // Items Parsing Logic: Handle both { items: [...] } and { items: { item: [...] } }
        let itemsRaw = body.items as any;
        if (itemsRaw && !Array.isArray(itemsRaw) && itemsRaw.item) {
            itemsRaw = itemsRaw.item;
        }

        let items: NaraItem[] = [];

        if (Array.isArray(itemsRaw)) {
            items = itemsRaw;
        } else if (itemsRaw) {
            items = [itemsRaw];
        }

        // items is sometimes undefined if no results
        if (!items) items = [];

        return {
            response: {
                body: {
                    items,
                    totalCount: body.totalCount,
                    pageNo: body.pageNo,
                    numOfRows: body.numOfRows
                }
            }
        };
    } catch (error) {
        console.error('[API] Error fetching bids:', error);
        throw error;
    }
};

// Backward compatibility wrapper for page.tsx
export const fetchBidList = async (keyword: string, startDate?: string, endDate?: string, typeStr: string = '?꾩껜') => {
    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(now.getMonth() - 1);

    const start = startDate ? new Date(startDate + 'T00:00:00') : oneMonthAgo;
    const end = endDate ? new Date(endDate + 'T23:59:59') : now;

    // Map UI type string to API type params
    let apiType: 'servc' | 'cnstwk' | 'thng' = 'servc'; // Default
    if (typeStr === '怨듭궗') apiType = 'cnstwk';
    else if (typeStr === '臾쇳뭹') apiType = 'thng';
    else if (typeStr === '?⑹뿭') apiType = 'servc';
    else if (typeStr === '?꾩껜') apiType = 'servc'; // TODO: Handle 'All' by fetching multiple or defaulting

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

// ?숈같?뺣낫 議고쉶 (嫄댁꽕/?⑹뿭/臾쇳뭹 ??
// ?숈같?뺣낫 議고쉶 (嫄댁꽕/?⑹뿭/臾쇳뭹 ??
export const fetchWinList = async (keyword: string, startDate?: string, endDate?: string, type: 'cnstwk' | 'servc' | 'thng' = 'servc'): Promise<any> => {
    try {
        const now = new Date();
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(now.getMonth() - 1);

        const start = startDate ? new Date(startDate + 'T00:00:00') : oneMonthAgo;
        const end = endDate ? new Date(endDate + 'T23:59:59') : now;

        // Endpoint Selection
        // Pattern: getScsbidListSttus{Type}{PPSSrch?}
        // Types: Servc (Services), Cnstwk (Construction), Thng (Goods)
        // Capitalize type for endpoint naming convention
        let typeCap = 'Servc';
        if (type === 'cnstwk') typeCap = 'Cnstwk';
        if (type === 'thng') typeCap = 'Thng';

        const hasKeyword = !!keyword && keyword.trim().length > 0;
        let endpoint = `getScsbidListSttus${typeCap}`;
        if (hasKeyword) {
            endpoint += 'PPSSrch';
        }

        const url = `/api/proxy/1230000/as/ScsbidInfoService/${endpoint}`;

        const params: any = {
            serviceKey: API_KEY,
            pageNo: 1,
            numOfRows: 500,
            inqryDiv: 1,
            inqryBgnDt: getDateString(start),
            inqryEndDt: getDateString(end),
            type: 'json'
        };

        if (hasKeyword) {
            params.bidNtceNm = keyword;
        }

        console.log(`[API] Fetching WinList from: ${url}`, params);

        const response = await axios.get(url, { params });

        const body = response.data?.response?.body;
        let allItems = body?.items || [];

        // Nara API structure varies: { items: [...] } or { items: { item: [...] } }
        if (allItems && !Array.isArray(allItems)) {
            if (allItems.item) {
                allItems = Array.isArray(allItems.item) ? allItems.item : [allItems.item];
            } else {
                allItems = [allItems];
            }
        } else if (!allItems) {
            allItems = [];
        }

        console.log(`[API] WinList Fetched: ${allItems.length} items (Total: ${body?.totalCount})`);

        // Standardize WinList Items to NaraItem format if needed, or keeping generic any
        // Assuming the UI handles the specific fields for win list.

        return {
            response: {
                header: { resultCode: '00', resultMsg: '?뺤긽' },
                body: {
                    items: allItems,
                    totalCount: response.data?.response?.body?.totalCount || allItems.length,
                    pageNo: 1,
                    numOfRows: allItems.length
                }
            }
        };
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

// ?낆껜 議고쉶 (Mock)
export const fetchCompanyList = async (keyword: string): Promise<any> => {
    const MOCK_COMPANY_DATA = [
        {
            bizRegNo: "123-45-67890",
            corpNm: "(二??⑥쿂?명룷?뚰겕",
            ceoNm: "源誘몃옒",
            addr: "?쒖슱?밸퀎??媛뺣궓援??뚰뿤?濡?123",
            bizType: "?뚰봽?몄썾??媛쒕컻",
            mainProduct: "SI, ?쒖뒪???듯빀, AI ?붾（??,
            creditRating: "A-",
            recentPerf: 15
        },
        {
            bizRegNo: "987-65-43210",
            corpNm: "?쇱꽦SDS(二?",
            ceoNm: "?띻만??,
            addr: "?쒖슱?밸퀎???≫뙆援??щ┝?쎈줈 35湲?125",
            bizType: "?뺣낫?듭떊怨듭궗??,
            mainProduct: "IT ?쒕퉬?? 臾쇰쪟 BPO",
            creditRating: "AAA",
            recentPerf: 124
        }
    ];

    return new Promise((resolve) => {
        setTimeout(() => {
            const filtered = keyword.trim() === ''
                ? MOCK_COMPANY_DATA
                : MOCK_COMPANY_DATA.filter(item =>
                    item.corpNm.includes(keyword) ||
                    item.bizRegNo.includes(keyword) ||
                    item.ceoNm.includes(keyword)
                );

            resolve({
                response: {
                    header: { resultCode: "00", resultMsg: "NORMAL SERVICE." },
                    body: {
                        items: filtered,
                        totalCount: filtered.length,
                        pageNo: 1,
                        numOfRows: 10
                    }
                }
            });
        }, 300);
    });
};

// ?낆껜 ?대젰 議고쉶 (?낆같/?숈같 ?곗씠?곗뿉??異붿텧)
export const fetchCompanyHistory = async (name: string): Promise<any> => {
    try {
        const now = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(now.getMonth() - 6);

        const params = {
            serviceKey: API_KEY,
            pageNo: 1,
            numOfRows: 100,
            inqryDiv: 1,
            inqryBgnDt: getDateString(sixMonthsAgo),
            inqryEndDt: getDateString(now),
            type: 'json'
        };

        // ?낆같 諛??숈같 ?곗씠??蹂묐젹 議고쉶 
        // Note: fetchBids瑜??ъ궗?⑺븯嫄곕굹 吏곸젒 ?몄텧
        const bidResponse = await axios.get(`${BASE_URL}/getBidPblancListInfoCnstwk`, { params });
        const winResponse = await axios.get('/api/proxy/1230000/as/ScsbidInfoService/getScsbidListSttusThng', { params });

        const bids = bidResponse.data?.response?.body?.items || [];
        const wins = winResponse.data?.response?.body?.items || [];

        let safeBids = Array.isArray(bids) ? bids : (bids ? [bids] : []);
        let safeWins = Array.isArray(wins) ? wins : (wins ? [wins] : []);

        // ?낆껜紐낆쑝濡??꾪꽣留?
        const relatedBids = safeBids.filter((item: any) =>
            item.dminsttNm?.includes(name) || item.ntceInsttNm?.includes(name)
        ).map((item: any) => ({ ...item, type: '諛쒖＜(怨듦퀬)', date: item.bidNtceDt }));

        const relatedWins = safeWins.filter((item: any) =>
            item.bidwinrNm?.includes(name)
        ).map((item: any) => ({ ...item, type: '?섏＜(?숈같)', date: item.opengDt }));

        const allHistory = [...relatedBids, ...relatedWins]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return {
            response: {
                header: { resultCode: "00", resultMsg: "NORMAL SERVICE." },
                body: {
                    items: allHistory,
                    totalCount: allHistory.length,
                    pageNo: 1,
                    numOfRows: 100
                }
            }
        };
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

// 怨꾩빟?뺣낫 議고쉶 (?섏슂湲곌? 湲곗?)
export const fetchContracts = async (insttNm: string, startDate?: string, endDate?: string, type: 'cnstwk' | 'servc' | 'thng' = 'servc') => {
    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(now.getMonth() - 1);

    const start = startDate ? new Date(startDate + 'T00:00:00') : oneMonthAgo;
    const end = endDate ? new Date(endDate + 'T23:59:59') : now;

    // Type mapping to Operation
    let operation = 'getCntrctInfoListServcPPSSrch'; // Default
    if (type === 'cnstwk') operation = 'getCntrctInfoListCnstwkPPSSrch';
    if (type === 'thng') operation = 'getCntrctInfoListThngPPSSrch';

    // Note: CntrctInfoService URL is /ao/ (not /ad/)
    const url = `/api/proxy/1230000/ao/CntrctInfoService/${operation}`;

    const params = {
        serviceKey: API_KEY,
        numOfRows: 100, // Search specific agency might have fewer results
        pageNo: 1,
        inqryDiv: 1, // 1: Period Search
        inqryBgnDate: getDateString(start).substring(0, 8), // YYYYMMDD
        inqryEndDate: getDateString(end).substring(0, 8),   // YYYYMMDD
        insttDivCd: 2, // 2: Demanding Agency
        insttNm: insttNm,
        type: 'json'
    };

    console.log(`[API] Fetching Contracts from: ${url}`, params);

    try {
        const response = await axios.get(url, { params });

        let items = response.data?.response?.body?.items || [];
        // Ensure array
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
                    totalCount: response.data?.response?.body?.totalCount || items.length
                }
            }
        };
    } catch (error) {
        console.error('[API] Error fetching contracts:', error);
        throw error;
    }
};

 
 / /   �Z����[̬��  ? J�  ? ��ܮ  1uJ��? ? p��v�  ( ? ���  ? K?�)  
 e x p o r t   c o n s t   f e t c h O p e n i n g R e s u l t s   =   a s y n c   ( b i d N t c e N o :   s t r i n g ,   b i d N t c e O r d :   s t r i n g   =   ' 0 0 0 ' ,   s e r v i c e K e y ? :   s t r i n g ) :   P r o m i s e < a n y [ ] >   = >   {  
         / /   N o t e :   T h e   s p e c i f i c   o p e r a t i o n   ' g e t O p e n g R e s u l t L i s t I n f o O p e n g C o m p t '   i s   l o c a t e d   u n d e r   ' S c s b i d I n f o S e r v i c e '   p a t h   i n   s o m e   c o n t e x t s ,   o r   ' O p e n g R e s u l t I n f o S e r v i c e ' .  
         / /   D e b u g g i n g   c o n f i r m e d :   h t t p : / / a p i s . d a t a . g o . k r / 1 2 3 0 0 0 0 / a s / S c s b i d I n f o S e r v i c e / g e t O p e n g R e s u l t L i s t I n f o O p e n g C o m p t  
         c o n s t   u r l   =   ' / a p i / p r o x y / 1 2 3 0 0 0 0 / a s / S c s b i d I n f o S e r v i c e / g e t O p e n g R e s u l t L i s t I n f o O p e n g C o m p t ' ;   / /   P r o x y   s e t u p   r e q u i r e d  
  
         c o n s t   p a r a m s   =   {  
                 s e r v i c e K e y :   s e r v i c e K e y   | |   p r o c e s s . e n v . N E X T _ P U B L I C _ N A R A _ A P I _ K E Y ,  
                 n u m O f R o w s :   5 0 0 ,  
                 p a g e N o :   1 ,  
                 b i d N t c e N o :   b i d N t c e N o ,  
                 b i d N t c e O r d :   b i d N t c e O r d ,  
                 t y p e :   ' j s o n '  
         } ;  
  
         t r y   {  
                 c o n s t   r e s p o n s e   =   a w a i t   a x i o s . g e t ( u r l ,   {   p a r a m s   } ) ;  
                 c o n s t   b o d y   =   r e s p o n s e . d a t a ? . r e s p o n s e ? . b o d y ;  
                 l e t   i t e m s   =   b o d y ? . i t e m s ;  
  
                 i f   ( i t e m s   & &   ! A r r a y . i s A r r a y ( i t e m s ) )   {  
                         i f   ( i t e m s . i t e m )   {  
                                 i t e m s   =   A r r a y . i s A r r a y ( i t e m s . i t e m )   ?   i t e m s . i t e m   :   [ i t e m s . i t e m ] ;  
                         }   e l s e   {  
                                 i t e m s   =   [ i t e m s ] ;  
                         }  
                 }   e l s e   i f   ( ! i t e m s )   {  
                         i t e m s   =   [ ] ;  
                 }  
  
                 c o n s o l e . l o g ( ` [ A P I ]   O p e n i n g   R e s u l t s   f o r   $ { b i d N t c e N o } :   $ { i t e m s . l e n g t h }   i t e m s ` ) ;  
                 r e t u r n   i t e m s ;  
         }   c a t c h   ( e r r o r )   {  
                 c o n s o l e . e r r o r ( ' E r r o r   f e t c h i n g   o p e n i n g   r e s u l t s : ' ,   e r r o r ) ;  
                 r e t u r n   [ ] ;  
         }  
 } ;  
 