import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 120;

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// The tools the agent can ask the desktop to execute
const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'navigate',
    description: 'Navigate the hidden browser to a URL and wait for it to load.',
    input_schema: {
      type: 'object' as const,
      properties: {
        url: { type: 'string', description: 'The URL to navigate to' },
      },
      required: ['url'],
    },
  },
  {
    name: 'get_network_traffic',
    description: 'Get all JSON network responses intercepted so far from the hidden browser. Returns API endpoints and their response data. Use this early — it\'s the fastest way to find a direct data endpoint.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'read_page_dom',
    description: 'Read the full visible text content of the current page in the hidden browser. Use this to understand page structure, find pagination controls, dropdowns, and table data.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'execute_script',
    description: 'Execute JavaScript in the hidden browser page context. Use this to: change dropdowns to show more rows, steal auth tokens from localStorage/sessionStorage, click pagination buttons, or fetch data directly from internal APIs using the page\'s own auth headers.',
    input_schema: {
      type: 'object' as const,
      properties: {
        script: { type: 'string', description: 'JavaScript to execute. Must return a value (use return statement or be an expression). For async operations wrap in an async IIFE.' },
      },
      required: ['script'],
    },
  },
  {
    name: 'fetch_directly',
    description: 'Make a direct HTTP request to an API endpoint from the desktop (not the browser). Use this once you have discovered an inventory API endpoint and want to paginate through all results efficiently.',
    input_schema: {
      type: 'object' as const,
      properties: {
        url: { type: 'string', description: 'The API endpoint URL' },
        headers: { type: 'object', description: 'Request headers (e.g. Authorization token)' },
        method: { type: 'string', description: 'HTTP method, defaults to GET' },
      },
      required: ['url'],
    },
  },
  {
    name: 'screenshot',
    description: 'Capture a screenshot of the current page in the hidden browser. Use this as a last resort when the DOM text is not enough to understand what\'s on the page.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'finish',
    description: 'Call this when you have successfully extracted all inventory items. Pass the final structured array.',
    input_schema: {
      type: 'object' as const,
      properties: {
        items: {
          type: 'array',
          description: 'The extracted inventory items',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              qty: { type: 'number' },
              price: { type: 'number' },
            },
            required: ['name', 'qty', 'price'],
          },
        },
        method: {
          type: 'string',
          description: 'Short description of how you extracted the data (e.g. "direct API endpoint", "DOM scrape with pagination", "network intercept")',
        },
      },
      required: ['items', 'method'],
    },
  },
  {
    name: 'give_up',
    description: 'Call this only if you have exhausted all approaches and truly cannot extract the inventory. Provide a clear reason why.',
    input_schema: {
      type: 'object' as const,
      properties: {
        reason: { type: 'string', description: 'Why extraction failed' },
      },
      required: ['reason'],
    },
  },
];

const SYSTEM_PROMPT = `You are Synkk's AI extraction agent. You are running inside a pharmacy's computer.

Your ONE job: extract the full inventory from a pharmacy POS system and return it as a structured list of {name, qty, price}.

You have a hidden browser window already open. The user has already logged in to their POS. You are here to get the stock out — quietly, efficiently, completely.

STRATEGY (try in this order, but use your judgment):
1. FIRST: Check network traffic immediately. Many POS systems make API calls that expose all inventory in one request. This is the fastest path.
2. If you find an API endpoint — use execute_script to steal the auth token from localStorage/sessionStorage and fetch all pages directly.
3. If no API endpoint is obvious — read the DOM. Look for a "rows per page" or "show all" dropdown and expand it to get more items.
4. Paginate through all pages if needed. Never stop after one page.
5. Screenshot only if you genuinely can't understand the page structure from DOM text.

IMPORTANT RULES:
- Never return partial results. Get ALL items, paginate until done.
- Items have name, qty (number), and price (number). You can figure out which field is which from context — you don't need to be told.
- Ignore non-medical items (groceries, beverages) if you can clearly identify them, but when in doubt keep the item.
- Be efficient. Don't take screenshots if you don't need them. Don't read DOM if network traffic already has the data.
- If an approach fails, immediately try the next one. Don't retry the same thing twice.
- Call finish() when you have all the items. Call give_up() only if truly impossible.`;

export async function POST(req: Request) {
  try {
    const { messages, url } = await req.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Missing Anthropic API key' }, { status: 500 });
    }

    // Build the message history for Claude
    const claudeMessages: Anthropic.MessageParam[] = messages && messages.length > 0
      ? messages
      : [
          {
            role: 'user',
            content: `The pharmacy's POS system is at: ${url}\n\nThe hidden browser is already open and the user is logged in. Start by checking network traffic to see if any API endpoints have already been captured during page load.`,
          },
        ];

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: AGENT_TOOLS,
      messages: claudeMessages,
    });

    // Check what Claude wants to do
    const toolUse = response.content.find(block => block.type === 'tool_use') as Anthropic.ToolUseBlock | undefined;
    const textBlock = response.content.find(block => block.type === 'text') as Anthropic.TextBlock | undefined;

    if (!toolUse) {
      // Claude responded with text but no tool call — this shouldn't happen often
      // but if it does, treat it as a give_up
      return NextResponse.json({
        type: 'error',
        reason: textBlock?.text || 'Agent returned no tool call',
        // Send back updated messages so desktop can continue if needed
        messages: [
          ...claudeMessages,
          { role: 'assistant', content: response.content },
        ],
      });
    }

    // Claude wants to call a tool
    if (toolUse.name === 'finish') {
      const input = toolUse.input as { items: any[]; method: string };
      return NextResponse.json({
        type: 'done',
        items: input.items,
        method: input.method,
        messages: [
          ...claudeMessages,
          { role: 'assistant', content: response.content },
        ],
      });
    }

    if (toolUse.name === 'give_up') {
      const input = toolUse.input as { reason: string };
      return NextResponse.json({
        type: 'failed',
        reason: input.reason,
        messages: [
          ...claudeMessages,
          { role: 'assistant', content: response.content },
        ],
      });
    }

    // Any other tool — tell the desktop to execute it
    return NextResponse.json({
      type: 'tool_call',
      tool: toolUse.name,
      args: toolUse.input,
      toolUseId: toolUse.id,
      // Send back the updated messages so desktop can append the tool result and call us again
      messages: [
        ...claudeMessages,
        { role: 'assistant', content: response.content },
      ],
    });

  } catch (error: any) {
    console.error('[Agent] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
