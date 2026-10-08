import {readFile,writeFile,mkdir,rm,cp} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {nativeAudioReady,validateManifest} from '../src/dependencies/cava-bundle.js';
const root=fileURLToPath(new URL('../',import.meta.url)),out=resolve(root,'dist/pulsedeck');

try{
 const release=process.argv.includes('--release');
 if(release&&!nativeAudioReady)throw Error('Release blocked: native Audio acceptance is pending; audited bundled CAVA evidence is required.');
 const manifest=await validateManifest({root,release});const code=(await readFile(resolve(root,'src/host/claude.js'),'utf8')).replaceAll("from '../core/","from '../src/core/").replaceAll("from '../sources/","from '../src/sources/").replace("from '../preferences.js'","from '../src/preferences.js'").replace("from './claude-process.js'","from '../src/host/claude-process.js'");
 await rm(out,{recursive:true,force:true});await mkdir(resolve(out,'hooks'),{recursive:true});
 for(const name of ['src','vendor','docs','design'])await cp(resolve(root,name),resolve(out,name),{recursive:true});
 await mkdir(resolve(out,'.claude-plugin'),{recursive:true});
 await cp(resolve(root,'.claude-plugin/plugin.json'),resolve(out,'.claude-plugin/plugin.json'));
 for(const name of ['README.md','GLOSSARY.md','LICENSE'])await cp(resolve(root,name),resolve(out,name));
 // Manifest payloads must be packaged, including private libs, notices/source and evidence.
 for(const t of manifest.targets)for(const path of [t.executable,...t.runtimeLibraries.map(l=>l.path),...t.notices,...t.sourceMaterials,...(t.auditEvidence?[t.auditEvidence]:[])]){await mkdir(dirname(resolve(out,path)),{recursive:true});await cp(resolve(root,path),resolve(out,path));}
 await cp(resolve(root,'hooks/hooks.json'),resolve(out,'hooks/hooks.json'));await writeFile(resolve(out,'hooks/register.js'),code);
 await writeFile(resolve(out,'build-status.json'),JSON.stringify({kind:release?'release':'development-candidate',nativeAudioReady,bundledTargets:manifest.targets.length,noBinariesIncluded:manifest.targets.length===0},null,2)+'\n');
 if(process.argv.includes('--package')){
  const distribution=resolve(root,'plugins/pulsedeck');
  await rm(distribution,{recursive:true,force:true});
  await cp(out,distribution,{recursive:true});
  console.log(`Packaged tracked candidate at ${distribution}.`);
 }
 console.log(`Built ${out}: ${release?'release':'development candidate'}; ${manifest.targets.length} bundled targets.`);
}catch(e){console.error(e.message);process.exitCode=1;}
