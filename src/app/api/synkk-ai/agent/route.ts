import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, FunctionDeclaration, SchemaType, Tool } from '@google/generative-ai';

export const maxDuration = 120;

const SYSTEM_PROMPT = `You are Synkk's AI extraction agent running inside a pharmacy's computer.

Your ONE job: extract the full inventory from a pharmacy POS system and return it as a structured list of {name, qty, price}.

You have a hidden browser window already open. The user has already logged in. Get the stock out — quietly, efficiently, completely.

STRATEGY — this POS uses Laravel + DataTables. Use this exact approach:

STEP 1: Run this script to get all 6000 items in one shot via the DataTables API:
\`\`\`javascript
(async () => {
  // Try Laravel DataTables instance
  const tableId = 'product_table';
  const dt = window.LaravelDataTables?.[tableId];
  if (dt) {
    const url = dt.ajax.url();
    const params = { ...dt.ajax.params(), length: 7000, start: 0 };
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' }, body: qs });
    const json = await res.json();
    return json;
  }
  // Fallback: try window.$ DataTables API
  if (window.$ && $.fn.dataTable) {
    const api = $(\'#\' + tableId).DataTable();
    const settings = api.settings()[0];
    const ajaxUrl = settings.ajax || settings.sAjaxSource;
    const res = await fetch(ajaxUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' }, body: \'draw=1&start=0&length=7000\' });
    return await res.json();
  }
  return { error: 'No DataTables instance found' };
})()
\`\`\`

STEP 2: The result may be { data: [...] } OR { data: { data: [...] } } (double-nested). Unwrap accordingly.
IMPORTANT: Before mapping, log Object.keys(firstRow) to see the ACTUAL column names — do NOT guess. Use whatever keys are actually present.
- name = the column containing the medicine/product name (NOT price, NOT qty)
- qty = current stock (parse number from "178.00 Pieces" → 178)
- price = selling price (parse number from "₦ 10,599.85" → 10599.85)
- Filter out rows where name is empty or contains "Actions"

STEP 3: Call finish with all items and the script that worked.

FALLBACK if DataTables API fails: Use execute_script to change entries to 500 using jQuery:
\`\`\`javascript
$('[name="product_table_length"]').val('500').trigger('change'); return 'done';
\`\`\`
Then read the DOM and parse all rows. Then paginate to next page and repeat.

CRITICAL RULES:
- Never return partial results. Get ALL items (there are 6,000).
- If a script errors, fix the error and retry with corrected script. Don't give up after one failure.
- Call finish when you have everything. Call give_up only if truly impossible after 5+ attempts.
- Be decisive. Don't call read_page_dom more than twice — you already know the page structure.`;

const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'navigate',
    description: 'Navigate the hidden browser to a URL.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        url: { type: SchemaType.STRING, description: 'The URL to navigate to' },
      },
      required: ['url'],
    },
  },
  {
    name: 'get_network_traffic',
    description: 'Get all JSON API calls intercepted from the hidden browser so far. Use this first — fastest path to finding the inventory endpoint.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: 'read_page_dom',
    description: 'Read the full visible text of the current page. Use to understand structure, find pagination, tables, dropdowns.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: 'execute_script',
    description: 'Execute JavaScript in the hidden browser. Use to: steal auth tokens from localStorage/sessionStorage, fetch data from internal APIs, change dropdowns, paginate. For fetching all inventory, write a single script that loops all pages and returns the full array.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        script: { type: SchemaType.STRING, description: 'JavaScript to execute. Must return a value. For async use an async IIFE.' },
      },
      required: ['script'],
    },
  },
  {
    name: 'fetch_directly',
    description: 'Make a direct HTTP request from the desktop to an API endpoint.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        url: { type: SchemaType.STRING },
        headers: { type: SchemaType.OBJECT, description: 'Request headers', properties: {} },
        method: { type: SchemaType.STRING, description: 'HTTP method, default GET' },
      },
      required: ['url'],
    },
  },
  {
    name: 'screenshot',
    description: 'Capture a screenshot of the current page. Last resort only.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: 'finish',
    description: 'Call this when you have ALL inventory items. Pass the complete structured array.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        items: {
          type: SchemaType.ARRAY,
          description: 'All extracted inventory items',
          items: {
            type: SchemaType.OBJECT,
            properties: {
              name: { type: SchemaType.STRING },
              qty: { type: SchemaType.NUMBER },
              price: { type: SchemaType.NUMBER },
            },
          },
        },
        method: { type: SchemaType.STRING, description: 'How you extracted the data' },
        script: { type: SchemaType.STRING, description: 'The exact script that worked for fetching all items (so it can be reused next sync)' },
      },
      required: ['items', 'method'],
    },
  },
  {
    name: 'give_up',
    description: 'Call only if all approaches exhausted.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        reason: { type: SchemaType.STRING },
      },
      required: ['reason'],
    },
  },
];

const GEMINI_TOOLS: Tool[] = [{ functionDeclarations: TOOL_DECLARATIONS }];

export async function POST(req: Request) {
  try {
    const { messages, url } = await req.json();

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing Gemini API key' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
      tools: GEMINI_TOOLS,
    });

    // Build the full contents array for generateContent
    // This avoids startChat history validation which rejects functionResponse in user turns
    let contents: any[];

    if (!messages || messages.length === 0) {
      // First turn — inject the initial prompt
      contents = [{
        role: 'user',
        parts: [{ text: `The pharmacy POS is at: ${url}\n\nThe hidden browser is open and the user is logged in. Start by checking network traffic.` }],
      }];
    } else {
      // Strip thoughtSignature blobs — they're Gemini's internal thinking trace,
      // huge base64 strings we don't need to echo back, and they balloon the payload
      contents = messages.map((msg: any) => ({
        ...msg,
        parts: msg.parts.map((p: any) => {
          const { thoughtSignature, ...rest } = p;
          return rest;
        }),
      }));
    }

    // Retry up to 4 times on 429 rate limit with backoff
    let result: any;
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        result = await model.generateContent({ contents });
        break;
      } catch (err: any) {
        const is429 = err?.message?.includes('429') || err?.message?.includes('503') || err?.status === 429 || err?.status === 503;
        if (is429 && attempt < 4) {
          await new Promise(r => setTimeout(r, attempt * 15000)); // 15s, 30s, 45s
          continue;
        }
        throw err;
      }
    }

    const response = result.response;
    const candidate = response.candidates?.[0];
    if (!candidate || !candidate.content?.parts) {
      const reason = candidate?.finishReason || 'No response from Gemini';
      return NextResponse.json({ type: 'error', reason: `Gemini returned no content: ${reason}` });
    }

    // Build updated messages array for next turn
    const updatedMessages = [
      ...contents,
      { role: 'model', parts: candidate.content.parts },
    ];

    // Check for function calls
    const functionCall = candidate.content.parts.find((p: any) => p.functionCall);

    if (!functionCall) {
      // Text only response
      const text = candidate.content.parts.find((p: any) => p.text)?.text || '';
      return NextResponse.json({ type: 'error', reason: `No tool call: ${text}` });
    }

    const { name: toolName, args } = functionCall.functionCall as { name: string; args: any };

    if (toolName === 'finish') {
      return NextResponse.json({
        type: 'done',
        items: args.items || [],
        method: args.method,
        script: args.script || null,
      });
    }

    if (toolName === 'give_up') {
      return NextResponse.json({
        type: 'failed',
        reason: args.reason,
      });
    }

    // Return tool call to desktop for execution
    return NextResponse.json({
      type: 'tool_call',
      tool: toolName,
      args,
      // For Gemini, tool results go back as function response parts
      messages: updatedMessages,
    });

  } catch (error: any) {
    console.error('[Agent] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
