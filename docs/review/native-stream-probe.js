export function register(on){
  on('session.start',async($,e,next)=>{await $.command.register({name:'probe-stream',description:'Verify native stream cleanup',immediate:true});return next(e);});
  on('command.run',{command:'probe-stream'},async($,e)=>{
    const child=$.process.spawn({argv:['/bin/sh','-c','echo native-marker; exec /bin/sleep 30']});child.result.catch(()=>{});
    const first=await child.next();
    const pending=child.next();pending.catch(()=>{});
    let timer;
    try{
      await Promise.race([child.return(),new Promise((_,reject)=>{timer=$.clock.after(1000,()=>reject(Error('native stream return timeout')));})]);
      await $.ui.log(first.value.text.trim()+'; native quiet-child cancellation passed');
      return {};
    }finally{timer?.cancel();}
  });
}
