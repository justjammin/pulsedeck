import {spawnSync} from 'node:child_process';
import {readFile,readdir} from 'node:fs/promises';
const run=(args,expect=0)=>{const r=spawnSync(process.execPath,args,{encoding:'utf8'});if(r.status!==expect){process.stderr.write(r.stderr||r.stdout);throw Error(`Check failed: ${args.join(' ')}`);}return r;};
try{
 run(['--test',...(await readdir('test')).filter(x=>x.endsWith('.test.js')).sort().map(x=>`test/${x}`)]);
 run(['scripts/build.mjs']);run(['scripts/vendor-cava.mjs']);
 for(const p of ['spectrum','ocean','grid'])run(['scripts/demo.mjs','--preset',p,'--frames','2']);
 const b=JSON.parse(run(['scripts/benchmark.mjs']).stdout);if(b.render.ownedBinaryBytesBefore!==b.render.ownedBinaryBytesAfter||b.parser.pendingBytes!==0)throw Error('Owned-array bounds failed.');
 const release=spawnSync(process.execPath,['scripts/build.mjs','--release'],{encoding:'utf8'});if(release.status===0||!release.stderr.includes('native Audio'))throw Error('Release gate failed.');
 const status=JSON.parse(await readFile('dist/pulsedeck/build-status.json'));if(status.nativeAudioReady!==false)throw Error('Unexpected native readiness.');
 console.log('Checks passed: source tests, restricted bundle registration, finite demos, core owned-array bounds; release correctly blocked. No native/audio acceptance claimed.');
}catch(e){console.error(e.message);process.exitCode=1;}
