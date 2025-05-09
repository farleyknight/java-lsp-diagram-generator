import { formatRequestMessage, formatNotificationMessage, parseMessage } from './json_rpc_protocol';
import { JsonRpcRequest, JsonRpcNotification, JsonRpcResponse } from './types';

describe('JSON-RPC Protocol Utilities', () => {
    describe('formatRequestMessage', () => {
        it('should correctly format a request message with string id', () => {
            const id = 'request-1';
            const method = 'initialize';
            const params = { capabilities: {} };
            const message = formatRequestMessage(id, method, params);
            const content = JSON.stringify({ jsonrpc: '2.0', id, method, params });
            const contentLength = Buffer.byteLength(content, 'utf-8');
            expect(message).toBe(`Content-Length: ${contentLength}\r\n\r\n${content}`);
        });

        it('should correctly format a request message with numeric id', () => {
            const id = 1;
            const method = 'textDocument/didOpen';
            const params = { textDocument: { uri: 'file:///test.java' } };
            const message = formatRequestMessage(id, method, params);
            const content = JSON.stringify({ jsonrpc: '2.0', id, method, params });
            const contentLength = Buffer.byteLength(content, 'utf-8');
            expect(message).toBe(`Content-Length: ${contentLength}\r\n\r\n${content}`);
        });

        it('should correctly calculate content length for various param sizes', () => {
            const id = 2;
            const method = '$/setTrace';
            const params = { value: 'verbose'.repeat(100) }; // Larger params
            const message = formatRequestMessage(id, method, params);
            const content = JSON.stringify({ jsonrpc: '2.0', id, method, params });
            const contentLength = Buffer.byteLength(content, 'utf-8');
            expect(message.startsWith(`Content-Length: ${contentLength}\r\n\r\n`)).toBe(true);
            expect(message.endsWith(content)).toBe(true);
        });

        it('should handle requests with no params', () => {
            const id = 3;
            const method = 'shutdown';
            // Type assertion needed if params is explicitly typed as non-optional in function
            const message = formatRequestMessage(id, method, undefined);
            const content = JSON.stringify({ jsonrpc: '2.0', id, method, params: undefined });
            const contentLength = Buffer.byteLength(content, 'utf-8');
            expect(message).toBe(`Content-Length: ${contentLength}\r\n\r\n${content}`);
        });
    });

    describe('formatNotificationMessage', () => {
        it('should correctly format a notification message', () => {
            const method = 'initialized';
            const params = {};
            const message = formatNotificationMessage(method, params);
            const content = JSON.stringify({ jsonrpc: '2.0', method, params });
            const contentLength = Buffer.byteLength(content, 'utf-8');
            expect(message).toBe(`Content-Length: ${contentLength}\r\n\r\n${content}`);
        });

        it('should correctly calculate content length for various param sizes', () => {
            const method = 'textDocument/didChange';
            const params = { contentChanges: Array(50).fill({ text: 'a' }) }; // Larger params
            const message = formatNotificationMessage(method, params);
            const content = JSON.stringify({ jsonrpc: '2.0', method, params });
            const contentLength = Buffer.byteLength(content, 'utf-8');
            expect(message.startsWith(`Content-Length: ${contentLength}\r\n\r\n`)).toBe(true);
            expect(message.endsWith(content)).toBe(true);
        });

        it('should handle notifications with no params', () => {
            const method = 'exit';
             // Type assertion needed if params is explicitly typed as non-optional in function
            const message = formatNotificationMessage(method, undefined);
            const content = JSON.stringify({ jsonrpc: '2.0', method, params: undefined });
            const contentLength = Buffer.byteLength(content, 'utf-8');
            expect(message).toBe(`Content-Length: ${contentLength}\r\n\r\n${content}`);
        });
    });

    describe('parseMessage', () => {
        const createMessageBuffer = (payload: object | string): Buffer => {
            const content = typeof payload === 'string' ? payload : JSON.stringify(payload);
            const contentLength = Buffer.byteLength(content, 'utf-8');
            return Buffer.from(`Content-Length: ${contentLength}\r\n\r\n${content}`, 'utf-8');
        };
        
        const createMalformedHeaderBuffer = (payload: object): Buffer => {
            const content = JSON.stringify(payload);
            return Buffer.from(`Content-Length:WRONG\r\n\r\n${content}`, 'utf-8');
        };

        it('should parse a valid response message', () => {
            const response: JsonRpcResponse = { jsonrpc: '2.0', id: 1, result: { capabilities: {} } };
            const buffer = createMessageBuffer(response);
            const { message, remainingBuffer } = parseMessage(buffer);
            expect(message).toEqual(response);
            expect(remainingBuffer.length).toBe(0);
        });

        it('should parse a valid notification message', () => {
            const notification: JsonRpcNotification = { jsonrpc: '2.0', method: 'window/logMessage', params: { type: 3, message: 'Hello' } };
            const buffer = createMessageBuffer(notification);
            const { message, remainingBuffer } = parseMessage(buffer);
            expect(message).toEqual(notification);
            expect(remainingBuffer.length).toBe(0);
        });

        it('should return null for partial message (header only)', () => {
            const buffer = Buffer.from('Content-Length: 100', 'utf-8');
            const { message, remainingBuffer } = parseMessage(buffer);
            expect(message).toBeNull();
            expect(remainingBuffer).toBe(buffer);
        });

        it('should return null for partial message (header and partial content)', () => {
            const partialContent = '{"jsonrpc": "2.0", "id": 1, "resul';
            const header = `Content-Length: ${Buffer.byteLength(partialContent + 't": {}}', 'utf-8')}\r\n\r\n`;
            const buffer = Buffer.from(header + partialContent, 'utf-8');
            const { message, remainingBuffer } = parseMessage(buffer);
            expect(message).toBeNull();
            expect(remainingBuffer).toBe(buffer);
        });
        
        it('should parse the first message if buffer contains multiple messages', () => {
            const response1: JsonRpcResponse = { jsonrpc: '2.0', id: 1, result: { value: 'one' } };
            const response2: JsonRpcResponse = { jsonrpc: '2.0', id: 2, result: { value: 'two' } };
            const buffer1 = createMessageBuffer(response1);
            const buffer2 = createMessageBuffer(response2);
            const combinedBuffer = Buffer.concat([buffer1, buffer2]);
            
            const { message, remainingBuffer } = parseMessage(combinedBuffer);
            expect(message).toEqual(response1);
            expect(remainingBuffer.equals(buffer2)).toBe(true);

            const { message: message2, remainingBuffer: finalRemainingBuffer } = parseMessage(remainingBuffer);
            expect(message2).toEqual(response2);
            expect(finalRemainingBuffer.length).toBe(0);
        });

        it('should return null for malformed header (no Content-Length numeric value)', () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            const payload = { jsonrpc: '2.0', id: 1, result: {} };
            const buffer = createMalformedHeaderBuffer(payload)
            const { message, remainingBuffer } = parseMessage(buffer);
            expect(message).toBeNull();
            // Depending on implementation, remainingBuffer might be the original buffer or an empty one after error
            expect(remainingBuffer).toBe(buffer); 
            expect(consoleErrorSpy).toHaveBeenCalledWith("Malformed header: Content-Length not found.");
            consoleErrorSpy.mockRestore();
        });
        
        it('should return null for malformed JSON content', () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            const malformedContent = '{"jsonrpc": "2.0", "id": 1, "result": {'; // Missing closing bracket
            const buffer = createMessageBuffer(malformedContent);
            const { message, remainingBuffer } = parseMessage(buffer);
            expect(message).toBeNull();
             // Depending on implementation, remainingBuffer might be the original buffer or an empty one after error
            expect(remainingBuffer.length).toBe(0); // Assumes message part is consumed
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Error parsing JSON-RPC message content:"), expect.any(Error));
            consoleErrorSpy.mockRestore();
        });

        it('should return null for empty buffer', () => {
            const buffer = Buffer.from('', 'utf-8');
            const { message, remainingBuffer } = parseMessage(buffer);
            expect(message).toBeNull();
            expect(remainingBuffer).toBe(buffer);
        });

        it('should handle message with Content-Length: 0', () => {
            // This case might be invalid per spec, but testing robustness
            const buffer = Buffer.from('Content-Length: 0\r\n\r\n', 'utf-8');
            const { message, remainingBuffer } = parseMessage(buffer);
            expect(message).toBeNull(); // Expecting JSON.parse('') to fail
            expect(remainingBuffer.length).toBe(0);
        });

        it('should parse a message with non-ASCII characters correctly', () => {
            const params = { text: 'こんにちは世界' }; // Hello World in Japanese
            const request: JsonRpcRequest = { jsonrpc: '2.0', id: 'unicode-test', method: 'echo', params };
            const buffer = createMessageBuffer(request);
            const { message, remainingBuffer } = parseMessage(buffer);
            expect(message).toEqual(request);
            expect(remainingBuffer.length).toBe(0);
        });
    });
}); 