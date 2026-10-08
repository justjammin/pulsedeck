// CAVA ASCII transport: bounded pending line; no incoming chunk is retained.
export function createParser(onFrame) {
  const pending = new Uint8Array(4096), last = new Uint8Array(32);
  let length = 0, dropping = false, invalidFrames = 0, validFrames = 0;
  const increment = () => { invalidFrames = Math.min(Number.MAX_SAFE_INTEGER, invalidFrames + 1); };
  function parse(write) {
    let end = length;
    if (end && pending[end - 1] === 13) end--;
    if (end && pending[end - 1] === 59) end--;
    let count = 0, value = 0, digits = 0;
    for (let i = 0; i <= end; i++) {
      const byte = i === end ? 59 : pending[i];
      if (byte === 59) {
        if (!digits || value > 255 || count >= 32) return false;
        if (write) last[count] = value;
        count++; value = 0; digits = 0;
      } else if (byte >= 48 && byte <= 57) {
        digits++; value = value * 10 + byte - 48;
        if (value > 255) return false;
      } else return false;
    }
    return count === 32;
  }
  return {
    push(chunk) {
      if (typeof chunk !== 'string' && !(chunk instanceof Uint8Array)) throw new TypeError('Expected string or Uint8Array');
      for (let i = 0; i < chunk.length; i++) {
        const byte = typeof chunk === 'string' ? chunk.charCodeAt(i) : chunk[i];
        if (byte === 10) {
          if (!dropping) {
            if (parse(false)) { parse(true); validFrames = Math.min(Number.MAX_SAFE_INTEGER, validFrames + 1); onFrame(last); }
            else increment();
          }
          length = 0; dropping = false;
        } else if (!dropping) {
          if (length === pending.length || byte > 127) { increment(); dropping = true; length = 0; }
          else pending[length++] = byte;
        }
      }
    },
    reset() { length = 0; dropping = false; last.fill(0); invalidFrames = 0; validFrames = 0; },
    metrics() { return {pendingBytes:length, invalidFrames, validFrames, dropping, ownedBinaryBytes:pending.byteLength+last.byteLength}; }
  };
}
