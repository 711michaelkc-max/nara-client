/**
 * React Duplicate Key 에러 수정 가이드
 * 
 * 에러 위치: src/app/page.tsx 라인 462, 500
 * 
 * 문제: bidList.map((bid) => ...) 에서 key={bid.bidNtceNo}를 사용하는데,
 *      같은 bidNtceNo를 가진 항목이 여러 개 있어서 중복 키 에러 발생
 * 
 * 해결 방법:
 * 1. map 함수에 index 파라미터 추가
 * 2. key를 고유하게 만들기 위해 index 조합
 */

// 수정 전 (라인 462):
// {bidList.map((bid: any) => (

// 수정 후:
// {bidList.map((bid: any, index: number) => (


// 수정 전 (라인 465):
// key={bid.bizRegNo}

// 수정 후:
// key={`company-${bid.bizRegNo}-${index}`}


// 수정 전 (라인 500):
// key={bid.bidNtceNo}

// 수정 후:
// key={`bid-${bid.bidNtceNo}-${index}`}


/**
 * 수동 수정 방법:
 * 
 * 1. src/app/page.tsx 파일 열기
 * 2. 라인 462 찾기: {bidList.map((bid: any) => (
 *    → {bidList.map((bid: any, index: number) => ( 로 변경
 * 
 * 3. 라인 465 찾기: key={bid.bizRegNo}
 *    → key={`company-${bid.bizRegNo}-${index}`} 로 변경
 * 
 * 4. 라인 500 찾기: key={bid.bidNtceNo}
 *    → key={`bid-${bid.bidNtceNo}-${index}`} 로 변경
 * 
 * 5. 저장 후 개발 서버 재시작
 */

console.log("React Duplicate Key 에러 수정 가이드");
console.log("위 주석을 참고하여 src/app/page.tsx 파일을 수정해주세요.");
