import { JsonRpcRequest, JsonRpcNotification, JsonRpcResponse, JsonRpcBaseMessage } from './types';

const HEADER_CONTENT_LENGTH = "Content-Length: ";
const HEADER_SEPARATOR = "\r\n\r\n";

/**
 * Formats a JSON-RPC request message with appropriate headers.
 */
export function formatRequestMessage<TParams>(id: number | string, method: string, params: TParams): string {
    const message: JsonRpcRequest = {
        jsonrpc: "2.0",
        id,
        method,
        params
    };
    const content = JSON.stringify(message);
    const contentLength = Buffer.byteLength(content, 'utf8');
    return `${HEADER_CONTENT_LENGTH}${contentLength}${HEADER_SEPARATOR}${content}`;
}

/**
 * Formats a JSON-RPC notification message with appropriate headers.
 */
export function formatNotificationMessage<TParams>(method: string, params: TParams): string {
    const message: JsonRpcNotification = {
        jsonrpc: "2.0",
        method,
        params
    };
    const content = JSON.stringify(message);
    const contentLength = Buffer.byteLength(content, 'utf8');
    return `${HEADER_CONTENT_LENGTH}${contentLength}${HEADER_SEPARATOR}${content}`;
}

export interface ParsedMessageResult {
    message: JsonRpcResponse | JsonRpcNotification | null;
    remainingBuffer: Buffer;
}

/**
 * Tries to parse a JSON-RPC message from the buffer.
 * Assumes messages are separated by Content-Length headers.
 * Handles cases where the buffer might contain partial messages.
 */
export function parseMessage(buffer: Buffer): ParsedMessageResult {
    const bufferString = buffer.toString('utf8'); // Assume UTF8 for headers
    const headerEndIndex = bufferString.indexOf(HEADER_SEPARATOR);

    if (headerEndIndex === -1) {
        // Separator not found, need more data
        return { message: null, remainingBuffer: buffer };
    }

    const headerPart = bufferString.substring(0, headerEndIndex);
    const headers = headerPart.split('\r\n');
    let contentLength = -1;

    for (const header of headers) {
        if (header.startsWith(HEADER_CONTENT_LENGTH)) {
            contentLength = parseInt(header.substring(HEADER_CONTENT_LENGTH.length), 10);
            break;
        }
    }

    if (contentLength === -1) {
        // Invalid header
        console.error("Could not find Content-Length header.");
        // Decide how to handle this - discard buffer up to separator?
        return { message: null, remainingBuffer: buffer.slice(headerEndIndex + HEADER_SEPARATOR.length) };
    }

    const messageStartIndex = headerEndIndex + HEADER_SEPARATOR.length;
    const messageEndIndex = messageStartIndex + contentLength;

    if (buffer.length < messageEndIndex) {
        // Full message content not yet received
        return { message: null, remainingBuffer: buffer };
    }

    const messageBuffer = buffer.slice(messageStartIndex, messageEndIndex);
    const remainingBuffer = buffer.slice(messageEndIndex);

    try {
        const parsedJson = JSON.parse(messageBuffer.toString('utf8'));
        // Basic validation: check for jsonrpc field
        if (parsedJson && parsedJson.jsonrpc === '2.0') {
            // Further check if it looks like a response (has id) or notification (no id, has method)
            if (Object.prototype.hasOwnProperty.call(parsedJson, 'id')) {
                return { message: parsedJson as JsonRpcResponse, remainingBuffer };
            } else if (Object.prototype.hasOwnProperty.call(parsedJson, 'method')) {
                return { message: parsedJson as JsonRpcNotification, remainingBuffer };
            }
        }
        console.error('Parsed JSON does not appear to be a valid JSON-RPC 2.0 message:', parsedJson);
        return { message: null, remainingBuffer }; // Treat as invalid
    } catch (e) {
        console.error('Failed to parse JSON message content:', e);
        // Consider the message part corrupted, discard it and return the rest?
        return { message: null, remainingBuffer }; // Or remainingBuffer starting after the supposed message
    }
}

export { JsonRpcRequest, JsonRpcResponse, JsonRpcNotification, JsonRpcBaseMessage }; 