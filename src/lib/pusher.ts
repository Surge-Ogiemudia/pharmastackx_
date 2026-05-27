import Pusher from 'pusher';

export const pusherServer = new Pusher({
    appId: process.env.PUSHER_APP_ID || "2152461",
    key: process.env.PUSHER_KEY || "097f7e40113bef06b815",
    secret: process.env.PUSHER_SECRET || "6ba1f6f30a55e661de9e",
    cluster: process.env.PUSHER_CLUSTER || "eu",
    useTLS: true,
});

// Notify patient watching a specific request that a new quote arrived
export function triggerQuoteUpdate(requestId: string) {
    return pusherServer.trigger(`request-${requestId}`, 'new-quote', {});
}

// Notify pharmacists in a state that a new request was created
export function triggerNewRequest(state: string) {
    return pusherServer.trigger(`pharmacist-${state.toLowerCase().trim()}`, 'new-request', {});
}

// Notify a specific pharmacy (by slug) that they have a new online order
export function triggerNewOrder(slug: string, orderData: any) {
    return pusherServer.trigger(`pharmacy-${slug}`, 'new-order', orderData);
}
