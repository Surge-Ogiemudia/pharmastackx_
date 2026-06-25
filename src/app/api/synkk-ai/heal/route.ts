import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 120;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { url, pageHtml, failedScript, errorMessage, attempt = 1 } = await req.json();

    if (!pageHtml) {
      return NextResponse.json({ error: 'pageHtml is required' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: `You are a pharmacy inventory extraction specialist. Given a POS webpage HTML, you write a single self-contained JavaScript async IIFE that extracts ALL inventory items and returns them as an array of {name: string, qty: number, price: number}.

The script runs inside Electron's webContents.executeJavaScript() — it has full DOM and window access, including jQuery ($), fetch, XMLHttpRequest, and any globals the page loaded.

Rules:
- Return ONLY the raw JavaScript. No markdown, no code fences, no explanation.
- The script must be an async IIFE: (async () => { ... })()
- It must return the array directly (not via callback)
- name = medicine/product name (string, strip HTML tags)
- qty = numeric quantity in stock (parse from strings like "178.00 Pieces" → 178)
- price = numeric selling price (parse from strings like "₦ 10,599.85" → 10599.85)
- Filter out header rows, "Actions" buttons, empty names
- If the page uses Laravel DataTables, try window.LaravelDataTables first, then $.fn.dataTable, then fetch the AJAX endpoint directly
- If all API approaches fail, fall back to reading table rows from the DOM
- The script must return at least 10 items or return an empty array — never partial/broken data`,
    });

    let prompt = `POS URL: ${url}

Page HTML (first 50,000 chars):
${pageHtml.substring(0, 50000)}`;

    if (failedScript && errorMessage && attempt > 1) {
      prompt += `

PREVIOUS ATTEMPT FAILED:
Script tried:
${failedScript.substring(0, 3000)}

Error received: ${errorMessage}

Fix the error and write a corrected script. Try a completely different approach if the same approach keeps failing.`;
    }

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Strip markdown code fences if Gemini wrapped the script anyway
    const script = text
      .replace(/^```(?:javascript|js)?\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim();

    if (!script || script.length < 20) {
      return NextResponse.json({ error: 'Gemini returned empty script' }, { status: 500 });
    }

    return NextResponse.json({ script });
  } catch (err: any) {
    console.error('[/api/synkk-ai/heal] Error:', err);
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}
