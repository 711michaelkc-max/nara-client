"use client";

import { useState } from "react";

interface TestDetailViewProps {
    selectedBid: any;
    onClose: () => void;
    activeTab: string;
}

export default function TestDetailView({ selectedBid, onClose, activeTab }: TestDetailViewProps) {
    const [analyzingFileIndex, setAnalyzingFileIndex] = useState<number | null>(null);

    if (!selectedBid) return null;

    const isWin = activeTab === 'win';
    const [analysisResults, setAnalysisResults] = useState<{ [key: number]: { country: string, personnel: string, debugText?: string } }>({});
    const [showDebug, setShowDebug] = useState<number | null>(null);
    const isResult = activeTab === 'result';

    // API Call Function
    const handleAnalyze = async (fileIndex: number, fileName: string, fileUrl: string) => {
        setAnalyzingFileIndex(fileIndex);

        try {
            const response = await fetch('/api/parse-attachment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: fileUrl, fileName: fileName }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '분석 실패');
            }

            setAnalysisResults(prev => ({
                ...prev,
                [fileIndex]: {
                    country: data.country || "정보 없음",
                    personnel: data.personnel || "정보 없음",
                    debugText: data.debugText
                }
            }));

        } catch (error: any) {
            console.error("Analysis failed:", error);
            alert(`분석 중 오류가 발생했습니다: ${error.message}\n(상세: ${error.detail || '없음'})`);
        } finally {
            setAnalyzingFileIndex(null);
        }
    };

    // --- Reuse existing layout logic (simplified for Test View) ---

    const title = selectedBid.bidNtceNm;
    const agency = selectedBid.dminsttNm;

    return (
        <div className="w-[800px] mx-auto px-4 py-4 animate-in fade-in slide-in-from-right-4 duration-300 border-4 border-green-500 rounded-lg relative">
            {/* Test Mode Indicator */}
            <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg z-20">
                테스트 모드 (파일 분석)
            </div>

            {/* Detail Header */}
            <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-3 mt-4">
                <h2 className="text-xl font-black text-black">
                    {isResult ? '개찰결과 (테스트)' : (isWin ? '낙찰결과 (테스트)' : '입찰공고 (테스트)')}
                </h2>
                <button
                    onClick={onClose}
                    className="text-xs font-bold text-gray-600 hover:text-black px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                >
                    ✕ 닫기
                </button>
            </div>

            <div className="bg-gray-50 p-5 rounded-lg border border-gray-300 mb-6">
                <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 text-[10px] font-bold border rounded bg-gray-100 text-gray-700 border-gray-300`}>
                        TEST VIEW
                    </span>
                    <span className="text-gray-500 text-[10px] font-mono font-bold">
                        공고번호 {selectedBid.bidNtceNo}
                    </span>
                    <span className="text-gray-600 text-[10px] font-bold">
                        {agency || '조달청'}
                    </span>
                </div>
                <h2 className="text-xl font-black text-black leading-snug mb-4">
                    {title}
                </h2>

                {/* --- Attachments Section (The Key Feature) --- */}
                <div className="mt-6 bg-white rounded-lg p-4 border-2 border-green-200 shadow-sm">
                    <h3 className="text-sm font-bold text-black mb-3 flex items-center gap-2">
                        <span className="text-base">💾</span> 첨부파일 분석 테스트
                        <span className="text-[10px] text-green-600 font-bold ml-1">* 분석 버튼을 눌러보세요.</span>
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                        {Array.from({ length: 10 }).map((_, i) => {
                            const index = i + 1;
                            const fileName = selectedBid[`ntceSpecFileNm${index}`];
                            const fileUrl = selectedBid[`ntceSpecDocUrl${index}`];

                            if (!fileName || !fileUrl) return null;

                            const result = analysisResults[index];

                            return (
                                <div key={index} className="flex flex-col gap-2 border border-gray-200 rounded p-2 hover:border-green-300 transition-colors bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <a
                                            href={fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 group"
                                        >
                                            <span className="text-gray-400 group-hover:text-blue-500">📄</span>
                                            <span className="text-xs font-bold text-gray-700 group-hover:text-blue-700 underline underline-offset-2">
                                                {fileName}
                                            </span>
                                        </a>

                                        <button
                                            onClick={() => handleAnalyze(index, fileName, fileUrl)}
                                            disabled={analyzingFileIndex === index}
                                            className="flex items-center gap-1 bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-green-700 transition-colors shadow-sm disabled:bg-gray-400"
                                        >
                                            {analyzingFileIndex === index ? (
                                                <>
                                                    <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></span>
                                                    분석중...
                                                </>
                                            ) : (
                                                <>
                                                    <span>🔍</span> 분석 (Analyze)
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* Analysis Result Display */}
                                    {result && (
                                        <div className="mt-1 bg-green-50 border border-green-200 rounded p-3 animate-in slide-in-from-top-2 fade-in duration-300">
                                            <h4 className="text-[11px] font-bold text-green-800 mb-1 flex items-center gap-1">
                                                <span>✅</span> 분석 결과
                                            </h4>
                                            <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded text-sm">
                                                <div className="flex justify-between items-start">
                                                    <div className="space-y-1">
                                                        <p><span className="font-bold text-green-800 w-16 inline-block">국가:</span> {analysisResults[index].country}</p>
                                                        <p><span className="font-bold text-green-800 w-16 inline-block">인원:</span> {analysisResults[index].personnel}</p>

                                                        {/* Budget & Calculation Display */}
                                                        <p><span className="font-bold text-green-800 w-16 inline-block">예산:</span> {analysisResults[index].budget}</p>

                                                        {(analysisResults[index].budget && analysisResults[index].personnel &&
                                                            analysisResults[index].budget !== "정보 없음" && analysisResults[index].personnel !== "정보 없음") && (() => {
                                                                const b = parseNumber(analysisResults[index].budget);
                                                                const p = parseNumber(analysisResults[index].personnel);
                                                                if (b > 0 && p > 0) {
                                                                    return (
                                                                        <p className="mt-2 pt-2 border-t border-green-200 text-blue-800 font-bold">
                                                                            <span className="w-16 inline-block">1인당:</span>
                                                                            {formatMoney(Math.round(b / p))}
                                                                            <span className="text-xs font-normal text-gray-500 ml-1">(예상)</span>
                                                                        </p>
                                                                    );
                                                                }
                                                            })()}
                                                    </div>

                                                    {(analysisResults[index].country === "정보 없음" || analysisResults[index].personnel === "정보 없음") && (
                                                        <button
                                                            onClick={() => setShowDebug(showDebug === index ? null : index)}
                                                            className="text-xs text-gray-500 underline ml-2 whitespace-nowrap"
                                                        >
                                                            {showDebug === index ? "닫기" : "원문"}
                                                        </button>
                                                    )}
                                                </div>
                                                {showDebug === index && analysisResults[index].debugText && (
                                                    <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto border border-gray-300 font-mono">
                                                        {analysisResults[index].debugText}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {/* Fallback for Standard Notice */}
                        {selectedBid.stdNtceDocUrl && (
                            <div className="flex flex-col gap-2 border border-gray-200 rounded p-2 bg-gray-50 opacity-70">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span>📜</span>
                                        <span className="text-xs font-bold text-gray-500">통합공고문 (분석 제외)</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Brief Overview (Simplified) */}
                <div className="mt-8 opacity-50 pointer-events-none grayscale">
                    <p className="text-center text-gray-400 font-bold text-xs py-4 border-t border-b border-gray-200">
                        (기존 상세 정보는 테스트 모드에서 생략됩니다)
                    </p>
                </div>

            </div>
        </div>
    );
}
