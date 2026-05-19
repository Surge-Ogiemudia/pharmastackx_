import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function extractTextFromFile(buffer: Buffer, mimeType: string, filename: string): Promise<string> {
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    // PDF
    if (mimeType === 'application/pdf' || ext === 'pdf') {
        const pdfParse = (await import('pdf-parse')).default;
        const data = await pdfParse(buffer);
        return data.text;
    }

    // Word (.docx)
    if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        ext === 'docx'
    ) {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    }

    // Excel (.xlsx / .xls)
    if (
        mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mimeType === 'application/vnd.ms-excel' ||
        ext === 'xlsx' ||
        ext === 'xls'
    ) {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        return XLSX.utils.sheet_to_csv(sheet);
    }

    // CSV / TXT — return as-is
    return buffer.toString('utf-8');
}

async function parseInventoryWithAI(rawText: string): Promise<{ medicineName: string; price: number | null }[]> {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are extracting a pharmacy medicine inventory from raw text.

Extract every medicine or drug item you can find. For each, return:
- medicineName: the name of the medicine (include strength/form if present, e.g. "Panadol 500mg")
- price: the price as a plain number in Naira if mentioned, or null if not

Output ONLY a valid JSON array. No markdown, no code blocks, no explanation.
Format: [{"medicineName":"Amoxicillin 250mg","price":1500},{"medicineName":"Panadol","price":null}]

Raw text:
"""
${rawText.slice(0, 8000)}
"""`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('AI did not return a valid JSON array');

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) throw new Error('AI response is not an array');

    return parsed
        .filter((item: any) => typeof item.medicineName === 'string' && item.medicineName.trim())
        .map((item: any) => ({
            medicineName: item.medicineName.trim(),
            price: typeof item.price === 'number' ? item.price : null
        }));
}

export async function POST(req: NextRequest) {
    try {
        const sessionCookie = req.cookies.get('session_token');
        if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const rawText = await extractTextFromFile(buffer, file.type, file.name);

        if (!rawText.trim()) {
            return NextResponse.json({ error: 'Could not extract text from file' }, { status: 422 });
        }

        const inventory = await parseInventoryWithAI(rawText);

        return NextResponse.json({ inventory, itemCount: inventory.length });
    } catch (e: any) {
        console.error('[parse-inventory]', e.message);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
