import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {writeFile,readFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createClaudePort} from '../src/host/claude-process.js';
const execute=promisify(execFile);
const after=(ms,fn)=>{const timer=setTimeout(fn,ms);return {cancel:()=>clearTimeout(timer)};};
const run=async(argv,init)=>{try{const r=await execute(argv[0],argv.slice(1),{timeout:init?.timeoutMs});return {exitCode:0,...r};}catch(e){return {exitCode:e.code||1,stdout:e.stdout||'',stderr:e.stderr||e.message};}};

test('native port verifies real bundled bytes and owns private config cleanup',async()=>{
  if(process.platform!=='darwin'||process.arch!=='arm64')return;
  const root=resolve('.');
  const port=createClaudePort({root,run,write:writeFile,after});
  const capability=await port.check(root+'/vendor/cava/darwin-arm64/cava');
  assert.deepEqual(capability.backends,['coreaudio']);assert.match(capability.version,/1\.0\.0/);
  const config=await port.createConfig('test-owned-config');
  assert.equal((await stat(config.path)).mode&0o777,0o600);
  assert.equal(await readFile(config.path,'utf8'),'test-owned-config');
  await assert.rejects(port.createConfig('second'),/pending/);
  await Promise.all([config.remove(),config.remove()]);
  await assert.rejects(readFile(config.path),/ENOENT/);
});

test('native port chunks bounded streams, shares Stop, and suppresses late callbacks',async()=>{
  let finish,returns=0;const final=new Promise(r=>finish=r);
  let pull=0,closed=false;
  const stream={result:Promise.resolve({code:0}),[Symbol.asyncIterator](){return this;},async next(){if(pull++===0)return {done:false,value:{stream:'stdout',text:'x'.repeat(9000)}};await final;return {done:closed,value:{stream:'stderr',text:'late'}};},async return(){returns++;closed=true;finish();return {done:true};}};
  const received=[];
  const port=createClaudePort({root:'',spawn:()=>stream,after});
  const child=await port.spawn(['/fixture'],{stdout:c=>received.push(c),stderr:c=>received.push(c),exited:()=>received.push('exit')});
  await new Promise(r=>setImmediate(r));
  await Promise.all([child.stop(),child.stop()]);
  assert.equal(returns,1);assert.deepEqual(received.map(c=>c.length),[4096,4096,808]);
});

test('native port retains a failed config removal for explicit retry',async()=>{
  let attempts=0;
  const port=createClaudePort({root:'',after,write:async()=>{},run:async argv=>{
    if(argv[0]==='/usr/bin/mktemp')return {exitCode:0,stdout:'/tmp/pulsedeck.Fixture',stderr:''};
    if(argv[0]==='/bin/rm'&&attempts++===0)return {exitCode:1,stdout:'',stderr:'cleanup refused'};
    return {exitCode:0,stdout:'',stderr:''};
  }});
  const config=await port.createConfig('owned');
  await assert.rejects(config.remove(),/cleanup refused/);
  await assert.rejects(port.createConfig('next'),/pending/);
  await config.remove();assert.equal(attempts,2);
});
