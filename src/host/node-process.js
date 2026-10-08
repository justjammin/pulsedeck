// Standalone developer adapter only. Never import from the native hooks module.
import {diagnostic,diagnosticMessage} from '../diagnostics.js';
import {spawn as spawnChild} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
export function createNodePort({backends=[],outputAuto=false,filesystem={mkdtemp,writeFile,rm}}={}) {
  const pending=new Map();
  let probeLaunching=false;
  function ownCleanup(dir){
    let inFlight=null;
    const owner={async remove(){
      if(!pending.has(dir))return;
      if(!inFlight)inFlight=filesystem.rm(dir,{recursive:true,force:true}).then(()=>{pending.delete(dir);},error=>{inFlight=null;throw error;});
      await inFlight;
    }};
    pending.set(dir,owner);return owner;
  }
  const port={available:true,outputAuto,
    pendingCleanupCount:()=>pending.size,
    async retryCleanup(){for(const owner of [...pending.values()])await owner.remove();},
    async createConfig(text){
      if(typeof text!=='string' || Buffer.byteLength(text)>2048)throw Error('CAVA config exceeds 2048 bytes.');
      if(pending.size)throw Error('Temporary cleanup failed; retry cleanup before creating another configuration.');
      const dir=await filesystem.mkdtemp(join(tmpdir(),'pulsedeck-'));const path=join(dir,'config');
      try{await filesystem.writeFile(path,text,{mode:0o600});}catch(error){const cleanup=ownCleanup(dir);try{await cleanup.remove();}catch(cleanupError){const failure=Error(diagnosticMessage('CAVA configuration failed: ',`${error.message}; cleanup failed: ${cleanupError.message}`));failure.cleanup=cleanup;throw failure;}throw error;}
      let removed=false,inFlight=null;return {path,async remove(){if(removed)return;if(!inFlight)inFlight=filesystem.rm(dir,{recursive:true,force:true}).then(()=>{removed=true;},error=>{inFlight=null;throw error;});await inFlight;}};
    },
    async check(executable){
      if(pending.size){
        const error=Error('Pending cleanup must be retried before checking CAVA.');
        error.cleanup={remove:()=>port.retryCleanup()};throw error;
      }
      let stdout='',stderr='',handle=null,launch=null,launchSettled=false,cleanupStarted=false,inFlight=null;
      const key={};
      const owner={remove(){
        if(!pending.has(key))return Promise.resolve();
        if(inFlight)return inFlight;
        cleanupStarted=true;
        inFlight=(async()=>{
          await launch;
          if(handle){await handle.stop();handle=null;}
          pending.delete(key);
        })().catch(error=>{inFlight=null;throw Error(diagnosticMessage('CAVA probe cleanup failed: ',error.message));});
        return inFlight;
      }};
      // Own the launch itself, before a child can exist or the spawn promise yields.
      pending.set(key,owner);
      let resolveExit,rejectExit;
      const result=new Promise((resolve,reject)=>{resolveExit=resolve;rejectExit=reject;});
      launch=Promise.resolve().then(()=>{
        probeLaunching=true;
        try{return port.spawn([executable,'-v'],{
          stdout:c=>{if(!cleanupStarted)stdout=diagnostic(stdout+c);},
          stderr:c=>{if(!cleanupStarted)stderr=diagnostic(stderr+c);},
          exited:resolveExit
        });}finally{probeLaunching=false;}
      }).then(child=>{handle=child;launchSettled=true;},error=>{launchSettled=true;rejectExit(error);});
      let timer,code,failure;
      try{
        code=await Promise.race([result,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('CAVA version check timed out.')),2000);})]);
        if(code!==0)throw Error(diagnosticMessage('CAVA version check failed: ',stderr));
      }catch(error){failure=Error(diagnosticMessage('Unable to use the plugin CAVA executable: ',error.message));}
      finally{clearTimeout(timer);}
      const cleanup=owner.remove();
      if(failure && !launchSettled){
        // Do not extend the probe timeout while spawn is unresolved. This owned
        // cleanup promise adopts/stops any late handle; a rejection stays owned.
        cleanup.catch(()=>{});failure.cleanup=owner;throw failure;
      }
      try{await cleanup;}catch(error){
        const detail=failure ? `${failure.message}; ${error.message}` : error.message;
        const cleanupFailure=Error(diagnosticMessage('Unable to finish CAVA version check: ',detail));
        cleanupFailure.cleanup=owner;throw cleanupFailure;
      }
      if(failure)throw failure;
      return {backends:[...backends],outputAuto,version:stdout.trim()};
    },
    spawn(argv,handlers){
      if(pending.size&&!probeLaunching)return Promise.reject(Error('Pending cleanup must be retried before starting a process.'));
      if(!Array.isArray(argv) || !argv.length || argv.some(x=>typeof x!=='string' || x.includes('\0')))return Promise.reject(Error('Invalid process argv.'));
      return new Promise((resolve,reject)=>{
        const child=spawnChild(argv[0],argv.slice(1),{shell:false,stdio:['ignore','pipe','pipe']});
        let stopped=false,closed=false,stopPromise=null;let closeResolve;const close=new Promise(r=>closeResolve=r);
        const stream=(name,chunk)=>{if(stopped)return;for(let i=0;i<chunk.length;i+=4096)handlers[name]?.(chunk.slice(i,i+4096));};
        child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');child.stdout.on('data',c=>stream('stdout',c));child.stderr.on('data',c=>stream('stderr',c));
        child.once('error',reject);child.once('close',code=>{closed=true;closeResolve();if(!stopped)handlers.exited?.(code);});
        child.once('spawn',()=>resolve({stop(){
          if(stopPromise)return stopPromise;stopped=true;
          stopPromise=(async()=>{if(closed)return;child.kill('SIGTERM');let timer;await Promise.race([close,new Promise(r=>timer=setTimeout(r,500))]);clearTimeout(timer);if(!closed){child.kill('SIGKILL');let finalTimer;try{await Promise.race([close,new Promise((_,reject)=>finalTimer=setTimeout(()=>reject(Error('CAVA did not stop.')),500))]);}finally{clearTimeout(finalTimer);}}})().catch(error=>{stopPromise=null;throw error;});return stopPromise;
        }}));
      });
    }
  };return port;
}
