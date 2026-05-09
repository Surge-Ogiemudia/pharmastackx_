import { EventEmitter } from 'events';

declare global {
    // eslint-disable-next-line no-var
    var __psxEventEmitter: EventEmitter | undefined;
}

const emitter = globalThis.__psxEventEmitter ?? new EventEmitter();
emitter.setMaxListeners(100);
globalThis.__psxEventEmitter = emitter;

export default emitter;

// Emit when a new quote is added to a request
export function emitQuoteUpdate(requestId: string) {
    emitter.emit(`quote:${requestId}`);
}

// Emit when a new request is created — notify pharmacists in a state
export function emitNewRequest(state: string) {
    emitter.emit(`requests:${state.toLowerCase().trim()}`);
}
