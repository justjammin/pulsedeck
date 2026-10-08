import {diagnostic} from '../diagnostics.js';

// Claude Code 2.1.293: returning the HookStream terminates its owned child.
// API calls are injected so this module never receives or aliases the host `$`.
export function createClaudePort({root,run,write,spawn,after}) {
  const pending=new Set();
  async function command(argv,timeoutMs=2000) {
    const result=await run(argv,{timeoutMs});
    if(result.exitCode!==0)throw Error(diagnostic(result.stderr||'Host command failed.'));
    return result.stdout.trim();
  }
  async function remove(owner) {
    if(!pending.has(owner))return;
    if(!owner.removing)owner.removing=command(['/bin/rm','-rf',owner.path]).then(()=>pending.delete(owner),error=>{owner.removing=null;throw error;});
    await owner.removing;
  }
  return {
    available:true,outputAuto:true,
    async check(executable) {
      if(pending.size)throw Error('Retry pending capture cleanup before starting.');
      if(await command(['/usr/bin/uname','-m'])!=='arm64')throw Error('Live audio requires an Apple Silicon Mac. Choose Demo.');
      const os=await command(['/usr/bin/sw_vers','-productVersion']);
      const [major,minor]=os.split('.').map(Number);
      if(major<14||(major===14&&minor<2))throw Error('Live audio requires macOS 14.2 or later.');
      const manifest=JSON.parse(await command(['/bin/cat',root+'/vendor/cava/manifest.json']));
      const target=manifest.targets?.find(t=>t.platform==='darwin'&&t.arch==='arm64');
      if(!target||target.executable!=='vendor/cava/darwin-arm64/cava'||!target.backends?.includes('coreaudio'))throw Error('The bundled Mac audio runtime is missing.');
      for(const item of [{path:target.executable,sha256:target.sha256},...(target.runtimeLibraries||[])]){
        if(!/^vendor\/cava\/darwin-arm64\/[A-Za-z0-9_.\/-]+$/.test(item.path)||item.path.split('/').includes('..')||! /^[a-f0-9]{64}$/.test(item.sha256))throw Error('Invalid bundled runtime manifest.');
        const sum=await command(['/usr/bin/shasum','-a','256',root+'/'+item.path]);
        if(sum.split(/\s+/)[0]!==item.sha256)throw Error('Bundled audio runtime checksum mismatch. Reinstall PulseDeck.');
      }
      const version=await command([executable,'-v']);
      return {backends:['coreaudio'],outputAuto:true,version};
    },
    async createConfig(text) {
      if(pending.size)throw Error('Retry pending capture cleanup before starting.');
      if(new TextEncoder().encode(text).length>2048)throw Error('Audio configuration is too large.');
      const path=await command(['/usr/bin/mktemp','-d','/tmp/pulsedeck.XXXXXXXX']);
      if(!/^\/tmp\/pulsedeck\.[A-Za-z0-9]+$/.test(path))throw Error('Invalid temporary configuration directory.');
      const owner={path,removing:null};pending.add(owner);
      try{
        await write(path+'/config',text);
        await command(['/bin/chmod','600',path+'/config']);
      }catch(error){try{await remove(owner);}catch{error.cleanup={remove:()=>remove(owner)};}throw error;}
      return {path:path+'/config',remove:()=>remove(owner)};
    },
    async spawn(argv,handlers) {
      const stream=spawn({argv});
      // Closing a stream deliberately rejects result; consume that rejection.
      stream.result.catch(()=>{});
      let stopped=false,stopping=null;
      const pump=(async()=>{
        try{
          for await(const chunk of stream){
            if(stopped)break;
            for(let i=0;i<chunk.text.length;i+=4096)handlers[chunk.stream]?.(chunk.text.slice(i,i+4096));
          }
          if(!stopped)handlers.exited?.((await stream.result).code);
        }catch(error){if(!stopped){handlers.stderr?.(diagnostic(error.message));handlers.exited?.(-1);}}
      })();
      return {stop(){
        if(stopping)return stopping;
        stopped=true;
        stopping=(async()=>{
          let timer;
          try{await Promise.race([
            (async()=>{await stream.return();await pump;})(),
            new Promise((_,reject)=>{timer=after(1000,()=>reject(Error('Audio process did not stop within one second.')));})
          ]);}finally{timer?.cancel();}
        })().catch(error=>{stopping=null;throw error;});
        return stopping;
      }};
    }
  };
}
