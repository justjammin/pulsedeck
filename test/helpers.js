export function fakeClock() {
  let time = 0, next = 0; const tasks = new Map();
  return {now: () => time, every(ms, cb) {const id = ++next; tasks.set(id,{ms,cb,next:time+ms}); return () => tasks.delete(id);},
    advance(ms) {const end=time+ms; for (;;) {let chosen; for (const [id,t] of tasks) if (t.next<=end && (!chosen || t.next<chosen[1].next)) chosen=[id,t]; if(!chosen) break; time=chosen[1].next; chosen[1].next+=chosen[1].ms; chosen[1].cb();} time=end;},
    get schedules(){return [...tasks.values()].map(t=>t.ms);}};
}
export const bands = value => new Uint8Array(32).fill(value);
export function manualSource() {
 const sessions=[]; let live=0, maxLive=0;
 return {sessions,get live(){return live;},get maxLive(){return maxLive;},async start(kind, config, callbacks){live++; maxLive=Math.max(live,maxLive); let stopped=false; const session={kind,config,...callbacks}; sessions.push(session); return {async stop(){if(!stopped){stopped=true;live--;}}};}};
}
