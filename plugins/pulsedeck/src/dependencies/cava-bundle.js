// Node packaging/developer resolver. Native hooks never import this module.
import {readFile,realpath,stat} from 'node:fs/promises';
import {resolve,relative,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
export const nativeAudioReady = false; // Real-audio, resource, and clean-install acceptance is still pending.
export const SUPPORTED_TARGETS = ['darwin-arm64','darwin-x64','linux-arm64','linux-x64'];
export const RELEASE_TARGETS = ['darwin-arm64'];
async function contained(root,path) {
 if(typeof path!=='string'||!path||path.includes('\\')||path.includes('\0')||isAbsolute(path)||path.split('/').some(p=>p==='..'||p==='.'||!p))throw Error('Invalid plugin-contained path.');
 const base=await realpath(root), actual=await realpath(resolve(base,path)),rel=relative(base,actual);
 if(rel.startsWith('..')||isAbsolute(rel))throw Error('Path escapes plugin root.');
 if(!(await stat(actual)).isFile())throw Error('Payload path must be a file.');return actual;
}
async function hashed(root,item,executable=false){
 if(!item||! /^[a-f0-9]{64}$/.test(item.sha256))throw Error('Missing payload SHA256 checksum.');
 const path=await contained(root,item.executable||item.path);
 if(createHash('sha256').update(await readFile(path)).digest('hex')!==item.sha256)throw Error('Payload checksum mismatch.');
 if(executable && (item.mode!=='0755'||((await stat(path)).mode&0o777)!==0o755))throw Error('Executable permissions must be 0755.');return path;
}
function shape(manifest){
 if(manifest?.schemaVersion!==1||!Array.isArray(manifest.targets)||!manifest.upstream)throw Error('Invalid CAVA manifest.');
 const ids=manifest.targets.map(t=>`${t.platform}-${t.arch}`);
 if(new Set(ids).size!==ids.length||ids.some(id=>!SUPPORTED_TARGETS.includes(id)))throw Error('Unsupported or duplicate target.');
 if(manifest.targets.length&&(!manifest.upstream.version||! /^[a-f0-9]{40}$/.test(manifest.upstream.commit)))throw Error('Pinned upstream version/commit required.');
}
async function validateTarget(root,target,release){
 if(!Array.isArray(target.backends)||!target.backends.length||target.backends.some(b=>!['pulse','pipewire','coreaudio'].includes(b))||typeof target.outputAuto!=='boolean')throw Error('Invalid capture capability attestation.');
 if(target.platform==='darwin'&&(target.backends.some(b=>b!=='coreaudio')||target.minimumOS!=='14.2'))throw Error('macOS tap capability requires minimumOS 14.2.');
 if(target.platform==='linux'&&(target.backends.some(b=>b==='coreaudio')||!target.libcBaseline))throw Error('Linux monitor capability requires libcBaseline.');
 if(!Array.isArray(target.runtimeLibraries)||!Array.isArray(target.notices)||!target.notices.length||!Array.isArray(target.sourceMaterials)||!target.sourceMaterials.length)throw Error('Runtime closure, notices and source materials required.');
 if(release && (target.audited!==true||!target.auditEvidence))throw Error('Actual audited CAVA payloads and evidence required.');
 const executable=await hashed(root,target,true);
 for(const lib of target.runtimeLibraries)await hashed(root,lib);
 for(const path of [...target.notices,...target.sourceMaterials,...(target.auditEvidence?[target.auditEvidence]:[])])await contained(root,path);
 return {executable,backends:[...target.backends],outputAuto:target.outputAuto};
}
export async function resolveBundledCava({root,manifest,platform=process.platform,arch=process.arch}){
 manifest??=JSON.parse(await readFile(resolve(root,'vendor/cava/manifest.json'),'utf8'));shape(manifest);
 const target=manifest.targets.find(t=>t.platform===platform&&t.arch===arch);
 if(!target)throw Error(`Unsupported target ${platform}-${arch}: bundled CAVA is unavailable in this development preview. Choose Demo.`);
 return validateTarget(root,target,false);
}
export async function validateManifest({root,manifest,release=false}){
 manifest??=JSON.parse(await readFile(resolve(root,'vendor/cava/manifest.json'),'utf8'));shape(manifest);
 for(const target of manifest.targets)await validateTarget(root,target,release);
 if(release&&RELEASE_TARGETS.some(id=>!manifest.targets.some(t=>`${t.platform}-${t.arch}`===id)))throw Error('Audited bundled CAVA payloads missing for release targets.');
 return manifest;
}
