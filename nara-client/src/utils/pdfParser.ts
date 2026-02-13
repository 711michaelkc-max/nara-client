// Polyfill for PDF.js in Node.js environment
if (typeof Promise.withResolvers === 'undefined') {
    // Some versions of PDF.js might need this too, but DOMMatrix is the current crasher.
}

if (typeof global.DOMMatrix === 'undefined') {
    // Simple mock to verify if it satisfies the load
    (global as any).DOMMatrix = class DOMMatrix {
        a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
        constructor() { }
        translate() { return this; }
        scale() { return this; }
        rotate() { return this; }
        multiply() { return this; }
        transformPoint(p: any) { return p; }
    };
}

const pdf = require('pdf-parse/lib/pdf-parse.js');

export async function parsePdf(buffer: Buffer): Promise<string> {
    try {
        const data = await pdf(buffer);
        return data.text;
    } catch (error) {
        console.error('PDF parsing error:', error);
        throw new Error('Failed to parse PDF');
    }
}

/**
 * Extracts country and personnel information from text using Regex.
 * This function can be shared for both PDF and HWP results.
 */
export function extractInfoFromText(text: string): { country: string; personnel: string; budget: string } {
    // Normalize text (remove excessive whitespace but keep newlines for structure detection if possible, 
    // but pdf-parse often returns a stream of text. We'll rely on patterns that stop at logical boundaries)

    // 1. Cleaning: Remove weird control characters but keep basic punctuation
    const cleanText = text.replace(/[\t]/g, ' ').trim();

    // Helper to find match with priority
    const findMatch = (patterns: RegExp[]) => {
        for (const pattern of patterns) {
            // Create a global regex to find all matches
            const globalPattern = new RegExp(pattern.source, 'g');
            let match;

            while ((match = globalPattern.exec(cleanText)) !== null) {
                if (!match[1]) continue;

                let value = match[1].trim();

                // Filter: Ignore "Refer to" type answers
                if (value.includes("참조") || value.includes("공고서") || value.includes("따름") || value.includes("붙임")) {
                    continue; // Skip this match, look for the next one (e.g. detailed section)
                }

                // Additional Cleanup
                if (value.length > 50) continue;

                const stopWords = ['인원', '기간', '목적', '방문', '출장', '과업', '예산', '사업', '일정'];
                for (const word of stopWords) {
                    const idx = value.indexOf(word);
                    if (idx > 1) {
                        value = value.substring(0, idx).trim();
                    }
                }

                value = value.replace(/[,;.:]+$/, '');

                // Remove trailing conjunctions (e.g. "사찰음식 장인스님 및" -> "사찰음식 장인스님")
                const trailingWords = ['및', '등', '그리고', '와', '과'];
                for (const word of trailingWords) {
                    if (value.endsWith(word)) {
                        value = value.substring(0, value.length - word.length).trim();
                    }
                }

                if (value.length > 0) return value; // Return the first valid, non-reference match
            }
        }
        return "정보 없음";
    };

    // Country Patterns (Priority Order)
    // 1. Specific label with colon: "방문국 : 미국"
    // 2. "국가" label with colon (Strict to avoid "national policy" sentences)
    // 3. Relaxed patterns
    // Country Patterns (Priority Order)
    const countryPatterns = [
        // 1. "Total X countries (A, B, C)" pattern (Very specific, high confidence)
        /총\s*\d+개국\s*\(([^)]+)\)/,

        // 2. Sentence style: "연수국가는 ... 이다", "연수지(국가)는 ...", "방문국은 ..."
        /(?:연수국가|연수국|방문국가|방문국|출장국가|출장국|대상국가|대상국|연수지|방문지|출장지)(?:\(국가\))?\s*(?:는|은|가|이|보|의)\s*([^\n\r:;]+)/,

        // 3. Explicit label with colon
        /(?:연수국가|연수국|방문국가|방문국|출장국가|출장국|파견국가|파견국|대상국가|대상국|연수장소|출장장소|방문장소|방문지|출장지|연수지)\s*[:;]\s*([^\n\r]+)/,

        // 4. Generic label matched STRICTLY (Risk of false positives like "Region: Safe area")
        // We move this to lower priority and stricter validation if possible
        /(?:국가|장소|지역)\s*[:;]\s*([^\n\r]+)/,

        // 5. Short text following keyword (No colon)
        /(?:연수국|방문국|출장국|대상국)\s+([가-힣a-zA-Z, ]{2,20})(?=\s|$)/
    ];

    // Personnel Patterns
    const personnelPatterns = [
        // 1. Explicit Number with label: "연수인원 : 30명", "참여대상 : 30명"
        /(?:연수인원|방문인원|출장인원|파견인원|참가인원|소요인원|참여대상|교육대상|연수대상|인원)\s*[:;]\s*([0-9,]+명)/,

        // 2. "Total X People" pattern in text: "총 30명", "전체 30명" (High confidence)
        /(?:총인원|전체인원|총|합계)\s*[:\s]*([0-9,]+명)/,

        // 3. Mixed Text (Fallback): "참여대상 : 학생 및 교사" (Only if no number found)
        /(?:연수인원|방문인원|참가인원|참여대상|교육대상)\s*[:;]\s*([0-9명,\s가-힣]+)/,

        // 4. Loose fallback
        /(?:인원|대상)\s*[:;]\s*([0-9명,\s]+)/
    ];

    // Budget Patterns (New)
    // "사업예산: 금76,692,320원", "소요예산 : 10,000,000원", "사업비 : 5천만원"
    const budgetPatterns = [
        /(?:사업예산|소요예산|사업비|배정예산|예산액|추정금액|기초금액)\s*[:;]\s*([0-9,금원천만\s]+)/,
        /(?:예산)\s*[:;]\s*([0-9,금원천만\s]+)/
    ];

    return {
        country: findMatch(countryPatterns),
        personnel: findMatch(personnelPatterns),
        budget: findMatch(budgetPatterns) // Added Budget
    };
}
