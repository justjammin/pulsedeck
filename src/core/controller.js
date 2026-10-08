import {createRaster} from './raster.js';
import {createPresets} from './presets.js';

export const LIMITS = Object.freeze({
  silenceEnergy: 0.02, silenceMs: 1500,
  waitingMs: 2000, errorMs: 10000, maxElapsedMs: 250
});

export function createController({clock, sourceFactory, invalidate = () => {}, preferences = {}}) {
  const normalized = new Float32Array(32);
  const smoothed = new Float32Array(32);
  const peaks = new Float32Array(32);
  const raster = createRaster();
  const presets = createPresets();
  let state = 'Stopped', sourceKind = 'None';
  let preset = ['spectrum', 'ocean', 'grid'].includes(preferences.preset) ? preferences.preset : 'spectrum';
  let expanded = preferences.expanded === true;
  let motion = preferences.motion === 'reduced' ? 'reduced' : 'full';
  let message = 'Capture is stopped. Choose Start or Demo.';
  // The source adapter validates this opaque configuration before launching anything.
  let config = {...(preferences.source || {})};
  let handle = null, cancel = null, interval = 0, generation = 0, disposed = false;
  let operation = Promise.resolve(), startPromise = null;
  let cleanupBlocked = false;
  let lastFrame = 0, quietSince = null, lastTick = clock.now(), frames = 0;

  function notify() { invalidate(); }
  function unschedule() {
    if (cancel) cancel();
    cancel = null;
    interval = 0;
  }
  function schedule() {
    if (state === 'Stopped' || state === 'Error' || disposed) {
      unschedule();
      return;
    }
    const ms = motion === 'reduced' || state === 'Silence' ? 500 : expanded ? 50 : 100;
    if (cancel && ms === interval) return;
    unschedule();
    interval = ms;
    lastTick = clock.now();
    cancel = clock.every(ms, tick);
  }
  function setState(value, text) {
    // Continuous input replaces the frame; only transitions bypass the draw timer.
    if (state === value && message === text) return;
    state = value;
    message = text;
    schedule();
    notify();
  }
  function enqueue(fn) {
    const next = operation.then(fn);
    operation = next.catch(() => {});
    return next;
  }
  function clear() {
    normalized.fill(0);
    smoothed.fill(0);
    peaks.fill(0);
    presets.reset();
    quietSince = null;
  }
  async function release() {
    if (!handle) return;
    const old = handle;
    try {
      await old.stop();
      if (handle === old) handle = null;
      cleanupBlocked = false;
    } catch (error) {
      // A rejected termination is still an owned producer, even after Stop.
      cleanupBlocked = true;
      unschedule();
      state = 'Error';
      message = 'Capture cleanup failed. Choose Stop to retry cleanup before Start. '
        + String(error?.message || error).slice(0, 400).replace(/[\x00-\x1f\x7f]/g, ' ');
      notify();
      throw error;
    }
  }
  function fail(reason) {
    generation++;
    unschedule();
    state = 'Error';
    // At most 400 UTF-16 units plus guidance: below 2 KiB even for non-ASCII errors.
    message = String(reason?.message || reason || 'Capture ended unexpectedly')
      .slice(0, 400).replace(/[\x00-\x1f\x7f]/g, ' ')
      + ' Retry or check the selected source setup.';
    notify();
    // release publishes an ownership failure itself; retired capture errors never
    // overwrite the resulting cleanup guidance from an asynchronous catch.
    enqueue(release).catch(() => {});
  }
  function tick() {
    raster.advance();
    const now = clock.now();
    const dt = Math.max(0, Math.min(LIMITS.maxElapsedMs, now - lastTick)) / 1000;
    lastTick = now;
    if (now - lastFrame >= LIMITS.errorMs) {
      fail('No valid frames for 10 seconds. Check CAVA and the selected monitor source.');
      return;
    }
    if (now - lastFrame >= LIMITS.waitingMs && state !== 'Waiting') {
      setState('Waiting', 'No recent spectrum data. Check the selected monitor source.');
    }
    for (let i = 0; i < 32; i++) {
      smoothed[i] += (normalized[i] - smoothed[i]) * (1 - Math.exp(-dt * 12));
      peaks[i] = Math.max(smoothed[i], peaks[i] - dt * 0.45);
    }
    presets.update(preset, smoothed, dt, motion === 'reduced');
    notify();
  }
  function ingest(own, frame) {
    if (own !== generation || disposed || !(frame instanceof Uint8Array) || frame.length !== 32) return;
    let energy = 0;
    for (let i = 0; i < 32; i++) {
      normalized[i] = frame[i] / 255;
      energy += normalized[i] / 32;
    }
    frames = Math.min(Number.MAX_SAFE_INTEGER, frames + 1);
    lastFrame = clock.now();
    if (energy <= LIMITS.silenceEnergy) {
      if (quietSince === null) quietSince = lastFrame;
      if (lastFrame - quietSince >= LIMITS.silenceMs) {
        setState('Silence', sourceKind === 'Demo'
          ? 'Demo — quiet synthetic signal.' : 'Silence — selected audio source is quiet.');
      }
    } else {
      quietSince = null;
      setState('Active', sourceKind === 'Demo'
        ? 'Demo — synthetic spectrum.' : 'Audio — live selected source.');
    }
  }

  const api = {
    start(kind = 'audio') {
      if (disposed) return Promise.reject(new Error('PulseDeck is disposed'));
      if (cleanupBlocked) return Promise.resolve();
      if (!['audio', 'demo'].includes(kind)) return Promise.reject(new Error('Unknown source kind'));
      const desired = kind === 'demo' ? 'Demo' : 'Audio';
      if (sourceKind === desired && state !== 'Stopped' && state !== 'Error') {
        return startPromise || Promise.resolve();
      }
      const own = ++generation;
      unschedule();
      clear();
      sourceKind = desired;
      state = 'Checking';
      message = 'Checking selected source. Stop cancels setup.';
      lastFrame = clock.now();
      schedule();
      notify();
      startPromise = enqueue(async () => {
        try {
          if (cleanupBlocked) return;
          await release();
          if (own !== generation || disposed) return;
          // Older queued cleanup may have published Error after this command's
          // initial Checking view. Re-establish the current startup only once
          // its ownership barrier is cleared, before callbacks can arrive.
          sourceKind = desired;
          lastFrame = clock.now();
          setState('Checking', 'Checking selected source. Stop cancels setup.');
          const fresh = await sourceFactory.start(kind, {...config}, {
            frame: frame => ingest(own, frame),
            error(reason) { if (own === generation && !disposed) fail(reason); },
            end() { if (own === generation && !disposed) fail('Capture ended unexpectedly.'); }
          });
          // Even a retired setup owns its returned handle until termination succeeds.
          handle = fresh;
          if (own !== generation || disposed) {
            await release();
            return;
          }
          if (state === 'Checking') {
            setState('Waiting', sourceKind === 'Demo'
              ? 'Demo — waiting for synthetic frame.'
              : 'Waiting for spectrum data. Check the selected monitor source.');
          }
        } catch (error) {
          if (!cleanupBlocked && own === generation && !disposed) fail(error);
        }
      });
      return startPromise;
    },
    stop() {
      const own = ++generation;
      unschedule();
      clear();
      state = 'Stopped';
      sourceKind = 'None';
      message = 'Capture is stopped. Choose Start or Demo.';
      notify();
      return enqueue(async () => {
        await release();
        // A successful explicit retry supersedes an older cleanup failure, but
        // never overwrites a newer command's Checking/Waiting/Stopped state.
        if (own === generation) {
          setState('Stopped', 'Capture is stopped. Choose Start or Demo.');
        }
      });
    },
    open() { notify(); },
    expand(value) { expanded = Boolean(value); schedule(); notify(); },
    setPreset(value) {
      if (!['spectrum', 'ocean', 'grid'].includes(value)) throw new Error('Unknown preset');
      preset = value;
      presets.reset();
      notify();
    },
    setMotion(value) {
      if (!['full', 'reduced'].includes(value)) throw new Error('Unknown motion setting');
      motion = value;
      presets.reset();
      schedule();
      notify();
    },
    setSource(value) {
      const result = api.stop();
      config = {...value};
      return result;
    },
    snapshot() {
      return {state, sourceKind, preset, expanded, motion, message, metrics: {
        frames, frameBacklog: 0, renderFps: interval ? 1000 / interval : 0,
        ownedBinaryBytes: normalized.byteLength + smoothed.byteLength + peaks.byteLength
          + raster.ownedBinaryBytes + presets.ownedBinaryBytes
          + (sourceFactory.metrics?.().ownedBinaryBytes || 0),
        ...presets.metrics()
      }};
    },
    /**
     * Returns a borrowed RGBA view. Any subsequent render may clear or overwrite
     * its backing storage (including same-tick resize/control changes). Draw ticks
     * alternate two reusable buffers; consumers needing stable pixels must copy.
     */
    render(width, height) {
      const target = raster.resize(width, height);
      raster.clear();
      presets.draw(preset, raster, smoothed, peaks, motion === 'reduced');
      return {...target, label: `${sourceKind} · ${state} · ${preset} · ${message}`};
    },
    dispose() { disposed = true; return api.stop(); }
  };
  return api;
}
