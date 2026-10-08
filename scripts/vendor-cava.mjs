// Validates local, audited build inputs; never downloads or installs anything.
import {fileURLToPath} from 'node:url';
import {validateManifest} from '../src/dependencies/cava-bundle.js';
const root=fileURLToPath(new URL('../',import.meta.url));
try {const m=await validateManifest({root,release:process.argv.includes('--release')});console.log(JSON.stringify({targets:m.targets.length,status:m.targets.length?'Local payload integrity checked; native validation separate.':'Development preview: no binaries included.'}));}catch(e){console.error(e.message);process.exitCode=1;}
