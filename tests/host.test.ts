import {expect,test,mock} from 'claude-code/testing';

test('native controls render on terminal, preserve neighbors, and stop Demo',async($,on)=>{
  const clock=mock.clock(on);mock.store(on);
  on('ui.render',{component:'AbovePrompt'},($,e)=>$.ui.resolve(e).Text({children:['Neighbor mod']}));
  await $.command.run({command:'pulsedeck',args:'demo'});
  const ui=await $.ui.mount({plugin:'pulsedeck',surface:'terminal',component:'AbovePrompt',requestId:'native-band',props:{hasSurvey:false,isWorking:false,maxRows:12,bodyColumns:80,scroll:{bodyRows:12,bodyColumns:80,offset:0},view:{}}});
  await clock.advance(150);
  expect((await ui.find({type:'Text',text:'Demo'}))?.text).toContain('Demo');
  expect((await ui.find({type:'Text',text:'Neighbor mod'}))?.text).toBe('Neighbor mod');
  expect(await ui.find({type:'Raster'})).toBeDefined();
  await ui.press({key:'pulsedeck-preset-ocean'});
  expect((await ui.find({type:'Text',text:'ocean'}))?.text).toContain('ocean');
  await ui.press({key:'pulsedeck-stop'});
  expect((await ui.find({type:'Text',text:'Stopped'}))?.text).toContain('Stopped');
  await ui.unmount();
});

test('native desktop fallback and surveys preserve host content',async($,on)=>{
  mock.clock(on);mock.store(on);
  on('ui.render',{component:'AbovePrompt'},($,e)=>$.ui.resolve(e).Text({children:['Host content']}));
  await $.command.run({command:'pulsedeck',args:'open'});
  const ui=await $.ui.mount({plugin:'pulsedeck',surface:'desktop',component:'AbovePrompt',requestId:'desktop-band',props:{hasSurvey:false,isWorking:false,maxRows:12,bodyColumns:80,scroll:{},view:{}}});
  expect(await ui.find({type:'Raster'})).toBeUndefined();
  expect((await ui.find({type:'Text',text:'terminal'}))?.text).toContain('terminal');
  await ui.redraw({hasSurvey:true,isWorking:false,maxRows:12,bodyColumns:80,scroll:{},view:{}});
  expect(await ui.find({type:'Text',text:'PulseDeck'})).toBeUndefined();
  expect((await ui.find({type:'Text',text:'Host content'}))?.text).toBe('Host content');
  await ui.unmount();
});
