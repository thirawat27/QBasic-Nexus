/**
 * QB64-PE vWATCH wire protocol (the channel between a program compiled with
 * `$DEBUG` and its debugger).
 *
 * Source of truth: QB64-PE `internal/support/vwatch/vwatch.bm` (program side)
 * and `source/ide/ide_methods.bas` SUB DebugMode (IDE side).
 *
 * Framing, both directions: MKL$(LEN(body)) + body — a 4-byte little-endian
 * int32 length, then the body. The body is `name` or `name:value`, split at
 * the first colon; the value is binary.
 */

/** Pointer size of 64-bit QB64-PE builds (`_MK$(_OFFSET, ...)`). */
const OFFSET_SIZE = 8;

/**
 * MKL$: 32-bit little-endian integer.
 * @param {number} value
 * @returns {Buffer}
 */
function mkl(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeInt32LE(value | 0, 0);
  return buffer;
}

/**
 * CVL: read a 32-bit little-endian integer.
 * @param {Buffer} buffer
 * @param {number} [offset]
 */
function cvl(buffer, offset = 0) {
  return buffer.length >= offset + 4 ? buffer.readInt32LE(offset) : 0;
}

/**
 * Encode one message.
 * @param {string} name
 * @param {Buffer|string} [value] - omitted for value-less commands like `run`
 * @returns {Buffer}
 */
function encodeMessage(name: string, value?: Buffer | string): Buffer {
  const body =
    value === undefined
      ? Buffer.from(name, 'latin1')
      : Buffer.concat([
          Buffer.from(`${name}:`, 'latin1'),
          Buffer.isBuffer(value) ? value : Buffer.from(String(value), 'latin1'),
        ]);
  return Buffer.concat([mkl(body.length), body]);
}

/**
 * Split a received body into its name and binary value.
 * @param {Buffer} body
 * @returns {{name: string, value: Buffer}}
 */
function decodeBody(body) {
  const colon = body.indexOf(0x3a);
  if (colon === -1) return { name: body.toString('latin1'), value: Buffer.alloc(0) };
  return {
    name: body.subarray(0, colon).toString('latin1'),
    value: body.subarray(colon + 1),
  };
}

/**
 * Reassembles length-prefixed messages from TCP chunks.
 */
class MessageReader {
  declare _buffer: any;

  constructor() {
    this._buffer = Buffer.alloc(0);
  }

  /**
   * @param {Buffer} chunk
   * @returns {Array<{name: string, value: Buffer}>} complete messages
   */
  push(chunk) {
    this._buffer = this._buffer.length
      ? Buffer.concat([this._buffer, chunk])
      : Buffer.from(chunk);
    const messages = [];
    while (this._buffer.length >= 4) {
      const size = this._buffer.readInt32LE(0);
      if (size < 0) {
        this._buffer = Buffer.alloc(0);
        break;
      }
      if (this._buffer.length < 4 + size) break;
      messages.push(decodeBody(this._buffer.subarray(4, 4 + size)));
      this._buffer = this._buffer.subarray(4 + size);
    }
    return messages;
  }
}

/**
 * Handshake replies the IDE sends after the program announces itself with
 * `me:<exe path>`. The last message starts or pauses the program.
 * @param {{lineCount: number, breakpoints: number[], stopOnEntry?: boolean}} options
 * @returns {Buffer[]}
 */
function handshakeMessages({
  lineCount,
  breakpoints,
  stopOnEntry = false,
}: {
  lineCount: number;
  breakpoints: number[];
  stopOnEntry?: boolean;
}): Buffer[] {
  const lines = [...new Set(breakpoints)].filter(
    (line) => Number.isInteger(line) && line >= 1 && line <= lineCount,
  );
  const messages = [
    encodeMessage('vwatch', 'ok'),
    encodeMessage('hwnd', Buffer.alloc(OFFSET_SIZE)),
    encodeMessage('line count', mkl(lineCount)),
  ];
  if (lines.length > 0) {
    messages.push(
      encodeMessage('breakpoint count', mkl(lines.length)),
      encodeMessage('breakpoint list', Buffer.concat(lines.map(mkl))),
    );
  }
  messages.push(encodeMessage(stopOnEntry ? 'break' : 'run'));
  return messages;
}

/**
 * Parse a `call stack` reply: entries joined by CHR$(0), each
 * "<display name>, line N".
 * @param {Buffer} value
 * @returns {Array<{name: string, line: number|null}>}
 */
function parseCallStack(value) {
  return value
    .toString('latin1')
    .split('\0')
    .filter((entry) => entry.trim())
    .map((entry) => {
      const match = /^(.*),\s*line\s+(\d+)\s*$/i.exec(entry);
      return match
        ? { name: match[1].trim(), line: Number(match[2]) }
        : { name: entry.trim(), line: null };
    });
}

export {
  OFFSET_SIZE,
  mkl,
  cvl,
  encodeMessage,
  decodeBody,
  MessageReader,
  handshakeMessages,
  parseCallStack,
};
