import { JsonRpcRequest, JsonRpcNotification, JsonRpcResponse } from './types';

const HEADER_CONTENT_LENGTH = "Content-Length: ";
const HEADER_SEPARATOR = "\r\n\r\n";

/**
 * Formats a JSON-RPC request message with appropriate headers.
 */
export function formatRequestMessage<TParams>(id: number | string, method: string, params?: TParams): string {
    const message: JsonRpcRequest = {
        jsonrpc: "2.0",
        id,
        method,
        params
    };
    const content = JSON.stringify(message);
    const contentLength = Buffer.byteLength(content, 'utf-8');
    return `${HEADER_CONTENT_LENGTH}${contentLength}${HEADER_SEPARATOR}${content}`;
}

/**
 * Formats a JSON-RPC notification message with appropriate headers.
 */
export function formatNotificationMessage<TParams>(method: string, params?: TParams): string {
    const message: JsonRpcNotification = {
        jsonrpc: "2.0",
        method,
        params
    };
    const content = JSON.stringify(message);
    const contentLength = Buffer.byteLength(content, 'utf-8');
    return `${HEADER_CONTENT_LENGTH}${contentLength}${HEADER_SEPARATOR}${content}`;
}

interface ParsedMessageResult {
    message: JsonRpcResponse | JsonRpcNotification | null;
    remainingBuffer: Buffer;
}

/**
 * Tries to parse a complete JSON-RPC message from the start of a buffer.
 * Returns the parsed message and the remaining unparsed buffer part.
 */
export function parseMessage(buffer: Buffer): ParsedMessageResult {
    const bufferString = buffer.toString('utf-8');
    const separatorIndex = bufferString.indexOf(HEADER_SEPARATOR);

    if (separatorIndex === -1) {
        // Not enough data for headers yet
        return { message: null, remainingBuffer: buffer };
    }

    const headerPart = bufferString.substring(0, separatorIndex);
    const headerLines = headerPart.split("\r\n");
    let contentLength = -1;

    for (const line of headerLines) {
        if (line.startsWith(HEADER_CONTENT_LENGTH)) {
            contentLength = parseInt(line.substring(HEADER_CONTENT_LENGTH.length), 10);
            break;
        }
    }

    if (contentLength === -1) {
        // Malformed header
        // Consider more robust error handling or logging here
        // For now, assume it's an incomplete message and wait for more data
        console.error("Malformed header: Content-Length not found.");
        return { message: null, remainingBuffer: buffer }; // Or discard part of buffer if known to be corrupt
    }

    const messageStartIndex = separatorIndex + HEADER_SEPARATOR.length;
    const messageEndIndex = messageStartIndex + contentLength;

    if (buffer.length < messageEndIndex) {
        // Not enough data for the full message content yet
        return { message: null, remainingBuffer: buffer };
    }

    const messageContent = buffer.subarray(messageStartIndex, messageEndIndex).toString('utf-8');
    const remainingBuffer = buffer.subarray(messageEndIndex);

    try {
        const parsed = JSON.parse(messageContent) as JsonRpcResponse | JsonRpcNotification;
        return { message: parsed, remainingBuffer };
    } catch (error) {
        console.error("Error parsing JSON-RPC message content:", error);
        // Consider how to handle malformed JSON. Potentially discard the identified message part.
        return { message: null, remainingBuffer }; // Or remainingBuffer starting after the supposed message
    }
} 