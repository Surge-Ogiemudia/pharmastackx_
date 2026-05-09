import { NextRequest } from 'next/server';
import emitter from '@/lib/eventEmitter';

// SSE stream — pharmacist listens for new requests in their state
export async function GET(req: NextRequest) {
    const state = req.nextUrl.searchParams.get('state')?.toLowerCase().trim();
    if (!state) {
        return new Response('Missing state', { status: 400 });
    }

    const stream = new ReadableStream({
        start(controller) {
            const send = () => {
                try {
                    controller.enqueue(new TextEncoder().encode('data: update\n\n'));
                } catch {
                    // Client disconnected
                }
            };

            emitter.on(`requests:${state}`, send);

            // Heartbeat every 25s to keep connection alive
            const heartbeat = setInterval(() => {
                try {
                    controller.enqueue(new TextEncoder().encode(': ping\n\n'));
                } catch {
                    clearInterval(heartbeat);
                }
            }, 25000);

            req.signal.addEventListener('abort', () => {
                emitter.off(`requests:${state}`, send);
                clearInterval(heartbeat);
                controller.close();
            });
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}
