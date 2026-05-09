import { NextRequest } from 'next/server';
import emitter from '@/lib/eventEmitter';

// SSE stream — patient listens for new quotes on their request
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    const stream = new ReadableStream({
        start(controller) {
            const send = () => {
                try {
                    controller.enqueue(new TextEncoder().encode('data: update\n\n'));
                } catch {
                    // Client disconnected
                }
            };

            emitter.on(`quote:${id}`, send);

            // Heartbeat every 25s to keep connection alive
            const heartbeat = setInterval(() => {
                try {
                    controller.enqueue(new TextEncoder().encode(': ping\n\n'));
                } catch {
                    clearInterval(heartbeat);
                }
            }, 25000);

            req.signal.addEventListener('abort', () => {
                emitter.off(`quote:${id}`, send);
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
