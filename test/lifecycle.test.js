import test from 'node:test';
import assert from 'node:assert/strict';
import {createController} from '../src/core/controller.js';
import {createDemoSource} from '../src/sources/demo.js';
import {fakeClock} from './helpers.js';

function rejectingCleanupSource() {
  let live = 0;
  const source = {
    starts: 0, allowStop: false, callbacks: null,
    get live() { return live; },
    async start(kind, config, callbacks) {
      source.starts++;
      source.callbacks = callbacks;
      live++;
      return {
        async stop() {
          if (!source.allowStop) throw new Error('producer termination not confirmed');
          live--;
        }
      };
    }
  };
  return source;
}

// Losing a rejected-cleanup handle would allow a second producer.
for (const cause of ['stop', 'error']) {
  test(`failed ${cause} cleanup retains ownership until an explicit Stop retry succeeds`, async () => {
    const source = rejectingCleanupSource();
    const clock = fakeClock();
    const c = createController({clock, sourceFactory: source});
    await c.start();
    if (cause === 'stop') {
      await assert.rejects(c.stop(), /termination/);
    } else {
      source.callbacks.error(new Error('capture failed'));
      for (let i = 0; i < 8; i++) await Promise.resolve();
    }
    assert.equal(c.snapshot().state, 'Error');
    assert.match(c.snapshot().message, /Stop.*retry.*cleanup/i);
    assert.deepEqual(clock.schedules, []);
    source.allowStop = true;
    await c.start(); // Start must not silently retry failed cleanup.
    assert.equal(source.starts, 1);
    assert.equal(source.live, 1);
    await c.stop();
    assert.equal(source.live, 0);
    await c.start();
    assert.equal(source.starts, 2);
    assert.equal(source.live, 1);
    await c.dispose();
  });
}

// A late startup handle must remain owned if its retired cleanup rejects.
test('retired startup cleanup failure blocks replacement and remains retryable', async () => {
  let ready, returned = false, live = 0;
  const source = {
    allowStop: false,
    async start() {
      await new Promise(resolve => { ready = resolve; });
      live++;
      returned = true;
      return {
        async stop() {
          if (!source.allowStop) throw new Error('late producer still running');
          live--;
        }
      };
    }
  };
  const c = createController({clock: fakeClock(), sourceFactory: source});
  const starting = c.start();
  while (!ready) await Promise.resolve();
  const stopping = c.stop();
  const stopped = stopping.catch(() => {});
  ready();
  await starting;
  await stopped;
  assert.equal(returned, true);
  assert.equal(live, 1);
  assert.equal(c.snapshot().state, 'Error');
  assert.match(c.snapshot().message, /Stop.*retry.*cleanup/i);
  await c.start();
  assert.equal(live, 1);
  source.allowStop = true;
  await c.stop();
  assert.equal(live, 0);
  assert.match(c.snapshot().message, /Capture is stopped/);
});

// A pending automatic cleanup failure must expose ownership, not stale capture guidance.
test('cleanup failure during a newer Stop has actionable ownership guidance', async () => {
  let rejectStop;
  const source = {
    async start(kind, config, callbacks) {
      source.callbacks = callbacks;
      return {stop: () => new Promise((resolve, reject) => { rejectStop = reject; })};
    }
  };
  const c = createController({clock: fakeClock(), sourceFactory: source});
  await c.start();
  source.callbacks.error(new Error('retired capture failure'));
  while (!rejectStop) await Promise.resolve();
  const stopping = c.stop();
  const outcome = stopping.catch(() => {});
  rejectStop(new Error('late cleanup failed'));
  // The newer Stop may retry the retained resource; reject that attempt too.
  const priorReject = rejectStop;
  for (let i = 0; i < 8 && rejectStop === priorReject; i++) await Promise.resolve();
  if (rejectStop !== priorReject) rejectStop(new Error('retry cleanup failed'));
  await outcome;
  assert.equal(c.snapshot().state, 'Error');
  assert.match(c.snapshot().message, /Stop.*retry.*cleanup/i);
  assert.doesNotMatch(c.snapshot().message, /retired capture failure/);
});

// Concurrent exported source starts must never register two live producers.
test('direct concurrent demo starts retain one timer and disposal removes it', async () => {
  const clock = fakeClock();
  const source = createDemoSource(clock);
  await Promise.all([
    source.start('demo', {}, {frame() {}}),
    source.start('demo', {}, {frame() {}})
  ]);
  assert.deepEqual(clock.schedules, [50]);
  await source.dispose();
  assert.deepEqual(clock.schedules, []);
});

test('demo disposal retires pending starts before they can install timers', async () => {
  const clock = fakeClock();
  const source = createDemoSource(clock);
  const start = source.start('demo', {}, {frame() {}});
  const outcome = start.catch(() => {});
  await source.dispose();
  await outcome;
  assert.deepEqual(clock.schedules, []);
});
test('a newer explicit Stop restores stopped guidance after its cleanup retry succeeds', async () => {
  let rejectFirst, attempts = 0, live = 0;
  const source = {
    async start(kind, config, callbacks) {
      source.callbacks = callbacks;
      live++;
      return {
        stop() {
          attempts++;
          if (attempts === 1) return new Promise((resolve, reject) => { rejectFirst = reject; });
          live--;
          return Promise.resolve();
        }
      };
    }
  };
  const c = createController({clock: fakeClock(), sourceFactory: source});
  await c.start();
  source.callbacks.error(new Error('capture failed'));
  while (!rejectFirst) await Promise.resolve();
  const stopping = c.stop();
  rejectFirst(new Error('first cleanup failed'));
  await stopping;
  assert.equal(live, 0);
  assert.equal(c.snapshot().state, 'Stopped');
  assert.match(c.snapshot().message, /Capture is stopped/);
});
test('queued Start restores its timer after an older failure and successful Stop retry', async () => {
  let rejectFirst, attempts = 0, live = 0, maxLive = 0;
  const source = {
    starts: 0,
    async start(kind, config, callbacks) {
      source.callbacks = callbacks;
      source.starts++;
      live++;
      maxLive = Math.max(maxLive, live);
      return {
        stop() {
          attempts++;
          if (attempts === 1) return new Promise((resolve, reject) => { rejectFirst = reject; });
          live--;
          return Promise.resolve();
        }
      };
    }
  };
  const clock = fakeClock();
  const c = createController({clock, sourceFactory: source});
  await c.start();
  source.callbacks.error(new Error('capture failed'));
  while (!rejectFirst) await Promise.resolve();
  const stopping = c.stop();
  const starting = c.start();
  rejectFirst(new Error('first cleanup failed'));
  await stopping;
  await starting;
  assert.equal(source.starts, 2);
  assert.equal(live, 1);
  assert.equal(maxLive, 1);
  assert.equal(c.snapshot().state, 'Waiting');
  assert.equal(c.snapshot().sourceKind, 'Audio');
  assert.deepEqual(clock.schedules, [100]);
  assert.doesNotMatch(c.snapshot().message, /cleanup failed/i);
  clock.advance(10000);
  assert.equal(c.snapshot().state, 'Error');
  assert.deepEqual(clock.schedules, []);
  await c.stop();
  assert.equal(live, 0);
});
