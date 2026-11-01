const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','tt-planner.html'),'utf8');
const block=a=>html.slice(html.indexOf('//#'+a+'-START'),html.indexOf('//#'+a+'-END'));
const src=block('I18N')+'\nreturn {DICT,t,setL:(l)=>{LANG=l;}};';
const {DICT,t,setL}=new Function('ordinal',src)(n=>{const s=['th','st','nd','rd'],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0]);});
let fail=0; const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m);}};
const ke=Object.keys(DICT.en),kn=Object.keys(DICT.nl);
ok(ke.length===kn.length,'key count '+ke.length+' vs '+kn.length);
ke.forEach(k=>{ok(k in DICT.nl,'missing nl: '+k); if(k in DICT.nl) ok(typeof DICT.en[k]===typeof DICT.nl[k],'type mismatch '+k);});
kn.forEach(k=>ok(k in DICT.en,'missing en: '+k));
// strings identical in both languages (possible untranslated)
ke.forEach(k=>{ if(typeof DICT.en[k]==='string'&&DICT.en[k]===DICT.nl[k]&&DICT.en[k].length>4) console.log('same in both:',k,DICT.en[k]); });
// all function entries run with plausible vars in both langs and contain no 'undefined'/'NaN'
const vars={n:3,G:5,ex:2,base:4,need:5,min:3,max:4,direct:10,K:16,byes:6,sd:10,A:2,extra:4,uneven:true,N:10,c:2,z:4,sizes:'x',name:'Anna',i:2,msg:'m',t:12,d:4,g:'A',r:1};
['en','nl'].forEach(l=>{setL(l);ke.forEach(k=>{const r=t(k,vars); ok(typeof r==='string'&&!/undefined|NaN|\[object/.test(r),l+' bad output '+k+': '+r);});});
// usage check in app source
const app=html;
const body=app.replace(/\/\/#I18N-START[\s\S]*?\/\/#I18N-END/,'');
const used=new Set(); let m;
const re1=/\bt\('([a-z_0-9]+)'/g; while((m=re1.exec(body))) used.add(m[1]);
const re2=/\b(?:M|ask)\('([a-z_0-9]+)'(?:,'([a-z_0-9]+)')?/g; while((m=re2.exec(body))){used.add(m[1]); if(m[2]) used.add(m[2]);}
const re3=/\b(?:k|lk):'([a-z_0-9]+)'/g; while((m=re3.exec(body))) used.add(m[1]);
const re4=/data-ia?="([a-z_0-9]+)"/g; while((m=re4.exec(body))) used.add(m[1]);
const re5=/F\('\w+','([a-z_0-9]+)','([a-z_0-9]+)'\)/g; while((m=re5.exec(body))){used.add(m[1]);used.add(m[2]);}
const re6=/(?:r\.bad\[i\]|err)\s*[=:]\s*'([a-z_0-9]+)'/g; while((m=re6.exec(body))) used.add(m[1]);
const re7=/\bt\((?:p\.extra>0\?'(\w+)':p\.byes>0\?'(\w+)':'(\w+)'|S\.groups\?'(\w+)':'(\w+)')/g;
['q_extra','q_byes','q_plain','create_again','create_groups','lbl_load'].forEach(k=>used.add(k));
['r_final','r_semi','r_quarter','r_of','m_semi','m_quarter','m_n'].forEach(k=>used.add(k));
used.forEach(k=>ok(k in DICT.en,'used but undefined: '+k));
const unused=ke.filter(k=>!used.has(k)); console.log('unused keys:',unused.join(', ')||'none');
console.log(fail?'FAILURES '+fail:'I18N OK',ke.length,'keys');
