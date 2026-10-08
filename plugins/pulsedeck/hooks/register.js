import {createController} from '../src/core/controller.js';
import {createDemoSource} from '../src/sources/demo.js';
import {createCavaSource,validateSource} from '../src/sources/cava.js';
import {createPreferences,defaults} from '../src/preferences.js';
import {createClaudePort} from '../src/host/claude-process.js';
const PANE='pulsedeck-expanded';
export function packRaster({width,height,rgba}) {
  const bytes=new Uint8Array(width*height*12),view=new DataView(bytes.buffer);
  for(let i=0;i<width*height;i++){
    view.setUint32(i*12,0x2588,true);
    view.setUint32(i*12+4,(rgba[i*4]<<16)|(rgba[i*4+1]<<8)|rgba[i*4+2],true);
    view.setUint32(i*12+8,0x01000000,true);
  }
  // Standard padded base64 without Node Buffer or browser-only globals.
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let result='';
  for(let i=0;i<bytes.length;i+=3){const a=bytes[i],b=bytes[i+1],c=bytes[i+2];result+=alphabet[a>>2]+alphabet[((a&3)<<4)|((b||0)>>4)]+(i+1<bytes.length?alphabet[((b&15)<<2)|((c||0)>>6)]:'=')+(i+2<bytes.length?alphabet[c&63]:'=');}
  return {columns:width,rows:height,cells:result};
}

async function ensure($,s){
  if(s.controller)return;
  if(s.initialization)return s.initialization;
  s.initialization=(async()=>{
    let now=await $.clock.now();
    const clock={now:()=>now,every(ms,fn){let cancelled=false,busy=false;const timer=$.clock.every(ms,async()=>{if(cancelled||busy)return;busy=true;try{const fresh=await $.clock.now();if(!cancelled){now=fresh;fn();}}finally{busy=false;}});return ()=>{cancelled=true;timer.cancel();};}};
    s.prefs=createPreferences({get:key=>$.store.get(key),set:(key,value)=>$.store.set(key,value),delete:key=>$.store.delete(key)});
    s.settings=await s.prefs.load();s.demo=createDemoSource(clock);
    const root=$.plugin.root;
    if(root){
      const port=createClaudePort({root,run:(argv,init)=>$.process.run(argv,init),write:(path,text)=>$.fs.write(path,text),spawn:request=>$.process.spawn(request),after:(ms,fn)=>$.clock.after(ms,fn)});
      s.audio=createCavaSource(port,{executable:root+'/vendor/cava/darwin-arm64/cava'});
      // This release supports system output on Apple Silicon; old Linux defaults
      // migrate to the safe Mac tap without selecting an input device.
      if(s.settings.source.method!=='coreaudio')s.settings.source={method:'coreaudio',source:'tap'};
    }
    s.controller=createController({clock,preferences:{...s.settings,expanded:false},sourceFactory:{start(kind,config,callbacks){s.sourceKind=kind;if(kind==='audio'){if(!s.audio)throw Error('Audio preview unavailable: this host has no plugin runtime. Choose Demo.');return s.audio.start(kind,config,callbacks);}return s.demo.start(kind,config,callbacks);},metrics:()=>s.sourceKind==='audio'?s.audio?.metrics():s.demo.metrics()},invalidate:()=>$.ui.invalidate('ui.render')});
  })();
  try{await s.initialization;}finally{s.initialization=null;}
}
async function save(s,alive=()=>true){if(!alive())return;const saved=await s.prefs.save(s.settings);if(alive())s.settings=saved;}
async function action($,s,text='open',expected=s.lifecycle){
  if(expected!==s.lifecycle||s.ending)return;
  await ensure($,s);if(expected!==s.lifecycle||s.ending)return;
  const current=s.controller,alive=()=>expected===s.lifecycle&&s.controller===current&&!s.ending;
  s.visible=true;s.notice='';
  const [command,...args]=text.trim().split(/\s+/);const value=args.join(' ');
  try{
    switch(command||'open'){
      case 'open':current.open();if(s.settings.layout==='expanded'){const result=await $.ui.open({id:PANE,title:'PulseDeck',closeOnEscape:true,rows:22,columns:64});if(!alive())return;if(result?.isPlaced!==false)current.expand(true);else s.notice=result.reason;}break;
      case 'start':if(!s.audio){s.notice='Audio preview unavailable: this host has no plugin runtime. Choose Demo.';break;}await current.start('audio');break;
      case 'demo':await current.start('demo');break;
      case 'stop':await current.stop();break;
      case 'setup':s.notice='Start captures Mac system output. Allow system audio recording if macOS asks. PulseDeck never selects your microphone.';break;
      case 'status':s.notice=current.snapshot().message;break;
      case 'preset':current.setPreset(value);s.settings.preset=value;await save(s,alive);break;
      case 'motion':current.setMotion(value);s.settings.motion=value;await save(s,alive);break;
      case 'source':{const [method,source]=args;const selected=validateSource({method,source});await current.setSource(selected);if(!alive())return;s.settings.source=selected;await save(s,alive);break;}
      case 'expand':{const result=await $.ui.open({id:PANE,title:'PulseDeck',closeOnEscape:true,rows:22,columns:64});if(!alive())return;if(result?.isPlaced===false){s.notice=result.reason;break;}current.expand(true);s.settings.layout='expanded';await save(s,alive);break;}
      case 'compact':current.expand(false);s.settings.layout='compact';await $.ui.close({id:PANE});await save(s,alive);break;
      case 'reset':await current.stop();if(!alive())return;await $.ui.close({id:PANE});if(!alive())return;s.settings=await s.prefs.reset();if(!alive())return;if(s.audio)s.settings.source={method:'coreaudio',source:'tap'};current.setPreset(s.settings.preset);current.setMotion(s.settings.motion);await current.setSource(s.settings.source);if(!alive())return;current.expand(false);break;
      default:s.notice='Use open, start, demo, stop, setup, status, preset spectrum|ocean|grid, motion full|reduced, source coreaudio tap, expand, compact, or reset.';
    }
  }catch(error){if(!alive())return;s.notice=String(error?.message||error).slice(0,400).replace(/[\x00-\x1f\x7f]/g,' ');}
  if(alive())$.ui.invalidate('ui.render');
}
function draw($,s,e,pane,current=s.controller,epoch=s.lifecycle){
  const {Box,Text,Button}= $.ui.resolve(e);const state=current.snapshot();
  const children=[Text({children:[`PulseDeck · ${state.sourceKind} · ${state.state} · ${state.preset}`]}),Text({children:[s.notice||state.message]})];
  if(e.surface==='terminal'){
    const {Raster}= $.ui.resolve(e);
    const columns=Math.max(1,Math.min(128,Math.floor(e.props?.bodyColumns||64)));
    const available=pane?(e.props?.scroll?.bodyRows||22):(e.props?.maxRows||10);
    const rows=Math.max(1,Math.min(48,Math.floor(available)-5));
    children.push(Raster({key:pane?'pulsedeck-pane':'pulsedeck-band',...packRaster(current.render(columns,rows))}));
  }else children.push(Text({children:['Visual animation is available in the terminal.']}));
  const controls=[['start','Start'],['demo','Demo'],['stop','Stop'],['setup','Help'],[pane?'compact':'expand',pane?'Compact':'Expand'],['preset spectrum','Spectrum'],['preset ocean','Ocean'],['preset grid','Grid'],[state.motion==='full'?'motion reduced':'motion full',state.motion==='full'?'Reduce motion':'Full motion']];
  children.push(Box({flexDirection:'row',children:controls.map(([command,label])=>Button({key:'pulsedeck-'+command.replace(/ /g,'-'),label,onPress:()=>action($,s,command,epoch)}))}));
  return Box({flexDirection:'column',children});
}
export function register(on){
  const s={controller:null,demo:null,audio:null,prefs:null,settings:defaults(),visible:false,notice:'',ending:null,initialization:null,lifecycle:0};
  on('session.start',async($,e,next)=>{await ensure($,s);await $.command.register({name:'pulsedeck',description:'Open PulseDeck music visualization controls',immediate:true});return next(e);});
  on('command.run',{command:'pulsedeck'},async($,e)=>{await action($,s,e.args||'open');return {};});
  on('ui.render',{component:'AbovePrompt'},async($,e,next)=>{
    if(!s.visible||!s.controller||e.props?.hasSurvey)return next(e);
    const current=s.controller,epoch=s.lifecycle;
    const rest=await next(e);if(epoch!==s.lifecycle||current!==s.controller||s.ending)return rest;
    const {Box}= $.ui.resolve(e);return Box({flexDirection:'column',children:[draw($,s,e,false,current,epoch),rest]});
  });
  on('ui.render',{component:'Pane'},async($,e,next)=>{if(e.requestId!==PANE||!s.controller)return next(e);return draw($,s,e,true);});
  on('ui.close',async($,e,next)=>{if(e.id===PANE&&s.controller&&!s.ending){const current=s.controller,epoch=s.lifecycle;current.expand(false);s.settings.layout='compact';await save(s,()=>epoch===s.lifecycle&&s.controller===current&&!s.ending);}return next(e);});
  on('session.end',async($,e,next)=>{
    s.lifecycle++;s.visible=false;
    s.ending=s.ending||(async()=>{if(s.initialization)await s.initialization;if(s.controller)await s.controller.dispose();if(s.audio)await s.audio.dispose();if(s.demo)await s.demo.dispose();s.controller=null;s.audio=null;s.demo=null;s.visible=false;})();
    try{await s.ending;}finally{s.ending=null;}return next(e);
  });
}
