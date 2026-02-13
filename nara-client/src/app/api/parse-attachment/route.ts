
import { NextResponse } from 'next/server';
import axios from 'axios';
import { parsePdf, extractInfoFromText } from '@/utils/pdfParser';
import { parseHwp } from '@/utils/hwpParser';

export async function POST(request: Request) {
    try {
        const { url, fileName } = await request.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        console.log(`Analyzing attachment: ${url} (Name: ${fileName})`);

        // 1. Download File
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            // Nara might require User-Agent
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
        });

        const buffer = Buffer.from(response.data);
        const contentType = response.headers['content-type'];

        // Determine file type: Check URL, Content-Type, OR provided FileName
        let text = "";

        const isPdf =
            (fileName && fileName.toLowerCase().endsWith('.pdf')) ||
            url.toLowerCase().split('?')[0].endsWith('.pdf') ||
            contentType === 'application/pdf';

        const isHwp =
            (fileName && (fileName.toLowerCase().endsWith('.hwp') || fileName.toLowerCase().endsWith('.hwpx'))) ||
            url.toLowerCase().split('?')[0].endsWith('.hwp') ||
            url.toLowerCase().split('?')[0].endsWith('.hwpx') ||
            contentType === 'application/x-hwp';

        if (isPdf) {
            text = await parsePdf(buffer);
        }
        else if (isHwp) {
            text = await parseHwp(buffer);
        }
        else {
            return NextResponse.json({
                error: 'Unsupported file type. Only PDF and HWP are supported.',
                details: { fileName, contentType, url }
            }, { status: 400 });
        }

        // 2. Extract Info
        const result = extractInfoFromText(text);

        return NextResponse.json({
            ...result,
            debugText: text.substring(0, 3000) // Return first 3000 chars for debugging
        });

    } catch (error: any) {
        console.error('API Error:', error);

        // Return a friendly error if olefile is missing
        if (error.message && error.message.includes("olefile")) {
            return NextResponse.json(
                { error: "Python 'olefile' library missing. Please contact administrator.", detail: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to process file', detail: error.message },
            { status: 500 }
        );
    }
}
