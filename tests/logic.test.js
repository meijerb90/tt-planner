const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','tt-planner.html'),'utf8');
const block=a=>html.slice(html.indexOf('//#'+a+'-START'),html.indexOf('//#'+a+'-END'));
const api=new Function(block('CORE')+'\nreturn {validGame,evalEntry,emptyEntry,randEntry,drawGroups,buildMatches,qualification,makeKnockout,koModel,validateSetup,koPlan,seedOrder,rankGroup};')();
const {evalEntry,emptyEntry,randEntry,drawGroups,buildMatches,qualification,makeKnockout,koModel,validateSetup,koPlan,seedOrder}=api;
let fail=0; const ok=(c,m)=>{ if(!c){fail++;console.log('FAIL',m);} };
// seed order
ok(JSON.stringify(seedOrder(4))==='[1,4,2,3]','order4'); ok(JSON.stringify(seedOrder(8))==='[1,8,4,5,2,7,3,6]','order8');
ok(JSON.stringify(seedOrder(16))==='[1,16,8,9,4,13,5,12,2,15,7,10,3,14,6,11]','order16');
ok(JSON.stringify(seedOrder(2))==='[1,2]','order2');
// plan table: sizes,A -> K,extra,byes
const sz=(n,G)=>Array.from({length:G},(_,i)=>i<n%G?Math.floor(n/G)+1:Math.floor(n/G));
const plans=[[32,8,2,16,0,0],[28,6,2,16,4,0],[30,8,2,16,0,0],[20,4,3,16,4,0],[26,5,3,16,1,0],[30,5,2,16,0,6],[12,3,2,8,2,0],[16,4,2,8,0,0],[8,2,2,4,0,0],[10,1,2,2,0,0],[9,3,1,4,1,0],[40,10,2,32,0,12],[24,4,4,16,0,0],[33,16,1,16,0,0],[24,6,2,16,4,0]];
plans.forEach(([n,G,A,K,ex,by])=>{const p=koPlan(sz(n,G),A); ok(p.K===K&&p.extra===ex&&p.byes===by&&p.N+p.byes===K,`plan ${n}/${G}/${A}: ${JSON.stringify(p)}`);});
// validation
const v=(n,g,a,sd)=>validateSetup({n,g,per:Math.ceil(n/g),adv:a,seeds:sd},n);
ok(!v(32,8,2,16).E.length,'32/8/2'); ok(!v(12,3,2,3).E.length,'12/3/2 now valid'); ok(!v(30,5,2,10).E.length&&v(30,5,2,10).W.some(w=>w.k==='w_byes'),'byes warn');
ok(v(3,1,2,0).E.length,'n<4'); ok(v(10,1,1,0).E.length,'direct<2'); ok(v(40,26,3,10).E.length,'>64 qualifiers');
ok(!v(10,1,2,0).E.length,'1 group final');
ok(v(32,8,5,16).E.length,'adv>size');
// play helpers
function sim(n,G,A,seeds){
  const ids=[...Array(n).keys()].map(i=>'p'+(i+1));
  const S={setup:{n,g:G,per:Math.ceil(n/G),adv:A,seeds},cfg:{adv:A},lots:{},groups:null,ko:null};
  ids.forEach(i=>S.lots[i]=Math.random());
  const {groups:gr,seq:drawSeq}=drawGroups(ids,G,seeds);
  ok(drawSeq.length===n,`seq length ${n}/${G}: ${drawSeq.length}`);
  ok(new Set(drawSeq.map(s=>s.pid)).size===n,'seq unique pids');
  gr.forEach((p,i)=>{
    const steps=drawSeq.filter(s=>s.g===i).sort((a,b)=>a.pos-b.pos);
    ok(steps.length===p.length&&steps.every((s,k)=>s.pos===k&&s.pid===p[k]),`seq matches group ${i}`);
  });
  S.groups=gr.map((p,i)=>{p=p.slice().sort((a,b)=>+a.slice(1)-+b.slice(1));return {name:String.fromCharCode(65+i),pids:p,matches:buildMatches(p)};});
  S.groups.forEach(g=>g.matches.forEach(m=>{m.e=randEntry();}));
  const q=qualification(S); const plan=q.plan;
  ok(q.allComplete,'complete'); ok(q.seedList.length===plan.N,`N ${n}/${G}/${A}: ${q.seedList.length} vs ${plan.N}`);
  ok(new Set(q.seedList.map(x=>x.pid)).size===plan.N,'unique');
  const ko=makeKnockout(S,q); S.ko=ko;
  ok(ko.K===plan.K&&ko.first.length===plan.K/2,'K');
  const real=[].concat.apply([],ko.first).filter(Boolean); ok(real.length===plan.N&&new Set(real).size===plan.N,'bracket players');
  // byes go to top seeds
  ko.first.forEach(p=>{ if((p[0]==null)!==(p[1]==null)){ const pid=p[0]||p[1]; ok(ko.info[pid].seed<=plan.byes,'bye to top seed'); } if(p[0]==null&&p[1]==null) ok(false,'double bye'); });
  ok(ko.first.filter(p=>p[0]==null||p[1]==null).length===plan.byes,'bye count');
  let rem=0; ko.first.forEach(([a,b])=>{ if(a&&b&&ko.info[a].group===ko.info[b].group) rem++; });
  let M=koModel(ko);
  for(let r=0;r<M.R;r++){
    M.rounds[r].forEach(m=>{ if(r>0) ok(m.a&&m.b,`round ${r} filled`); if(m.a&&m.b&&!m.bye) ko.entries[m.id]={sig:m.sig,g:randEntry().g,wo:null}; });
    M=koModel(ko);
  }
  if(M.third){ ok(M.third.a&&M.third.b,'third filled'); ko.entries.T={sig:M.third.sig,g:randEntry().g,wo:null}; M=koModel(ko); ok(M.third.w,'third winner'); }
  else ok(M.R<2||M.rounds[M.R-2].some(m=>m.bye),'third missing only with bye');
  ok(M.fin.w&&M.fin.l,'champion');
  if(M.R>=2){ const m0=M.rounds[0].find(m=>!m.bye); const flip=m0.ev.winner==='a'?[['5','11'],['5','11'],['5','11'],['',''],['','']]:[['11','5'],['11','5'],['11','5'],['',''],['','']]; const before=M.fin.w; ko.entries[m0.id]={sig:m0.sig,g:flip,wo:null}; M=koModel(ko); ok(!M.fin.w,'final cleared after flip'); }
  return rem;
}
let rematches=0;
const cfgs=[[32,8,2,16],[28,6,2,12],[30,8,2,12],[20,4,3,8],[24,4,4,8],[33,16,1,16],[26,5,3,10],[30,5,2,10],[12,3,2,3],[16,4,2,4],[8,2,2,2],[6,2,2,2],[10,1,2,0],[9,3,1,3],[40,10,2,10],[24,6,2,6],[21,7,2,7]];
const per={};for(let t=0;t<150;t++) cfgs.forEach(c=>{ const r=sim.apply(null,c); rematches+=r; per[c.join("/")]=(per[c.join("/")]||0)+r; });
const nz={};Object.keys(per).forEach(k=>{if(per[k])nz[k]=per[k];});console.log(JSON.stringify(nz));
console.log('rematches',rematches);
// old saved state migration shape
console.log(fail?'FAILURES '+fail:'ALL OK');
