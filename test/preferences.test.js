import test from 'node:test';
import assert from 'node:assert/strict';
const m = await import('../src/preferences.js').catch(() => ({}));
test('preferences validate sources and allowlisted fields, bound storage, reset only owned key', async () => {
  assert.equal(typeof m.createPreferences, 'function');
  const data=new Map([['unrelated',42]]);
  const p=m.createPreferences({get:async k=>data.get(k),set:async(k,v)=>data.set(k,v),delete:async k=>data.delete(k)});
  assert.equal((await p.load()).preset,'spectrum');
  await p.save({preset:'ocean',motion:'reduced',layout:'expanded',source:{method:'pulse',source:'sink.monitor'},active:true});
  assert.equal((await p.load()).preset,'ocean'); assert.equal(data.get(m.PREFERENCE_KEY).active,undefined);
  await assert.rejects(p.save({source:{method:'pulse',source:'mic\n[output]'}}));
  data.set(m.PREFERENCE_KEY,{version:99,preset:'grid'}); assert.equal((await p.load()).preset,'spectrum');
  data.set(m.PREFERENCE_KEY,{version:1,preset:'grid',junk:'x'.repeat(2049)}); assert.equal((await p.load()).preset,'spectrum');
  await p.reset();assert.equal(data.get('unrelated'),42);
});
