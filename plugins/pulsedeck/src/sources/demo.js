export function createDemoSource(clock) {
  const frame = new Uint8Array(32);
  let active = null;
  let disposed = false;

  // Timer cancellation is synchronous, so startup has no yield between replacing
  // the previous producer and owning its successor. Concurrent calls cannot race.
  function stopProducer(producer = active) {
    if (!producer || producer.stopped) return;
    producer.stopped = true;
    producer.cancel();
    if (active === producer) active = null;
  }

  return {
    async start(kind, config, callbacks) {
      if (disposed) throw new Error('Demo source disposed');
      if (kind !== 'demo') {
        throw new Error('Real audio source unavailable. Check CAVA or choose Demo.');
      }
      stopProducer();
      let step = 0;
      const producer = {stopped: false, cancel: null};
      producer.cancel = clock.every(50, () => {
        if (producer.stopped || disposed) return;
        step++;
        for (let i = 0; i < 32; i++) {
          const wave = 0.35 + 0.25 * Math.sin(step * 0.13 + i * 0.27)
            + 0.2 * Math.sin(step * 0.07 - i * 0.19);
          frame[i] = Math.round(255 * Math.max(0, Math.min(1, wave * Math.exp(-i / 70))));
        }
        callbacks.frame(frame);
      });
      active = producer;
      return {async stop() { stopProducer(producer); }};
    },
    async dispose() {
      disposed = true;
      stopProducer();
    },
    metrics() { return {ownedBinaryBytes: frame.byteLength, producers: active ? 1 : 0}; }
  };
}
