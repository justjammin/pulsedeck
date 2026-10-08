import test from 'node:test'; import assert from 'node:assert/strict';
import * as module from '../src/core/parser.js';
const line = v => Array(32).fill(v).join(';');
test('parser consumes split/coalesced frames with a reusable latest slot',()=>{
 assert.equal(typeof module.createParser,'function'); const seen=[]; const p=module.createParser(f=>seen.push({ref:f,copy:[...f]}));
 p.push(line(12).slice(0,19)); p.push(line(12).slice(19)+';\r\n'+line(200)+'\n');
 assert.equal(seen.length,2); assert.equal(seen[0].copy[0],12); assert.equal(seen[1].copy[31],200); assert.equal(seen[0].ref,seen[1].ref); assert.equal(p.metrics().pendingBytes,0);
});
test('parser rejects bad counts, values, syntax and oversized lines then recovers',()=>{
 assert.equal(typeof module.createParser,'function'); const seen=[];const p=module.createParser(f=>seen.push([...f]));
 for(const bad of [Array(31).fill(1).join(';'),line(256),line(-1),line('1.2'),line('NaN'),line(1)+';1',line(1)+';;',line(' 1')]) p.push(bad+'\n');
 p.push(new Uint8Array(1024*1024).fill(49)); assert.ok(p.metrics().pendingBytes<=4096); p.push('\n'+line(255)+'\n');
 assert.deepEqual(seen,[Array(32).fill(255)]); assert.equal(p.metrics().invalidFrames,9); assert.ok(p.metrics().ownedBinaryBytes<=4128);
 p.push('123');p.reset();assert.equal(p.metrics().pendingBytes,0);
});
test('byte chunks can split every delimiter and digit without losing the frame',()=>{
 assert.equal(typeof module.createParser,'function');let last; const p=module.createParser(f=>last=[...f]); for(const byte of new TextEncoder().encode(line(123)+'\n'))p.push(Uint8Array.of(byte));assert.deepEqual(last,Array(32).fill(123));
});
