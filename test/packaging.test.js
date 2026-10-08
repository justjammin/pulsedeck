import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,chmod,rm,mkdir,symlink,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const run=(file,args=[])=>spawnSync(process.execPath,[file,...args],{encoding:'utf8',timeout:10000});
test('preview builds a host-safe single register artifact and release remains blocked',async()=>{
 const result=run('scripts/build.mjs');assert.equal(result.status,0,result.stderr);
 const code=await readFile('dist/pulsedeck/hooks/register.js','utf8');assert.doesNotMatch(code.replace(/\/\/[^\n]*/g,''),/node:|\bBuffer\b/);assert.match(code,/export function register/);
 const validation=spawnSync('claude',['plugin','validate','dist/pulsedeck'],{encoding:'utf8'});assert.match(validation.stdout,/Validation passed/,validation.stdout+validation.stderr);
 assert.equal(JSON.parse(await readFile('dist/pulsedeck/build-status.json')).nativeAudioReady,false);
 const release=run('scripts/build.mjs',['--release']);assert.notEqual(release.status,0);assert.match(release.stderr,/native Audio|Native Audio/);
});
test('bundled resolver validates fixture bytes, confinement, permissions, capability and provenance',async()=>{
 const {resolveBundledCava,validateManifest,nativeAudioReady}=await import('../src/dependencies/cava-bundle.js');
 const root=await mkdtemp(join(tmpdir(),'pulsedeck-fixture-'));try{
 await mkdir(join(root,'runtime/linux-x64'),{recursive:true});const bytes='#!/bin/sh\n# TEST FIXTURE ONLY — NOT CAVA\nexit 0\n';await writeFile(join(root,'runtime/linux-x64/cava'),bytes,{mode:0o755});
 for(const p of ['NOTICE','SOURCE'])await writeFile(join(root,p),'test fixture provenance; not actual CAVA');
 const entry={platform:'linux',arch:'x64',libcBaseline:'test-fixture-only',executable:'runtime/linux-x64/cava',sha256:createHash('sha256').update(bytes).digest('hex'),mode:'0755',backends:['pulse'],outputAuto:false,runtimeLibraries:[],notices:['NOTICE'],sourceMaterials:['SOURCE'],audited:false};
 const manifest={schemaVersion:1,upstream:{version:'test-fixture',commit:'a'.repeat(40)},targets:[entry]};
 const options={root,manifest,platform:'linux',arch:'x64'};assert.equal((await resolveBundledCava(options)).executable,await realpath(join(root,entry.executable)));
 await assert.rejects(resolveBundledCava({...options,platform:'win32'}),/unsupported|Unsupported/);
 await assert.rejects(resolveBundledCava({...options,manifest:{...manifest,targets:[{...entry,executable:'../outside'}]}}),/path|Path/);
 await assert.rejects(resolveBundledCava({...options,manifest:{...manifest,targets:[{...entry,sha256:'0'.repeat(64)}]}}),/checksum/);
 await chmod(join(root,entry.executable),0o644);await assert.rejects(resolveBundledCava(options),/permission/);await chmod(join(root,entry.executable),0o755);
 await symlink('/etc/passwd',join(root,'escape'));await assert.rejects(resolveBundledCava({...options,manifest:{...manifest,targets:[{...entry,executable:'escape'}]}}),/path|Path/);
 await assert.rejects(validateManifest({root,manifest,release:true}),/audited/);
 const validFixtures={...manifest,targets:['darwin-arm64','darwin-x64','linux-arm64','linux-x64'].map(id=>{const [platform,arch]=id.split('-');return {...entry,platform,arch,minimumOS:'14.2',backends:platform==='darwin'?['coreaudio']:['pulse'],audited:true,auditEvidence:'NOTICE'};})};
 await validateManifest({root,manifest:validFixtures,release:true});assert.equal(nativeAudioReady,false,'valid fixture metadata cannot enable native Audio');
 await assert.rejects(resolveBundledCava({...options,manifest:{...manifest,targets:[{...entry,backends:['alsa']}]}}),/capability/);
 await rm(join(root,'NOTICE'));await assert.rejects(resolveBundledCava(options),/ENOENT/);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('finite non-TTY demos label synthetic output and reject implicit audio fallback',()=>{
 for(const preset of ['spectrum','ocean','grid']){const r=run('scripts/demo.mjs',['--frames','2','--preset',preset]);assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/Demo/);assert.match(r.stdout,new RegExp(preset));}
 const r=run('scripts/demo.mjs',['--audio','--frames','1']);assert.notEqual(r.status,0);assert.match(r.stderr,/bundled CAVA|Choose Pulse, PipeWire, or macOS output tap/);
 const override=run('scripts/demo.mjs',['--audio','--executable','/bin/true','--frames','1']);assert.notEqual(override.status,0);assert.match(override.stderr,/attest/);
});
test('core benchmark reports real throughput and fixed owned arrays without host budget claims',()=>{
 const r=run('scripts/benchmark.mjs');assert.equal(r.status,0,r.stderr);const b=JSON.parse(r.stdout);assert.equal(b.scope,'core-only');assert.ok(b.parser.bytesPerSecond>0);assert.equal(b.render.ownedBinaryBytesBefore,b.render.ownedBinaryBytesAfter);assert.equal(b.hostBudgets,'unmeasured targets');assert.equal(b.parser.pendingBytes,0);
});

test('developer CLI startup error removes its owned configuration before exit',async()=>{
 const root=await mkdtemp(join(tmpdir(),'pulsedeck-cli-fixture-'));try{
 const executable=join(root,'not-cava'),marker=join(root,'config-path');
 await writeFile(executable,`#!/bin/sh
# executable test fixture, NOT CAVA
if [ "$1" = "-v" ]; then echo test-fixture; exit 0; fi
printf '%s' "$2" > '${marker}'
echo fixture-startup-failure >&2
exit 2
`,{mode:0o755});
 const r=run('scripts/demo.mjs',['--audio','--executable',executable,'--backend','pulse','--attest-backend','pulse','--source','fixture.monitor','--attest-output-monitor','--frames','5']);assert.notEqual(r.status,0);assert.match(r.stderr,/fixture-startup-failure/);
 const config=await readFile(marker,'utf8');await assert.rejects(readFile(config),/ENOENT/);
 }finally{await rm(root,{recursive:true,force:true});}
});
