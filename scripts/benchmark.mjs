import {performance} from 'node:perf_hooks';
import {createParser} from '../src/core/parser.js';
import {createController} from '../src/core/controller.js';
const parser=createParser(()=>{}),valid=new Array(32).fill(128).join(';')+';\n';
const adversarial='9'.repeat(10000)+'\n'+valid+'-1;\n';const iterations=2000;
const started=performance.now();for(let n=0;n<iterations;n++){for(let i=0;i<adversarial.length;i+=37)parser.push(adversarial.slice(i,i+37));}const elapsedMs=performance.now()-started;
let callback;const c=createController({clock:{now:()=>0,every:()=>()=>{}},sourceFactory:{async start(kind,config,callbacks){callback=callbacks.frame;return {async stop(){}};}}});
await c.start('demo');callback(new Uint8Array(32).fill(180));const before=c.snapshot().metrics.ownedBinaryBytes;let checksum=0;const renderStart=performance.now();
for(let i=0;i<2000;i++){c.setPreset(['spectrum','ocean','grid'][i%3]);const f=c.render(i%2?128:64,i%2?48:16);checksum+=f.rgba[i%f.rgba.length];}
const renderMs=performance.now()-renderStart,after=c.snapshot().metrics.ownedBinaryBytes;await c.dispose();
console.log(JSON.stringify({scope:'core-only',runtime:process.version,platform:process.platform,arch:process.arch,parser:{iterations,chunkBytes:37,inputBytes:adversarial.length*iterations,elapsedMs,bytesPerSecond:adversarial.length*iterations/(elapsedMs/1000),...parser.metrics()},render:{iterations:2000,elapsedMs:renderMs,ownedBinaryBytesBefore:before,ownedBinaryBytesAfter:after,checksum},hostBudgets:'unmeasured targets',limitations:'Owned typed arrays only; excludes JS heap, host raster/base64 transport, CAVA, RSS, CPU and capture latency.'},null,2));
