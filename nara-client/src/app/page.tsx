
"use client";

import { useState, useEffect } from "react";
import { fetchBidList, fetchWinList, fetchScsbidList, fetchContracts, fetchOpeningResults } from "@/services/naraApi";

import { BidNotice } from "@/types/nara";
import TestDetailView from "@/app/components/TestDetailView";

type TabType = 'bid' | 'result' | 'win'; // Changed 'contract' to 'win'

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('bid'); // Changed 'contract' to 'win'
  const [detailSearch, setDetailSearch] = useState(""); // 개찰 상세 검색어 상태

  // Search State
  const [keyword, setKeyword] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [bidType, setBidType] = useState("용역"); // Default to '용역'

  // Analysis State
  const [analysisResult, setAnalysisResult] = useState<{ country: string, personnel: string, budget: string, status: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // History Mock State
  const [history, setHistory] = useState<any[]>([]);

  // Result State
  const [bidList, setBidList] = useState<any[]>([]); // Use any[] for mixed types (Bid/Win/Contract)
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedBid, setSelectedBid] = useState<any | null>(null);
  const [selectedTestBid, setSelectedTestBid] = useState<any | null>(null); // New State for Test Mode
  const [isMobileView, setIsMobileView] = useState(false); // Mobile Test Mode State

  // Participants State for Result Detail
  const [bidParticipants, setBidParticipants] = useState<any[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  // Reset analysis when selecting a new bid
  useEffect(() => {
    setAnalysisResult(null);
    setIsAnalyzing(false);
    if (selectedBid) {
      window.scrollTo(0, 0); // ✅ Fix: Scroll to top
      // Allow a brief delay for render, or call immediately (async is fine)
      handleAnalyzeBid();
    }
  }, [selectedBid]);

  // Fetch participants when selectedBid changes (only for Result tab)
  useEffect(() => {
    if (activeTab === 'result' && selectedBid) {
      setLoadingParticipants(true);
      setDetailSearch(""); // 상세 검색어 초기화
      // Use bidNtceOrd if available, otherwise '000'
      const ord = selectedBid.bidNtceOrd || '000';
      fetchOpeningResults(selectedBid.bidNtceNo, ord)
        .then((data: any[]) => {
          setBidParticipants(data || []);
          setLoadingParticipants(false);
        })
        .catch((err: any) => {
          console.error(err);
          setBidParticipants([]);
          setLoadingParticipants(false);
        });
    } else {
      setBidParticipants([]);
      setDetailSearch("");
    }
  }, [selectedBid, activeTab]);

  // Clear search results when tab changes
  useEffect(() => {
    setBidList([]);
    setSearched(false);
    setSelectedBid(null);
    setSelectedTestBid(null); // Clear test mode on tab change
    setKeyword(''); // Optional: clear keyword too if desired, user said "erase search results", usually implies fresh start. Let's clear search results + selected.
    // User said "다른 탭에서 검색한 검색결과는 모두 지워지도록". Usually keeping keyword is fine, but clearing lists is the main thing.
    // Let's keep keyword for convenience unless asked, but user said "search results cleared".
  }, [activeTab]);

  // Set default date (1 month) on mount
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setMonth(end.getMonth() - 1);  // ✅ 1주일 → 1개월로 변경
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    setEndDate(formatDate(end));
    setStartDate(formatDate(start));

    // Auto-detect Mobile Environment
    const userAgent = navigator.userAgent;
    const isAndroid = /Android/i.test(userAgent);
    const isSmallScreen = window.innerWidth < 768;

    if (isAndroid || isSmallScreen) {
      setIsMobileView(true);
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSearched(true);
    setAnalysisResult(null); // Clear previous analysis

    // Add to history
    if (keyword) {
      setHistory(prev => {
        const filtered = prev.filter(item => item.keyword !== keyword);
        const newHistory = [
          { id: Date.now(), keyword, date: '사용자 지정', type: bidType },
          ...filtered
        ];
        return newHistory.slice(0, 10);
      });
    }

    try {
      let result;
      // Map UI type string to API type params for Contracts and WinList
      let apiType: 'servc' | 'cnstwk' | 'thng' | undefined = undefined;
      if (bidType === '공사') apiType = 'cnstwk';
      else if (bidType === '물품') apiType = 'thng';
      else if (bidType === '용역') apiType = 'servc'; // Explicitly map '용역'

      if (activeTab === 'bid') {
        result = await fetchBidList(keyword, startDate, endDate, bidType);
      } else if (activeTab === 'result') {
        // Now supports type and keywords properly
        result = await fetchWinList(keyword, startDate, endDate, apiType);
      } else { // activeTab === 'win'
        // Using fetchScsbidList for Win Results
        result = await fetchScsbidList(keyword, startDate, endDate, apiType);
      }

      console.log('API Response:', result);

      // 안전하게 응답 데이터 추출
      const items = result?.response?.body?.items || [];
      setBidList(items);

      if (items.length === 0) {
        console.warn('No items found in response');
      }
    } catch (error) {
      console.error("Search failed", error);
      setBidList([]); // 에러 시 빈 배열로 설정
    } finally {
      setLoading(false);
    }
  };

  const setDateRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    setEndDate(formatDate(end));
    setStartDate(formatDate(start));
  };

  const applyHistory = (item: any) => {
    setKeyword(item.keyword);
    setBidType(item.type);
    setDateRange(item.date === '1개월' ? 30 : 7);
  };

  const deleteHistory = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  // --------------------------------------------------------------------------
  // AI Analysis Logic
  // --------------------------------------------------------------------------

  // Validation Helpers
  const isValidCountry = (text: string) => {
    if (!text || text === "정보 없음") return false;
    // Known valid countries/regions whitelist
    const whiteList = ["미국", "중국", "일본", "베트남", "싱가포르", "호주", "유럽", "영국", "독일", "프랑스", "홍콩", "대만", "태국", "필리핀", "말레이시아", "인도네시아", "캐나다", "뉴질랜드", "동남아", "북미", "남미"];
    // Check if the text contains any of the whitelist words
    return whiteList.some(c => text.includes(c));
  };

  const isValidPersonnel = (text: string) => {
    if (!text || text === "정보 없음") return false;
    // Must look like a number (e.g., "30명", "30", "약 30명")
    // Remove commas and spaces
    const clean = text.replace(/[^0-9]/g, '');
    return clean.length > 0;
  };

  const parseNumber = (str: string): number => {
    if (!str) return 0;
    const clean = str.replace(/[^0-9]/g, '');
    return parseInt(clean, 10) || 0;
  };

  const handleAnalyzeBid = async () => {
    if (!selectedBid) return;
    setIsAnalyzing(true);

    // 1. Find Best File
    let targetUrl = "";
    let targetName = "";

    // Priority keywords
    const priorities = ["과업지시서", "과업내용서", "제안요청서", "규격서", "사양서", "공고문", "공고서"];

    // Collect all files
    const files = [];
    for (let i = 1; i <= 10; i++) {
      const name = selectedBid[`ntceSpecFileNm${i}`];
      const url = selectedBid[`ntceSpecDocUrl${i}`];
      if (name && url) files.push({ name, url });
    }

    // Find match
    for (const keyword of priorities) {
      const match = files.find(f => f.name.includes(keyword));
      if (match) {
        targetUrl = match.url;
        targetName = match.name;
        break;
      }
    }

    // Fallback: Pick first HWP/PDF if no priority match
    if (!targetUrl && files.length > 0) {
      const fallback = files.find(f => f.name.toLowerCase().endsWith('.hwp') || f.name.toLowerCase().endsWith('.pdf') || f.name.toLowerCase().endsWith('.hwpx'));
      if (fallback) {
        targetUrl = fallback.url;
        targetName = fallback.name;
      }
    }

    if (!targetUrl) {
      setAnalysisResult({
        country: "정보 없음",
        personnel: "정보 없음",
        budget: "정보 없음",
        status: "파일없음"
      });
      setIsAnalyzing(false);
      return;
    }

    // 2. Call API
    try {
      const response = await fetch('/api/parse-attachment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl, fileName: targetName }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setAnalysisResult({
        country: data.country || "정보 없음",
        personnel: data.personnel || "정보 없음",
        budget: data.budget || "정보 없음",
        status: "완료"
      });

    } catch (e) {
      console.error(e);
      setAnalysisResult({
        country: "분석실패",
        personnel: "분석실패",
        budget: "분석실패",
        status: "오류"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };


  // Detail View Component
  const renderDetailView = () => {
    if (!selectedBid) return null;

    // Helper text
    const isWin = activeTab === 'win';
    const isResult = activeTab === 'result';

    // Different Layout for 'Result' (WinList)
    if (isResult) {
      return (
        <div className={`mx-auto px-4 py-4 animate-in fade-in slide-in-from-right-4 duration-300 ${isMobileView ? 'w-[390px] bg-white' : 'w-full max-w-5xl'}`}>
          {/* Header & Back Button */}
          <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-3">
            <h2 className="text-xl font-black text-black">개찰결과</h2>
            <button
              onClick={() => setSelectedBid(null)}
              className="text-xs font-bold text-gray-600 hover:text-black px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
            >
              ✕ 닫기
            </button>
          </div>

          {/* 1. Notice Info (공고정보) */}
          <div className="mb-8">
            <div className="flex justify-between items-end mb-2">
              <h3 className="text-sm font-bold text-black">공고정보</h3>

            </div>

            <div className="border-t-2 border-blue-600 border-b border-gray-300 text-xs">
              {/* Simplified layout for Result View - Keeping it basic as requested focus is Bid View */}
              <div className="grid grid-cols-[120px_1fr] border-b border-gray-200">
                <div className="bg-gray-50 p-2 font-bold flex items-center">입찰공고번호</div>
                <div className="p-2 text-blue-600 font-bold flex items-center">{selectedBid.bidNtceNo}</div>
              </div>
              <div className="grid grid-cols-[120px_1fr] border-b border-gray-200">
                <div className="bg-gray-50 p-2 font-bold flex items-center">입찰공고명</div>
                <div className="p-2 font-bold flex items-center">{selectedBid.bidNtceNm}</div>
              </div>
              <div className="bg-gray-50 p-4 text-center text-gray-400">
                상세 내용은 입찰공고 탭에서 확인 가능합니다.
              </div>
            </div>
          </div>

          {/* 2. List (목록) */}
          <div>
            <div className="flex justify-between items-center mb-2 border-b-2 border-black pb-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-black">목록</h3>
                <span className="text-xs text-red-500 font-bold">
                  전체 {bidParticipants.length > 0 ? bidParticipants.length : (selectedBid.bidwinrNm ? '1' : '0')}건
                  {loadingParticipants && ' (조회중...)'}
                </span>
              </div>

            </div>

            <div className="overflow-x-auto h-[400px] overflow-y-scroll border-b border-gray-300">
              <table className="w-full text-xs text-center border-collapse table-fixed">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-100 border-t border-gray-400 border-b border-gray-300 font-bold text-gray-700">
                    <th className="py-2 px-1 w-12 bg-gray-100">순위</th>

                    <th className="py-2 px-2 w-auto bg-gray-100">업체명</th>
                    <th className="py-2 px-2 w-20 bg-gray-100">대표자명</th>
                    <th className="py-2 px-2 w-28 bg-gray-100">입찰금액(원)</th>

                  </tr>
                </thead>
                <tbody>
                  {/* Simplified Body for Brevity - Keeping Core Data */}
                  {bidParticipants.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-200 hover:bg-blue-50 text-gray-800">
                      <td className="py-2 px-1 font-bold">{item.opengRank}</td>

                      <td className="py-2 px-2 text-left pl-4 font-bold truncate">{item.prcbdrNm}</td>
                      <td className="py-2 px-2">{item.prcbdrCeoNm}</td>
                      <td className="py-2 px-2 text-right pr-4 font-mono font-bold text-blue-800">
                        {item.bidprcAmt ? Number(item.bidprcAmt).toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    // New Layout for 'Win' (Winning Results)
    if (isWin) {
      return (
        <div className={`mx-auto px-4 py-4 animate-in fade-in slide-in-from-right-4 duration-300 ${isMobileView ? 'w-[390px] bg-white' : 'w-full max-w-5xl'}`}>
          <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-3">
            <h2 className="text-xl font-black text-black">낙찰결과 상세</h2>
            <button onClick={() => setSelectedBid(null)} className="text-xs font-bold text-gray-600 hover:text-black px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 transition-colors">✕ 닫기</button>
          </div>
          <div className="bg-gray-50 p-5 rounded-lg border border-gray-300 mb-6 text-center">
            <h2 className="text-xl font-black text-black leading-snug mb-4">{selectedBid.bidNtceNm}</h2>
            <p className="text-gray-500">낙찰 정보는 요약본만 제공됩니다.</p>
          </div>
        </div>
      );
    }

    // Default Layout for 'Bid' (and previously 'Contract', now removed)
    const title = selectedBid.bidNtceNm;
    const agency = selectedBid.dminsttNm;

    // Restore helper variables
    const dateLabel = '입찰마감';
    const dateValue = selectedBid.bidClseDt;
    const amountLabel = '배정예산';
    const amountValue = selectedBid.presmptPrce;

    return (
      <div className={`mx-auto px-4 py-4 animate-in fade-in slide-in-from-right-4 duration-300 ${isMobileView ? 'w-[390px] bg-white' : 'w-full max-w-[800px]'}`}>
        {/* Detail Header (Revised as requested) */}
        <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-3">
          <h2 className="text-xl font-black text-black">입찰공고</h2>
          <button
            onClick={() => setSelectedBid(null)}
            className="text-xs font-bold text-gray-600 hover:text-black px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
          >
            ✕ 닫기
          </button>
        </div>

        <div className="bg-gray-50 p-5 rounded-lg border border-gray-300 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 text-[10px] font-bold border rounded ${selectedBid.ntceKindNm === '긴급'
              ? 'bg-red-100 text-red-700 border-red-300'
              : 'bg-blue-100 text-blue-700 border-blue-300'
              } `}>
              {(activeTab as string) === 'result' ? '개찰' : (selectedBid.ntceKindNm || '일반')}
            </span>
            <span className="text-gray-500 text-[10px] font-mono font-bold">
              공고번호 {selectedBid.bidNtceNo}
            </span>
            <span className="text-gray-400 text-[10px]">|</span>
            <span className="text-gray-600 text-[10px] font-bold">
              {agency || '조달청'}
            </span>
          </div>
          <h2 className="text-xl font-black text-black leading-snug mb-4">
            {title}
          </h2>

          <div className="mt-8">
            <h3 className="text-sm font-black text-black border-l-4 border-blue-600 pl-2 mb-3">공고일반</h3>
            <div className={`grid ${isMobileView ? 'grid-cols-[80px_1fr]' : 'grid-cols-[100px_1fr_100px_1fr]'} border-t-2 border-t-black border-b border-b-gray-300 text-xs`}>

              {/* Row 1 */}
              <div className="bg-gray-50 border-b border-gray-200 p-2 font-bold flex items-center">공고종류</div>
              <div className="border-b border-gray-200 p-2 flex items-center">{selectedBid.ntceKindNm || '-'}</div>
              <div className="bg-gray-50 border-b border-gray-200 p-2 font-bold flex items-center">게시일자</div>
              <div className="border-b border-gray-200 p-2 flex items-center">{(selectedBid.bidNtceDt || '').substring(0, 10)}</div>

              {/* Row 2 */}
              <div className="bg-gray-50 border-b border-gray-200 p-2 font-bold flex items-center">입찰공고번호</div>
              <div className="border-b border-gray-200 p-2 flex items-center">{selectedBid.bidNtceNo}</div>
              <div className="bg-gray-50 border-b border-gray-200 p-2 font-bold flex items-center">참조번호</div>
              <div className="border-b border-gray-200 p-2 flex items-center">{selectedBid.refNo || '-'}</div>

              {/* Row 3: Notice Name (Full Width) */}
              <div className="bg-gray-50 border-b border-gray-200 p-2 font-bold flex items-center">공고명</div>
              <div className={`${isMobileView ? 'col-span-1' : 'col-span-3'} border-b border-gray-200 p-2 font-bold text-black flex items-center group`}>
                {title}
                {selectedBid.ntceKindNm === '긴급' && <span className="ml-2 text-red-600 text-[10px]">(긴급공고)</span>}
              </div>

              {/* Row 4 */}
              <div className="bg-gray-50 border-b border-gray-200 p-2 font-bold flex items-center">배정예산</div>
              <div className="border-b border-gray-200 p-2 flex items-center font-bold text-blue-800">
                {selectedBid.asignBdgtAmt ? Number(selectedBid.asignBdgtAmt).toLocaleString() + '원' : '-'}
              </div>
              <div className="bg-gray-50 border-b border-gray-200 p-2 font-bold flex items-center">계약방법</div>
              <div className="border-b border-gray-200 p-2 flex items-center">{selectedBid.cntrctCnclsMthdNm || '-'}</div>

              {/* ------------------------------------------------------------- */}
              {/* NEW: Integrated Analysis Rows (Seamless)                      */}
              {/* ------------------------------------------------------------- */}

              {isAnalyzing && !analysisResult && (
                <div className={`${isMobileView ? 'col-span-2' : 'col-span-4'} p-2 bg-gray-50 text-center border-b border-gray-200 text-gray-500 flex items-center justify-center gap-2`}>
                  <div className="animate-spin h-3 w-3 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                  <span>첨부파일 분석 중... (자동)</span>
                </div>
              )}

              {analysisResult && (
                <>
                  {/* Country & Personnel Row */}
                  <div className="bg-green-50/50 border-b border-gray-200 p-2 font-bold flex items-center text-green-900">방문국가</div>
                  <div className="border-b border-gray-200 p-2 flex items-center font-bold">
                    {isValidCountry(analysisResult.country)
                      ? <span className="text-black">{analysisResult.country}</span>
                      : <span className="text-red-500 flex items-center gap-1">🔴 확인오류 <span className="text-[9px] text-gray-400 font-normal">({analysisResult.country})</span></span>
                    }
                  </div>
                  <div className="bg-green-50/50 border-b border-gray-200 p-2 font-bold flex items-center text-green-900">참여인원</div>
                  <div className="border-b border-gray-200 p-2 flex items-center font-bold">
                    {isValidPersonnel(analysisResult.personnel)
                      ? <span className="text-black">{analysisResult.personnel}</span>
                      : <span className="text-red-500 flex items-center gap-1">🔴 확인오류 <span className="text-[9px] text-gray-400 font-normal">({analysisResult.personnel})</span></span>
                    }
                  </div>

                  {/* Cost Calculation Row */}
                  <div className="bg-green-50/50 border-b border-gray-200 p-2 font-bold flex items-center text-green-900">1인당 비용</div>
                  <div className={`${isMobileView ? 'col-span-1' : 'col-span-3'} border-b border-gray-200 p-2 flex items-center font-bold`}>
                    {(() => {
                      // Use Assigned Budget from API if valid, otherwise parsed budget
                      const budgetRaw = selectedBid.asignBdgtAmt || analysisResult.budget;
                      const personnelRaw = analysisResult.personnel;

                      if (isValidPersonnel(personnelRaw) && budgetRaw) {
                        const b = parseNumber(String(budgetRaw));
                        const p = parseNumber(personnelRaw);
                        if (b > 0 && p > 0) {
                          return (
                            <span className="text-blue-700">
                              {new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(Math.round(b / p))}
                              <span className="text-gray-500 font-normal ml-1">(예상)</span>
                            </span>
                          )
                        }
                      }
                      return <span className="text-gray-400">-</span>;
                    })()}
                    <span className="text-[9px] text-gray-400 font-normal ml-auto">
                      *자동분석결과
                    </span>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>

        {/* Bid Progress Info */}
        <div className="mt-8 mb-6">
          <div className="flex justify-between items-end mb-3">
            <h3 className="text-sm font-black text-black border-l-4 border-blue-600 pl-2">입찰진행정보</h3>
            <span className="text-[10px] text-gray-500 font-bold">전체 8건</span>
          </div>

          <div className="overflow-x-auto border-t-2 border-black border-b border-gray-300">
            {/* Header */}
            <div className="grid grid-cols-[40px_1fr_80px_130px_130px] bg-gray-50 border-b border-gray-300 text-xs font-bold text-center py-2 text-gray-700 min-w-[500px]">
              <div>No</div>
              <div>진행명</div>
              <div>진행방법</div>
              <div>시작일시</div>
              <div>종료일시</div>
            </div>

            {/* Rows */}
            {[
              { id: 1, name: '공고게시', method: '', start: (selectedBid.bidNtceDt || ''), end: '', place: '국가종합전자조달시스템(나라장터)' },
              { id: 2, name: '입찰참가자격등록', method: '', start: '', end: (selectedBid.bidQlfctRgstDt || ''), place: '국가종합전자조달시스템(나라장터)' },
              { id: 3, name: '입찰보증서접수', method: '', start: '', end: '', place: '국가종합전자조달시스템(나라장터)' }, // Data mapping unclear, leaving blank
              { id: 4, name: '실적심사신청서제출', method: '수기', start: '', end: (selectedBid.pqApplDocRcptDt || ''), place: '공고서참조' },
              { id: 5, name: '제안서제출', method: '전자', start: (selectedBid.bidBeginDt || ''), end: (selectedBid.tpEvalApplClseDt || selectedBid.bidClseDt || ''), place: '국가종합전자조달시스템(나라장터)' },
              { id: 6, name: '입찰서제출', method: selectedBid.bidMethdNm || '전자입찰', start: (selectedBid.bidBeginDt || ''), end: (selectedBid.bidClseDt || ''), place: '국가종합전자조달시스템(나라장터)' },
              { id: 7, name: '제안서평가', method: '해당없음', start: '', end: '', place: '' },
              { id: 8, name: '개찰', method: '', start: (selectedBid.opengDt || ''), end: '', place: selectedBid.opengPlce || '국가종합전자조달시스템(나라장터)' },
            ].map((row, idx) => (
              <div key={row.id} className="grid grid-cols-[40px_1fr_80px_130px_130px] border-b border-gray-100 text-xs py-2 items-center hover:bg-gray-50 min-w-[500px]">
                <div className="text-center text-gray-500 font-mono">{row.id}</div>
                <div className="pl-2 font-bold text-black">{row.name}</div>
                <div className="text-center text-gray-600">{row.method}</div>
                <div className="text-center text-gray-800 tracking-tighter">{row.start ? row.start.substring(0, 16) : '-'}</div>
                <div className="text-center text-gray-800 tracking-tighter">{row.end ? row.end.substring(0, 16) : '-'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Attachments */}
        <div className="bg-gray-100 rounded-lg p-4 border border-gray-300">
          <h3 className="text-xs font-bold text-black mb-3 flex items-center gap-2">
            <span className="text-base">💾</span> 첨부파일
            <span className="text-[10px] text-gray-500 font-normal ml-1">클릭 시 다운로드됩니다.</span>
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {Array.from({ length: 10 }).map((_, i) => {
              const index = i + 1;
              const fileName = selectedBid[`ntceSpecFileNm${index}`];
              const fileUrl = selectedBid[`ntceSpecDocUrl${index}`];

              if (!fileName || !fileUrl) return null;

              return (
                <a
                  key={index}
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-white px-3 py-2 rounded border border-gray-300 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-colors group"
                >
                  <span className="text-gray-400 group-hover:text-blue-500">📄</span>
                  <span className="text-xs font-bold text-gray-700 group-hover:text-blue-700 underline underline-offset-2">
                    {fileName}
                  </span>
                </a>
              );
            })}

            {/* Fallback if no specific files found but count suggests otherwise? No, just rely on fields. */}
            {/* Also check standard notice doc */}
            {selectedBid.stdNtceDocUrl && (
              <a
                href={selectedBid.stdNtceDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-white px-3 py-2 rounded border border-gray-300 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-colors group"
              >
                <span className="text-gray-400 group-hover:text-blue-500">📜</span>
                <span className="text-xs font-bold text-gray-700 group-hover:text-blue-700 underline underline-offset-2">
                  통합공고문 (바로보기/다운로드)
                </span>
              </a>
            )}
          </div>
        </div>
      </div >
    );
  };

  // 0. Test Detail View (Priority over normal detail)
  if (selectedTestBid) {
    return (
      <main className="min-h-screen bg-white text-black font-sans text-xs flex flex-col items-center">
        <div className="w-full w-[600px]">
          <TestDetailView
            selectedBid={selectedTestBid}
            activeTab={activeTab}
            onClose={() => setSelectedTestBid(null)}
          />
        </div>
      </main>
    );
  }

  // 1. Project Detail View (Level 3)
  if (selectedBid) {
    return (
      <main className="min-h-screen bg-gray-100 text-black font-sans text-xs flex flex-col items-center">
        <div className={`w-full transition-all duration-300 ${isMobileView ? 'w-[390px] border-x border-gray-300 shadow-2xl bg-white min-h-screen' : 'max-w-[800px]'}`}>
          {renderDetailView()}
        </div>
      </main>
    );
  }

  // 3. Search List View (Level 0)
  return (
    <main className={`min-h-screen text-black font-sans text-xs transition-colors duration-300 ${isMobileView ? 'bg-gray-100' : 'bg-white'}`}>

      {/* Header / Tabs */}
      <header className="border-b border-black sticky top-0 bg-white z-10 shadow-sm">
        <div className={`mx-auto px-4 flex items-center justify-between h-14 transition-all duration-300 ${isMobileView ? 'w-[390px]' : 'w-full max-w-[800px]'}`}>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-black">나라장터 검색기 <span className="text-[10px] font-normal text-gray-500">(Responsive)</span></h1>
            <button
              onClick={() => setIsMobileView(!isMobileView)}
              className={`text-[9px] px-1.5 py-1 rounded border transition-colors leading-tight ${isMobileView ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'}`}
            >
              <div className="text-center">{isMobileView ? '데스크탑' : '모바일'}</div>
              <div className="text-center font-bold">모드로</div>
            </button>
          </div>
          <nav className="flex h-full items-end gap-1">
            {[
              { id: 'bid', label: '입찰 공고' },
              { id: 'result', label: '개찰 결과' },
              { id: 'win', label: '낙찰 결과' } // Changed 'contract' to 'win' and label to '낙찰결과'
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px - 4 h - 10 text - xs font - bold border - t border - l border - r rounded - t - md transition - colors ml - 1 ${activeTab === tab.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-gray-50 text-gray-500 border-gray-300 hover:bg-gray-100'
                  } `}
              >
                <div className="leading-tight">
                  <span className="block">{tab.label.replace('📢 ', '').replace('🏆 ', '').replace('💰 ', '').split(' ')[0]}</span>
                  <span className="block font-bold">{tab.label.replace('📢 ', '').replace('🏆 ', '').replace('💰 ', '').split(' ').pop()}</span>
                </div>
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Body */}
      <div className={`mx-auto px-4 py-4 transition-all duration-300 ${isMobileView ? 'w-[390px] border-x border-gray-300 shadow-2xl min-h-screen bg-white' : 'w-full max-w-[800px]'}`}>

        {/* Search Panel */}
        <div className="bg-gray-50 border border-black p-4 rounded-lg mb-4 shadow-sm">
          <form onSubmit={handleSearch} className="space-y-3">

            {/* Row 1: Keyword */}
            <div>
              <label className="block text-xs font-bold mb-1">
                {activeTab === 'bid' ? '입찰공고명 검색' : (activeTab === 'result' ? '개찰결과 공고명 검색' : '낙찰결과 공고명 검색')}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder={activeTab === 'win' ? "예: 시스템 구축, PC 구매" : "예: 시스템 구축, PC 구매"} // Placeholder might need adjustment if 'win' has different search semantics
                  className="flex-1 text-xs p-2.5 border border-gray-500 rounded focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium"
                />
                <button
                  type="submit"
                  className="bg-blue-600 text-white text-xs font-bold px-5 rounded hover:bg-blue-700 transition-colors shadow-sm border border-blue-800"
                >
                  조회
                </button>
              </div>
            </div>

            {/* Row 2: Filters (Compact) */}
            {(activeTab === 'bid' || activeTab === 'result' || activeTab === 'win') && (
              <div className="flex flex-wrap gap-4 items-end bg-white p-3 rounded border border-gray-200">
                {/* Date Range */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      <label className="text-[11px] font-bold text-gray-600 shrink-0 whitespace-nowrap">
                        {activeTab === 'bid' ? '공고기간' : (activeTab === 'win' ? '종료일자' : '개찰기간')}
                      </label>
                      <div className="flex border border-gray-300 rounded overflow-hidden">
                        <button type="button" onClick={() => setDateRange(7)} className="px-1.5 py-0.5 bg-gray-50 text-[10px] border-r hover:bg-gray-100">1주</button>
                        <button type="button" onClick={() => setDateRange(30)} className="px-1.5 py-0.5 bg-gray-50 text-[10px] border-r hover:bg-gray-100">1달</button>
                        <button type="button" onClick={() => setDateRange(90)} className="px-1.5 py-0.5 bg-gray-50 text-[10px] border-r hover:bg-gray-100">3달</button>
                        <button type="button" onClick={() => setDateRange(365)} className="px-1.5 py-0.5 bg-gray-50 text-[10px] hover:bg-gray-100">1년</button>
                      </div>
                    </div>

                    {/* Compact Type Dropdown */}
                    {(activeTab === 'bid' || activeTab === 'win' || activeTab === 'result') && (
                      <select
                        value={bidType}
                        onChange={e => setBidType(e.target.value)}
                        className="w-16 px-1 py-0.5 border border-gray-400 rounded text-[11px] font-bold h-[22px] ml-2"
                      >
                        <option value="전체">전체</option>
                        <option value="용역">용역</option>
                        <option value="물품">물품</option>
                        <option value="공사">공사</option>
                      </select>
                    )}
                  </div>

                  <div className="flex items-center gap-1 w-full">
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="flex-1 px-2 py-1.5 border border-gray-400 rounded text-[11px]" />
                    <span className="text-gray-400 text-[11px]">~</span>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="flex-1 px-2 py-1.5 border border-gray-400 rounded text-[11px]" />
                  </div>
                </div>

                {/* Type - 입찰공고, 개찰결과, 계약 탭에서 모두 표시 */}

              </div>
            )}
          </form>

          {/* Search History removed for brevity/cleanup in this snippet or keep if needed. 
               Keeping strictly necessary parts only. Re-adding history code for completeness. */}
          {history.length > 0 && (
            <div className="mt-3">
              <span className="text-[11px] font-bold text-gray-500 mb-2 block">최근검색:</span>
              <div className="grid grid-cols-4 gap-2">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => applyHistory(item)}
                    className="px-2 py-1 bg-white border border-gray-300 rounded text-[11px] hover:bg-blue-50 hover:border-blue-300 flex items-center justify-between transition-colors group shadow-sm h-8"
                  >
                    <div className="flex flex-col items-start overflow-hidden w-full pr-6 relative">
                      <span className="text-blue-700 font-bold truncate w-full text-left leading-none">{item.keyword}</span>
                      {item.date !== '사용자 지정' && <span className="text-gray-400 text-[9px] leading-none mt-0.5">{item.date}</span>}

                      {/* Close Button Positioned Right & Absolute */}
                      <span
                        onClick={(e) => deleteHistory(item.id, e)}
                        className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full w-5 h-5 flex items-center justify-center font-bold shrink-0"
                      >
                        ×
                      </span>
                    </div>

                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Results List */}
        <div>
          <div className="flex justify-between items-end mb-2 border-b-2 border-black pb-1">
            <h2 className="text-sm font-black">
              검색결과 {searched && !loading && <span className="text-blue-600 text-xs font-bold">({bidList.length})</span>}
            </h2>
          </div>

          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
              <p className="text-xs font-bold animate-pulse">데이터를 조회하고 있습니다...</p>
              <p className="text-[10px] text-gray-400 mt-1">기간이 길거나 데이터가 많으면 시간이 소요될 수 있습니다.</p>
            </div>
          )}

          {!loading && searched && bidList.length === 0 && (
            <p className="text-xs text-center py-8 bg-gray-50 border border-dashed border-gray-300 rounded text-gray-500">
              검색 결과가 없습니다.
            </p>
          )}

          {!loading && (
            <div className="space-y-2">
              {bidList.map((bid: any, index: number) => {
                // Determine fields based on tab
                const isWin = activeTab === 'win';
                const idKey = bid.bidNtceNo + '_' + index;
                const title = bid.bidNtceNm;
                const agency = bid.dminsttNm;

                // Date Display
                let dateLabel = '마감';
                let dateValue = bid.bidClseDt?.substring(0, 10);
                if (activeTab === 'result') { dateLabel = '개찰'; dateValue = bid.opengDt?.substring(0, 10); }
                else if (isWin) { dateLabel = '개찰'; dateValue = bid.opengDt?.substring(0, 10); }

                // Amount Display
                let amountLabel = '배정예산';
                let amountValue = bid.presmptPrce;
                if (activeTab === 'result') { amountLabel = '투찰금액'; amountValue = bid.sucsfbidAmt || bid.bidprcAmt; }
                else if (isWin) { amountLabel = '낙찰금액'; amountValue = bid.succsfbidAmt; }

                // Badge Color
                let badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                if (activeTab === 'result') badgeColor = 'bg-green-50 text-green-700 border-green-200';
                else if (isWin) badgeColor = 'bg-green-100 text-green-800 border-green-300';
                else if (bid.ntceKindNm === '긴급') badgeColor = 'bg-red-50 text-red-700 border-red-200';

                return (
                  <div
                    key={idKey}
                    onClick={() => setSelectedBid(bid)}
                    className={`bg-white border border-gray-300 p-2.5 rounded hover:border-blue-600 hover:shadow-md transition-all cursor-pointer group hover:bg-blue-50 ${isMobileView ? 'flex flex-col gap-2' : ''}`}
                  >
                    {/* Mobile Layout (Stacked) */}
                    {isMobileView ? (
                      <>
                        {/* Row 1: Badge & Date (Top for quick scan) */}
                        <div className="flex justify-between items-center w-full">
                          <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${badgeColor}`}>
                            {isWin ? '낙찰' : (activeTab === 'result' ? '개찰' : (bid.ntceKindNm || '일반'))}
                          </span>
                          <span className="text-[11px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            {dateLabel} {dateValue}
                          </span>
                        </div>

                        {/* Row 2: Title (Full width, multi-line allowed) */}
                        <div className="w-full">
                          <span className="text-sm text-black font-bold group-hover:text-blue-700 leading-snug">
                            {title}
                          </span>
                        </div>

                        {/* Row 3: Agency & Winner */}
                        <div className="flex flex-wrap gap-2 text-xs text-gray-600 items-center">
                          <span className="flex items-center gap-1">
                            🏢 {agency || '기관명 없음'}
                          </span>
                          {(isWin || activeTab === 'result') && (
                            <>
                              <span className="text-gray-300">|</span>
                              <span className="font-bold text-blue-700 flex items-center gap-1">
                                👑 {bid.bidwinnrNm || bid.bidwinrNm || '미확정'}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Row 4: Amount (Highlighted at bottom) & Action */}
                        <div className="flex justify-between items-end border-t border-dashed border-gray-200 pt-2 mt-1">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 font-bold">{amountLabel}</span>
                            <span className="text-sm text-black font-black">
                              {amountValue && amountValue !== '0' ? Number(String(amountValue).replace(/,/g, '')).toLocaleString() : '-'}
                              <span className="text-[10px] font-normal text-gray-500 ml-0.5">원</span>
                            </span>
                          </div>
                          <span className="text-[10px] text-blue-500 font-bold flex items-center">
                            상세보기 &gt;
                          </span>
                        </div>
                      </>
                    ) : (
                      /* Desktop Layout (Original Horizontal) */
                      <>
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2 mb-1 w-full">
                            <span className="text-sm text-black font-bold group-hover:text-blue-700 line-clamp-1 flex-1">
                              {title}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-500 whitespace-nowrap bg-gray-100 px-1 rounded shrink-0 ml-2">
                            {dateLabel} {dateValue}
                          </span>
                        </div>

                        <div className="flex justify-between items-end text-xs text-gray-600 mt-1 pl-1">
                          <div className="flex gap-3">
                            <span className="text-[11px] flex items-center gap-1">
                              🏢 <span className="text-gray-600">{agency || '기관명 없음'}</span>
                            </span>

                            {isWin ? (
                              <>
                                <span className="text-gray-300">|</span>
                                <span className="text-[11px] text-blue-700 font-bold">
                                  👑 <span className="truncate max-w-[100px] inline-block align-bottom">{bid.bidwinnrNm || '낙찰자 정보 없음'}</span>
                                </span>
                              </>
                            ) : activeTab === 'result' ? (
                              <>
                                <span className="text-gray-300">|</span>
                                <span className="text-[11px]">
                                  🏆 낙찰: {bid.bidwinrNm || '미확정'}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="text-gray-300">|</span>
                                <span className="text-[11px]">
                                  🕒 {bid.bidNtceDt?.substring(0, 16)}
                                </span>
                              </>
                            )}
                          </div>

                          <div className="text-right flex items-center gap-2">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${badgeColor}`}>
                              {isWin ? '낙찰' : (activeTab === 'result' ? '개찰' : (bid.ntceKindNm || '일반'))}
                            </span>
                            <div>
                              <span className="font-medium mr-1 text-[11px] text-gray-400">{amountLabel}</span>
                              <span className="text-black font-black text-xs">
                                {amountValue && amountValue !== '0' ? Number(String(amountValue).replace(/,/g, '')).toLocaleString() : '-'}
                              </span>
                              <span className="text-gray-500 text-[10px] ml-0.5">{amountValue && amountValue !== '0' ? '원' : ''}</span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main >
  );
}
