// Preset state has fixed capacity. Time is seconds, clamped by the controller.
export function createPresets() {
  const particles = new Float32Array(48 * 4); // x,y,life,velocity
  const cells = new Float32Array(32);
  let phase=0,baseline=0,cooldown=0,cursor=0;
  function reset(){particles.fill(0);cells.fill(0);phase=0;baseline=0;cooldown=0;cursor=0;}
  return {
    reset,
    update(name,bands,dt,reduced) {
      let energy=0;for(const v of bands)energy+=v/32;
      if(!reduced)phase+=dt;
      cooldown=Math.max(0,cooldown-dt);
      for(let i=0;i<32;i++)cells[i]*=Math.exp(-dt*4);
      if(reduced){particles.fill(0);cells.fill(0);}
      else if(name==='ocean') {
        for(let i=0;i<particles.length;i+=4) {particles[i+2]=Math.max(0,particles[i+2]-dt);particles[i+1]-=particles[i+3]*dt;}
        if(energy>0.08){const i=(cursor++%48)*4;particles[i]=((cursor*37)%101)/100;particles[i+1]=1;particles[i+2]=1;particles[i+3]=0.15+energy*0.25;}
      } else if(name==='grid' && energy>baseline+0.08 && energy>0.12 && cooldown===0){cells[cursor++%32]=1;cooldown=0.25;}
      baseline+=(energy-baseline)*(1-Math.exp(-dt*3));
    },
    draw(name,r,bands,peaks,reduced) {
      const w=r.width,h=r.height;
      if(name==='spectrum') {
        for(let x=0;x<w;x++){const i=Math.min(31,Math.floor(x*32/w));const top=h-Math.round(bands[i]*h);for(let y=Math.max(0,top);y<h;y++)r.pixel(x,y,40,120+120*(h-y)/h,190);r.pixel(x,h-1-Math.round(peaks[i]*(h-1)),220,240,255);}
      } else if(name==='ocean') {
        let bass=0,mid=0;for(let i=0;i<8;i++)bass+=bands[i]/8;for(let i=8;i<24;i++)mid+=bands[i]/16;
        for(let layer=0;layer<3;layer++)for(let x=0;x<w;x++) {const y=h*(0.35+layer*0.2)+Math.sin(x/w*Math.PI*(2+layer)+phase*(0.5+layer*0.2))*(1+bass*h*0.12+mid);r.pixel(x,y,40+layer*25,100+layer*45,180+layer*25);}
        if(!reduced)for(let i=0;i<particles.length;i+=4)if(particles[i+2]>0)r.pixel(particles[i]*(w-1),particles[i+1]*(h-1),180,210,255);
      } else {
        for(let y=0;y<h;y++)for(let x=0;x<w;x++){const col=Math.min(7,Math.floor(x*8/w)),row=Math.min(3,Math.floor(y*4/h)),i=row*8+col;const v=reduced?bands[i]*0.3:Math.min(1,bands[i]*0.3+cells[i]*0.7);if(x%Math.max(2,Math.floor(w/8)) && y%Math.max(2,Math.floor(h/4)))r.pixel(x,y,40+v*130,25+v*70,70+v*160);}
      }
    },
    metrics(){let active=0,pulses=0;for(let i=2;i<particles.length;i+=4)if(particles[i]>0)active++;for(const v of cells)if(v>0.01)pulses++;return {particles:active,transientPulses:pulses};},
    ownedBinaryBytes:particles.byteLength+cells.byteLength
  };
}
