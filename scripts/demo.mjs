import {fileURLToPath} from 'node:url';
import {isAbsolute} from 'node:path';
import {createController} from '../src/core/controller.js';
import {createDemoSource} from '../src/sources/demo.js';
import {createCavaSource,validateSource} from '../src/sources/cava.js';
import {createNodePort} from '../src/host/node-process.js';
import {resolveBundledCava} from '../src/dependencies/cava-bundle.js';
const args=process.argv.slice(2),options={};
for(let i=0;i<args.length;i++){const key=args[i];if(['--audio','--attest-output-monitor','--attest-default-output'].includes(key))options[key]=true;else if(['--preset','--frames','--max-duration','--executable','--backend','--source','--attest-backend'].includes(key))options[key]=args[++i];else{console.error(`Unknown option: ${key}`);process.exit(1);}}
let controller,demo,cava,port,factory;let cancelled=false;const interrupt=()=>{cancelled=true;};process.on('SIGINT',interrupt);process.on('SIGTERM',interrupt);
// Deterministic timer ordering and synthetic time; finite Demo needs no TTY.
let now=0,nextId=0;const tasks=new Map();
const clock={now:()=>now,every(ms,cb){const id=++nextId;tasks.set(id,{ms,cb,next:now+ms});return ()=>tasks.delete(id);}};
function advance(ms){const end=now+ms;while(true){let selected;for(const [id,t]of tasks)if(t.next<=end&&(!selected||t.next<selected[1].next))selected=[id,t];if(!selected)break;now=selected[1].next;selected[1].next+=selected[1].ms;selected[1].cb();}now=end;}
try{
 const frames=Number(options['--frames']??30),duration=Number(options['--max-duration']??3);
 if(!Number.isInteger(frames)||frames<1||frames>100000||!Number.isFinite(duration)||duration<=0||duration>3600)throw Error('Use --frames 1..100000 and --max-duration seconds 0..3600.');
 const preset=options['--preset']??'spectrum';if(!['spectrum','ocean','grid'].includes(preset))throw Error('Choose spectrum, ocean or grid.');
 let audioConfig;
 demo=createDemoSource(clock);
 if(options['--audio']){
  let capability;
  try{capability=await resolveBundledCava({root:fileURLToPath(new URL('../',import.meta.url))});}catch(error){if(!options['--executable'])throw error;}
  if(options['--executable']){
   if(!isAbsolute(options['--executable'])||options['--attest-backend']!==options['--backend']||!options['--attest-output-monitor'])throw Error('Developer executable override requires absolute path, --attest-backend BACKEND and --attest-output-monitor.');
   capability={executable:options['--executable'],backends:[options['--attest-backend']],outputAuto:options['--attest-default-output']===true};
  }
  port=createNodePort(capability);audioConfig=validateSource({method:options['--backend'],source:options['--source']},{outputAuto:capability.outputAuto});cava=createCavaSource(port,capability);
 }
 factory={dispose:async()=>{const results=await Promise.allSettled([cava?.dispose(),demo?.dispose()]);for(const r of results)if(r.status==='rejected')throw r.reason;},start:(kind,config,callbacks)=>(kind==='audio'?cava:demo).start(kind,config,callbacks),metrics:()=>options['--audio']?cava.metrics():demo.metrics()};
 controller=createController({clock,sourceFactory:factory});controller.setPreset(preset);if(audioConfig)await controller.setSource(audioConfig);await controller.start(options['--audio']?'audio':'demo');
 if(controller.snapshot().state==='Error')throw Error(controller.snapshot().message);
 const started=Date.now();
 for(let n=0;n<frames&&!cancelled;n++){
  if(options['--audio']||process.stdout.isTTY)await new Promise(r=>setTimeout(r,100));
  advance(100);const frame=controller.render(48,12);console.log(frame.label);
  for(let y=0;y<frame.height;y++){let row='';for(let x=0;x<frame.width;x++){const i=(y*frame.width+x)*4;row+=' .:+*#'[Math.min(5,Math.floor((frame.rgba[i]+frame.rgba[i+1]+frame.rgba[i+2])/120))];}console.log(row);}
  if(controller.snapshot().state==='Error')throw Error(controller.snapshot().message);
  if((options['--audio']||process.stdout.isTTY)?Date.now()-started>=duration*1000:now>=duration*1000)break;
 }
}catch(e){console.error(e.message);process.exitCode=1;}finally{
 // Independent awaited cleanup attempts even when controller setup/start failed.
 for(const cleanup of [()=>controller?.dispose(),()=>factory?.dispose(),()=>cava?.dispose(),()=>demo?.dispose(),()=>port?.retryCleanup()])try{await cleanup();}catch(e){console.error(`Cleanup failed: ${e.message}`);process.exitCode=1;}
 process.removeListener('SIGINT',interrupt);process.removeListener('SIGTERM',interrupt);
}
