import axios from 'axios';

// 개찰결과 투찰 업체 리스트 조회 (순위 포함)
export const fetchOpeningResults = async (bidNtceNo: string, bidNtceOrd: string = '000', serviceKey?: string): Promise<any[]> => {
    // Note: The specific operation 'getOpengResultListInfoOpengCompt' is located under 'ScsbidInfoService' path in some contexts, or 'OpengResultInfoService'.
    // Debugging confirmed: http://apis.data.go.kr/1230000/as/ScsbidInfoService/getOpengResultListInfoOpengCompt
    const url = '/api/proxy/1230000/as/ScsbidInfoService/getOpengResultListInfoOpengCompt'; // Proxy setup required

    const params = {
        serviceKey: serviceKey || process.env.NEXT_PUBLIC_NARA_API_KEY,
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
            if (items.item) {
                items = Array.isArray(items.item) ? items.item : [items.item];
            } else {
                items = [items];
            }
        } else if (!items) {
            items = [];
        }

        console.log(`[API] Opening Results for ${bidNtceNo}: ${items.length} items`);
        return items;
    } catch (error) {
        console.error('Error fetching opening results:', error);
        return [];
    }
};
