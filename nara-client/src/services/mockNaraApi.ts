import { BidNotice, BidResponse } from "@/types/nara";

const MOCK_DATA: BidNotice[] = [
    // 1. 용역 (Service)
    {
        bidNtceNo: "20231200001",
        bidNtceNm: "[긴급] 2024년도 차세대 AI 시스템 구축 및 유지보수 용역",
        bidNtceDt: "2023-12-19 10:00",
        dminsttNm: "한국지능정보사회진흥원",
        presmptPrce: "500,000,000",
        bidClseDt: "2023-12-26 18:00",
        ntceKindNm: "긴급"
    },
    {
        bidNtceNo: "20231200002",
        bidNtceNm: "2024년 교육청 통합 메신저 고도화 사업",
        bidNtceDt: "2023-12-18 14:00",
        dminsttNm: "경기도교육청",
        presmptPrce: "230,000,000",
        bidClseDt: "2023-12-28 10:00",
        ntceKindNm: "일반"
    },
    {
        bidNtceNo: "20231200003",
        bidNtceNm: "공공데이터 품질관리 수준진단 용역",
        bidNtceDt: "2023-12-17 09:00",
        dminsttNm: "행정안전부",
        presmptPrce: "150,000,000",
        bidClseDt: "2024-01-05 18:00",
        ntceKindNm: "일반"
    },
    // 2. 물품 (Goods)
    {
        bidNtceNo: "20231200004",
        bidNtceNm: "노후 업무용 PC 및 노트북 교체(1200대)",
        bidNtceDt: "2023-12-19 11:30",
        dminsttNm: "서울특별시청",
        presmptPrce: "1,200,000,000",
        bidClseDt: "2023-12-27 17:00",
        ntceKindNm: "일반"
    },
    {
        bidNtceNo: "20231200005",
        bidNtceNm: "데이터센터 서버 랙(Rack) 이중화 장비 구매",
        bidNtceDt: "2023-12-16 15:00",
        dminsttNm: "국가정보자원관리원",
        presmptPrce: "80,000,000",
        bidClseDt: "2023-12-22 18:00",
        ntceKindNm: "긴급"
    },
    // 3. 공사 (Construction)
    {
        bidNtceNo: "20231200006",
        bidNtceNm: "본관 청사 외벽 리모델링 및 내진보강 공사",
        bidNtceDt: "2023-12-15 13:00",
        dminsttNm: "강원특별자치도",
        presmptPrce: "3,500,000,000",
        bidClseDt: "2024-01-15 14:00",
        ntceKindNm: "일반"
    },
    {
        bidNtceNo: "20231200007",
        bidNtceNm: "체육관 바닥 샌딩 및 도장 공사 (소액수의)",
        bidNtceDt: "2023-12-19 16:00",
        dminsttNm: "서울대학교사범대학부설고등학교",
        presmptPrce: "25,000,000",
        bidClseDt: "2023-12-21 10:00",
        ntceKindNm: "수의(소액)"
    },
    // 4. 기타
    {
        bidNtceNo: "20231200008",
        bidNtceNm: "2024년 해외 선진지 시찰 위탁 용역",
        bidNtceDt: "2023-12-18 10:00",
        dminsttNm: "한국관광공사",
        presmptPrce: "45,000,000",
        bidClseDt: "2023-12-29 18:00",
        ntceKindNm: "일반"
    }
];

export const fetchBidListMock = async (keyword: string): Promise<BidResponse> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            // If keyword is '테스트' or empty, return ALL data
            const isTest = keyword === '테스트' || keyword.trim() === '';

            const filtered = isTest
                ? MOCK_DATA
                : MOCK_DATA.filter(item => item.bidNtceNm.includes(keyword) || item.dminsttNm.includes(keyword));

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
        }, 300); // 300ms delay
    });
};
// ... (previous code)

// ... (previous code MOCK_DATA)

const MOCK_WIN_DATA: any[] = [
    {
        bidNtceNo: "20231200001",
        bidNtceNm: "[긴급] 2024년도 차세대 AI 시스템 구축 및 유지보수 용역",
        opendDt: "2023-12-26 19:00",
        dminsttNm: "한국지능정보사회진흥원",
        winnerNm: "(주)퓨처인포테크",
        bidPrice: "489,500,000",
        bidRate: "97.9%"
    },
    {
        bidNtceNo: "20231200004",
        bidNtceNm: "노후 업무용 PC 및 노트북 교체(1200대)",
        opendDt: "2023-12-27 18:00",
        dminsttNm: "서울특별시청",
        winnerNm: "삼성SDS(주)",
        bidPrice: "1,150,000,000",
        bidRate: "95.8%"
    },
    {
        bidNtceNo: "20231200006",
        bidNtceNm: "본관 청사 외벽 리모델링 및 내진보강 공사",
        opendDt: "2023-12-20 14:00",
        dminsttNm: "강원특별자치도",
        winnerNm: "(유)강원건설",
        bidPrice: "3,100,000,000",
        bidRate: "88.5%"
    },
    {
        bidNtceNo: "20231299999",
        bidNtceNm: "2024년도 공공데이터 개방 사업 (1차)",
        opendDt: "2023-12-10 11:00",
        dminsttNm: "행정안전부",
        winnerNm: "미투찰 유찰",
        bidPrice: "-",
        bidRate: "-"
    },
    {
        bidNtceNo: "20231200010",
        bidNtceNm: "강남구 CCTV 통합관제센터 고도화",
        opendDt: "2023-12-29 11:00",
        dminsttNm: "서울특별시 강남구",
        winnerNm: "(주)이글루코퍼레이션",
        bidPrice: "850,000,000",
        bidRate: "91.2%"
    }
];

export const fetchWinListMock = async (keyword: string): Promise<any> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const isTest = keyword === '테스트' || keyword.trim() === '';
            const filtered = isTest
                ? MOCK_WIN_DATA
                : MOCK_WIN_DATA.filter(item =>
                    item.bidNtceNm.includes(keyword) ||
                    item.dminsttNm.includes(keyword) ||
                    (item.winnerNm && item.winnerNm.includes(keyword))
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

const MOCK_COMPANY_DATA: any[] = [
    {
        bizRegNo: "123-45-67890",
        corpNm: "(주)퓨처인포테크",
        ceoNm: "김미래",
        addr: "서울특별시 강남구 테헤란로 123",
        bizType: "소프트웨어 개발",
        mainProduct: "SI, 시스템 통합, AI 솔루션",
        creditRating: "A-",
        recentPerf: 15
    },
    {
        bizRegNo: "987-65-43210",
        corpNm: "삼성SDS(주)",
        ceoNm: "홍길동",
        addr: "서울특별시 송파구 올림픽로 35길 125",
        bizType: "정보통신공사업",
        mainProduct: "IT 서비스, 물류 BPO",
        creditRating: "AAA",
        recentPerf: 124
    },
    {
        bizRegNo: "111-22-33333",
        corpNm: "(유)강원건설",
        ceoNm: "박건설",
        addr: "강원특별자치도 춘천시 공지로 5",
        bizType: "건설업",
        mainProduct: "토목, 건축, 조경",
        creditRating: "BBB+",
        recentPerf: 8
    },
    {
        bizRegNo: "555-44-33221",
        corpNm: "(주)이글루코퍼레이션",
        ceoNm: "이보안",
        addr: "서울특별시 송파구 정의로 8",
        bizType: "정보보안",
        mainProduct: "보안관제, 정보보호 솔루션",
        creditRating: "A",
        recentPerf: 42
    },
    {
        bizRegNo: "333-55-77777",
        corpNm: "대박상사",
        ceoNm: "최대박",
        addr: "경기도 성남시 분당구 판교로 255",
        bizType: "도소매",
        mainProduct: "사무용품, 전산소모품",
        creditRating: "BB",
        recentPerf: 2
    }
];

export const fetchCompanyListMock = async (keyword: string): Promise<any> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const isTest = keyword === '테스트' || keyword.trim() === '';
            const filtered = isTest
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

export const fetchCompanyHistory = async (name: string): Promise<any> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            // Find Bids where this company is the agency (dminsttNm)
            const bids = MOCK_DATA.filter(item => item.dminsttNm === name);

            // Find Wins where this company is the winner (winnerNm)
            const wins = MOCK_WIN_DATA.filter(item => item.winnerNm === name);

            // Also find Wins where this company is the agency (dminsttNm)
            const agencyWins = MOCK_WIN_DATA.filter(item => item.dminsttNm === name);

            // Combine and sort by date (newest first)
            // Note: We need a common date field for sorting. Bid: bidNtceDt, Win: opendDt
            const allHistory = [
                ...bids.map(item => ({ ...item, type: '발주(공고)', date: item.bidNtceDt })),
                ...wins.map(item => ({ ...item, type: '수주(낙찰)', date: item.opendDt })),
                ...agencyWins.map(item => ({ ...item, type: '발주(개찰)', date: item.opendDt }))
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            resolve({
                response: {
                    header: { resultCode: "00", resultMsg: "NORMAL SERVICE." },
                    body: {
                        items: allHistory,
                        totalCount: allHistory.length,
                        pageNo: 1,
                        numOfRows: 100
                    }
                }
            });
        }, 300);
    });
};
