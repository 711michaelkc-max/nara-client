
"use client";

import { useState, useEffect } from "react";
import { fetchBidList, fetchWinList, fetchScsbidList, fetchContracts, fetchOpeningResults } from "@/services/naraApi";
import { BidNotice } from "@/types/nara";

type TabType = 'bid' | 'result' | 'win'; // Changed 'contract' to 'win'

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('bid'); // Changed 'contract' to 'win'

  // Search State
  const [keyword, setKeyword] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [bidType, setBidType] = useState("전체"); // 용역/물품/공사

  // History Mock State
  const [history, setHistory] = useState([
    { id: 1, keyword: '시스템 구축', date: '1개월', type: '용역' },
    { id: 2, keyword: 'PC 구매', date: '1주일', type: '물품' },
  ]);

  // Result State
  const [bidList, setBidList] = useState<any[]>([]); // Use any[] for mixed types (Bid/Win/Contract)
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedBid, setSelectedBid] = useState<any | null>(null);

  // Participants State for Result Detail
  const [bidParticipants, setBidParticipants] = useState<any[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  // Fetch participants when selectedBid changes (only for Result tab)
  useEffect(() => {
    if (activeTab === 'result' && selectedBid) {
      setLoadingParticipants(true);
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
    }
  }, [selectedBid, activeTab]);

  // Clear search results when tab changes
  useEffect(() => {
    setBidList([]);
    setSearched(false);
    setSelectedBid(null);
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
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSearched(true);

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

  // Detail View Component
  const renderDetailView = () => {
    if (!selectedBid) return null;

    // Helper text
    const isWin = activeTab === 'win'; // New helper for 'win' tab
    const isResult = activeTab === 'result';

    // Different Layout for 'Result' (WinList)
    if (isResult) {
      return (
        <div className="max-w-[1000px] mx-auto px-4 py-4 animate-in fade-in slide-in-from-right-4 duration-300">
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
              <button className="text-[10px] text-gray-500 border px-1 rounded hover:bg-gray-50">▲</button>
            </div>

            <div className="border-t-2 border-blue-600 border-b border-gray-300 text-xs">
              {/* Row 1 */}
              <div className="grid grid-cols-[120px_1fr_120px_1fr_120px_1fr] border-b border-gray-200">
                <div className="bg-gray-50 p-2 font-bold flex items-center">입찰공고번호</div>
                <div className="p-2 text-blue-600 font-bold flex items-center">
                  {selectedBid.bidNtceNo}
                  {selectedBid.bidNtceOrd && `- ${selectedBid.bidNtceOrd} `}
                </div>
                <div className="bg-gray-50 p-2 font-bold flex items-center">참조번호</div>
                <div className="p-2 flex items-center">{selectedBid.refNo || selectedBid.rbidNo || '-'}</div>
                <div className="bg-gray-50 p-2 font-bold flex items-center">실제개찰일시</div>
                <div className="p-2 flex items-center">{selectedBid.opengDt || selectedBid.rlOpengDt || '-'}</div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-[120px_1fr] border-b border-gray-200">
                <div className="bg-gray-50 p-2 font-bold flex items-center">입찰공고명</div>
                <div className="p-2 font-bold flex items-center">{selectedBid.bidNtceNm}</div>
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-[120px_1fr_120px_1fr_120px_1fr] border-b border-gray-200">
                <div className="bg-gray-50 p-2 font-bold flex items-center">공고기관</div>
                <div className="p-2 flex items-center">{selectedBid.ntceInsttNm}</div>
                <div className="bg-gray-50 p-2 font-bold flex items-center">수요기관</div>
                <div className="p-2 flex items-center">{selectedBid.dminsttNm}</div>
                <div className="bg-gray-50 p-2 font-bold flex items-center">적격심사결과</div>
                <div className="p-2 flex items-center"></div>
              </div>

              {/* Row 4 */}
              <div className="grid grid-cols-[120px_1fr_120px_1fr_120px_1fr] border-b border-gray-200">
                <div className="bg-gray-50 p-2 font-bold flex items-center">집행관</div>
                <div className="p-2 flex items-center">{selectedBid.ntceInsttOfclNm || '-'}</div>
                <div className="bg-gray-50 p-2 font-bold flex items-center">복수예비가격<br />및 예정가격</div>
                <div className="p-2 flex items-center">
                  <button className="border border-gray-300 px-2 py-0.5 rounded text-[10px] flex items-center gap-1 hover:bg-gray-50">
                    🔗 보기
                  </button>
                </div>
                <div className="bg-gray-50 p-2 font-bold flex items-center">공고담당자</div>
                <div className="p-2 flex items-center">{selectedBid.ntceInsttOfclNm || '-'}</div>
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
                  {!loadingParticipants && bidParticipants.length === 0 && selectedBid.bidwinrNm && ' (API 제한: 낙찰자 정보만 표시)'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold">사업자등록번호 :</span>
                <input type="text" className="border border-gray-300 px-2 py-1 rounded w-32 text-xs" disabled />
                <button className="bg-white border border-gray-300 px-3 py-1 rounded text-xs hover:bg-gray-50">적용</button>
              </div>
            </div>

            <div className="overflow-x-auto h-[400px] overflow-y-scroll border-b border-gray-300">
              <table className="w-full text-xs text-center border-collapse table-fixed">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-100 border-t border-gray-400 border-b border-gray-300 font-bold text-gray-700">
                    <th className="py-2 px-1 w-12 bg-gray-100">순위</th>
                    <th className="py-2 px-2 w-24 bg-gray-100">사업자등록번호</th>
                    <th className="py-2 px-2 w-auto bg-gray-100">업체명</th>
                    <th className="py-2 px-2 w-20 bg-gray-100">대표자명</th>
                    <th className="py-2 px-2 w-28 bg-gray-100">입찰금액(원)</th>
                    <th className="py-2 px-2 w-16 bg-gray-100">투찰률(%)</th>
                    <th className="py-2 px-2 w-16 bg-gray-100">비고</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingParticipants ? (
                    <tr><td colSpan={7} className="py-10 text-center text-gray-500">데이터를 불러오는 중입니다...</td></tr>
                  ) : bidParticipants.length > 0 ? (
                    bidParticipants.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-200 hover:bg-blue-50 text-gray-800 transition-colors">
                        <td className="py-2 px-1 font-bold text-gray-600">{item.opengRank}</td>
                        <td className="py-2 px-2 text-gray-600 font-mono">{item.prcbdrBizno}</td>
                        <td className="py-2 px-2 text-left pl-4 font-bold text-black truncate" title={item.prcbdrNm}>{item.prcbdrNm}</td>
                        <td className="py-2 px-2 text-gray-600">{item.prcbdrCeoNm}</td>
                        <td className="py-2 px-2 text-right pr-4 font-mono font-bold text-blue-800">
                          {item.bidprcAmt ? Number(item.bidprcAmt).toLocaleString() : '-'}
                        </td>
                        <td className="py-2 px-2 text-gray-600 font-mono">{item.bidprcrt}%</td>
                        <td className="py-2 px-2 text-red-600 font-bold">{item.rmrk || (item.opengRank === '1' ? '낙찰' : '정상')}</td>
                      </tr>
                    ))
                  ) : (selectedBid.bidwinrNm || selectedBid.opengCorpInfo) ? (
                    (() => {
                      // Parse opengCorpInfo: Name^BizNo^Ceo^Amt^Rate
                      // Example: 아라사회적협동조합^3458200175^박지호^215712000^94.189
                      const info = selectedBid.opengCorpInfo ? selectedBid.opengCorpInfo.split('^') : [];
                      const corpName = info[0] || selectedBid.bidwinrNm;
                      const bizNo = info[1] || selectedBid.bidwinnrBizno || '-';
                      const ceoName = info[2] || selectedBid.bidwinnrCeoNm || '-';
                      const amt = info[3] ? Number(info[3]) : (selectedBid.sucsfbidAmt || selectedBid.bidPrice);
                      const rate = info[4] || selectedBid.sucsfbidRate || selectedBid.bidRate || '-';

                      return (
                        <tr className="border-b border-gray-200 hover:bg-gray-50 text-gray-800">
                          <td className="py-2 px-1 text-red-600 font-bold">1</td>
                          <td className="py-2 px-2 text-red-600 font-mono">{bizNo}</td>
                          <td className="py-2 px-2 text-red-600 font-bold text-left pl-4">{corpName}</td>
                          <td className="py-2 px-2 text-red-600">{ceoName}</td>
                          <td className="py-2 px-2 text-red-600 font-bold text-right pr-4">
                            {amt ? Number(amt).toLocaleString() : '-'}
                          </td>
                          <td className="py-2 px-2 text-red-600 font-mono">{rate}%</td>
                          <td className="py-2 px-2 text-red-600 font-bold">낙찰(1순위)</td>
                        </tr>
                      );
                    })()
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-gray-500">
                        투찰 내역이 존재하지 않거나 정보를 불러올 수 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    // New Layout for 'Win' (Winning Results)
    if (isWin) {
      const title = selectedBid.bidNtceNm;
      const agency = selectedBid.dminsttNm;

      return (
        <div className="max-w-[800px] mx-auto px-4 py-4 animate-in fade-in slide-in-from-right-4 duration-300">
          {/* Detail Header */}
          <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-3">
            <h2 className="text-xl font-black text-black">낙찰결과 상세</h2>
            <button
              onClick={() => setSelectedBid(null)}
              className="text-xs font-bold text-gray-600 hover:text-black px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
            >
              ✕ 닫기
            </button>
          </div>

          <div className="bg-gray-50 p-5 rounded-lg border border-gray-300 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px - 2 py - 0.5 text - [10px] font - bold border rounded bg - green - 100 text - green - 700 border - green - 300`}>
                낙찰
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
              <h3 className="text-sm font-black text-black border-l-4 border-blue-600 pl-2 mb-3">공고개요</h3>
              <div className="grid grid-cols-[120px_1fr_120px_1fr] border-t-2 border-t-black border-b border-b-gray-300 text-xs">

                {/* Row 1 */}
                <div className="bg-gray-50 border-b border-gray-200 p-2 font-bold flex items-center">공고종류</div>
                <div className="border-b border-gray-200 p-2 flex items-center">{selectedBid.ntceKindNm || '-'}</div>
                <div className="bg-gray-50 border-b border-gray-200 p-2 font-bold flex items-center">게시일시</div>
                <div className="border-b border-gray-200 p-2 flex items-center">{selectedBid.bidNtceDt || '-'}</div>

                {/* Row 2 */}
                <div className="bg-gray-50 border-b border-gray-200 p-2 font-bold flex items-center">입찰공고번호</div>
                <div className="border-b border-gray-200 p-2 flex items-center">{selectedBid.bidNtceNo}{selectedBid.bidNtceOrd ? ` - ${selectedBid.bidNtceOrd} ` : ''}</div>
                <div className="bg-gray-50 border-b border-gray-200 p-2 font-bold flex items-center">참조번호</div>
                <div className="border-b border-gray-200 p-2 flex items-center">{selectedBid.refNo || '-'}</div>

                {/* Row 3: Notice Name (Full Width) */}
                <div className="bg-gray-50 border-b border-gray-200 p-2 font-bold flex items-center">공고명</div>
                <div className="col-span-3 border-b border-gray-200 p-2 font-bold text-black flex items-center group">
                  {title}
                  {selectedBid.ntceKindNm === '긴급' && <span className="ml-2 text-red-600 text-[10px]">(긴급공고)</span>}
                </div>

                {/* Row 4 */}
                <div className="bg-gray-50 border-b border-gray-200 p-2 font-bold flex items-center">계약방법</div>
                <div className="border-b border-gray-200 p-2 flex items-center">{selectedBid.cntrctCnclsMthdNm || '-'}</div>
                <div className="bg-gray-50 border-b border-gray-200 p-2 font-bold flex items-center">낙찰방법</div>
                <div className="border-b border-gray-200 p-2 flex items-center">{selectedBid.sucsfbidMthdNm || selectedBid.cntrctCnclsMthdNm || '-'}</div>

                {/* Row 5 */}
                <div className="bg-gray-50 border-b border-gray-200 p-2 font-bold flex items-center">배정예산</div>
                <div className="border-b border-gray-200 p-2 flex items-center">
                  {selectedBid.asignBdgtAmt ? Number(selectedBid.asignBdgtAmt).toLocaleString() + '원' : '-'}
                </div>
                <div className="bg-gray-50 border-b border-gray-200 p-2 font-bold flex items-center">재입찰여부</div>
                <div className="border-b border-gray-200 p-2 flex items-center">{selectedBid.rbidPermsnYn === 'Y' ? '가능' : (selectedBid.reNtceYn === 'Y' ? '재공고' : '-')}</div>

              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-sm font-black text-black border-l-4 border-blue-600 pl-2 mb-3">낙찰업체 정보</h3>
              <div className="border-t-2 border-t-black border-b border-b-gray-300 text-xs">
                {/* Row 1 */}
                <div className="grid grid-cols-[120px_1fr_120px_1fr] border-b border-gray-200">
                  <div className="bg-gray-50 p-2 font-bold flex items-center">낙찰자명</div>
                  <div className="p-2 flex items-center font-bold text-blue-700">{selectedBid.bidwinnrNm || '-'}</div>
                  <div className="bg-gray-50 p-2 font-bold flex items-center">사업자등록번호</div>
                  <div className="p-2 flex items-center font-mono">{selectedBid.bidwinnrBizno || '-'}</div>
                </div>
                {/* Row 2 */}
                <div className="grid grid-cols-[120px_1fr_120px_1fr] border-b border-gray-200">
                  <div className="bg-gray-50 p-2 font-bold flex items-center">낙찰금액</div>
                  <div className="p-2 flex items-center font-bold text-red-700">
                    {selectedBid.sucsfbidAmt ? Number(selectedBid.sucsfbidAmt).toLocaleString() + '원' : '-'}
                  </div>
                  <div className="bg-gray-50 p-2 font-bold flex items-center">낙찰률</div>
                  <div className="p-2 flex items-center font-mono">{selectedBid.sucsfbidRate ? `${selectedBid.sucsfbidRate}% ` : '-'}</div>
                </div>
                {/* Row 3 */}
                <div className="grid grid-cols-[120px_1fr_120px_1fr] border-b border-gray-200">
                  <div className="bg-gray-50 p-2 font-bold flex items-center">개찰일시</div>
                  <div className="p-2 flex items-center">{selectedBid.opengDt || '-'}</div>
                  <div className="bg-gray-50 p-2 font-bold flex items-center">개찰장소</div>
                  <div className="p-2 flex items-center">{selectedBid.opengPlce || '-'}</div>
                </div>
              </div>
            </div>
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
      <div className="max-w-[800px] mx-auto px-4 py-4 animate-in fade-in slide-in-from-right-4 duration-300">
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
            <span className={`px - 2 py - 0.5 text - [10px] font - bold border rounded ${selectedBid.ntceKindNm === '긴급'
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
            <div className="grid grid-cols-[120px_1fr_120px_1fr] border-t-2 border-t-black border-b border-b-gray-300 text-xs">

              {/* Row 1 */}
              <div className="bg-gray-50 border-b border-gray-200 p-2 font-bold flex items-center">공고종류</div>
              <div className="border-b border-gray-200 p-2 flex items-center">{selectedBid.ntceKindNm || '-'}</div>
              <div className="bg-gray-50 border-b border-gray-200 p-2 font-bold flex items-center">게시일시</div>
              <div className="border-b border-gray-200 p-2 flex items-center">{selectedBid.bidNtceDt || '-'}</div>

              {/* Row 2 */}
              <div className="bg-gray-50 border-b border-gray-200 p-2 font-bold flex items-center">입찰공고번호</div>
              <div className="border-b border-gray-200 p-2 flex items-center">{selectedBid.bidNtceNo}{selectedBid.bidNtceOrd ? ` - ${selectedBid.bidNtceOrd} ` : ''}</div>
              <div className="bg-gray-50 border-b border-gray-200 p-2 font-bold flex items-center">참조번호</div>
              <div className="border-b border-gray-200 p-2 flex items-center">{selectedBid.refNo || '-'}</div>

              {/* Row 3: Notice Name (Full Width) */}
              <div className="bg-gray-50 border-b border-gray-200 p-2 font-bold flex items-center">공고명</div>
              <div className="col-span-3 border-b border-gray-200 p-2 font-bold text-black flex items-center group">
                {title}
                {selectedBid.ntceKindNm === '긴급' && <span className="ml-2 text-red-600 text-[10px]">(긴급공고)</span>}
              </div>

              {/* Layout adjusted after removing fields:
                  Removed:
                   - 입찰방식 (Row 4)
                   - 채권자명 (Row 6)
                   - 공동수급협정서 (Row 7)
                   - 현장설명회장소/일시 (Row 8)
                  Kept:
                   - 낙찰방법 (Moved to Row 4)
                   - 계약방법 (Row 5 -> Row 4)
                   - 배정예산 (Row 5 -> Row 5)
                   - 재입찰여부 (Row 6 -> Row 5)
               */}

              {/* Row 4 */}
              <div className="bg-gray-50 border-b border-gray-200 p-2 font-bold flex items-center">계약방법</div>
              <div className="border-b border-gray-200 p-2 flex items-center">{selectedBid.cntrctCnclsMthdNm || '-'}</div>
              <div className="bg-gray-50 border-b border-gray-200 p-2 font-bold flex items-center">낙찰방법</div>
              <div className="border-b border-gray-200 p-2 flex items-center">{selectedBid.sucsfbidMthdNm || selectedBid.cntrctCnclsMthdNm || '-'}</div>

              {/* Row 5 */}
              <div className="bg-gray-50 border-b border-gray-200 p-2 font-bold flex items-center">배정예산</div>
              <div className="border-b border-gray-200 p-2 flex items-center">
                {selectedBid.asignBdgtAmt ? Number(selectedBid.asignBdgtAmt).toLocaleString() + '원' : '-'}
              </div>
              <div className="bg-gray-50 border-b border-gray-200 p-2 font-bold flex items-center">재입찰여부</div>
              <div className="border-b border-gray-200 p-2 flex items-center">{selectedBid.rbidPermsnYn === 'Y' ? '가능' : (selectedBid.reNtceYn === 'Y' ? '재공고' : '-')}</div>

            </div>
          </div>
        </div>

        {/* Bid Progress Info */}
        <div className="mt-8 mb-6">
          <div className="flex justify-between items-end mb-3">
            <h3 className="text-sm font-black text-black border-l-4 border-blue-600 pl-2">입찰진행정보</h3>
            <span className="text-[10px] text-gray-500 font-bold">전체 8건</span>
          </div>

          <div className="border-t-2 border-black border-b border-gray-300">
            {/* Header */}
            <div className="grid grid-cols-[40px_1fr_80px_130px_130px_1fr] bg-gray-50 border-b border-gray-300 text-xs font-bold text-center py-2 text-gray-700">
              <div>No</div>
              <div>진행명</div>
              <div>진행방법</div>
              <div>시작일시</div>
              <div>종료일시</div>
              <div>장소</div>
            </div>

            {/* Rows */}
            {[
              { id: 1, name: '공고게시', method: '', start: selectedBid.bidNtceDt, end: '', place: '국가종합전자조달시스템(나라장터)' },
              { id: 2, name: '입찰참가자격등록', method: '', start: '', end: selectedBid.bidQlfctRgstDt, place: '국가종합전자조달시스템(나라장터)' },
              { id: 3, name: '입찰보증서접수', method: '', start: '', end: '', place: '국가종합전자조달시스템(나라장터)' }, // Data mapping unclear, leaving blank
              { id: 4, name: '실적심사신청서제출', method: '수기', start: '', end: selectedBid.pqApplDocRcptDt, place: '공고서참조' },
              { id: 5, name: '제안서제출', method: '전자', start: selectedBid.bidBeginDt, end: selectedBid.tpEvalApplClseDt || selectedBid.bidClseDt, place: '국가종합전자조달시스템(나라장터)' },
              { id: 6, name: '입찰서제출', method: selectedBid.bidMethdNm || '전자입찰', start: selectedBid.bidBeginDt, end: selectedBid.bidClseDt, place: '국가종합전자조달시스템(나라장터)' },
              { id: 7, name: '제안서평가', method: '해당없음', start: '', end: '', place: '' },
              { id: 8, name: '개찰', method: '', start: selectedBid.opengDt, end: '', place: selectedBid.opengPlce || '국가종합전자조달시스템(나라장터)' },
            ].map((row, idx) => (
              <div key={row.id} className="grid grid-cols-[40px_1fr_80px_130px_130px_1fr] border-b border-gray-100 text-xs py-2 items-center hover:bg-gray-50">
                <div className="text-center text-gray-500 font-mono">{row.id}</div>
                <div className="pl-2 font-bold text-black">{row.name}</div>
                <div className="text-center text-gray-600">{row.method}</div>
                <div className="text-center text-gray-800 tracking-tighter">{row.start || '-'}</div>
                <div className="text-center text-gray-800 tracking-tighter">{row.end || '-'}</div>
                <div className="pl-2 text-gray-600 truncate" title={row.place}>{row.place || '-'}</div>
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
              const fileName = selectedBid[`ntceSpecFileNm${index} `];
              const fileUrl = selectedBid[`ntceSpecDocUrl${index} `];

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

  // 1. Project Detail View (Level 3)
  if (selectedBid) {
    return (
      <main className="min-h-screen bg-white text-black font-sans text-xs flex flex-col items-center">
        <div className="w-full max-w-[800px]">
          {renderDetailView()}
        </div>
      </main>
    );
  }

  // 3. Search List View (Level 0)
  return (
    <main className="min-h-screen bg-white text-black font-sans text-xs">

      {/* Header / Tabs */}
      <header className="border-b border-black sticky top-0 bg-white z-10 shadow-sm">
        <div className="max-w-[800px] mx-auto px-4 flex items-center justify-between h-12">
          <h1 className="text-sm font-black">나라장터 검색기</h1>
          <nav className="flex h-full items-end">
            {[
              { id: 'bid', label: '📢 입찰공고' },
              { id: 'result', label: '🏆 개찰결과' },
              { id: 'win', label: '💰 낙찰결과' } // Changed 'contract' to 'win' and label to '낙찰결과'
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px - 4 h - 10 text - xs font - bold border - t border - l border - r rounded - t - md transition - colors ml - 1 ${activeTab === tab.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-gray-50 text-gray-500 border-gray-300 hover:bg-gray-100'
                  } `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Body */}
      <div className="max-w-[800px] mx-auto px-4 py-4">

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
                  <label className="block text-[11px] font-bold mb-1 text-gray-600">
                    {activeTab === 'bid' ? '공고기간' : (activeTab === 'win' ? '종료일자' : '개찰기간')}
                  </label>
                  <div className="flex items-center gap-1">
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-[110px] px-2 py-1 border border-gray-400 rounded text-[11px]" />
                    <span className="text-gray-400 text-[11px]">~</span>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-[110px] px-2 py-1 border border-gray-400 rounded text-[11px]" />
                    <div className="flex ml-2 border border-gray-300 rounded overflow-hidden">
                      <button type="button" onClick={() => setDateRange(7)} className="px-2 py-1 bg-gray-50 text-[11px] border-r hover:bg-gray-100">1주</button>
                      <button type="button" onClick={() => setDateRange(30)} className="px-2 py-1 bg-gray-50 text-[11px] border-r hover:bg-gray-100">1달</button>
                      <button type="button" onClick={() => setDateRange(90)} className="px-2 py-1 bg-gray-50 text-[11px] border-r hover:bg-gray-100">3달</button>
                      <button type="button" onClick={() => setDateRange(365)} className="px-2 py-1 bg-gray-50 text-[11px] hover:bg-gray-100">1년</button>
                    </div>
                  </div>
                </div>

                {/* Type - 입찰공고, 개찰결과, 계약 탭에서 모두 표시 */}
                {(activeTab === 'bid' || activeTab === 'win' || activeTab === 'result') && (
                  <div>
                    <label className="block text-[11px] font-bold mb-1 text-gray-600">업무종류</label>
                    <select
                      value={bidType}
                      onChange={e => setBidType(e.target.value)}
                      className="w-20 px-2 py-1 border border-gray-400 rounded text-[11px] font-bold h-[26px]"
                    >
                      <option value="전체">전체</option>
                      <option value="용역">용역</option>
                      <option value="물품">물품</option>
                      <option value="공사">공사</option>
                    </select>
                  </div>
                )}
              </div>
            )}
          </form>

          {/* Search History removed for brevity/cleanup in this snippet or keep if needed. 
               Keeping strictly necessary parts only. Re-adding history code for completeness. */}
          {history.length > 0 && (
            <div className="mt-3">
              <span className="text-[11px] font-bold text-gray-500 mb-2 block">최근검색:</span>
              <div className="grid grid-cols-5 gap-2">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => applyHistory(item)}
                    className="px-2 py-1 bg-white border border-gray-300 rounded text-[11px] hover:bg-blue-50 hover:border-blue-300 flex items-center justify-between transition-colors group"
                  >
                    <div className="flex flex-col items-start overflow-hidden">
                      <span className="text-blue-700 font-bold truncate w-full">{item.keyword}</span>
                      <span className="text-gray-400 text-[9px]">{item.date}</span>
                    </div>
                    <span
                      onClick={(e) => deleteHistory(item.id, e)}
                      className="ml-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full w-4 h-4 flex items-center justify-center font-bold shrink-0"
                    >
                      ×
                    </span>
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
                    className="bg-white border border-gray-300 p-2.5 rounded hover:border-blue-600 hover:shadow-md transition-all cursor-pointer group hover:bg-blue-50"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${badgeColor}`}>
                          {isWin ? '낙찰' : (activeTab === 'result' ? '개찰' : (bid.ntceKindNm || '일반'))}
                        </span>
                        <span className="text-sm text-black font-bold group-hover:text-blue-700 line-clamp-1">
                          {title}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-500 whitespace-nowrap bg-gray-100 px-1 rounded">
                        {dateLabel} {dateValue}
                      </span>
                    </div>

                    <div className="flex justify-between items-end text-xs text-gray-600 mt-0.5 pl-1">
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

                      <div className="text-right">
                        <span className="font-medium mr-1 text-[11px] text-gray-400">{amountLabel}</span>
                        <span className="text-black font-black text-xs">
                          {amountValue && amountValue !== '0' ? Number(String(amountValue).replace(/,/g, '')).toLocaleString() : '-'}
                        </span>
                        <span className="text-gray-500 text-[10px] ml-0.5">{amountValue && amountValue !== '0' ? '원' : ''}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
