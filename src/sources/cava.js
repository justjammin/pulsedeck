import {diagnostic,diagnosticMessage} from '../diagnostics.js';
import {createParser} from '../core/parser.js';
export function validateSource(value, {outputAuto = false} = {}) {
  if (!value || !['pulse','pipewire','coreaudio'].includes(value.method)) throw Error('Choose Pulse, PipeWire, or macOS output tap.');
  const source=value.source;
  if (typeof source !== 'string' || source.length>256 || !/^[A-Za-z0-9_.:@-]+$/.test(source) || source==='auto_input') throw Error('Invalid output source.');
  if(value.method==='coreaudio' ? !['tap','tap_mono'].includes(source) : !(source.endsWith('.monitor') || (source==='auto' && outputAuto))) throw Error('Choose an output monitor ending in .monitor.');
  return {method:value.method,source};
}
export function buildConfig(value, capability) {
  const {method,source}=validateSource(value,capability);
  return `[general]\nbars = 32\nframerate = 20\n[input]\nmethod = ${method}\nsource = ${source}\n[output]\nmethod = raw\nraw_target = /dev/stdout\ndata_format = ascii\nchannels = mono\nascii_max_range = 255\nbar_delimiter = 59\nframe_delimiter = 10\n`;
}
export function createCavaSource(port, {executable} = {}) {
  let active=null, startup=null, disposed=false;
  const parser=createParser(frame=>{if(active && !active.stopped)active.callbacks.frame?.(frame);});
  function release(owned) {
    if(!owned)return Promise.resolve();
    if(owned.cleanup)return owned.cleanup;
    owned.stopped=true;
    owned.cleanup=(async()=>{
      if(owned.child){await owned.child.stop();owned.child=null;}
      if(owned.config){await owned.config.remove();owned.config=null;}
      if(active===owned)active=null;
    })().catch(error=>{owned.cleanup=null;throw error;});
    return owned.cleanup;
  }
  return {
    async start(kind,config,callbacks) {
      if(disposed)throw Error('Capture source is disposed.');
      if(kind!=='audio')throw Error('Choose Audio for CAVA capture.');
      if(!port.available)throw Error(port.reason || 'Audio preview is unavailable. Choose Demo.');
      if(!executable || typeof executable!=='string' || /[\x00-\x1f\x7f]/.test(executable))throw Error('The plugin CAVA executable is unavailable. Choose Demo.');
      if(startup || active)throw Error('Stop the current capture before starting another.');
      // Validate before any executable probe, temp file, or capture.
      validateSource(config,{outputAuto:port.outputAuto===true});
      const owned={child:null,config:null,stopped:false,callbacks,stderr:''};active=owned;parser.reset();
      startup=(async()=>{
        try {
          const capability=await port.check(executable);
          if(!capability.backends?.includes(config.method))throw Error('The included CAVA build does not support this output backend.');
          const text=buildConfig(config,{outputAuto:port.outputAuto===true && capability.outputAuto===true});
          if(owned.stopped || disposed)return;
          owned.config=await port.createConfig(text);
          if(owned.stopped || disposed){await release(owned);return;}
          owned.child=await port.spawn([executable,'-p',owned.config.path],{
            stdout(chunk){if(!owned.stopped)parser.push(chunk);},
            stderr(chunk){if(!owned.stopped)owned.stderr=diagnostic(owned.stderr+String(chunk).slice(-8192));},
            exited(code){if(!owned.stopped)callbacks.error?.(/AudioTap permissions missing/.test(owned.stderr)?'System audio permission is missing. Enable your terminal app in macOS Privacy & Security → System Audio Recording, then press Start again.':diagnosticMessage(`CAVA exited (${code}). `,owned.stderr));}
          });
          if(owned.stopped || disposed)await release(owned);
        }catch(error){if(error.cleanup){owned.config=error.cleanup;owned.stopped=true;}else await release(owned);throw error;}
      })();
      try{await startup;}finally{startup=null;}
      return {stop:()=>release(owned)};
    },
    async dispose(){disposed=true;if(active)active.stopped=true;if(startup)await startup.catch(()=>{});await release(active);},
    metrics(){return {...parser.metrics(),producers:active?.child?1:0};}
  };
}
