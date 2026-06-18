import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, FunctionDeclaration, SchemaType, Tool } from '@google/generative-ai';

export const maxDuration = 120;

const SYSTEM_PROMPT = `You are Synkk's AI extraction agent running inside a pharmacy's computer.

Your ONE job: extract the full inventory from a pharmacy POS system and return it as a structured list of {name, qty, price}.

You have a hidden browser window already open. The user has already logged in. Get the stock out — quietly, efficiently, completely.

STRATEGY (try in this order):
1. FIRST: Check network traffic. Many POS systems expose all inventory via a single API call.
2. If you find an API endpoint — use execute_script to steal the auth token from localStorage/sessionStorage and fetch ALL pages in a single loop script. Do not call one page at a time.
3. If no API — read the DOM, find pagination controls, expand rows to max, scrape all pages.
4. Screenshot only as absolute last resort.

CRITICAL RULES:
- Never return partial results. Get ALL items.
- Items need name (string), qty (number), price (number). You can figure out field names from context.
- When you have the endpoint and auth token, write ONE script that loops through all pages and returns the complete array.
- Call finish when you have everything. Call give_up only if truly impossible.
- Be decisive. Don't retry the same failing approach more than twice.`;

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
        headers: { type: SchemaType.OBJECT, description: 'Request headers' },
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

    // Build chat history from messages
    // messages format: [{ role: 'user'|'model', parts: [...] }]
    let history: any[] = [];
    let currentUserMessage: any = null;

    if (messages && messages.length > 0) {
      // All but the last message go into history
      // The last message is the current user turn
      history = messages.slice(0, -1);
      currentUserMessage = messages[messages.length - 1];
    }

    const chat = model.startChat({ history });

    // Determine what to send
    let messageToSend: any;
    if (!currentUserMessage) {
      // First turn
      messageToSend = {
        role: 'user',
        parts: [{ text: `The pharmacy POS is at: ${url}\n\nThe hidden browser is open and the user is logged in. Start by checking network traffic.` }],
      };
    } else {
      messageToSend = currentUserMessage;
    }

    const result = await chat.sendMessage(messageToSend.parts || messageToSend.content || messageToSend);

    const response = result.response;
    const candidate = response.candidates?.[0];
    if (!candidate) {
      return NextResponse.json({ type: 'error', reason: 'No response from Gemini' });
    }

    // Build updated messages array for next turn
    const updatedMessages = [
      ...(messages || []),
      ...(currentUserMessage ? [] : [messageToSend]), // add initial message if first turn
      { role: 'model', parts: candidate.content.parts },
    ];

    // Check for function calls
    const functionCall = candidate.content.parts.find((p: any) => p.functionCall);

    if (!functionCall) {
      // Text only response
      const text = candidate.content.parts.find((p: any) => p.text)?.text || '';
      return NextResponse.json({ type: 'error', reason: `No tool call: ${text}` });
    }

    const { name: toolName, args } = functionCall.functionCall;

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
