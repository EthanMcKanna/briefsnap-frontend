export const Buffer = globalThis.Buffer || {
  from: (data) => new TextEncoder().encode(data),
  alloc: (size) => new Uint8Array(size),
  concat: (chunks) => {
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  },
};

export const process = globalThis.process || {
  env: { NODE_ENV: 'production' },
};

export const stream = globalThis.stream || { Readable: class {}, Writable: class {}, Transform: class {} };
export const util = globalThis.util || { inherits: () => {} };