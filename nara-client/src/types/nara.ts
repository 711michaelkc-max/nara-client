export interface BidNotice {
    bidNtceNo: string; // 입찰공고번호
    bidNtceNm: string; // 입찰공고명
    bidNtceDt: string; // 입찰공고일시
    dminsttNm: string; // 수요기관명
    presmptPrce: string; // 추정가격 (예산)
    bidClseDt: string; // 입찰마감일시
    // Add more fields as needed for the mock
    ntceKindNm?: string; // 공고종류명 (일반, 긴급 등)
    bidBzptNm?: string; // 입찰집행관명? (Or similar) 
    link?: string; // Link to detailed page (mock)
}

export interface BidResponse {
    response: {
        header: {
            resultCode: string;
            resultMsg: string;
        };
        body: {
            items: BidNotice[];
            totalCount: number;
            pageNo: number;
            numOfRows: number;
        };
    };
}

export interface Company {
    bizRegNo: string; // 사업자등록번호
    corpNm: string;   // 상호명
    ceoNm: string;    // 대표자명
    addr: string;     // 주소
    bizType: string;  // 업종
    mainProduct: string; // 주생산품
    creditRating?: string; // 신용등급
    recentPerf?: number; // 최근 실적 건수
}

